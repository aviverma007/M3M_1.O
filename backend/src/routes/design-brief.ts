/**
 * Design Brief (Module 4) — ported from frontend/src/mock/handlers/design-brief.ts.
 *
 *  GET    /project/:id/design-brief                       all department records grouped by key + summary
 *  GET    /project/:id/design-brief/download[?type=mo]    combined PDF
 *  GET    /project/:id/design-brief/:dept/download        one department PDF (dept = liaison | businessDevelopment | ...)
 *  GET    /project/:id/design-brief-summary               remarks / sent-to-design / final documents / chapter page data
 *  POST   /project/:id/design-brief-summary               upsert (JSON or multipart with inHouseDoc / moApprovedDoc)
 *  DELETE /project/:id/design-brief-summary/document      { docType: 'inHouseDocUrl' | 'moApprovedDocUrl' }
 *  GET    /design-brief-comment?projectId&department
 *  POST   /design-brief-comment                           { projectId, department, comment, status }
 *  GET    /:dept?projectId          POST /:dept          PATCH /:dept/:id       GET /:dept/:id
 *  GET    /:dept/:id/download-design-brief-inputs
 *
 * The six per-department mock tables are one SQL table, dbo.designBriefInputs (department column, form values in the
 * `fields` JSON spill column). POST /upload and GET /upload/:id live in routes/files.ts.
 */
import { db, type Row } from '../db/table.js'
import { query } from '../db/pool.js'
import { created, fail, ok, route, type Result } from '../http/router.js'
import { audit, notify, UploadedFile } from '../http/helpers.js'
import { saveUpload } from '../http/files.js'
import type { AuthUser } from '../http/auth.js'
import { buildPdf, type PdfLine } from '@/components/design-brief/pdf'
import { DEPT_LABEL, FIELDS_BY_KEY, SUMMARY_CATALOGUE } from '@/components/design-brief/fields'
import type { DeptKey } from '@/types/design-brief'

/** API path segment (= department column value) -> response key */
const DEPTS: { path: string; key: DeptKey }[] = [
  { path: 'liaison', key: 'liaison' },
  { path: 'business-development', key: 'businessDevelopment' },
  { path: 'land', key: 'land' },
  { path: 'structure', key: 'structure' },
  { path: 'mep', key: 'mep' },
  { path: 'anarock', key: 'anarock' },
]
type Dept = (typeof DEPTS)[number]

const INPUTS = 'designBriefInputs'
const inputsAll = () => db.table<Row>(INPUTS, { spill: 'fields' })
const inputs = (d: Dept) => db.table<Row>(INPUTS, { spill: 'fields', scope: { department: d.path } })
const summaries = () => db.table<Row>('designBriefSummaries', { spill: 'extra' })
const comments = () => db.table<Row>('designBriefComments')

const toId = (v: unknown) => {
  const n = Number(v)
  return Number.isInteger(n) && n > 0 ? n : null
}

/* ---------------- users / projects ---------------- */
type UserLite = { id: number; name: string; email: string; role: string; department: string | null }
async function usersById(ids: unknown[]) {
  const list = [...new Set(ids.map(toId).filter((x): x is number => x !== null))]
  const map = new Map<number, UserLite>()
  if (!list.length) return map
  const rows = await query<UserLite>(
    `SELECT id, name, email, role, department FROM dbo.users WHERE id IN (${list.map((_, i) => `@u${i}`).join(', ')})`,
    Object.fromEntries(list.map((id, i) => [`u${i}`, id])),
  )
  rows.forEach((u) => map.set(u.id, { id: u.id, name: u.name, email: u.email, role: u.role, department: u.department ?? null }))
  return map
}
async function userLite(id: unknown) {
  const n = toId(id)
  return n ? ((await usersById([n])).get(n) ?? null) : null
}

/** strip the storage-only department column so records look like the mock's per-department rows */
const strip = (r: Row): Row => {
  const { department: _d, ...rest } = r // eslint-disable-line @typescript-eslint/no-unused-vars
  return rest as Row
}
async function withUsersMany(rows: Row[]) {
  const users = await usersById(rows.flatMap((r) => [r.createdBy, r.assignedTo]))
  return rows.map((r) => ({ ...strip(r), Creator: users.get(Number(r.createdBy)) ?? null, Assignee: users.get(Number(r.assignedTo)) ?? null }))
}
const withUsers = async (r: Row) => (await withUsersMany([r]))[0]

async function projectRow(id: unknown) {
  const n = toId(id)
  if (!n) return undefined
  const [p] = await query<{ id: number; name: string }>('SELECT id, name FROM dbo.projects WHERE id = @id', { id: n })
  return p
}
const projectName = async (id: unknown) => String((await projectRow(id))?.name ?? `Project ${id}`)

const deptRecords = async (d: Dept, projectId: unknown) => {
  const pid = toId(projectId)
  return pid ? withUsersMany(await inputs(d).where({ projectId: pid })) : []
}
const firstRecord = async (d: Dept, projectId: unknown) => {
  const pid = toId(projectId)
  return pid ? inputs(d).first({ projectId: pid }) : undefined
}
/** chapter-page columns (xxxData) that were never saved are left out, like the mock's sparse summary record */
const tidySummary = (s: Row) => Object.fromEntries(Object.entries(s).filter(([k, v]) => !(v === null && k.endsWith('Data')))) as Row
const summaryOf = async (projectId: unknown) => {
  const pid = toId(projectId)
  const s = pid ? await summaries().first({ projectId: pid }) : undefined
  return s ? tidySummary(s) : null
}

/* ---------------- aggregate ---------------- */
route('GET', '/project/:id/design-brief', async ({ params }) => {
  const pid = toId(params.id)
  const out: Record<string, unknown> = {}
  const raw = pid ? await inputsAll().where({ projectId: pid }) : []
  const rows = await withUsersMany(raw) // same order as raw; department is stripped from the output
  DEPTS.forEach((d) => (out[d.key] = rows.filter((_, i) => raw[i].department === d.path)))
  out.summary = await summaryOf(pid)
  return ok(out)
})

/* ---------------- PDFs ---------------- */
async function deptPdfLines(key: DeptKey, rec: Row | undefined): Promise<PdfLine[]> {
  const lines: PdfLine[] = [{ text: DEPT_LABEL[key], size: 14, bold: true, gap: 14 }]
  if (!rec) return [...lines, { text: 'No inputs submitted yet.' }]
  const u = await withUsers(rec)
  lines.push({ text: `Owner: ${u.Assignee?.name ?? u.Creator?.name ?? '-'}    Status: ${rec.status ?? '-'}` })
  const fields = key === 'anarock' ? [] : SUMMARY_CATALOGUE[key].fields.map((f) => ({ name: f.key, label: f.label }))
  const list = fields.length ? fields : FIELDS_BY_KEY[key]
  list.forEach((f, i) => {
    const note = rec[`${f.name}Note`] || rec[`${f.name}CADNote`] || rec[`${f.name}PDFNote`]
    lines.push({ text: `${String(i + 1).padStart(2, '0')}. ${f.label}: ${rec[f.name] || '-'}${note ? '  [attachment]' : ''}`, gap: 2 })
  })
  const custom = rec.customFields && typeof rec.customFields === 'object' ? (rec.customFields as Record<string, unknown>) : {}
  Object.entries(custom)
    .filter(([k]) => !k.endsWith('Note'))
    .forEach(([k, v]) => lines.push({ text: `- ${k}: ${typeof v === 'object' && v !== null ? JSON.stringify(v) : v || '-'}` }))
  return lines
}
const pdf = (blob: Blob): Result => ({ status: 200, body: blob })

route('GET', '/project/:id/design-brief/download', async ({ params, query: q }) => {
  const header: PdfLine[] = [
    { text: `${await projectName(params.id)} - Design Brief${q.type === 'mo' ? ' (MO Report)' : ''}`, size: 18, bold: true },
    { text: `Generated on ${new Date().toLocaleDateString('en-GB')}`, size: 9 },
  ]
  const body: PdfLine[] = []
  for (const d of DEPTS.filter((x) => x.key !== 'anarock')) body.push(...(await deptPdfLines(d.key, await firstRecord(d, params.id))))
  const s = await summaryOf(params.id)
  if (s?.remarks) body.push({ text: 'Remarks', size: 14, bold: true, gap: 14 }, { text: String(s.remarks) })
  return pdf(buildPdf([...header, ...body]))
})

route('GET', '/project/:id/design-brief/:dept/download', async ({ params }) => {
  const d = DEPTS.find((x) => x.key === params.dept || x.path === params.dept)
  if (!d) return fail(404, 'Department not found')
  const rec = await firstRecord(d, params.id)
  return pdf(buildPdf([{ text: `${await projectName(params.id)} - Design Brief`, size: 18, bold: true }, ...(await deptPdfLines(d.key, rec))]))
})

/* ---------------- summary ---------------- */
route('GET', '/project/:id/design-brief-summary', async ({ params }) => ok(await summaryOf(params.id)))

route('POST', '/project/:id/design-brief-summary', async ({ params, body, user }) => {
  const projectId = toId(params.id)
  const name = projectId ? (await projectRow(projectId))?.name : undefined
  if (!projectId || name === undefined) return fail(404, 'Project not found')
  const patch: Record<string, unknown> = {}
  for (const [k, v] of Object.entries((body ?? {}) as Record<string, unknown>)) {
    if (k === 'inHouseDoc' || k === 'moApprovedDoc') {
      if (v instanceof UploadedFile) patch[`${k}Url`] = (await saveUpload(v, user!.id)).s3Url
    } else if (k === 'sentToDesignTeam') patch[k] = v === true || v === 'true'
    else if (k === 'sentAt') {
      const t = v ? new Date(String(v)) : null
      patch[k] = t && !Number.isNaN(t.getTime()) ? t.toISOString() : null
    } else if (v instanceof UploadedFile) continue
    else if (k !== 'id' && k !== 'projectId' && k !== 'createdAt' && k !== 'updatedAt' && k !== 'extra') patch[k] = v
  }
  const t = summaries()
  const existing = await t.first({ projectId })
  const row = existing
    ? ((await t.update(existing.id, patch)) as Row)
    : await t.insert({ projectId, remarks: '', sentToDesignTeam: false, sentAt: null, ...patch })
  const u = user!
  if (patch.inHouseDocUrl || patch.moApprovedDocUrl)
    await audit(u, 'Design Brief Final Submission', `${u.name} submitted final design brief documents for "${name}".`, projectId)
  else if (patch.sentToDesignTeam && !existing?.sentToDesignTeam) {
    await audit(u, 'Design Brief Sent', `${u.name} sent the design brief of "${name}" to the design team.`, projectId)
    const admins = await query<{ id: number }>(`SELECT id FROM dbo.users WHERE role = 'design_admin' AND id <> @me`, { me: u.id })
    for (const a of admins) await notify(a.id, 'design_brief', `Design brief for ${name} has been sent to the design team.`, { projectId })
  } else await audit(u, 'Design Brief Summary Saved', `${u.name} updated the design brief summary of "${name}".`, projectId)
  return ok(tidySummary(row), 'Design brief summary saved successfully')
})

route('DELETE', '/project/:id/design-brief-summary/document', async ({ params, body, user }) => {
  const docType = String(body?.docType ?? '')
  if (docType !== 'inHouseDocUrl' && docType !== 'moApprovedDocUrl') return fail(400, 'Invalid document type')
  const s = await summaryOf(params.id)
  if (!s) return fail(404, 'Summary not found')
  await summaries().update(s.id, { [docType]: null })
  await audit(user, 'Design Brief Document Deleted', `${user!.name} deleted a design brief document of "${await projectName(params.id)}".`, s.projectId)
  return ok(null, 'Document deleted successfully')
})

/* ---------------- comments ---------------- */
route('GET', '/design-brief-comment', async ({ query: q }) => {
  const pid = toId(q.projectId)
  if (!pid) return ok([])
  const dept = q.department
  const filter: Record<string, unknown> = { projectId: pid }
  if (dept && dept !== 'all') filter.department = dept
  const rows = await comments().where(filter, { orderBy: 'createdAt desc, id desc' })
  const users = await usersById(rows.map((c) => c.createdBy))
  return ok(rows.map((c) => ({ ...c, Creator: users.get(Number(c.createdBy)) ?? null })))
})

route('POST', '/design-brief-comment', async ({ body, user }) => {
  if (!body?.comment || !String(body.comment).trim()) return fail(400, 'Comment is required')
  const projectId = toId(body.projectId)
  if (!projectId || !(await projectRow(projectId))) return fail(404, 'Project not found')
  const department = String(body.department ?? 'all')
  const u = user!
  const c = await comments().insert({
    projectId,
    department,
    comment: String(body.comment),
    status: body.status ?? 'Revision Requested',
    createdBy: u.id,
  })
  const name = await projectName(projectId)
  const d = DEPTS.find((x) => x.path === department)
  if (d) {
    const rec = await firstRecord(d, projectId)
    if (rec?.assignedTo && rec.assignedTo !== u.id)
      await notify(rec.assignedTo, 'design_brief_comment', `${u.name} commented on ${DEPT_LABEL[d.key]} inputs for ${name}.`, {
        projectId,
        department: DEPT_LABEL[d.key],
      })
  }
  await audit(u, 'Design Brief Comment', `${u.name} commented on ${d ? DEPT_LABEL[d.key] : 'the design brief'} in "${name}".`, projectId)
  return created({ ...c, Creator: await userLite(u.id) }, 'Comment added successfully')
})

/* ---------------- department records ---------------- */
/** keys never written from a request body (department/fields are storage columns of designBriefInputs) */
const SYSTEM_KEYS = new Set(['id', 'Creator', 'Assignee', 'createdAt', 'updatedAt', 'createdBy', 'department', 'fields'])
const clean = (body: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(body).filter(([k, v]) => !SYSTEM_KEYS.has(k) && v !== undefined && !(v instanceof UploadedFile)))

async function afterWrite(d: Dept, before: Row | null, rec: Row, user: AuthUser) {
  const label = DEPT_LABEL[d.key]
  const name = await projectName(rec.projectId)
  const newlyAssigned = !!rec.assignedTo && rec.assignedTo !== before?.assignedTo
  if (newlyAssigned) {
    await notify(rec.assignedTo, 'task_assigned', `You have been assigned ${label} inputs for ${name}.`, {
      projectId: rec.projectId,
      department: label,
      assignedBy: user.name,
      deadline: rec.deadline ?? null,
    })
    await audit(user, 'Task Assigned', `${user.name} assigned ${label} inputs for "${name}" to ${(await userLite(rec.assignedTo))?.name ?? 'a team member'}.`, rec.projectId)
  }
  if (rec.status && rec.status !== before?.status && ['Submitted', 'Approved', 'Rejected'].includes(rec.status)) {
    const verb = rec.status === 'Submitted' ? 'submitted' : rec.status === 'Approved' ? 'approved' : 'sent back for revision'
    const recipients = new Set<number>()
    if (rec.createdBy && rec.createdBy !== user.id) recipients.add(rec.createdBy)
    if (rec.status !== 'Submitted' && rec.assignedTo && rec.assignedTo !== user.id) recipients.add(rec.assignedTo)
    if (rec.status === 'Submitted') {
      const admins = await query<{ id: number }>(`SELECT id FROM dbo.users WHERE role IN ('super_admin', 'design_admin') AND id <> @me`, { me: user.id })
      admins.forEach((a) => recipients.add(a.id))
    }
    for (const id of recipients) await notify(id, 'design_brief', `${label} inputs were ${verb} for ${name}.`, { projectId: rec.projectId, department: label })
    await audit(user, `Design Brief ${rec.status}`, `${user.name} ${verb} the ${label} brief in "${name}".`, rec.projectId)
  } else if (!newlyAssigned) {
    await audit(user, 'Design Brief Saved', `${user.name} saved the ${label} brief in "${name}".`, rec.projectId)
  }
}

DEPTS.forEach((d) => {
  route('GET', `/${d.path}`, async ({ query: q }) => {
    const rows = q.projectId ? await deptRecords(d, q.projectId) : await withUsersMany(await inputs(d).all())
    return ok({ count: rows.length, data: rows })
  })

  route('GET', `/${d.path}/:id/download-design-brief-inputs`, async ({ params }) => {
    const rec = await inputs(d).find(params.id)
    if (!rec) return fail(404, 'Record not found')
    return pdf(buildPdf([{ text: `${await projectName(rec.projectId)} - ${DEPT_LABEL[d.key]} Inputs`, size: 18, bold: true }, ...(await deptPdfLines(d.key, rec))]))
  })

  route('GET', `/${d.path}/:id`, async ({ params }) => {
    const rec = await inputs(d).find(params.id)
    return rec ? ok(await withUsers(rec)) : fail(404, 'Record not found')
  })

  route('POST', `/${d.path}`, async ({ body, user }) => {
    const projectId = toId(body?.projectId)
    if (!projectId) return fail(400, 'projectId is required')
    if (!(await projectRow(projectId))) return fail(404, 'Project not found')
    const t = inputs(d)
    // one record per project & department: a second POST updates it
    const existing = await t.first({ projectId })
    const before = existing ? { ...existing } : null
    const data = clean(body ?? {})
    delete data.projectId
    const rec = existing
      ? ((await t.update(existing.id, data)) as Row)
      : await t.insert({
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
    await afterWrite(d, before, rec, user!)
    return created(await withUsers(rec), `${DEPT_LABEL[d.key]} created successfully`)
  })

  route('PATCH', `/${d.path}/:id`, async ({ params, body, user }) => {
    const t = inputs(d)
    const existing = await t.find(params.id)
    if (!existing) return fail(404, 'Record not found')
    const data = clean(body ?? {})
    delete data.projectId // records stay in their project
    const rec = (await t.update(existing.id, data)) as Row
    await afterWrite(d, existing, rec, user!)
    return ok(await withUsers(rec), `${DEPT_LABEL[d.key]} updated successfully`)
  })
})
