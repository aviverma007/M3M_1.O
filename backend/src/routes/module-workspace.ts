/**
 * Module workspace (Apartment Design / Common Design / Commercial design chapters) — SQL Server port of
 * frontend/src/mock/handlers/module-workspace.ts. Same paths, params, envelopes and side effects:
 *
 *   GET  /project/:p/module/:m/chapter[?chapterId=:c]   -> { count, totalPages, currentPage, rows: Chapter[] }
 *   PUT  /project/:p/module/:m/chapter/:c               body: ChapterAnswerInput[]  -> saves + marks chapter completed
 *   PUT  /project/:p/module/:m/chapter/saveAndDraft/:c  body: ChapterAnswerInput[]  -> saves answers only
 *   POST /project/:p/module/:m/import                   multipart "file" (module importer, else CSV: Chapter,Section,Field,Answer[,Remark])
 *   POST /module/sample/:id                             -> { base64Url, fileFormat: 'csv' } import template
 *
 * The chapter catalogue (chapters / chapterSections / sectionFields) is reference data loaded by
 * database/03_reference_data.sql. Every write recomputes the project's projectModules progress row.
 */
import { db } from '../db/table.js'
import { query } from '../db/pool.js'
import { fail, ok, paginate, route } from '../http/router.js'
import { audit, readText } from '../http/helpers.js'
import type { AuthUser } from '../http/auth.js'
import { moduleImporters } from './shared/module-importers.js'

type Row = { id: number; [k: string]: any } // eslint-disable-line @typescript-eslint/no-explicit-any
type Answer = string | string[]
type SavedValue = { answer: Answer; remark: string; isFlaged: number; anyOtherAnswer: string; benchmarkAnswer: string[] }
type AnswerInput = Partial<SavedValue> & { sectionId?: number; sectionFieldId: number }
type BenchKey = 'midEndAns' | 'premiumAns' | 'affluentAns' | 'hiStreetAns' | 'enclosedMallAns'

type ChapterRow = { id: number; moduleId: number; chapterNumber: number; title: string }
type SectionRow = { id: number; chapterId: number; title: string }
type FieldRow = {
  id: number
  sectionId: number
  chapterId: number
  fieldName: string
  fieldType: string
  options: string[]
} & Record<BenchKey, string[]>

/* ------------------------------------------------------------------ catalogue loaders (set-based) */

const parseArr = (v: unknown): string[] => {
  if (Array.isArray(v)) return v
  if (v == null || v === '') return []
  try {
    const p = JSON.parse(String(v))
    return Array.isArray(p) ? p : []
  } catch {
    return []
  }
}
const parseObj = (v: unknown): unknown => {
  if (v == null) return null
  try {
    return JSON.parse(String(v))
  } catch {
    return null
  }
}

const moduleChapters = (moduleId: number) =>
  query<ChapterRow>(
    'SELECT id, moduleId, chapterNumber, title FROM dbo.chapters WHERE moduleId = @moduleId ORDER BY chapterNumber, id',
    { moduleId },
  )

/** sections of one chapter (chapterId) or of a whole module (moduleId), ordered like the mock */
const loadSections = (by: { chapterId: number } | { moduleId: number }) =>
  'chapterId' in by
    ? query<SectionRow>('SELECT id, chapterId, title FROM dbo.chapterSections WHERE chapterId = @chapterId ORDER BY [order], id', by)
    : query<SectionRow>(
        `SELECT s.id, s.chapterId, s.title FROM dbo.chapterSections s JOIN dbo.chapters c ON c.id = s.chapterId
          WHERE c.moduleId = @moduleId ORDER BY s.[order], s.id`,
        by,
      )

/** fields of one chapter or a whole module (joined through their section, ordered by [order]) */
async function loadFields(by: { chapterId: number } | { moduleId: number }): Promise<FieldRow[]> {
  const where = 'chapterId' in by ? 's.chapterId = @chapterId' : 'c.moduleId = @moduleId'
  const rows = await query<Record<string, unknown>>(
    `SELECT f.id, f.sectionId, s.chapterId, f.fieldName, f.fieldType, f.options,
            f.midEndAns, f.premiumAns, f.affluentAns, f.hiStreetAns, f.enclosedMallAns
       FROM dbo.sectionFields f
       JOIN dbo.chapterSections s ON s.id = f.sectionId
       JOIN dbo.chapters c ON c.id = s.chapterId
      WHERE ${where}
      ORDER BY f.[order], f.id`,
    by,
  )
  return rows.map((r) => ({
    id: Number(r.id),
    sectionId: Number(r.sectionId),
    chapterId: Number(r.chapterId),
    fieldName: String(r.fieldName ?? ''),
    fieldType: String(r.fieldType ?? ''),
    options: parseArr(r.options),
    midEndAns: parseArr(r.midEndAns),
    premiumAns: parseArr(r.premiumAns),
    affluentAns: parseArr(r.affluentAns),
    hiStreetAns: parseArr(r.hiStreetAns),
    enclosedMallAns: parseArr(r.enclosedMallAns),
  }))
}

/** saved answers of a project, keyed by sectionFieldId (filtered by chapter or module) */
async function loadValues(projectId: number, by: { chapterId: number } | { moduleId: number }) {
  const where = 'chapterId' in by ? 'chapterId = @chapterId' : 'moduleId = @moduleId'
  const rows = await query<{ sectionFieldId: number; answer: string | null }>(
    `SELECT sectionFieldId, answer FROM dbo.chapterFieldValues WHERE projectId = @projectId AND ${where}`,
    { projectId, ...by },
  )
  const m = new Map<number, SavedValue | null>()
  for (const r of rows) if (!m.has(r.sectionFieldId)) m.set(r.sectionFieldId, parseObj(r.answer) as SavedValue | null)
  return m
}

async function completedIds(projectId: number, moduleId: number) {
  const rows = await query<{ chapterId: number }>(
    `SELECT chapterId FROM dbo.projectChapters WHERE projectId = @projectId AND moduleId = @moduleId AND status = N'completed'`,
    { projectId, moduleId },
  )
  return new Set(rows.map((r) => Number(r.chapterId)))
}

/* ------------------------------------------------------------------ helpers */

/** Benchmark column for a project category (same mapping as the original page). */
function benchmarkKey(category?: string | null): BenchKey {
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
function chapterStatuses(chapters: ChapterRow[], done: Set<number>) {
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

/** sections + fields (+ saved values) of one chapter — 3 queries regardless of size */
async function chapterWithSections(chapterId: number, projectId: number) {
  const [sections, fields, saved] = await Promise.all([loadSections({ chapterId }), loadFields({ chapterId }), loadValues(projectId, { chapterId })])
  const bySection = new Map<number, FieldRow[]>()
  for (const f of fields) {
    const list = bySection.get(f.sectionId)
    if (list) list.push(f)
    else bySection.set(f.sectionId, [f])
  }
  return sections.map((s) => ({
    id: s.id,
    chapterId,
    title: s.title,
    sectionFields: (bySection.get(s.id) ?? []).map((f) => ({
      id: f.id,
      sectionId: s.id,
      fieldName: f.fieldName,
      fieldType: f.fieldType,
      midEndAns: f.midEndAns,
      premiumAns: f.premiumAns,
      affluentAns: f.affluentAns,
      hiStreetAns: f.hiStreetAns,
      enclosedMallAns: f.enclosedMallAns,
      sectionFieldOptions: f.options.map((o, i) => ({ id: f.id * 100 + i, sectionFieldId: f.id, fieldOption: o })),
      fieldValue: saved.get(f.id) ?? null,
      inputValue: null,
    })),
  }))
}

async function chapterDto(ch: ChapterRow, projectId: number, statuses: Map<number, string>, lastId: number | undefined, withSections: boolean) {
  return {
    id: ch.id,
    moduleId: ch.moduleId,
    title: ch.title,
    chapterNumber: ch.chapterNumber,
    status: statuses.get(ch.id) ?? 'pending',
    isLastChapter: ch.id === lastId,
    ...(withSections ? { chapterSections: await chapterWithSections(ch.id, projectId) } : {}),
  }
}

/**
 * Recompute the modules-grid counters (projectModules row) for one project/module from the saved answers.
 * Exported so other modules (e.g. project/module admin) can refresh progress after changing answers.
 */
export async function recomputeModuleProgress(projectId: number, moduleId: number) {
  const project = await db.table<Row>('projects').find(projectId)
  if (!project) return
  const key = benchmarkKey(project.category)
  const [fields, saved, chapters, done] = await Promise.all([
    loadFields({ moduleId }),
    loadValues(projectId, { moduleId }),
    moduleChapters(moduleId),
    completedIds(projectId, moduleId),
  ])
  let answered = 0
  let onTrack = 0
  let flags = 0
  for (const f of fields) {
    const v = saved.get(f.id)
    if (!v || !isAnswered(v.answer)) continue
    answered++
    if (matchesBenchmark(v.answer, f[key] ?? [])) onTrack++
    if (Number(v.isFlaged) === 1) flags++
  }
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
  const t = db.table<Row>('projectModules')
  const pm = await t.first({ projectId, moduleId })
  if (pm) await t.update(pm.id, patch)
  else await t.insert({ projectId, moduleId, data: null, ...patch })
}

/**
 * Upsert answers in one MERGE. `fields` maps every allowed sectionFieldId to its catalogue row;
 * items for other fields are ignored (same as the mock). Returns the number of rows written.
 */
async function saveAnswers(projectId: number, moduleId: number, fields: Map<number, FieldRow>, items: AnswerInput[]) {
  const rows = new Map<number, { chapterId: number; sectionId: number; sectionFieldId: number; answer: SavedValue }>()
  for (const it of items) {
    if (!it || typeof it !== 'object') continue
    const fieldId = Number(it.sectionFieldId)
    const field = fields.get(fieldId)
    if (!field) continue
    const answer: Answer = it.answer === 'answer' || it.answer == null ? '' : it.answer
    const flag = Number(it.isFlaged ?? 0)
    rows.set(fieldId, {
      chapterId: field.chapterId,
      sectionId: field.sectionId,
      sectionFieldId: fieldId,
      answer: {
        answer,
        remark: it.remark ?? '',
        isFlaged: Number.isFinite(flag) ? flag : 0,
        anyOtherAnswer: it.anyOtherAnswer ?? '',
        benchmarkAnswer: it.benchmarkAnswer ?? [],
      },
    })
  }
  if (!rows.size) return 0
  await query(
    `MERGE dbo.chapterFieldValues WITH (HOLDLOCK) AS t
     USING (SELECT chapterId, sectionId, sectionFieldId, answer
              FROM OPENJSON(@rows) WITH (chapterId INT, sectionId INT, sectionFieldId INT, answer NVARCHAR(MAX) AS JSON)) AS s
        ON t.projectId = @projectId AND t.sectionFieldId = s.sectionFieldId
     WHEN MATCHED THEN UPDATE SET moduleId = @moduleId, chapterId = s.chapterId, sectionId = s.sectionId, answer = s.answer, updatedAt = SYSUTCDATETIME()
     WHEN NOT MATCHED THEN INSERT (projectId, moduleId, chapterId, sectionId, sectionFieldId, answer)
          VALUES (@projectId, @moduleId, s.chapterId, s.sectionId, s.sectionFieldId, s.answer);`,
    { projectId, moduleId, rows: JSON.stringify([...rows.values()]) },
  )
  return rows.size
}

async function markCompleted(projectId: number, moduleId: number, chapterId: number) {
  await query(
    `MERGE dbo.projectChapters WITH (HOLDLOCK) AS t
     USING (SELECT @projectId AS projectId, @chapterId AS chapterId) AS s
        ON t.projectId = s.projectId AND t.chapterId = s.chapterId
     WHEN MATCHED THEN UPDATE SET moduleId = @moduleId, status = N'completed', updatedAt = SYSUTCDATETIME()
     WHEN NOT MATCHED THEN INSERT (projectId, moduleId, chapterId, status) VALUES (@projectId, @moduleId, @chapterId, N'completed');`,
    { projectId, moduleId, chapterId },
  )
}

const toId = (v: unknown) => {
  const n = Number(v)
  return Number.isInteger(n) && n > 0 && n < 2 ** 31 ? n : null
}

async function guard(params: Record<string, string>) {
  const projectId = toId(params.projectId)
  const moduleId = toId(params.moduleId)
  const project = projectId ? await db.table<Row>('projects').find(projectId) : undefined
  if (!project || !projectId) return { error: fail(404, 'Project not found') }
  return { projectId, moduleId: moduleId ?? 0, project }
}

/* ------------------------------------------------------------------ routes */

route('GET', '/project/:projectId/module/:moduleId/chapter', async ({ params, query: q }) => {
  const g = await guard(params)
  if ('error' in g) return g.error
  const chapterId = q.chapterId ? Number(q.chapterId) : null
  const [chapters, done] = await Promise.all([moduleChapters(g.moduleId), completedIds(g.projectId, g.moduleId)])
  const statuses = chapterStatuses(chapters, done)
  const lastId = chapters[chapters.length - 1]?.id
  const rows = await Promise.all(chapters.map((c) => chapterDto(c, g.projectId, statuses, lastId, chapterId === c.id)))
  return ok(paginate(rows, 1, 100))
})

async function putChapter(params: Record<string, string>, body: unknown, complete: boolean, user: AuthUser | null) {
  const g = await guard(params)
  if ('error' in g) return g.error
  const chapterId = toId(params.chapterId)
  const [ch] = chapterId
    ? await query<ChapterRow>('SELECT id, moduleId, chapterNumber, title FROM dbo.chapters WHERE id = @chapterId', { chapterId })
    : []
  if (!ch || ch.moduleId !== g.moduleId) return fail(404, 'Chapter not found')
  const items = Array.isArray(body) ? (body as AnswerInput[]) : Array.isArray((body as { data?: unknown })?.data) ? (body as { data: AnswerInput[] }).data : []
  const fields = new Map((await loadFields({ chapterId: ch.id })).map((f) => [f.id, f]))
  await saveAnswers(g.projectId, g.moduleId, fields, items)
  if (complete) await markCompleted(g.projectId, g.moduleId, ch.id)
  await recomputeModuleProgress(g.projectId, g.moduleId)
  await audit(
    user,
    complete ? 'Chapter Saved' : 'Chapter Saved as Draft',
    `${user?.name ?? 'User'} saved Chapter ${ch.chapterNumber}: ${ch.title}${complete ? '' : ' as draft'} in "${g.project.name}".`,
    g.projectId,
  )
  const [chapters, done] = await Promise.all([moduleChapters(g.moduleId), completedIds(g.projectId, g.moduleId)])
  const dto = await chapterDto(ch, g.projectId, chapterStatuses(chapters, done), chapters[chapters.length - 1]?.id, true)
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

/** catalogue of a module as chapter -> sections -> fields (3 queries) */
async function moduleTree(moduleId: number) {
  const [chapters, sections, fields] = await Promise.all([moduleChapters(moduleId), loadSections({ moduleId }), loadFields({ moduleId })])
  const fieldsBySection = new Map<number, FieldRow[]>()
  for (const f of fields) fieldsBySection.set(f.sectionId, [...(fieldsBySection.get(f.sectionId) ?? []), f])
  const sectionsByChapter = new Map<number, SectionRow[]>()
  for (const s of sections) sectionsByChapter.set(s.chapterId, [...(sectionsByChapter.get(s.chapterId) ?? []), s])
  return chapters.map((c) => ({
    chapter: c,
    sections: (sectionsByChapter.get(c.id) ?? []).map((s) => ({ section: s, fields: fieldsBySection.get(s.id) ?? [] })),
  }))
}

async function templateCsv(moduleId: number) {
  const lines = [['Chapter', 'Section', 'Field', 'Answer', 'Remark', 'Options'].join(',')]
  for (const { chapter, sections } of await moduleTree(moduleId))
    for (const { section, fields } of sections)
      for (const f of fields) lines.push([chapter.title, section.title, f.fieldName, '', '', f.options.join(' | ')].map(csvCell).join(','))
  return lines.join('\n')
}

route('POST', '/project/:projectId/module/:moduleId/import', async ({ params, body, user }) => {
  {
    // module-specific importers (e.g. Key Ratio) registered in shared/module-importers.ts, keyed by module name
    const modId = toId(params.moduleId)
    const mod = modId ? await db.table<Row>('modules').find(modId) : undefined
    const custom = mod ? moduleImporters.get(String(mod.name)) : undefined
    if (custom) {
      const text = await readText((body as { file?: unknown })?.file)
      if (!text.trim()) return fail(400, 'Please upload a valid CSV file')
      return custom({ projectId: Number(params.projectId), moduleId: Number(params.moduleId), text, user })
    }
  }
  const g = await guard(params)
  if ('error' in g) return g.error
  const text = await readText((body as { file?: unknown })?.file)
  if (!text.trim()) return fail(400, 'Please upload a valid CSV file')
  const [header = [], ...rows] = parseCsv(text)
  const col = (name: string) => header.findIndex((h) => norm(h) === name)
  const [ci, si, fi, ai, ri] = [col('chapter'), col('section'), col('field'), col('answer'), col('remark')]
  if (si < 0 || fi < 0 || ai < 0) return fail(400, 'Invalid CSV format. Required columns: Section, Field, Answer')
  const allFields = new Map<number, FieldRow>()
  const items: AnswerInput[] = []
  const touched = new Set<number>()
  for (const { chapter: c, sections } of await moduleTree(g.moduleId)) {
    for (const { section: s, fields } of sections)
      for (const f of fields) {
        allFields.set(f.id, f)
        const r = rows.find((x) => (ci < 0 || norm(x[ci]) === norm(c.title)) && norm(x[si]) === norm(s.title) && norm(x[fi]) === norm(f.fieldName))
        if (!r || !r[ai]?.trim()) continue
        const raw = r[ai].trim()
        const answer: Answer = f.fieldType === 'multiselect' ? raw.split('|').map((x) => x.trim()).filter(Boolean) : raw
        items.push({ sectionId: s.id, sectionFieldId: f.id, answer, remark: ri >= 0 ? r[ri] ?? '' : '', isFlaged: 0, anyOtherAnswer: '' })
        touched.add(c.id)
      }
  }
  const imported = await saveAnswers(g.projectId, g.moduleId, allFields, items)
  await recomputeModuleProgress(g.projectId, g.moduleId)
  await audit(user, 'Project Imported', `${user?.name ?? 'User'} imported ${imported} values into "${g.project.name}".`, g.projectId)
  return ok({ imported, chapters: [...touched] }, 'Project imported successfully')
})

route('POST', '/module/sample/:id', async ({ params }) => {
  const moduleId = toId(params.id) ?? 0
  const csv = await templateCsv(moduleId)
  const base64 = Buffer.from(csv, 'utf8').toString('base64')
  return ok({ base64Url: `data:text/csv;base64,${base64}`, fileFormat: 'csv' }, 'Import format generated')
})
