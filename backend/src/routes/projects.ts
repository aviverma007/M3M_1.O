/*
 * Project endpoints — port of frontend/src/mock/handlers/project.ts + projects-extra.ts.
 *
 *  GET    /project                          list (search, type/category/date/portfolio filters, paging, `fields=` lite mode)
 *  GET    /project/contributor/tasks        tasks for the logged-in contributor's department
 *  GET    /project/:id                      one project
 *  POST   /project                          create (+ projectModules rows for every module of its type)
 *  PUT    /project/:id                      update
 *  DELETE /project/:id                      delete (child rows cascade via FKs)
 *  PUT    /project/:id/save-project-module  echo (kept for API compatibility)
 *  GET    /project/:id/module               modules of the project with progress + chapters
 *  GET    /module/:id                       one module
 *  GET    /project/:id/export               CSV of the project record
 *  GET    /project/:id/exportCommercial     CSV (commercial)
 *  POST   /project/:id/import               no-op (same as the original mock)
 *  POST   /project/:id/export-dpr-pdf       DPR export (PDF)
 *
 * Not here: POST /module/sample/:id and GET /project/:id/design-brief/download (owned by other groups).
 */
import { db, type Row } from '../db/table.js'
import { query, type Params } from '../db/pool.js'
import { created, fail, file, ok, paginate, route } from '../http/router.js'
import { audit } from '../http/helpers.js'
import { MODULE_ROUTE } from '@/mock/catalogue'
import { makePdf } from './projects/pdf.js'

type Project = Row

const PROJECT_FIELDS = [
  'name', 'description', 'projectType', 'category', 'projectOwner', 'location', 'userName', 'userEmail', 'userNumber', 'date',
  'userDesignation', 'projectClassification', 'designOwner', 'structureOwner', 'mepOwner', 'interiorDesignOwner',
  'far_permissible', 'site_area', 'site_area_acres', 'locationCategory',
]
/** every real column of dbo.projects (whitelist for `fields=`) */
const PROJECT_COLUMNS = new Set(['id', 'status', 'userId', 'createdAt', 'updatedAt', ...PROJECT_FIELDS])

const pick = (body: Record<string, unknown> | null | undefined) =>
  Object.fromEntries(PROJECT_FIELDS.filter((k) => body && k in body).map((k) => [k, body![k]]))

const projects = () => db.table<Project>('projects')

/** parse a numeric route id; undefined when it isn't a positive integer */
const toId = (v: unknown) => {
  const n = Number(v)
  return Number.isInteger(n) && n > 0 ? n : undefined
}
async function findProject(id: unknown) {
  const n = toId(id)
  return n ? projects().find(n) : undefined
}

/** convert a raw SQL row of dbo.projects (Date objects) to the API shape (ISO strings) */
const plain = (r: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v instanceof Date ? v.toISOString() : v])) as Project

const likeEscape = (s: string) => s.replace(/[[\]%_]/g, (c) => `[${c}]`)

/* ------------------------------------------------------------------ GET /project */
route('GET', '/project', async ({ query: qs }) => {
  const where: string[] = []
  const params: Params = {}
  const lc = qs.locationCategory || qs.lc
  if (lc && lc !== 'All') {
    where.push('p.locationCategory = @lc')
    params.lc = lc
  }
  if (qs.search) {
    // same haystack as the original: `${name} ${category} ${location}` (nulls rendered as text)
    where.push(`LOWER(CONCAT(p.name, N' ', ISNULL(p.category, N'null'), N' ', ISNULL(p.location, N'null'))) LIKE @search`)
    params.search = `%${likeEscape(qs.search.toLowerCase())}%`
  }
  if (qs.projectType && qs.projectType !== 'all') {
    where.push('p.projectType = @projectType')
    params.projectType = qs.projectType
  }
  if (qs.projectCategory) {
    where.push('p.category = @projectCategory')
    params.projectCategory = qs.projectCategory
  }
  // string comparison like the original (`String(p.date) >= fromDate`)
  if (qs.fromDate) {
    where.push(`ISNULL(p.[date], N'null') >= @fromDate`)
    params.fromDate = qs.fromDate
  }
  if (qs.toDate) {
    where.push(`ISNULL(p.[date], N'null') <= @toDate`)
    params.toDate = qs.toDate
  }
  const w = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const [{ n: count }] = await query<{ n: number }>(`SELECT COUNT(*) AS n FROM dbo.projects p ${w}`, params)

  // `fields=id,name,location` -> lightweight list (used by compare dropdowns): page 1 only
  if (qs.fields) {
    const f = qs.fields.split(',').map((s) => s.trim()).filter(Boolean)
    const cols = f.filter((k) => PROJECT_COLUMNS.has(k))
    const limit = Math.max(1, Number(qs.limit) || 1000)
    const rows = await query<Record<string, unknown>>(
      `SELECT ${cols.length ? cols.map((c) => `p.[${c}]`).join(', ') : 'p.id'} FROM dbo.projects p ${w}
        ORDER BY p.createdAt, p.id OFFSET 0 ROWS FETCH NEXT @lim ROWS ONLY`,
      { ...params, lim: limit },
    )
    const lite = rows.map((r) => {
      const p = plain(r)
      return { ...Object.fromEntries(f.map((k) => [k, p[k] ?? null])), moduleId: null }
    })
    return ok({ count, totalPages: Math.max(1, Math.ceil(count / limit)), currentPage: 1, rows: lite })
  }

  const page = Math.max(1, Number(qs.page) || 1)
  const limit = Math.max(1, Number(qs.limit) || 10)
  const rows = await query<Record<string, unknown>>(
    `SELECT p.*, (SELECT TOP 1 m.id FROM dbo.modules m WHERE m.projectType = p.projectType ORDER BY m.id) AS moduleId
       FROM dbo.projects p ${w}
      ORDER BY p.createdAt, p.id OFFSET @off ROWS FETCH NEXT @lim ROWS ONLY`,
    { ...params, off: (page - 1) * limit, lim: limit },
  )
  return ok({ count, totalPages: Math.max(1, Math.ceil(count / limit)), currentPage: page, rows: rows.map(plain) })
})

/* ------------------------------------------------------------------ contributor tasks */
route('GET', '/project/contributor/tasks', async ({ user }) => {
  const dept = String(user?.department ?? '').toLowerCase()
  const rows = await query<Record<string, unknown>>(
    `SELECT p.id, t.id AS internalTaskId, p.name, p.projectType, t.department, t.assignedBy, t.[date], t.createdAt, t.deadline, t.status
       FROM dbo.contributorTasks t JOIN dbo.projects p ON p.id = t.projectId
      ${dept ? 'WHERE t.departmentKey = @dept' : ''}
      ORDER BY t.id`,
    dept ? { dept } : {},
  )
  const out = rows.map(plain)
  return ok({ count: out.length, rows: out })
})

/* ------------------------------------------------------------------ CRUD */
route('GET', '/project/:id', async ({ params }) => {
  const p = await findProject(params.id)
  return p ? ok(p) : fail(404, 'Project not found')
})

route('POST', '/project', async ({ body, user }) => {
  if (!body?.name) return fail(400, 'Project name is required')
  const data = pick(body)
  if (!data.projectType) data.projectType = 'residential'
  const p = await projects().insert({ ...data, status: 'pending', userId: user!.id })
  // one projectModules row per module of the project's type (same defaults as the original seed)
  await query(
    `INSERT INTO dbo.projectModules (projectId, moduleId, allParams, deviations, benchmarkParams, flags, complianceScore, moduleStatus, completedChapters, status, data)
     SELECT @pid, m.id, 5, 0, 5, 0, 0, 0, 0, N'pending', NULL FROM dbo.modules m WHERE m.projectType = @type ORDER BY m.id`,
    { pid: p.id, type: String(p.projectType || 'residential') },
  )
  await audit(user, 'Project Created', `${user!.name} created project "${p.name}".`, p.id)
  return created(p, 'Project created successfully')
})

route('PUT', '/project/:id', async ({ params, body, user }) => {
  const id = toId(params.id)
  const patch = pick(body)
  // NOT NULL columns: ignore an explicit null instead of failing the whole update
  for (const k of ['name', 'projectType']) if (k in patch && patch[k] == null) delete patch[k]
  const p = id ? await projects().update(id, patch) : undefined
  if (!p) return fail(404, 'Project not found')
  await audit(user, 'Project Updated', `${user!.name} updated project "${p.name}".`, p.id)
  return ok(p, 'Project updated successfully')
})

route('DELETE', '/project/:id', async ({ params, user }) => {
  const p = await findProject(params.id)
  if (!p) return fail(404, 'Project not found')
  await projects().remove(p.id) // projectModules, chapters, briefs, key ratios... cascade via FKs
  await audit(user, 'Project Deleted', `${user!.name} deleted project "${p.name}".`, p.id)
  return ok(null, 'Project deleted successfully')
})

route('PUT', '/project/:id/save-project-module', async ({ params, body }) => {
  const p = await findProject(params.id)
  if (!p) return fail(404, 'Project not found')
  return ok(body, 'Module data saved successfully')
})

/* ------------------------------------------------------------------ GET /project/:id/module */
route('GET', '/project/:id/module', async ({ params, query: qs }) => {
  const p = await findProject(params.id)
  if (!p) return fail(404, 'Project not found')
  const type = qs.projectType || p.projectType || 'residential'
  const mods = await query<Record<string, unknown>>(
    `SELECT m.id, m.moduleNumber, m.name,
            pm.id AS pmId, pm.allParams, pm.deviations, pm.benchmarkParams, pm.flags, pm.complianceScore,
            pm.moduleStatus, pm.completedChapters, pm.status AS pmStatus
       FROM dbo.modules m
       LEFT JOIN dbo.projectModules pm ON pm.moduleId = m.id AND pm.projectId = @pid
      WHERE m.projectType = @type
      ORDER BY m.id`,
    { pid: p.id, type },
  )
  const ids = mods.map((m) => Number(m.id))
  const chapters = ids.length
    ? await query<{ id: number; moduleId: number; title: string; chapterNumber: number }>(
        `SELECT id, moduleId, title, chapterNumber FROM dbo.chapters
          WHERE moduleId IN (SELECT m.id FROM dbo.modules m WHERE m.projectType = @type)
          ORDER BY moduleId, chapterNumber, id`,
        { type },
      )
    : []
  const byModule = new Map<number, typeof chapters>()
  for (const c of chapters) {
    const list = byModule.get(c.moduleId) ?? []
    list.push(c)
    byModule.set(c.moduleId, list)
  }
  let moApprovedDocUrl: string | null | undefined
  const briefUrl = async () => {
    if (moApprovedDocUrl === undefined) {
      const r = await query<{ u: string | null }>(`SELECT TOP 1 moApprovedDocUrl AS u FROM dbo.designBriefSummaries WHERE projectId = @pid`, { pid: p.id })
      moApprovedDocUrl = r[0]?.u ?? null
    }
    return moApprovedDocUrl
  }

  const rows = []
  for (const m of mods) {
    const id = Number(m.id)
    const ch = byModule.get(id) ?? []
    rows.push({
      id,
      moduleNumber: m.moduleNumber,
      name: m.name,
      description: null,
      status: 'active',
      route: MODULE_ROUTE[m.name as string] ?? null,
      projectModule:
        m.pmId != null
          ? {
              allParams: m.allParams,
              deviations: m.deviations,
              benchmarkParams: m.benchmarkParams,
              flags: m.flags,
              complianceScore: m.complianceScore,
              moduleStatus: m.moduleStatus,
              completedChapters: m.completedChapters,
              status: m.pmStatus,
              // Design Brief module: link to the MO-approved brief once final submission is done
              moApprovedDocUrl: m.name === 'Design Brief' ? await briefUrl() : null,
            }
          : null,
      moduleChapters: ch.map((c) => ({ id: c.id, title: c.title, chapterNumber: c.chapterNumber })),
      firstChapterId: ch[0]?.id ?? null,
      originalModuleId: id,
    })
  }
  return ok(paginate(rows, 1, 100))
})

route('GET', '/module/:id', async ({ params }) => {
  const id = toId(params.id)
  const m = id ? await db.table('modules').find(id) : undefined
  return m ? ok(m) : fail(404, 'Module not found')
})

/* ------------------------------------------------------------------ export / import */
route('GET', '/project/:id/export', async ({ params }) => {
  const p = await findProject(params.id)
  if (!p) return fail(404, 'Project not found')
  const csv = ['Field,Value', ...PROJECT_FIELDS.map((k) => `${k},"${String(p[k] ?? '').replace(/"/g, '""')}"`)].join('\n')
  return ok({ fileName: `${p.name}.csv`, mimeType: 'text/csv', content: csv })
})

route('GET', '/project/:id/exportCommercial', async ({ params }) => {
  const p = await findProject(params.id)
  if (!p) return fail(404, 'Project not found')
  return ok({ fileName: `${p.name}.csv`, mimeType: 'text/csv', content: 'Field,Value\nname,' + p.name })
})

route('POST', '/project/:id/import', async () => ok(null, 'Imported successfully'))

route('POST', '/project/:id/export-dpr-pdf', async ({ params, body }) => {
  const p = await findProject(params.id)
  if (!p) return fail(404, 'Project not found')
  const mods = Array.isArray(body?.selectedModules) ? body.selectedModules.map(String).join(', ') : ''
  return file(makePdf(`${p.name} - ${mods}`), 'application/pdf')
})
