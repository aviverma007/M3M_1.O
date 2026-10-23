/**
 * Mock endpoints for the module workspace (Apartment Design / Common Design / Commercial design chapters).
 * Same paths, params and envelope as the original API:
 *
 *   GET  /project/:p/module/:m/chapter[?chapterId=:c]
 *        -> { count, totalPages, currentPage, rows: Chapter[] }
 *           Chapter = { id, moduleId, title, chapterNumber, status ('pending'|'active'|'completed'), isLastChapter,
 *                       chapterSections? }  (sections are included for the requested chapter)
 *           chapterSections -> [{ id, chapterId, title, sectionFields: [{ id, sectionId, fieldName, fieldType,
 *             midEndAns[], premiumAns[], affluentAns[], hiStreetAns[], enclosedMallAns[], sectionFieldOptions[{id, fieldOption}],
 *             fieldValue: { answer, remark, isFlaged, anyOtherAnswer, benchmarkAnswer } | null, inputValue }] }]
 *           This is a superset of what ID Specifications / Common Area read from the same endpoint.
 *   PUT  /project/:p/module/:m/chapter/:c               body: ChapterAnswerInput[]  -> saves + marks chapter completed
 *   PUT  /project/:p/module/:m/chapter/saveAndDraft/:c  body: ChapterAnswerInput[]  -> saves answers only
 *   POST /project/:p/module/:m/import                   multipart "file" (CSV: Chapter,Section,Field,Answer[,Remark])
 *   POST /module/sample/:id                             -> { base64Url, fileFormat: 'csv' } import template
 *
 * Every write recomputes the project's module progress row (projectModules: allParams, benchmarkParams,
 * deviations, flags, complianceScore, completedChapters, moduleStatus, status) so the modules grid reflects it.
 */
import { db, type Db } from '../db'
import { audit, fail, ok, paginate, route } from '../router'
import { seedChapterCatalogue } from '../seed/chapters-a-catalogue'

type Row = { id: number; [k: string]: any } // eslint-disable-line @typescript-eslint/no-explicit-any
type Answer = string | string[]
type SavedValue = { answer: Answer; remark: string; isFlaged: number; anyOtherAnswer: string; benchmarkAnswer: string[] }
type AnswerInput = Partial<SavedValue> & { sectionId?: number; sectionFieldId: number }

/* ------------------------------------------------------------------ catalogue */

type F = [name: string, type: 'select' | 'multiselect', options: string[], hiStreet: number[], enclosedMall: number[]]
type Sec = [title: string, fields: F[]]

/** Commercial Complex Design Considerations (fictional reference data; benchmarks per High Street / Enclosed Mall). */
const COMMERCIAL: [number, string, Sec[]][] = [
  [1, 'Flooring', [
    ['Atrium & common walkway', [
      ['Type of floor', 'select', ['Vitrified Tiles', 'Marble', 'Granite', 'Imported Marble'], [0, 2], [1, 3]],
      ['Finish of tile/stone', 'select', ['Matte', 'Polished', 'Anti Skid', 'Flamed'], [0, 2], [1]],
      ['Size of tile/stone', 'select', ['600x600 mm', '800x800 mm', '1200x600 mm'], [1], [2]],
    ]],
    ['Shop fronts & arcade', [
      ['Type of floor', 'select', ['Granite', 'Kota Stone', 'Vitrified Tiles'], [0, 1], [0]],
      ['Skirting height', 'select', ['100 mm', '150 mm'], [0], [1]],
    ]],
    ['Basement/ podium', [
      ['Flooring treatment', 'select', ['Tremix', 'Epoxy coating'], [0], [1]],
      ['Column guard', 'select', ['PVC + Reflective Tape', 'Rubber corner guard'], [0], [0]],
    ]],
  ]],
  [2, 'Facade & Entrance', [
    ['Main entrance', [
      ['Type of door', 'select', ['Glass door with frame', 'Automatic sliding glass door', 'Revolving door'], [0], [1, 2]],
      ['Air curtain', 'select', ['Air curtain (preferably from outside and merged seamlessly into facade)', 'Not provided'], [1], [0]],
    ]],
    ['Facade', [
      ['Type of glazing', 'select', ['Double glazed unit', 'Single glazed', 'Structural glazing'], [0], [2]],
      ['Signage provision', 'multiselect', ['Brand fascia', 'Pylon sign', 'Digital screen', 'Any Other'], [0, 1], [0, 1, 2]],
    ]],
  ]],
  [3, 'Services & Amenities', [
    ['Vertical transportation', [
      ['Escalators', 'select', ['Provided at atrium', 'Not provided'], [1], [0]],
      ['Passenger lifts type', 'select', ['MRL', 'Traction (machine room)'], [0], [0, 1]],
    ]],
    ['Air conditioning', [
      ['Type of AC', 'select', ['Ductable VRF', 'Central chilled water', 'Split units'], [0], [1]],
    ]],
    ['Customer facilities', [
      ['Facilities', 'multiselect', ['Washrooms', 'Baby care room', 'Drinking water', 'Seating areas', 'Any Other'], [0, 2], [0, 1, 2, 3]],
      ['Parking management', 'select', ['Manual', 'Automated with guidance system'], [0], [1]],
    ]],
  ]],
]

function seedCommercial(db: Db) {
  const moduleId = 102
  if (!db.table('modules').find(moduleId)) return
  if (db.table('chapters').first((c) => c.moduleId === moduleId)) return
  COMMERCIAL.forEach(([chapterNumber, title, sections]) => {
    const ch = db.table('chapters').insert({ moduleId, chapterNumber, title, status: 'pending' })
    sections.forEach(([secTitle, fields], si) => {
      const sec = db.table('chapterSections').insert({ chapterId: ch.id, title: secTitle, order: si + 1 })
      fields.forEach(([fieldName, fieldType, options, hi, mall], fi) => {
        const pick = (idx: number[]) => idx.map((i) => options[i]).filter(Boolean)
        db.table('sectionFields').insert({
          sectionId: sec.id,
          chapterId: ch.id,
          fieldName,
          fieldType,
          order: fi + 1,
          options,
          midEndAns: [],
          premiumAns: [],
          affluentAns: [],
          hiStreetAns: pick(hi),
          enclosedMallAns: pick(mall),
        })
      })
    })
  })
}

/**
 * Make sure the chapter catalogue exists (idempotent). Modules 2/3 reuse the catalogue from
 * seed/chapters-a-catalogue.ts (shared with ID Specifications / Common Area); module 102 is seeded here.
 */
export function ensureModuleWorkspaceCatalogue(d: Db = db) {
  seedChapterCatalogue(d)
  seedCommercial(d)
}

/* ------------------------------------------------------------------ helpers */

const sortBy = (k: string) => (a: Row, b: Row) => Number(a[k] ?? a.id) - Number(b[k] ?? b.id)

const moduleChapters = (moduleId: number) => db.table<Row>('chapters').where((c) => c.moduleId === moduleId).sort(sortBy('chapterNumber'))
const chapterSections = (chapterId: number) => db.table<Row>('chapterSections').where((s) => s.chapterId === chapterId).sort(sortBy('order'))
const sectionFields = (sectionId: number) => db.table<Row>('sectionFields').where((f) => f.sectionId === sectionId).sort(sortBy('order'))
const moduleFields = (moduleId: number) => {
  const ids = new Set(moduleChapters(moduleId).map((c) => c.id))
  return db.table<Row>('sectionFields').where((f) => ids.has(f.chapterId ?? db.table<Row>('chapterSections').find(f.sectionId)?.chapterId))
}

const values = (projectId: number) => db.table<Row>('chapterFieldValues').where((v) => v.projectId === projectId)
const completedIds = (projectId: number, moduleId: number) =>
  new Set(db.table<Row>('projectChapters').where((c) => c.projectId === projectId && c.moduleId === moduleId && c.status === 'completed').map((c) => c.chapterId as number))

/** Benchmark column for a project category (same mapping as the original page). */
function benchmarkKey(category?: string) {
  switch ((category ?? '').toLowerCase()) {
    case 'premium':
      return 'premiumAns'
    case 'affluent':
      return 'affluentAns'
    case 'hi_street':
    case 'high_street':
      return 'hiStreetAns'
    case 'enclosed_mall':
      return 'enclosedMallAns'
    default:
      return 'midEndAns'
  }
}

const norm = (s: unknown) => String(s ?? '').trim().toLowerCase()
function matchesBenchmark(answer: Answer | undefined, bench: string[] = []) {
  if (!bench.length) return true
  if (Array.isArray(answer)) return answer.length > 0 && answer.every((a) => bench.some((b) => norm(b) === norm(a)))
  return bench.some((b) => norm(b) === norm(answer))
}
const isAnswered = (a: Answer | undefined) => (Array.isArray(a) ? a.length > 0 : !!a && a !== 'answer')

/** Per-project chapter status: completed when saved, the first unsaved chapter is active, the rest pending. */
function chapterStatuses(projectId: number, moduleId: number) {
  const done = completedIds(projectId, moduleId)
  const chapters = moduleChapters(moduleId)
  let activeGiven = false
  return new Map(
    chapters.map((c) => {
      if (done.has(c.id)) return [c.id, 'completed'] as const
      if (!activeGiven) {
        activeGiven = true
        return [c.id, 'active'] as const
      }
      return [c.id, 'pending'] as const
    }),
  )
}

function chapterWithSections(ch: Row, projectId: number) {
  const saved = values(projectId).filter((v) => v.chapterId === ch.id)
  return chapterSections(ch.id).map((s) => ({
    id: s.id,
    chapterId: ch.id,
    title: s.title,
    sectionFields: sectionFields(s.id).map((f) => {
      const fv = saved.find((v) => v.sectionFieldId === f.id)?.answer as SavedValue | undefined
      return {
        id: f.id,
        sectionId: s.id,
        fieldName: f.fieldName,
        fieldType: f.fieldType,
        midEndAns: f.midEndAns ?? [],
        premiumAns: f.premiumAns ?? [],
        affluentAns: f.affluentAns ?? [],
        hiStreetAns: f.hiStreetAns ?? [],
        enclosedMallAns: f.enclosedMallAns ?? [],
        sectionFieldOptions: (f.options ?? []).map((o: string, i: number) => ({ id: f.id * 100 + i, sectionFieldId: f.id, fieldOption: o })),
        fieldValue: fv ?? null,
        inputValue: null,
      }
    }),
  }))
}

function chapterDto(ch: Row, projectId: number, statuses: Map<number, string>, lastId: number | undefined, withSections: boolean) {
  return {
    id: ch.id,
    moduleId: ch.moduleId,
    title: ch.title,
    chapterNumber: ch.chapterNumber,
    status: statuses.get(ch.id) ?? 'pending',
    isLastChapter: ch.id === lastId,
    ...(withSections ? { chapterSections: chapterWithSections(ch, projectId) } : {}),
  }
}

/** Recompute the modules-grid counters for one project/module from the saved answers. */
export function recomputeModuleProgress(projectId: number, moduleId: number) {
  const project = db.table<Row>('projects').find(projectId)
  if (!project) return
  const key = benchmarkKey(project.category)
  const fields = moduleFields(moduleId)
  const saved = values(projectId).filter((v) => v.moduleId === moduleId)
  let answered = 0
  let onTrack = 0
  let flags = 0
  fields.forEach((f) => {
    const v = saved.find((s) => s.sectionFieldId === f.id)?.answer as SavedValue | undefined
    if (!v || !isAnswered(v.answer)) return
    answered++
    if (matchesBenchmark(v.answer, f[key] ?? [])) onTrack++
    if (Number(v.isFlaged) === 1) flags++
  })
  const chapters = moduleChapters(moduleId)
  const done = completedIds(projectId, moduleId)
  const completedChapters = chapters.filter((c) => done.has(c.id)).length
  const patch = {
    allParams: fields.length,
    benchmarkParams: onTrack,
    deviations: answered - onTrack,
    flags,
    complianceScore: answered ? Math.round((onTrack / answered) * 100) : 0,
    completedChapters,
    moduleStatus: chapters.length ? Math.round((completedChapters / chapters.length) * 100) : 0,
    status: chapters.length && completedChapters === chapters.length ? 'completed' : answered || completedChapters ? 'active' : 'pending',
  }
  const pm = db.table<Row>('projectModules').first((m) => m.projectId === projectId && m.moduleId === moduleId)
  if (pm) db.table('projectModules').update(pm.id, patch)
  else db.table('projectModules').insert({ projectId, moduleId, data: null, ...patch })
}

function saveAnswers(projectId: number, moduleId: number, chapterId: number, items: AnswerInput[]) {
  const t = db.table<Row>('chapterFieldValues')
  const fieldIds = new Set(chapterSections(chapterId).flatMap((s) => sectionFields(s.id).map((f) => f.id)))
  items.forEach((it) => {
    const fieldId = Number(it.sectionFieldId)
    if (!fieldIds.has(fieldId)) return
    const answer: Answer = it.answer === 'answer' || it.answer == null ? '' : it.answer
    const field = db.table<Row>('sectionFields').find(fieldId)
    const value: SavedValue = {
      answer,
      remark: it.remark ?? '',
      isFlaged: Number(it.isFlaged ?? 0),
      anyOtherAnswer: it.anyOtherAnswer ?? '',
      benchmarkAnswer: it.benchmarkAnswer ?? [],
    }
    t.upsert((v) => v.projectId === projectId && v.sectionFieldId === fieldId, {
      projectId,
      moduleId,
      chapterId,
      sectionId: Number(it.sectionId ?? field?.sectionId),
      sectionFieldId: fieldId,
      answer: value,
    })
  })
}

function markCompleted(projectId: number, moduleId: number, chapterId: number) {
  db.table<Row>('projectChapters').upsert((c) => c.projectId === projectId && c.chapterId === chapterId, {
    projectId,
    moduleId,
    chapterId,
    status: 'completed',
  })
}

function guard(params: Record<string, string>) {
  const projectId = Number(params.projectId)
  const moduleId = Number(params.moduleId)
  const project = db.table<Row>('projects').find(projectId)
  if (!project) return { error: fail(404, 'Project not found') }
  return { projectId, moduleId, project }
}

/* ------------------------------------------------------------------ routes */

route('GET', '/project/:projectId/module/:moduleId/chapter', ({ params, query }) => {
  ensureModuleWorkspaceCatalogue()
  const g = guard(params)
  if ('error' in g) return g.error
  const chapterId = query.chapterId ? Number(query.chapterId) : null
  const chapters = moduleChapters(g.moduleId)
  const statuses = chapterStatuses(g.projectId, g.moduleId)
  const lastId = chapters[chapters.length - 1]?.id
  const rows = chapters.map((c) => chapterDto(c, g.projectId, statuses, lastId, chapterId === c.id))
  return ok(paginate(rows, 1, 100))
})

function putChapter(params: Record<string, string>, body: unknown, complete: boolean, user: Parameters<typeof audit>[0]) {
  const g = guard(params)
  if ('error' in g) return g.error
  const chapterId = Number(params.chapterId)
  const ch = db.table<Row>('chapters').find(chapterId)
  if (!ch || ch.moduleId !== g.moduleId) return fail(404, 'Chapter not found')
  const items = Array.isArray(body) ? (body as AnswerInput[]) : Array.isArray((body as { data?: unknown })?.data) ? ((body as { data: AnswerInput[] }).data) : []
  saveAnswers(g.projectId, g.moduleId, chapterId, items)
  if (complete) markCompleted(g.projectId, g.moduleId, chapterId)
  recomputeModuleProgress(g.projectId, g.moduleId)
  audit(
    user,
    complete ? 'Chapter Saved' : 'Chapter Saved as Draft',
    `${user?.name ?? 'User'} saved Chapter ${ch.chapterNumber}: ${ch.title}${complete ? '' : ' as draft'} in "${g.project.name}".`,
    g.projectId,
  )
  const chapters = moduleChapters(g.moduleId)
  const dto = chapterDto(ch, g.projectId, chapterStatuses(g.projectId, g.moduleId), chapters[chapters.length - 1]?.id, true)
  return ok(dto, 'Chapter saved successfully')
}

route('PUT', '/project/:projectId/module/:moduleId/chapter/saveAndDraft/:chapterId', ({ params, body, user }) => putChapter(params, body, false, user))
route('PUT', '/project/:projectId/module/:moduleId/chapter/:chapterId', ({ params, body, user }) => putChapter(params, body, true, user))

/* ---- CSV import / template ---- */

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"'
        i++
      } else if (c === '"') q = false
      else cell += c
    } else if (c === '"') q = true
    else if (c === ',') {
      row.push(cell)
      cell = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else cell += c
  }
  if (cell || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows.filter((r) => r.some((x) => x.trim()))
}

const csvCell = (v: unknown) => {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function templateCsv(moduleId: number) {
  const lines = [['Chapter', 'Section', 'Field', 'Answer', 'Remark', 'Options'].join(',')]
  moduleChapters(moduleId).forEach((c) =>
    chapterSections(c.id).forEach((s) =>
      sectionFields(s.id).forEach((f) => lines.push([c.title, s.title, f.fieldName, '', '', (f.options ?? []).join(' | ')].map(csvCell).join(','))),
    ),
  )
  return lines.join('\n')
}

/**
 * Module-specific CSV importers (e.g. Key Ratio registers one from handlers/keyratio-compare.ts).
 * Keyed by module name; the default below handles chapter-based modules.
 */
type ModuleImporter = (args: { projectId: number; moduleId: number; text: string; user: Parameters<typeof audit>[0] }) => unknown
export const moduleImporters = new Map<string, ModuleImporter>()

route('POST', '/project/:projectId/module/:moduleId/import', async ({ params, body, user }) => {
  {
    const mod = db.table('modules').find(params.moduleId)
    const custom = mod ? moduleImporters.get(String(mod.name)) : undefined
    if (custom) {
      const file = (body as { file?: unknown })?.file
      const text = typeof file === 'string' ? file : file && typeof (file as Blob).text === 'function' ? await (file as Blob).text() : ''
      if (!text.trim()) return fail(400, 'Please upload a valid CSV file')
      return custom({ projectId: Number(params.projectId), moduleId: Number(params.moduleId), text, user })
    }
  }
  ensureModuleWorkspaceCatalogue()
  const g = guard(params)
  if ('error' in g) return g.error
  const file = (body as { file?: unknown })?.file
  const text = typeof file === 'string' ? file : file && typeof (file as Blob).text === 'function' ? await (file as Blob).text() : ''
  if (!text.trim()) return fail(400, 'Please upload a valid CSV file')
  const [header, ...rows] = parseCsv(text)
  const col = (name: string) => header.findIndex((h) => norm(h) === name)
  const [ci, si, fi, ai, ri] = [col('chapter'), col('section'), col('field'), col('answer'), col('remark')]
  if (si < 0 || fi < 0 || ai < 0) return fail(400, 'Invalid CSV format. Required columns: Section, Field, Answer')
  let imported = 0
  const touched = new Set<number>()
  moduleChapters(g.moduleId).forEach((c) => {
    const items: AnswerInput[] = []
    chapterSections(c.id).forEach((s) =>
      sectionFields(s.id).forEach((f) => {
        const r = rows.find((x) => (ci < 0 || norm(x[ci]) === norm(c.title)) && norm(x[si]) === norm(s.title) && norm(x[fi]) === norm(f.fieldName))
        if (!r || !r[ai]?.trim()) return
        const raw = r[ai].trim()
        const answer: Answer = f.fieldType === 'multiselect' ? raw.split('|').map((x) => x.trim()).filter(Boolean) : raw
        items.push({ sectionId: s.id, sectionFieldId: f.id, answer, remark: ri >= 0 ? r[ri] ?? '' : '', isFlaged: 0, anyOtherAnswer: '' })
      }),
    )
    if (items.length) {
      saveAnswers(g.projectId, g.moduleId, c.id, items)
      imported += items.length
      touched.add(c.id)
    }
  })
  recomputeModuleProgress(g.projectId, g.moduleId)
  audit(user, 'Project Imported', `${user?.name ?? 'User'} imported ${imported} values into "${g.project.name}".`, g.projectId)
  return ok({ imported, chapters: [...touched] }, 'Project imported successfully')
})

route('POST', '/module/sample/:id', ({ params }) => {
  ensureModuleWorkspaceCatalogue()
  const moduleId = Number(params.id)
  const csv = templateCsv(moduleId)
  const base64 = btoa(Array.from(new TextEncoder().encode(csv), (b) => String.fromCharCode(b)).join(''))
  return ok({ base64Url: `data:text/csv;base64,${base64}`, fileFormat: 'csv' }, 'Import format generated')
})
