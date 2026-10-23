/**
 * Extra project endpoints used by the dashboard / modules pages (same paths as the original API):
 *  - GET  /project/contributor/tasks                 tasks for the logged-in general contributor
 *  - GET  /project/:id/design-brief/download?type=mo MO-approved design brief (PDF blob)
 *  - POST /project/:id/export-dpr-pdf                DPR chapter export (PDF blob)
 */
import { db } from '../db'
import { fail, ok, route } from '../router'

/** Minimal valid one-page PDF containing a title line (mock download). */
function makePdf(title: string) {
  const text = title.replace(/[()\\]/g, '')
  const stream = `BT /F1 18 Tf 60 760 Td (${text}) Tj ET`
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]
  let out = '%PDF-1.4\n'
  const offsets: number[] = []
  objs.forEach((o, i) => {
    offsets.push(out.length)
    out += `${i + 1} 0 obj\n${o}\nendobj\n`
  })
  const xref = out.length
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return new Blob([out], { type: 'application/pdf' })
}

route('GET', '/project/contributor/tasks', ({ user }) => {
  const dept = String(user?.department ?? '').toLowerCase()
  const rows = db
    .table('contributorTasks')
    .where((t) => !dept || t.departmentKey === dept)
    .map((t) => {
      const p = db.table('projects').find(t.projectId as number)
      if (!p) return null
      return {
        id: p.id,
        internalTaskId: t.id,
        name: p.name,
        projectType: p.projectType,
        department: t.department,
        assignedBy: t.assignedBy,
        date: t.date,
        createdAt: t.createdAt,
        deadline: t.deadline,
        status: t.status,
      }
    })
    .filter(Boolean)
  return ok({ count: rows.length, rows })
})

/* GET /project/:id/design-brief/download is served by handlers/design-brief.ts */

route('POST', '/project/:id/export-dpr-pdf', ({ params, body }) => {
  const p = db.table('projects').find(params.id)
  if (!p) return fail(404, 'Project not found')
  const mods = Array.isArray(body?.selectedModules) ? body.selectedModules.join(', ') : ''
  return { status: 200, body: makePdf(`${p.name} - ${mods}`) }
})
