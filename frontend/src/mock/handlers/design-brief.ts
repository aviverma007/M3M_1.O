/**
 * Design Brief (Module 4) mock endpoints — same paths/params/shapes as the original API.
 *
 *  GET    /project/:id/design-brief                       all department records grouped by key + summary
 *  GET    /project/:id/design-brief/download[?type=mo]    combined PDF
 *  GET    /project/:id/design-brief/:dept/download        one department PDF (dept = liaison | businessDevelopment | ...)
 *  GET    /project/:id/design-brief-summary               remarks / sent-to-design / final documents
 *  POST   /project/:id/design-brief-summary               upsert (JSON or multipart with inHouseDoc / moApprovedDoc)
 *  DELETE /project/:id/design-brief-summary/document      { docType: 'inHouseDocUrl' | 'moApprovedDocUrl' }
 *  GET    /design-brief-comment?projectId&department
 *  POST   /design-brief-comment                           { projectId, department, comment, status }
 *  GET    /:dept?projectId          POST /:dept          PATCH /:dept/:id
 *  GET    /:dept/:id/download-design-brief-inputs
 *  POST   /upload  (multipart "file")  -> { s3Url }       GET /upload/:id (mock only: file metadata + data URL)
 */
import { db } from '../db'
import { audit, created, fail, ok, route, type MockUser } from '../router'
import { notify } from './admin'
import { buildPdf, type PdfLine } from '@/components/design-brief/pdf'
import { DEPT_LABEL, FIELDS_BY_KEY, SUMMARY_CATALOGUE } from '@/components/design-brief/fields'
import type { DeptKey } from '@/types/design-brief'
import { seedDesignBrief } from '../seed/design-brief'

type Row = { id: number; [k: string]: any } // eslint-disable-line @typescript-eslint/no-explicit-any

/** API path segment -> response key and table name */
const DEPTS: { path: string; key: DeptKey; table: string }[] = [
  { path: 'liaison', key: 'liaison', table: 'briefLiaison' },
  { path: 'business-development', key: 'businessDevelopment', table: 'briefBusinessDevelopment' },
  { path: 'land', key: 'land', table: 'briefLand' },
  { path: 'structure', key: 'structure', table: 'briefStructure' },
  { path: 'mep', key: 'mep', table: 'briefMep' },
  { path: 'anarock', key: 'anarock', table: 'briefAnarock' },
]
const SUMMARY = 'designBriefSummaries'
const COMMENTS = 'designBriefComments'
const UPLOADS = 'uploads'
/** files up to this size are kept as data URLs so View/Download work offline */
const MAX_INLINE_BYTES = 1.5 * 1024 * 1024

const userLite = (id: unknown) => {
  const u = id ? db.table<Row>('users').find(Number(id)) : undefined
  return u ? { id: u.id, name: u.name, email: u.email, role: u.role, department: u.department ?? null } : null
}
const withUsers = (r: Row) => ({ ...r, Creator: userLite(r.createdBy), Assignee: userLite(r.assignedTo) })
const projectName = (id: unknown) => String(db.table<Row>('projects').find(Number(id))?.name ?? `Project ${id}`)

const deptRecords = (table: string, projectId: unknown) =>
  db
    .table<Row>(table)
    .where((r) => r.projectId === Number(projectId))
    .map(withUsers)

/* ---------------- uploads ---------------- */
function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(String(fr.result))
    fr.onerror = () => reject(fr.error)
    fr.readAsDataURL(file)
  })
}

async function storeUpload(file: unknown) {
  if (!(file instanceof Blob)) return null
  const name = file instanceof File ? file.name : 'file'
  const dataUrl = file.size <= MAX_INLINE_BYTES ? await readAsDataUrl(file) : null
  const row = db.table<Row>(UPLOADS).insert({ name, size: file.size, type: file.type, dataUrl })
  const s3Url = `/mock-uploads/${row.id}/${encodeURIComponent(name).replace(/%20/g, ' ')}`
  db.table<Row>(UPLOADS).update(row.id, { s3Url })
  return { ...row, s3Url }
}

route('POST', '/upload', async ({ body }) => {
  const f = await storeUpload(body?.file)
  if (!f) return fail(400, 'No file uploaded')
  return ok(f, 'File uploaded successfully')
})
route('GET', '/upload/:id', ({ params }) => {
  const f = db.table<Row>(UPLOADS).find(params.id)
  return f ? ok(f) : fail(404, 'File not found')
})

/* ---------------- aggregate ---------------- */
function aggregate(projectId: unknown) {
  seedDesignBrief(db) // browsers whose mock DB predates this module get the sample data too
  const out: Record<string, unknown> = {}
  DEPTS.forEach((d) => (out[d.key] = deptRecords(d.table, projectId)))
  out.summary = db.table<Row>(SUMMARY).first((s) => s.projectId === Number(projectId)) ?? null
  return out
}

route('GET', '/project/:id/design-brief', ({ params }) => ok(aggregate(params.id)))

/* ---------------- PDFs ---------------- */
function deptPdfLines(key: DeptKey, rec: Row | undefined): PdfLine[] {
  const lines: PdfLine[] = [{ text: DEPT_LABEL[key], size: 14, bold: true, gap: 14 }]
  if (!rec) return [...lines, { text: 'No inputs submitted yet.' }]
  const u = withUsers(rec)
  lines.push({ text: `Owner: ${u.Assignee?.name ?? u.Creator?.name ?? '-'}    Status: ${rec.status ?? '-'}` })
  const fields =
    key === 'anarock' ? [] : SUMMARY_CATALOGUE[key].fields.map((f) => ({ name: f.key, label: f.label }))
  const list = fields.length ? fields : FIELDS_BY_KEY[key]
  list.forEach((f, i) => {
    const note = rec[`${f.name}Note`] || rec[`${f.name}CADNote`] || rec[`${f.name}PDFNote`]
    lines.push({ text: `${String(i + 1).padStart(2, '0')}. ${f.label}: ${rec[f.name] || '-'}${note ? '  [attachment]' : ''}`, gap: 2 })
  })
  Object.entries((rec.customFields ?? {}) as Record<string, string>)
    .filter(([k]) => !k.endsWith('Note'))
    .forEach(([k, v]) => lines.push({ text: `- ${k}: ${v || '-'}` }))
  return lines
}
const pdf = (blob: Blob) => ({ status: 200, body: blob })

route('GET', '/project/:id/design-brief/download', ({ params, query }) => {
  const header: PdfLine[] = [
    { text: `${projectName(params.id)} - Design Brief${query.type === 'mo' ? ' (MO Report)' : ''}`, size: 18, bold: true },
    { text: `Generated on ${new Date().toLocaleDateString('en-GB')}`, size: 9 },
  ]
  const body = DEPTS.filter((d) => d.key !== 'anarock').flatMap((d) =>
    deptPdfLines(d.key, db.table<Row>(d.table).first((r) => r.projectId === Number(params.id))),
  )
  const s = db.table<Row>(SUMMARY).first((x) => x.projectId === Number(params.id))
  if (s?.remarks) body.push({ text: 'Remarks', size: 14, bold: true, gap: 14 }, { text: String(s.remarks) })
  return pdf(buildPdf([...header, ...body]))
})

route('GET', '/project/:id/design-brief/:dept/download', ({ params }) => {
  const d = DEPTS.find((x) => x.key === params.dept || x.path === params.dept)
  if (!d) return fail(404, 'Department not found')
  const rec = db.table<Row>(d.table).first((r) => r.projectId === Number(params.id))
  return pdf(buildPdf([{ text: `${projectName(params.id)} - Design Brief`, size: 18, bold: true }, ...deptPdfLines(d.key, rec)]))
})

/* ---------------- summary ---------------- */
route('GET', '/project/:id/design-brief-summary', ({ params }) => ok(db.table<Row>(SUMMARY).first((s) => s.projectId === Number(params.id)) ?? null))

route('POST', '/project/:id/design-brief-summary', async ({ params, body, user }) => {
  const projectId = Number(params.id)
  const patch: Record<string, unknown> = {}
  for (const [k, v] of Object.entries((body ?? {}) as Record<string, unknown>)) {
    if (k === 'inHouseDoc' || k === 'moApprovedDoc') {
      const f = await storeUpload(v)
      if (f) patch[`${k}Url`] = f.s3Url
    } else if (k === 'sentToDesignTeam') patch[k] = v === true || v === 'true'
    else if (k !== 'id' && k !== 'projectId' && k !== 'createdAt' && k !== 'updatedAt') patch[k] = v
  }
  const t = db.table<Row>(SUMMARY)
  const existing = t.first((s) => s.projectId === projectId)
  const row = existing ? t.update(existing.id, patch)! : t.insert({ projectId, remarks: '', sentToDesignTeam: false, sentAt: null, ...patch })
  const name = projectName(projectId)
  if (patch.inHouseDocUrl || patch.moApprovedDocUrl) audit(user, 'Design Brief Final Submission', `${user!.name} submitted final design brief documents for "${name}".`, projectId)
  else if (patch.sentToDesignTeam && !existing?.sentToDesignTeam) {
    audit(user, 'Design Brief Sent', `${user!.name} sent the design brief of "${name}" to the design team.`, projectId)
    db.table<Row>('users')
      .where((u) => u.role === 'design_admin' && u.id !== user!.id)
      .forEach((u) => notify(u.id, 'design_brief', `Design brief for ${name} has been sent to the design team.`, { projectId }))
  } else audit(user, 'Design Brief Summary Saved', `${user!.name} updated the design brief summary of "${name}".`, projectId)
  return ok(row, 'Design brief summary saved successfully')
})

route('DELETE', '/project/:id/design-brief-summary/document', ({ params, body, user }) => {
  const docType = String(body?.docType ?? '')
  if (docType !== 'inHouseDocUrl' && docType !== 'moApprovedDocUrl') return fail(400, 'Invalid document type')
  const t = db.table<Row>(SUMMARY)
  const s = t.first((x) => x.projectId === Number(params.id))
  if (!s) return fail(404, 'Summary not found')
  t.update(s.id, { [docType]: null })
  audit(user, 'Design Brief Document Deleted', `${user!.name} deleted a design brief document of "${projectName(params.id)}".`, Number(params.id))
  return ok(null, 'Document deleted successfully')
})

/* ---------------- comments ---------------- */
route('GET', '/design-brief-comment', ({ query }) => {
  const pid = Number(query.projectId)
  const dept = query.department
  const rows = db
    .table<Row>(COMMENTS)
    .where((c) => c.projectId === pid && (!dept || dept === 'all' || c.department === dept))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .map((c) => ({ ...c, Creator: userLite(c.createdBy) }))
  return ok(rows)
})

route('POST', '/design-brief-comment', ({ body, user }) => {
  if (!body?.comment || !String(body.comment).trim()) return fail(400, 'Comment is required')
  const projectId = Number(body.projectId)
  const department = String(body.department ?? 'all')
  const c = db.table<Row>(COMMENTS).insert({
    projectId,
    department,
    comment: String(body.comment),
    status: body.status ?? 'Revision Requested',
    createdBy: user!.id,
  })
  const d = DEPTS.find((x) => x.path === department)
  if (d) {
    const rec = db.table<Row>(d.table).first((r) => r.projectId === projectId)
    if (rec?.assignedTo && rec.assignedTo !== user!.id)
      notify(rec.assignedTo, 'design_brief_comment', `${user!.name} commented on ${DEPT_LABEL[d.key]} inputs for ${projectName(projectId)}.`, {
        projectId,
        department: DEPT_LABEL[d.key],
      })
  }
  audit(user, 'Design Brief Comment', `${user!.name} commented on ${d ? DEPT_LABEL[d.key] : 'the design brief'} in "${projectName(projectId)}".`, projectId)
  return created({ ...c, Creator: userLite(user!.id) }, 'Comment added successfully')
})

/* ---------------- department records ---------------- */
const SYSTEM_KEYS = new Set(['id', 'Creator', 'Assignee', 'createdAt', 'updatedAt', 'createdBy'])
const clean = (body: Record<string, unknown>) => Object.fromEntries(Object.entries(body).filter(([k, v]) => !SYSTEM_KEYS.has(k) && v !== undefined))

function afterWrite(d: (typeof DEPTS)[number], before: Row | null, rec: Row, user: MockUser) {
  const label = DEPT_LABEL[d.key]
  const name = projectName(rec.projectId)
  if (rec.assignedTo && rec.assignedTo !== before?.assignedTo) {
    notify(rec.assignedTo, 'task_assigned', `You have been assigned ${label} inputs for ${name}.`, {
      projectId: rec.projectId,
      department: label,
      assignedBy: user.name,
      deadline: rec.deadline ?? null,
    })
    audit(user, 'Task Assigned', `${user.name} assigned ${label} inputs for "${name}" to ${userLite(rec.assignedTo)?.name ?? 'a team member'}.`, rec.projectId)
  }
  if (rec.status && rec.status !== before?.status && ['Submitted', 'Approved', 'Rejected'].includes(rec.status)) {
    const verb = rec.status === 'Submitted' ? 'submitted' : rec.status === 'Approved' ? 'approved' : 'sent back for revision'
    const recipients = new Set<number>()
    if (rec.createdBy && rec.createdBy !== user.id) recipients.add(rec.createdBy)
    if (rec.status !== 'Submitted' && rec.assignedTo && rec.assignedTo !== user.id) recipients.add(rec.assignedTo)
    if (rec.status === 'Submitted')
      db.table<Row>('users')
        .where((u) => ['super_admin', 'design_admin'].includes(u.role) && u.id !== user.id)
        .forEach((u) => recipients.add(u.id))
    recipients.forEach((id) => notify(id, 'design_brief', `${label} inputs were ${verb} for ${name}.`, { projectId: rec.projectId, department: label }))
    audit(user, `Design Brief ${rec.status}`, `${user.name} ${verb} the ${label} brief in "${name}".`, rec.projectId)
  } else if (!(rec.assignedTo && rec.assignedTo !== before?.assignedTo)) {
    audit(user, 'Design Brief Saved', `${user.name} saved the ${label} brief in "${name}".`, rec.projectId)
  }
}

DEPTS.forEach((d) => {
  route('GET', `/${d.path}`, ({ query }) => {
    const rows = query.projectId ? deptRecords(d.table, query.projectId) : db.table<Row>(d.table).all().map(withUsers)
    return ok({ count: rows.length, data: rows })
  })

  route('GET', `/${d.path}/:id/download-design-brief-inputs`, ({ params }) => {
    const rec = db.table<Row>(d.table).find(params.id)
    if (!rec) return fail(404, 'Record not found')
    return pdf(buildPdf([{ text: `${projectName(rec.projectId)} - ${DEPT_LABEL[d.key]} Inputs`, size: 18, bold: true }, ...deptPdfLines(d.key, rec)]))
  })

  route('GET', `/${d.path}/:id`, ({ params }) => {
    const rec = db.table<Row>(d.table).find(params.id)
    return rec ? ok(withUsers(rec)) : fail(404, 'Record not found')
  })

  route('POST', `/${d.path}`, ({ body, user }) => {
    const projectId = Number(body?.projectId)
    if (!projectId) return fail(400, 'projectId is required')
    const t = db.table<Row>(d.table)
    const existing = t.first((r) => r.projectId === projectId)
    // one record per project & department: a second POST updates it
    const before = existing ? { ...existing } : null
    const data = clean(body ?? {})
    const rec = existing
      ? t.update(existing.id, data)!
      : t.insert({
          assignedTo: null,
          deadline: null,
          receivedDate: null,
          instructions: null,
          customFields: {},
          revisionReasons: null,
          ...data,
          status: (data.status as string) ?? (data.assignedTo ? 'Pending' : 'In Progress'),
          projectId,
          createdBy: user!.id,
        })
    afterWrite(d, before, rec, user!)
    return created(withUsers(rec), `${DEPT_LABEL[d.key]} created successfully`)
  })

  route('PATCH', `/${d.path}/:id`, ({ params, body, user }) => {
    const t = db.table<Row>(d.table)
    const existing = t.find(params.id)
    if (!existing) return fail(404, 'Record not found')
    const before = { ...existing }
    const rec = t.update(existing.id, clean(body ?? {}))!
    afterWrite(d, before, rec, user!)
    return ok(withUsers(rec), `${DEPT_LABEL[d.key]} updated successfully`)
  })
})
