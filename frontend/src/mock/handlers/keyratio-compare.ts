/**
 * Mock endpoints for the Key Ratio module and Compare Projects (same paths / payloads / envelope as the original API):
 *
 *   GET  /keyRatio?project_id                 -> { keyRatioFields: [flat inputs], keyCalFields: {tab: {section: [field]}}, projectOwners, calculatedFields }
 *   POST /keyRatio                            body: {...inputs, project_id, module_id, inputValues[], calculatedSectionValues[]}
 *   PUT  /keyRatio/?project_id                same body (record exists)
 *   POST /keyRatio/saveAsDraft[/?project_id]  same body, saved as draft
 *   GET  /commercial/create-key-ratio?project_id -> { keyRatioData: { inputData, outputData, owner } }
 *   POST|PUT /commercial/create-key-ratio[?project_id]   body: { projectId, keyRatioInputs[], keyOutputs[], sectionCost[] }
 *   PUT|POST /commercial/save-as-draft        same body, saved as draft
 *   POST /compare/get-projects                body: { currentProjectId, compareProjectIds[], moduleId, chapterId }
 *        -> { currentProject, comparedProjects[], navigation: { prevModule, nextModule }, module }
 *
 * Calculated values, benchmark validity (flags vs mid_end/premium/affluent ranges) and module progress are computed
 * here with the same functions the page uses, so a real backend can mirror them.
 */
import { db } from '../db'
import { audit, fail, ok, route } from '../router'
import { RESIDENTIAL_COST_DEFAULTS, RESIDENTIAL_INPUT_KEYS } from '../seed/keyratio-compare'
import { ensureModuleWorkspaceCatalogue, moduleImporters } from './module-workspace'
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

type Row = { id: number; [k: string]: any } // eslint-disable-line @typescript-eslint/no-explicit-any
type Obj = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

const project = (id: unknown) => db.table<Row>('projects').find(Number(id))
const catKey = (category?: string) => String(category ?? '').replace('-', '_')
const owners = (p: Row) => ({ design_owner: p.designOwner ?? null, structure_owner: p.structureOwner ?? null, mep_owner: p.mepOwner ?? null })
const TAB_ORDER = ['Design', 'Structure', 'MEP']

/* ------------------------------------------------------------------ residential */

function residentialRecord(projectId: number) {
  return db.table<Row>('keyRatios').first((k) => k.projectId === projectId)
}

/** keyRatioFields[0]: every input column (null when never entered) + the record id when saved. */
function residentialForm(projectId: number): KeyRatioForm {
  const rec = residentialRecord(projectId)
  const base: KeyRatioForm = Object.fromEntries(RESIDENTIAL_INPUT_KEYS.map((k) => [k, null]))
  if (!rec) return { ...base, ...RESIDENTIAL_COST_DEFAULTS }
  return { id: rec.id, project_id: projectId, module_id: rec.moduleId, ...base, ...RESIDENTIAL_COST_DEFAULTS, ...rec.fields, createdAt: rec.createdAt, updatedAt: rec.updatedAt }
}

function residentialCalFields(projectId: number, form: KeyRatioForm) {
  const rec = residentialRecord(projectId)
  const out: Record<string, Record<string, ResCalField[]>> = {}
  const defs = db.table<Row>('keyRatioCalFields').all().slice().sort((a, b) => a.order_id - b.order_id)
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
        })
      }),
  )
  return out
}

function residentialPayload(projectId: number) {
  const p = project(projectId)!
  const form = residentialForm(projectId)
  return {
    keyRatioFields: [form],
    keyCalFields: residentialCalFields(projectId, form),
    projectOwners: owners(p),
    calculatedFields: residentialRecord(projectId)?.sectionCosts ?? [],
  }
}

/** Module progress counters derived from the benchmark checks (shown on the modules grid). */
function updateProgress(projectId: number, moduleId: number, total: number, deviations: number, flags: number, completed: boolean) {
  const patch = {
    allParams: total,
    benchmarkParams: total - deviations,
    deviations,
    flags,
    complianceScore: total ? Math.round(((total - deviations) / total) * 100) : 0,
    moduleStatus: completed ? 100 : 50,
    status: completed ? 'completed' : 'active',
  }
  const pm = db.table<Row>('projectModules').first((m) => m.projectId === projectId && m.moduleId === moduleId)
  if (pm) db.table('projectModules').update(pm.id, patch)
  else db.table('projectModules').insert({ projectId, moduleId, completedChapters: 0, data: null, ...patch })
}

function saveResidential(body: Row, isDraft: boolean, user: Parameters<typeof audit>[0]) {
  const projectId = Number(body?.project_id)
  const p = project(projectId)
  if (!p) return fail(404, 'Project not found')
  const moduleId = Number(body.module_id) || 1
  const fields = Object.fromEntries(
    Object.entries(body)
      .filter(([k]) => ![...['id', 'project_id', 'module_id', 'inputValues', 'calculatedSectionValues', 'createdAt', 'updatedAt']].includes(k))
      .map(([k, v]) => [k, v === '' || v == null ? null : Number.isFinite(Number(v)) ? Number(v) : v]),
  )
  const outputs: Record<number, Obj> = {}
  ;(body.inputValues ?? []).forEach((v: Row) => {
    outputs[Number(v.field_id)] = { is_flag: v.flag ? 1 : 0, remark: v.remark ?? '', calculated_cost: v.calculated_cost ?? null, field_value: v.field_value }
  })
  const existing = residentialRecord(projectId)
  const data = { projectId, moduleId, fields: { ...(existing?.fields ?? {}), ...fields }, outputs, sectionCosts: body.calculatedSectionValues ?? [], isDraft }
  const rec = existing ? db.table<Row>('keyRatios').update(existing.id, data)! : db.table<Row>('keyRatios').insert(data)

  // server-side benchmark check of every ratio
  const form = residentialForm(projectId)
  const category = catKey(p.category)
  let deviations = 0
  let flags = 0
  const defs = db.table<Row>('keyRatioCalFields').all()
  defs.forEach((d) => {
    const f = d as unknown as ResCalField
    const value = residentialValue(f, form)
    const range = heightRange(d.id, category, form.building_height) ?? d[category]
    const v = checkValidity(value, range, d.id, residentialDynamicRange(f, category), false, form.building_height as number)
    if (v.value === 'false') deviations++
    if (outputs[d.id]?.is_flag) flags++
  })
  updateProgress(projectId, moduleId, defs.length, deviations, flags, !isDraft)
  audit(user, isDraft ? 'Key Ratio Draft Saved' : 'Key Ratio Saved', `${user?.name ?? 'User'} saved the Key Ratio module of "${p.name}".`, projectId)
  return ok({ id: rec.id, project_id: projectId, module_id: moduleId, ...rec.fields }, isDraft ? 'Project saved as draft' : 'KeyRatio Module created')
}

route('GET', '/keyRatio', ({ query }) => {
  const p = project(query.project_id)
  if (!p) return fail(404, 'Project not found')
  return ok(residentialPayload(p.id))
})
route('POST', '/keyRatio', ({ body, user }) => saveResidential(body, false, user))
route('PUT', '/keyRatio', ({ body, query, user }) => saveResidential({ ...body, project_id: body?.project_id ?? query.project_id }, false, user))
route('POST', '/keyRatio/saveAsDraft', ({ body, query, user }) => saveResidential({ ...body, project_id: body?.project_id ?? query.project_id }, true, user))

/* ------------------------------------------------------------------ commercial */

const comRecord = (projectId: number) => db.table<Row>('comKeyRatios').first((k) => k.projectId === projectId)

function comInputsList(projectId: number) {
  const rec = comRecord(projectId)
  return db
    .table<Row>('comKeyRatioInputs')
    .all()
    .map((d) => ({ field_id: d.id as number, value: rec?.inputs?.[d.id] ?? null }))
}

function commercialPayload(projectId: number) {
  const p = project(projectId)!
  const rec = comRecord(projectId)
  const inputs = comInputsList(projectId)
  const inputData: Obj = {}
  db.table<Row>('comKeyRatioInputs')
    .all()
    .slice()
    .sort((a, b) => a.order - b.order)
    .forEach((d) =>
      ((inputData[d.tab] ??= {})[d.section] ??= []).push({
        field_id: d.id,
        field_name: d.field_name,
        units: d.units,
        is_visible: d.is_visible,
        value: rec?.inputs?.[d.id] ?? null,
      }),
    )
  const outputData: Obj = {}
  db.table<Row>('comKeyRatioOutputs')
    .all()
    .slice()
    .sort((a, b) => a.order - b.order)
    .forEach((d) => {
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

function saveCommercial(body: Row, isDraft: boolean, user: Parameters<typeof audit>[0]) {
  const projectId = Number(body?.projectId)
  const p = project(projectId)
  if (!p) return fail(404, 'Project not found')
  const existing = comRecord(projectId)
  const inputs: Record<number, unknown> = { ...(existing?.inputs ?? {}) }
  ;(body.keyRatioInputs ?? []).forEach((i: Row) => (inputs[Number(i.field_id)] = i.value === '' || i.value == null ? null : Number(i.value)))
  const outputs: Record<number, Obj> = {}
  ;(body.keyOutputs ?? []).forEach((o: Row) => (outputs[Number(o.field_id)] = { is_flag: !!o.is_flag, remark: o.remark ?? '', calculated_cost: o.calculated_cost ?? null }))
  const data = { projectId, moduleId: 101, inputs, outputs, sectionCost: body.sectionCost ?? [], isDraft }
  const rec = existing ? db.table<Row>('comKeyRatios').update(existing.id, data)! : db.table<Row>('comKeyRatios').insert(data)

  // server-side benchmark check
  const category = String(p.category)
  const list = comInputsList(projectId)
  const defs = db.table<Row>('comKeyRatioOutputs').all()
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
  updateProgress(projectId, 101, defs.length, deviations, flags, !isDraft)
  audit(user, isDraft ? 'Key Ratio Draft Saved' : 'Key Ratio Saved', `${user?.name ?? 'User'} saved the Commercial Key Ratio module of "${p.name}".`, projectId)
  return ok({ id: rec.id }, isDraft ? 'Project saved as draft' : 'KeyRatio Module created')
}

route('GET', '/commercial/create-key-ratio', ({ query }) => {
  const p = project(query.project_id)
  if (!p) return fail(404, 'Project not found')
  return ok(commercialPayload(p.id))
})
route('POST', '/commercial/create-key-ratio', ({ body, user }) => saveCommercial(body, false, user))
route('PUT', '/commercial/create-key-ratio', ({ body, query, user }) => saveCommercial({ ...body, projectId: body?.projectId ?? query.project_id }, false, user))
route('PUT', '/commercial/save-as-draft', ({ body, query, user }) => saveCommercial({ ...body, projectId: body?.projectId ?? query.project_id }, true, user))
route('POST', '/commercial/save-as-draft', ({ body, query, user }) => saveCommercial({ ...body, projectId: body?.projectId ?? query.project_id }, true, user))

/* ------------------------------------------------------------------ compare */

const KEY_RATIO_MODULES = new Set([1, 101])

/** Modules that can be compared, per project type, in order (key ratio + design chapter modules). */
function comparableModules(projectType: string) {
  return db
    .table<Row>('modules')
    .where((m) => m.projectType === projectType)
    .filter((m) => KEY_RATIO_MODULES.has(m.id) || db.table('chapters').first((c) => c.moduleId === m.id))
    .sort((a, b) => a.moduleNumber - b.moduleNumber)
}

const chaptersOf = (moduleId: number) => db.table<Row>('chapters').where((c) => c.moduleId === moduleId).sort((a, b) => a.chapterNumber - b.chapterNumber)
const completedChapterIds = (projectId: number, moduleId: number) =>
  new Set(db.table<Row>('projectChapters').where((c) => c.projectId === projectId && c.moduleId === moduleId && c.status === 'completed').map((c) => c.chapterId))

function chapterSectionsDto(chapterId: number, projectId: number) {
  const values = db.table<Row>('chapterFieldValues').where((v) => v.projectId === projectId && v.chapterId === chapterId)
  return db
    .table<Row>('chapterSections')
    .where((s) => s.chapterId === chapterId)
    .sort((a, b) => (a.order ?? a.id) - (b.order ?? b.id))
    .map((s) => ({
      id: s.id,
      chapterId,
      title: s.title,
      sectionFields: db
        .table<Row>('sectionFields')
        .where((f) => f.sectionId === s.id)
        .sort((a, b) => (a.order ?? a.id) - (b.order ?? b.id))
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
          sectionFieldOptions: (f.options ?? []).map((o: string, i: number) => ({ id: f.id * 100 + i, sectionFieldId: f.id, fieldOption: o })),
          fieldValue: values.find((v) => v.sectionFieldId === f.id)?.answer ?? null,
        })),
    }))
}

function moduleData(projectId: number, moduleId: number, chapterId: number) {
  const chapters = chaptersOf(moduleId)
  const done = completedChapterIds(projectId, moduleId)
  let activeGiven = false
  return {
    rows: chapters.map((c, i) => {
      let status = 'pending'
      if (done.has(c.id)) status = 'completed'
      else if (!activeGiven) {
        activeGiven = true
        status = 'active'
      }
      return {
        id: c.id,
        moduleId,
        title: c.title,
        chapterNumber: c.chapterNumber,
        status,
        isLastChapter: i === chapters.length - 1,
        chapterSections: c.id === chapterId ? chapterSectionsDto(c.id, projectId) : [],
      }
    }),
  }
}

function projectDto(p: Row, moduleId: number, chapterId: number) {
  const base = { id: p.id, name: p.name, category: p.category, projectType: p.projectType }
  if (moduleId === 1) {
    const r = residentialPayload(p.id)
    return { ...base, keyRatioFields: r.keyRatioFields, keyCalFields: r.keyCalFields }
  }
  if (moduleId === 101) return { ...base, ...commercialPayload(p.id).keyRatioData }
  return { ...base, moduleData: moduleData(p.id, moduleId, chapterId) }
}

function isComplete(p: Row, moduleId: number) {
  if (moduleId === 1) return !!residentialRecord(p.id)
  if (moduleId === 101) return !!comRecord(p.id)
  const chapters = chaptersOf(moduleId)
  const done = completedChapterIds(p.id, moduleId)
  return chapters.length > 0 && chapters.every((c) => done.has(c.id))
}

route('POST', '/compare/get-projects', ({ body }) => {
  ensureModuleWorkspaceCatalogue()
  const ids: number[] = (body?.compareProjectIds ?? []).map(Number).filter(Boolean)
  const current = body?.currentProjectId ? project(body.currentProjectId) : null
  const compared = ids.map(project).filter(Boolean) as Row[]
  if (body?.currentProjectId && !current) return fail(404, 'Project not found')
  if (!compared.length) return fail(400, 'Please select projects to compare')
  const type = (current ?? compared[0]).projectType
  if (compared.some((c) => c.projectType !== type)) return fail(400, 'Projects of different types cannot be compared')

  // module from the query (key ratio module of the project type by default)
  const modules = comparableModules(type)
  let moduleId = Number(body?.moduleId)
  if (!modules.some((m) => m.id === moduleId)) {
    // the original numbers commercial key ratio as module 4 and residential as 1
    moduleId = [1, 4].includes(moduleId) || !moduleId ? modules[0]?.id : moduleId
  }
  const mod = modules.find((m) => m.id === moduleId)
  if (!mod) return fail(400, 'This module cannot be compared')
  const chapters = chaptersOf(moduleId)
  const chapterId = chapters.some((c) => c.id === Number(body?.chapterId)) ? Number(body.chapterId) : (chapters[0]?.id ?? Number(body?.chapterId))

  const incomplete = compared.filter((c) => !isComplete(c, moduleId))
  if (incomplete.length) return fail(400, `${incomplete.map((c) => c.name).join(', ')} ${incomplete.length > 1 ? 'have' : 'has'} not completed ${mod.name}`)

  const idx = modules.findIndex((m) => m.id === moduleId)
  const nav = (m?: Row) => (m ? { moduleId: m.id, firstChapterId: chaptersOf(m.id)[0]?.id ?? 1 } : null)
  return ok({
    currentProject: current ? projectDto(current, moduleId, chapterId) : null,
    comparedProjects: compared.map((c) => projectDto(c, moduleId, chapterId)),
    navigation: { prevModule: nav(modules[idx - 1]), nextModule: nav(modules[idx + 1]) },
    module: { id: mod.id, moduleNumber: mod.moduleNumber, name: mod.name, projectType: mod.projectType },
  })
})

/* ------------------------------------------------------------------ CSV import
 * Key Ratio CSV: rows of "Parameter,Value" (header row optional). Parameter matches the field label
 * ("Building Height") or key ("building_height"). Values are saved as a draft and recalculated.
 */
function csvRows(text: string) {
  return text
    .split(/\r?\n/)
    .map((l) => l.split(',').map((c) => c.trim().replace(/^"|"$/g, '')))
    .filter((r) => r.length >= 2 && r[0])
}
const toKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')

function importKeyRatioCsv({ projectId, moduleId, text, user }: { projectId: number; moduleId: number; text: string; user: Parameters<typeof audit>[0] }) {
  const p = project(projectId)
  if (!p) return fail(404, 'Project not found')
  const rows = csvRows(text)
  if (p.projectType === 'commercial') {
    const defs = db.table<Row>('comKeyRatioInputs').all()
    const keyRatioInputs = rows
      .map(([name, value]) => ({ def: defs.find((d) => toKey(String(d.field_name)) === toKey(name)), value }))
      .filter((x) => x.def && x.value !== '')
      .map((x) => ({ field_id: x.def!.id, value: x.value }))
    if (!keyRatioInputs.length) return fail(400, 'Invalid CSV format. Expected rows of Parameter,Value')
    return saveCommercial({ projectId, keyRatioInputs } as unknown as Row, true, user)
  }
  const keys = new Set<string>(RESIDENTIAL_INPUT_KEYS as readonly string[])
  const fields = Object.fromEntries(rows.map(([name, value]) => [toKey(name), value]).filter(([k, v]) => keys.has(k) && v !== ''))
  if (!Object.keys(fields).length) return fail(400, 'Invalid CSV format. Expected rows of Parameter,Value')
  return saveResidential({ project_id: projectId, module_id: moduleId, ...fields } as unknown as Row, true, user)
}
moduleImporters.set('Key Ratio', importKeyRatioCsv)
