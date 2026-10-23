import { db } from '../db'
import { audit, fail, ok, paginate, route, created } from '../router'
import { seedProjectModules } from '../seed/00-core'
import { MODULE_ROUTE } from '../catalogue'

type Project = { id: number; [k: string]: any } // eslint-disable-line @typescript-eslint/no-explicit-any

const PROJECT_FIELDS = [
  'name', 'description', 'projectType', 'category', 'projectOwner', 'location', 'userName', 'userEmail', 'userNumber', 'date',
  'userDesignation', 'projectClassification', 'designOwner', 'structureOwner', 'mepOwner', 'interiorDesignOwner',
  'far_permissible', 'site_area', 'site_area_acres', 'locationCategory',
]
const pick = (body: Record<string, unknown>) => Object.fromEntries(PROJECT_FIELDS.filter((k) => k in body).map((k) => [k, body[k]]))

/* GET /project — list with filters (same query params as original) */
route('GET', '/project', ({ query }) => {
  const projects = db.table<Project>('projects')
  let rows = projects.all().slice()
  const lc = query.locationCategory || query.lc
  if (lc && lc !== 'All') rows = rows.filter((p) => p.locationCategory === lc)
  if (query.search) {
    const s = query.search.toLowerCase()
    rows = rows.filter((p) => `${p.name} ${p.category} ${p.location}`.toLowerCase().includes(s))
  }
  if (query.projectType && query.projectType !== 'all') rows = rows.filter((p) => p.projectType === query.projectType)
  if (query.projectCategory) rows = rows.filter((p) => p.category === query.projectCategory)
  if (query.fromDate) rows = rows.filter((p) => String(p.date) >= query.fromDate)
  if (query.toDate) rows = rows.filter((p) => String(p.date) <= query.toDate)
  rows.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))

  // `fields=id,name,location` -> lightweight list (used by compare dropdowns)
  if (query.fields) {
    const f = query.fields.split(',')
    const lite = rows.map((p) => ({ ...Object.fromEntries(f.map((k) => [k, p[k] ?? null])), moduleId: null }))
    return ok(paginate(lite, 1, Number(query.limit) || 1000))
  }
  const firstModule = (p: Project) => db.table('modules').first((m) => m.projectType === p.projectType)?.id ?? null
  return ok(paginate(rows.map((p) => ({ ...p, moduleId: firstModule(p) })), Number(query.page) || 1, Number(query.limit) || 10))
})

route('GET', '/project/:id', ({ params }) => {
  const p = db.table<Project>('projects').find(params.id)
  return p ? ok(p) : fail(404, 'Project not found')
})

route('POST', '/project', ({ body, user }) => {
  if (!body?.name) return fail(400, 'Project name is required')
  const p = db.table<Project>('projects').insert({ ...pick(body), status: 'pending', userId: user!.id } as unknown as Project)
  seedProjectModules(db, p.id, String(p.projectType || 'residential'))
  audit(user, 'Project Created', `${user!.name} created project "${p.name}".`, p.id)
  return created(p, 'Project created successfully')
})

route('PUT', '/project/:id', ({ params, body, user }) => {
  const p = db.table<Project>('projects').update(params.id, pick(body))
  if (!p) return fail(404, 'Project not found')
  audit(user, 'Project Updated', `${user!.name} updated project "${p.name}".`, p.id)
  return ok(p, 'Project updated successfully')
})

route('DELETE', '/project/:id', ({ params, user }) => {
  const p = db.table<Project>('projects').find(params.id)
  if (!p) return fail(404, 'Project not found')
  db.table<Project>('projects').remove(p.id)
  db.table('projectModules').removeWhere((m) => m.projectId === p.id)
  audit(user, 'Project Deleted', `${user!.name} deleted project "${p.name}".`, p.id)
  return ok(null, 'Project deleted successfully')
})

route('PUT', '/project/:id/save-project-module', ({ params, body }) => {
  const p = db.table<Project>('projects').find(params.id)
  if (!p) return fail(404, 'Project not found')
  return ok(body, 'Module data saved successfully')
})

/* GET /project/:id/module — modules for a project with progress */
route('GET', '/project/:id/module', ({ params, query }) => {
  const p = db.table<Project>('projects').find(params.id)
  if (!p) return fail(404, 'Project not found')
  const type = query.projectType || p.projectType || 'residential'
  const modules = db.table('modules').where((m) => m.projectType === type)
  const rows = modules.map((m) => {
    const pm = db.table('projectModules').first((x) => x.projectId === p.id && x.moduleId === m.id)
    const chapters = db.table('chapters').where((c) => c.moduleId === m.id).sort((a, b) => Number(a.chapterNumber) - Number(b.chapterNumber))
    return {
      id: m.id,
      moduleNumber: m.moduleNumber,
      name: m.name,
      description: null,
      status: 'active',
      route: MODULE_ROUTE[m.name as string] ?? null,
      projectModule: pm
        ? {
            allParams: pm.allParams,
            deviations: pm.deviations,
            benchmarkParams: pm.benchmarkParams,
            flags: pm.flags,
            complianceScore: pm.complianceScore,
            moduleStatus: pm.moduleStatus,
            completedChapters: pm.completedChapters,
            status: pm.status,
            // Design Brief module: link to the MO-approved brief once final submission is done
            moApprovedDocUrl:
              m.name === 'Design Brief' ? (db.table('designBriefSummaries').first((s) => s.projectId === p.id)?.moApprovedDocUrl ?? null) : null,
          }
        : null,
      moduleChapters: chapters.map((c) => ({ id: c.id, title: c.title, chapterNumber: c.chapterNumber })),
      firstChapterId: chapters[0]?.id ?? null,
      originalModuleId: m.id,
    }
  })
  return ok(paginate(rows, 1, 100))
})

route('GET', '/module/:id', ({ params }) => {
  const m = db.table('modules').find(params.id)
  return m ? ok(m) : fail(404, 'Module not found')
})

/* Export project (mock returns a CSV built from the project record) */
route('GET', '/project/:id/export', ({ params, query }) => {
  const p = db.table<Project>('projects').find(params.id)
  if (!p) return fail(404, 'Project not found')
  const csv = ['Field,Value', ...PROJECT_FIELDS.map((k) => `${k},"${String(p[k] ?? '').replace(/"/g, '""')}"`)].join('\n')
  return ok({ fileName: `${p.name}.${query.format === 'pdf' ? 'csv' : 'csv'}`, mimeType: 'text/csv', content: csv })
})
route('GET', '/project/:id/exportCommercial', ({ params }) => {
  const p = db.table<Project>('projects').find(params.id)
  if (!p) return fail(404, 'Project not found')
  return ok({ fileName: `${p.name}.csv`, mimeType: 'text/csv', content: 'Field,Value\nname,' + p.name })
})
route('POST', '/project/:id/import', () => ok(null, 'Imported successfully'))
