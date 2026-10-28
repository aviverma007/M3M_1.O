/**
 * Key Ratio module + Compare Projects — port of frontend/src/mock/handlers/keyratio-compare.ts.
 *
 *   GET  /keyRatio?project_id                 -> { keyRatioFields: [flat inputs], keyCalFields: {tab: {section: [field]}}, projectOwners, calculatedFields }
 *   POST /keyRatio                            body: {...inputs, project_id, module_id, inputValues[], calculatedSectionValues[]}
 *   PUT  /keyRatio/?project_id                same body (record exists)
 *   POST /keyRatio/saveAsDraft[/?project_id]  same body, saved as draft
 *   GET  /commercial/create-key-ratio?project_id -> { keyRatioData: { inputData, outputData, owner } }
 *   POST|PUT /commercial/create-key-ratio[?project_id]   body: { projectId, keyRatioInputs[], keyOutputs[], sectionCost[] }
 *   PUT|POST /commercial/save-as-draft        same body, saved as draft
 *   POST /compare/get-projects                body: { currentProjectId, compareProjectIds[], moduleId, chapterId }
 *
 * Calculated values, benchmark validity and module progress are computed server-side with the same pure
 * functions the page uses (@/components/keyratio/calc).
 */
import { db, type Row } from '../db/table.js'
import { query } from '../db/pool.js'
import { fail, ok, route } from '../http/router.js'
import { audit } from '../http/helpers.js'
import type { AuthUser } from '../http/auth.js'
import { moduleImporters } from './shared/module-importers.js'
import {
  checkValidity,
  commercialValue,
  computeCommercial,
  heightRange,
  residentialDynamicRange,
  residentialValue,
  type ComRef,
} from '@/components/keyratio/calc'
import type { KeyRatioForm, ResCalField } from '@/types/keyratio-compare'

type Obj = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
type User = AuthUser | null

/* ------------------------------------------------------------------ constants (copied from mock seed/keyratio-compare.ts) */

/** Input columns of a residential key ratio record, in display order (keys of keyRatioFields[0]). */
export const RESIDENTIAL_INPUT_KEYS = [
  'building_height', 'carpet_area', 'saleable_area', 'balcony_area', 'built_up_area', 'far', 'permissible_far', 'total_external_wall_area',
  'window_to_area_ratio', 'service_shaft_area', 'sales_price', 'construction_cost_on_bua',
  'floor_to_floor_height_apt', 'no_of_units', 'average_wall_area_interior_exterior_per_unit',
  'lobby_corridor_width', 'driveway_width_basement', 'floor_to_floor_height_ground_lobby', 'floor_to_floor_height_basement_b1_b2', 'clear_height',
  'average_wall_area_interior_exterior_per_basement', 'no_of_basements', 'car_length', 'car_width',
  'total_basement_area', 'circulation_area', 'total_parking_area', 'total_number_of_cars',
  'total_steel_reinforcement', 'total_concrete_consumption',
  'air_conditioned_area_for_appartment', 'tonnage_per_appartment', 'cost_per_tonne_apartment', 'no_of_apartments',
  'air_conditioned_area_for_club', 'tonnage_of_club_house', 'cost_per_tonne_club', 'no_of_clubs',
  'passenger_lift_speed', 'no_of_passanger_lift', 'service_lift_speed', 'no_of_service_lift', 'avg_waiting_time',
]

/** Backend-maintained cost constants stored on every record (hidden from the input panel). */
export const RESIDENTIAL_COST_DEFAULTS: Record<string, number> = {
  cost_of_apartment_wall_construction: 1800,
  cost_of_basement_wall_construction: 2200,
  revenue_per_extra_car_slot: 500000,
  cost_of_passenger_lift_3ms: 0.9,
  cost_of_passenger_lift_3_5ms: 1.2,
  cost_of_passenger_lift_4ms: 1.4,
  cost_of_service_lift_2_5ms: 0.66,
  cost_of_service_lift_3ms: 0.7,
  price_per_steel: 55,
  price_per_concrete: 5000,
}

/* ------------------------------------------------------------------ helpers */

const toId = (v: unknown) => {
  const n = Number(v)
  return Number.isInteger(n) && n > 0 ? n : null
}
const project = async (id: unknown) => {
  const n = toId(id)
  return n ? db.table<Row>('projects').find(n) : undefined
}
const catKey = (category?: string) => String(category ?? '').replace('-', '_')
const owners = (p: Row) => ({ design_owner: p.designOwner ?? null, structure_owner: p.structureOwner ?? null, mep_owner: p.mepOwner ?? null })
const TAB_ORDER = ['Design', 'Structure', 'MEP']

/* ------------------------------------------------------------------ residential */

const residentialRecord = (projectId: number) => db.table<Row>('keyRatios').first({ projectId })
const resCalDefs = () => db.table<Row>('keyRatioCalFields').all({ orderBy: 'order_id, id' })

/** keyRatioFields[0]: every input column (null when never entered) + the record id when saved. */
function residentialForm(projectId: number, rec: Row | undefined): KeyRatioForm {
  const base: KeyRatioForm = Object.fromEntries(RESIDENTIAL_INPUT_KEYS.map((k) => [k, null]))
  if (!rec) return { ...base, ...RESIDENTIAL_COST_DEFAULTS }
  return { id: rec.id, project_id: projectId, module_id: rec.moduleId, ...base, ...RESIDENTIAL_COST_DEFAULTS, ...(rec.fields ?? {}), createdAt: rec.createdAt, updatedAt: rec.updatedAt }
}

function residentialCalFields(rec: Row | undefined, form: KeyRatioForm, defs: Row[]) {
  const out: Record<string, Record<string, ResCalField[]>> = {}
  TAB_ORDER.forEach((tab) =>
    defs
      .filter((d) => d.tab === tab)
      .forEach((d) => {
        const saved = rec?.outputs?.[d.id] ?? {}
        const field = { ...d } as unknown as ResCalField
        const value = rec ? residentialValue(field, form) : null
        ;((out[tab] ??= {})[d.section] ??= []).push({
          ...field,
          field_id: d.id,
          value,
          is_flag: saved.is_flag ?? 0,
          remark: saved.remark ?? '',
          calculated_cost: saved.calculated_cost ?? null,
        } as ResCalField)
      }),
  )
  return out
}

async function residentialPayload(p: Row, defs?: Row[]) {
  const rec = await residentialRecord(p.id)
  const form = residentialForm(p.id, rec)
  return {
    keyRatioFields: [form],
    keyCalFields: residentialCalFields(rec, form, defs ?? (await resCalDefs())),
    projectOwners: owners(p),
    calculatedFields: rec?.sectionCosts ?? [],
  }
}

/** Module progress counters derived from the benchmark checks (shown on the modules grid). */
async function updateProgress(projectId: number, moduleId: number, total: number, deviations: number, flags: number, completed: boolean) {
  const patch = {
    allParams: total,
    benchmarkParams: total - deviations,
    deviations,
    flags,
    complianceScore: total ? Math.round(((total - deviations) / total) * 100) : 0,
    moduleStatus: completed ? 100 : 50,
    status: completed ? 'completed' : 'active',
  }
  const t = db.table<Row>('projectModules')
  const pm = await t.first({ projectId, moduleId })
  if (pm) await t.update(pm.id, patch)
  else await t.insert({ projectId, moduleId, completedChapters: 0, data: null, ...patch })
}

const RES_META_KEYS = new Set(['id', 'project_id', 'module_id', 'inputValues', 'calculatedSectionValues', 'createdAt', 'updatedAt'])

async function saveResidential(body: Obj, isDraft: boolean, user: User) {
  const p = await project(body?.project_id)
  if (!p) return fail(404, 'Project not found')
  const projectId = p.id
  const moduleId = Number(body.module_id) || 1
  const fields = Object.fromEntries(
    Object.entries(body)
      .filter(([k]) => !RES_META_KEYS.has(k))
      .map(([k, v]) => [k, v === '' || v == null ? null : Number.isFinite(Number(v)) ? Number(v) : v]),
  )
  const outputs: Record<number, Obj> = {}
  ;(Array.isArray(body.inputValues) ? body.inputValues : []).forEach((v: Obj) => {
    outputs[Number(v?.field_id)] = { is_flag: v.flag ? 1 : 0, remark: v.remark ?? '', calculated_cost: v.calculated_cost ?? null, field_value: v.field_value }
  })
  const t = db.table<Row>('keyRatios')
  const existing = await residentialRecord(projectId)
  const data = {
    projectId,
    moduleId,
    fields: { ...(existing?.fields ?? {}), ...fields },
    outputs,
    sectionCosts: Array.isArray(body.calculatedSectionValues) ? body.calculatedSectionValues : [],
    isDraft,
  }
  const rec = existing ? (await t.update(existing.id, data))! : await t.insert(data)

  // server-side benchmark check of every ratio
  const form = residentialForm(projectId, rec)
  const category = catKey(p.category)
  let deviations = 0
  let flags = 0
  const defs = await resCalDefs()
  defs.forEach((d) => {
    const f = d as unknown as ResCalField
    const value = residentialValue(f, form)
    const range = heightRange(d.id, category, form.building_height) ?? d[category]
    const v = checkValidity(value, range, d.id, residentialDynamicRange(f, category), false, form.building_height as number)
    if (v.value === 'false') deviations++
    if (outputs[d.id]?.is_flag) flags++
  })
  await updateProgress(projectId, moduleId, defs.length, deviations, flags, !isDraft)
  await audit(user, isDraft ? 'Key Ratio Draft Saved' : 'Key Ratio Saved', `${user?.name ?? 'User'} saved the Key Ratio module of "${p.name}".`, projectId)
  return ok({ id: rec.id, project_id: projectId, module_id: moduleId, ...(rec.fields ?? {}) }, isDraft ? 'Project saved as draft' : 'KeyRatio Module created')
}

route('GET', '/keyRatio', async ({ query: q }) => {
  const p = await project(q.project_id)
  if (!p) return fail(404, 'Project not found')
  return ok(await residentialPayload(p))
})
route('POST', '/keyRatio', ({ body, user }) => saveResidential(body ?? {}, false, user))
route('PUT', '/keyRatio', ({ body, query: q, user }) => saveResidential({ ...body, project_id: body?.project_id ?? q.project_id }, false, user))
route('POST', '/keyRatio/saveAsDraft', ({ body, query: q, user }) => saveResidential({ ...body, project_id: body?.project_id ?? q.project_id }, true, user))

/* ------------------------------------------------------------------ commercial */

const comRecord = (projectId: number) => db.table<Row>('comKeyRatios').first({ projectId })
const comInputDefs = () => db.table<Row>('comKeyRatioInputs').all({ orderBy: 'order, id' })
const comOutputDefs = () => db.table<Row>('comKeyRatioOutputs').all({ orderBy: 'order, id' })

const comInputsList = (rec: Row | undefined, inputDefs: Row[]) =>
  inputDefs.map((d) => ({ field_id: d.id as number, value: rec?.inputs?.[d.id] ?? null }))

async function commercialPayload(p: Row, cache?: { inputDefs: Row[]; outputDefs: Row[] }) {
  const rec = await comRecord(p.id)
  const inputDefs = cache?.inputDefs ?? (await comInputDefs())
  const outputDefs = cache?.outputDefs ?? (await comOutputDefs())
  const inputs = comInputsList(rec, inputDefs)
  const inputData: Obj = {}
  inputDefs.forEach((d) =>
    ((inputData[d.tab] ??= {})[d.section] ??= []).push({
      field_id: d.id,
      field_name: d.field_name,
      units: d.units,
      is_visible: d.is_visible,
      value: rec?.inputs?.[d.id] ?? null,
    }),
  )
  const outputData: Obj = {}
  outputDefs.forEach((d) => {
    const saved = rec?.outputs?.[d.id] ?? {}
    const { id, order, tab, section, ...rest } = d
    void order
    ;((outputData[tab] ??= {})[section] ??= []).push({
      ...rest,
      id: rec ? rec.id * 1000 + id : null,
      field_id: id,
      field_value: rec ? commercialValue({ field_id: id, dependency: d.dependency }, inputs) : null,
      remark: saved.remark ?? '',
      is_flag: saved.is_flag ?? false,
      calculated_cost: saved.calculated_cost ?? null,
    })
  })
  return { keyRatioData: { inputData, outputData, owner: owners(p) } }
}

async function saveCommercial(body: Obj, isDraft: boolean, user: User) {
  const p = await project(body?.projectId)
  if (!p) return fail(404, 'Project not found')
  const projectId = p.id
  const t = db.table<Row>('comKeyRatios')
  const existing = await comRecord(projectId)
  const inputs: Record<number, unknown> = { ...(existing?.inputs ?? {}) }
  ;(Array.isArray(body.keyRatioInputs) ? body.keyRatioInputs : []).forEach(
    (i: Obj) => (inputs[Number(i?.field_id)] = i.value === '' || i.value == null ? null : Number(i.value)),
  )
  const outputs: Record<number, Obj> = {}
  ;(Array.isArray(body.keyOutputs) ? body.keyOutputs : []).forEach(
    (o: Obj) => (outputs[Number(o?.field_id)] = { is_flag: !!o.is_flag, remark: o.remark ?? '', calculated_cost: o.calculated_cost ?? null }),
  )
  const data = { projectId, moduleId: 101, inputs, outputs, sectionCost: Array.isArray(body.sectionCost) ? body.sectionCost : [], isDraft }
  const rec = existing ? (await t.update(existing.id, data))! : await t.insert(data)

  // server-side benchmark check
  const category = String(p.category)
  const list = comInputsList(rec, await comInputDefs())
  const defs = await comOutputDefs()
  const refs: ComRef[] = defs.map((d) => ({ field_id: d.id, dependency: d.dependency, range: d[category], dynamicRange: d[`${category}_range`], sectionName: d.section, tabName: d.tab }))
  const outs = defs.map((d) => ({ field_id: d.id, field_value: commercialValue({ field_id: d.id, dependency: d.dependency }, list) }))
  computeCommercial(list, outs, refs, category)
  const height = list.find((i) => i.field_id === 41)?.value
  let deviations = 0
  defs.forEach((d, i) => {
    const range = heightRange(d.id, category, height) ?? d[category]
    if (range && checkValidity(outs[i].field_value, range, d.id, d[`${category}_range`], false, height as number, true).value === 'false') deviations++
  })
  const flags = Object.values(outputs).filter((o) => o.is_flag).length
  await updateProgress(projectId, 101, defs.length, deviations, flags, !isDraft)
  await audit(user, isDraft ? 'Key Ratio Draft Saved' : 'Key Ratio Saved', `${user?.name ?? 'User'} saved the Commercial Key Ratio module of "${p.name}".`, projectId)
  return ok({ id: rec.id }, isDraft ? 'Project saved as draft' : 'KeyRatio Module created')
}

route('GET', '/commercial/create-key-ratio', async ({ query: q }) => {
  const p = await project(q.project_id)
  if (!p) return fail(404, 'Project not found')
  return ok(await commercialPayload(p))
})
route('POST', '/commercial/create-key-ratio', ({ body, user }) => saveCommercial(body ?? {}, false, user))
route('PUT', '/commercial/create-key-ratio', ({ body, query: q, user }) => saveCommercial({ ...body, projectId: body?.projectId ?? q.project_id }, false, user))
route('PUT', '/commercial/save-as-draft', ({ body, query: q, user }) => saveCommercial({ ...body, projectId: body?.projectId ?? q.project_id }, true, user))
route('POST', '/commercial/save-as-draft', ({ body, query: q, user }) => saveCommercial({ ...body, projectId: body?.projectId ?? q.project_id }, true, user))

/* ------------------------------------------------------------------ compare */

type ModuleRow = { id: number; moduleNumber: number; name: string; projectType: string }

/** Modules that can be compared, per project type, in order (key ratio + design chapter modules). */
const comparableModules = (projectType: string) =>
  query<ModuleRow>(
    `SELECT m.id, m.moduleNumber, m.name, m.projectType FROM dbo.modules m
      WHERE m.projectType = @t AND (m.id IN (1, 101) OR EXISTS (SELECT 1 FROM dbo.chapters c WHERE c.moduleId = m.id))
      ORDER BY m.moduleNumber, m.id`,
    { t: projectType },
  )

/** per-request cache of chapter lists */
function chapterCache() {
  const cache = new Map<number, Promise<Row[]>>()
  return (moduleId: number) => {
    let c = cache.get(moduleId)
    if (!c) {
      c = db.table<Row>('chapters').where({ moduleId }, { orderBy: 'chapterNumber, id' })
      cache.set(moduleId, c)
    }
    return c
  }
}

async function completedChapterIds(projectId: number, moduleId: number) {
  const rows = await query<{ chapterId: number }>(
    `SELECT chapterId FROM dbo.projectChapters WHERE projectId = @p AND moduleId = @m AND status = N'completed'`,
    { p: projectId, m: moduleId },
  )
  return new Set(rows.map((r) => r.chapterId))
}

async function chapterSectionsDto(chapterId: number, projectId: number) {
  const sections = await db.table<Row>('chapterSections').where({ chapterId }, { orderBy: 'order, id' })
  if (!sections.length) return []
  const [fields, values] = await Promise.all([
    db.table<Row>('sectionFields').where({ sectionId: sections.map((s) => s.id) }, { orderBy: 'order, id' }),
    db.table<Row>('chapterFieldValues').where({ projectId, chapterId }),
  ])
  const answers = new Map(values.map((v) => [v.sectionFieldId as number, v.answer]))
  return sections.map((s) => ({
    id: s.id,
    chapterId,
    title: s.title,
    sectionFields: fields
      .filter((f) => f.sectionId === s.id)
      .map((f) => ({
        id: f.id,
        sectionId: s.id,
        fieldName: f.fieldName,
        fieldType: f.fieldType,
        midEndAns: f.midEndAns ?? [],
        premiumAns: f.premiumAns ?? [],
        affluentAns: f.affluentAns ?? [],
        hiStreetAns: f.hiStreetAns ?? [],
        enclosedMallAns: f.enclosedMallAns ?? [],
        sectionFieldOptions: ((f.options as string[]) ?? []).map((o: string, i: number) => ({ id: f.id * 100 + i, sectionFieldId: f.id, fieldOption: o })),
        fieldValue: answers.get(f.id) ?? null,
      })),
  }))
}

async function moduleData(projectId: number, moduleId: number, chapterId: number, chapters: Row[]) {
  const done = await completedChapterIds(projectId, moduleId)
  let activeGiven = false
  const rows = []
  for (const [i, c] of chapters.entries()) {
    let status = 'pending'
    if (done.has(c.id)) status = 'completed'
    else if (!activeGiven) {
      activeGiven = true
      status = 'active'
    }
    rows.push({
      id: c.id,
      moduleId,
      title: c.title,
      chapterNumber: c.chapterNumber,
      status,
      isLastChapter: i === chapters.length - 1,
      chapterSections: c.id === chapterId ? await chapterSectionsDto(c.id, projectId) : [],
    })
  }
  return { rows }
}

route('POST', '/compare/get-projects', async ({ body }) => {
  const rawIds: unknown[] = Array.isArray(body?.compareProjectIds) ? body.compareProjectIds : []
  const ids = rawIds.map(Number).filter((n) => Number.isInteger(n) && n > 0)
  const current = body?.currentProjectId ? await project(body.currentProjectId) : null
  const compared = (await Promise.all(ids.map((id) => project(id)))).filter(Boolean) as Row[]
  if (body?.currentProjectId && !current) return fail(404, 'Project not found')
  if (!compared.length) return fail(400, 'Please select projects to compare')
  const type = (current ?? compared[0]).projectType
  if (compared.some((c) => c.projectType !== type)) return fail(400, 'Projects of different types cannot be compared')

  // module from the query (key ratio module of the project type by default)
  const modules = await comparableModules(type)
  let moduleId = Number(body?.moduleId)
  if (!modules.some((m) => m.id === moduleId)) {
    // the original numbers commercial key ratio as module 4 and residential as 1
    moduleId = [1, 4].includes(moduleId) || !moduleId ? modules[0]?.id : moduleId
  }
  const mod = modules.find((m) => m.id === moduleId)
  if (!mod) return fail(400, 'This module cannot be compared')
  const chaptersOf = chapterCache()
  const chapters = await chaptersOf(moduleId)
  const chapterId = chapters.some((c) => c.id === Number(body?.chapterId)) ? Number(body.chapterId) : (chapters[0]?.id ?? Number(body?.chapterId))

  const isComplete = async (p: Row) => {
    if (moduleId === 1) return !!(await residentialRecord(p.id))
    if (moduleId === 101) return !!(await comRecord(p.id))
    const done = await completedChapterIds(p.id, moduleId)
    return chapters.length > 0 && chapters.every((c) => done.has(c.id))
  }
  const incomplete: Row[] = []
  for (const c of compared) if (!(await isComplete(c))) incomplete.push(c)
  if (incomplete.length) return fail(400, `${incomplete.map((c) => c.name).join(', ')} ${incomplete.length > 1 ? 'have' : 'has'} not completed ${mod.name}`)

  // shared catalogue lookups for every project DTO
  const resDefs = moduleId === 1 ? await resCalDefs() : undefined
  const comCache = moduleId === 101 ? { inputDefs: await comInputDefs(), outputDefs: await comOutputDefs() } : undefined
  const projectDto = async (p: Row) => {
    const base = { id: p.id, name: p.name, category: p.category, projectType: p.projectType }
    if (moduleId === 1) {
      const r = await residentialPayload(p, resDefs)
      return { ...base, keyRatioFields: r.keyRatioFields, keyCalFields: r.keyCalFields }
    }
    if (moduleId === 101) return { ...base, ...(await commercialPayload(p, comCache)).keyRatioData }
    return { ...base, moduleData: await moduleData(p.id, moduleId, chapterId, chapters) }
  }

  const idx = modules.findIndex((m) => m.id === moduleId)
  const nav = async (m?: ModuleRow) => (m ? { moduleId: m.id, firstChapterId: (await chaptersOf(m.id))[0]?.id ?? 1 } : null)
  const comparedProjects = []
  for (const c of compared) comparedProjects.push(await projectDto(c))
  return ok({
    currentProject: current ? await projectDto(current) : null,
    comparedProjects,
    navigation: { prevModule: await nav(modules[idx - 1]), nextModule: await nav(modules[idx + 1]) },
    module: { id: mod.id, moduleNumber: mod.moduleNumber, name: mod.name, projectType: mod.projectType },
  })
})

/* ------------------------------------------------------------------ CSV import
 * Key Ratio CSV: rows of "Parameter,Value" (header row optional). Parameter matches the field label
 * ("Building Height") or key ("building_height"). Values are saved as a draft and recalculated.
 * Registered in moduleImporters; POST /project/:p/module/:m/import (module-workspace) delegates here.
 */
function csvRows(text: string) {
  return text
    .split(/\r?\n/)
    .map((l) => l.split(',').map((c) => c.trim().replace(/^"|"$/g, '')))
    .filter((r) => r.length >= 2 && r[0])
}
const toKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')

export async function importKeyRatioCsv({ projectId, moduleId, text, user }: { projectId: number; moduleId: number; text: string; user: User }) {
  const p = await project(projectId)
  if (!p) return fail(404, 'Project not found')
  const rows = csvRows(String(text ?? ''))
  if (p.projectType === 'commercial') {
    const defs = await comInputDefs()
    const keyRatioInputs = rows
      .map(([name, value]) => ({ def: defs.find((d) => toKey(String(d.field_name)) === toKey(name)), value }))
      .filter((x) => x.def && x.value !== '')
      .map((x) => ({ field_id: x.def!.id, value: x.value }))
    if (!keyRatioInputs.length) return fail(400, 'Invalid CSV format. Expected rows of Parameter,Value')
    return saveCommercial({ projectId: p.id, keyRatioInputs }, true, user)
  }
  const keys = new Set<string>(RESIDENTIAL_INPUT_KEYS)
  const fields = Object.fromEntries(rows.map(([name, value]) => [toKey(name), value]).filter(([k, v]) => keys.has(k) && v !== ''))
  if (!Object.keys(fields).length) return fail(400, 'Invalid CSV format. Expected rows of Parameter,Value')
  return saveResidential({ project_id: p.id, module_id: moduleId, ...fields }, true, user)
}
moduleImporters.set('Key Ratio', importKeyRatioCsv)
