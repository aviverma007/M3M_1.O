/*
 * Field-level change history ("who changed what, from what, to what").
 *
 * Every write through the table helper (db/table.ts) on a tracked table is diffed here: the row before and after
 * are flattened to leaf fields ("Project Level Design › Key Ratio Inputs › Saleable Area") and each changed leaf is
 * stored in dbo.fieldChanges with its old and new value, the user and the time. Chapter answers (written with a raw
 * MERGE) are recorded by module-workspace.ts with recordFieldChanges().
 *
 * Never throws: if dbo.fieldChanges is missing and can't be created, saves still work and a warning is logged
 * (run database/09_field_changes.sql).
 */
import { AsyncLocalStorage } from 'node:async_hooks'
import { query } from '../db/pool.js'

/* ---------------------------------------------------------------- who is making the change */
type Actor = { id: number; name: string } | null
const ctx = new AsyncLocalStorage<{ user: Actor }>()
/** run a request handler with its user available to the change log */
export const withActor = <T>(user: Actor, fn: () => T) => ctx.run({ user: user ? { id: user.id, name: user.name } : null }, fn)
const actor = (): Actor => ctx.getStore()?.user ?? null

/* ---------------------------------------------------------------- table */
let ready: Promise<boolean> | null = null
let retryAt = 0
function ensureTable() {
  if (ready && Date.now() < retryAt) return ready
  if (ready && retryAt === 0) return ready
  ready = query(
    `IF OBJECT_ID(N'dbo.fieldChanges') IS NULL
     BEGIN
       CREATE TABLE dbo.fieldChanges (
         id         BIGINT IDENTITY(1,1) PRIMARY KEY,
         projectId  INT            NULL,
         entity     NVARCHAR(64)   NOT NULL,
         entityId   INT            NULL,
         module     NVARCHAR(100)  NOT NULL,
         path       NVARCHAR(400)  NOT NULL,
         label      NVARCHAR(600)  NOT NULL,
         oldValue   NVARCHAR(MAX)  NULL,
         newValue   NVARCHAR(MAX)  NULL,
         action     NVARCHAR(10)   NOT NULL,
         userId     INT            NULL,
         userName   NVARCHAR(200)  NULL,
         createdAt  DATETIME2      NOT NULL CONSTRAINT DF_fieldChanges_created DEFAULT SYSUTCDATETIME()
       );
       CREATE INDEX IX_fieldChanges_project ON dbo.fieldChanges(projectId, createdAt DESC);
       CREATE INDEX IX_fieldChanges_created ON dbo.fieldChanges(createdAt DESC);
     END`,
  )
    .then(() => {
      retryAt = 0
      return true
    })
    .catch((e) => {
      console.error('[changes] dbo.fieldChanges missing and could not be created — run database/09_field_changes.sql.', e?.message ?? e)
      retryAt = Date.now() + 5 * 60_000 // try again in 5 minutes (e.g. after the script was run)
      return false
    })
  return ready
}
export const changesReady = () => ensureTable()

/* ---------------------------------------------------------------- what is tracked */
/** table -> how to name its changes. Tables not listed (logs, notifications, sessions, uploads…) aren't tracked. */
const SUMMARY_MODULES: Record<string, string> = {
  projectDetailsLayoutData: 'Project Details',
  unitLevelDesignData: 'Unit Level Design',
  projectLevelDesignData: 'Project Level Design',
  idSpecificationsData: 'ID Specifications',
  commonAreaData: 'Common Area',
  landscapeAmenitiesData: 'Landscape & Amenities',
  serviceDesignData: 'Service Design',
  facadeData: 'Façade & Envelope',
  contractingStrategyData: 'Contracting Strategy',
  consultantStrategyData: 'Consultant Strategy',
  phasingPlanData: 'Phasing Plan',
  projectScheduleData: 'Project Schedule',
  approvalsData: 'Approvals',
  additionalProjectDetailsData: 'Additional Details',
}
const DEPT_MODULES: Record<string, string> = {
  liaison: 'Liaison',
  'business-development': 'Business Development',
  land: 'Land',
  structure: 'Structure',
  mep: 'MEP',
  anarock: 'Anarock',
}
const ALWAYS_SKIP = new Set(['id', 'createdAt', 'updatedAt', 'projectId', 'userId'])
type Spec = { skip?: string[]; module: (top: string, row: Record<string, unknown>) => string; label?: string }
export const TRACKED: Record<string, Spec> = {
  projects: { module: () => 'Project Info', skip: ['status'] },
  designBriefSummaries: { module: (top) => SUMMARY_MODULES[top] ?? 'Design Brief' },
  designBriefInputs: { module: (_t, row) => DEPT_MODULES[String(row.department ?? '')] ?? 'Design Brief Inputs', skip: ['department'] },
  keyRatios: { module: () => 'Key Ratio', skip: ['moduleId'] },
  comKeyRatios: { module: () => 'Commercial Key Ratio', skip: ['moduleId'] },
  // progress counters are recomputed on every save; only the stored module data is a user change
  projectModules: { module: () => 'Module Data', skip: ['moduleId', 'allParams', 'deviations', 'benchmarkParams', 'flags', 'complianceScore', 'moduleStatus', 'completedChapters', 'status'] },
  users: { module: () => 'Users', skip: ['passwordHash', 'failedAttempts', 'lockUntil'] },
  accessRoles: { module: () => 'Roles & Access' },
  benchmarks: { module: () => 'Benchmarks' },
  dropdownOptions: { module: () => 'Dropdown Options' },
  keyRatioCalFields: { module: () => 'Key Ratio Setup' },
  comparisonSets: { module: () => 'Saved Comparisons' },
  /** helper entry for chapter answers (module-workspace.ts names them itself) */
  chapterAnswers: { module: () => 'Chapter' },
}
export const isTracked = (table: string) => table in TRACKED

/* ---------------------------------------------------------------- flattening & labels */
const humanize = (k: string) =>
  k
    .replace(/Data$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (c) => c.toUpperCase())

/** what to call an array element: its name / type / label …, else #n */
const NAME_KEYS = ['name', 'unitName', 'unitType', 'type', 'label', 'title', 'element', 'parameter', 'description', 'task', 'packageName', 'tower', 'phase', 'category', 'fieldName', 'key']
function itemName(v: unknown, i: number) {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const o = v as Record<string, unknown>
    for (const k of NAME_KEYS) {
      const s = o[k]
      if ((typeof s === 'string' && s.trim()) || typeof s === 'number') return String(s).trim().slice(0, 60)
    }
  }
  return `#${i + 1}`
}

const MAX_VALUE = 4000
function show(v: unknown): string | null {
  if (v === null || v === undefined) return null
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  if (typeof v === 'string') return v.trim() === '' ? null : v.slice(0, MAX_VALUE)
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : null
  return JSON.stringify(v).slice(0, MAX_VALUE)
}

type Leaf = { label: string; value: string }
const join = (a: string, b: string) => (a ? `${a} › ${b}` : b)
const isPlainObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)

function flatten(v: unknown, path: string, label: string, out: Map<string, Leaf>, depth = 0) {
  if (depth > 12) return
  if (Array.isArray(v)) {
    // list of plain values (amenities, options): one field
    if (v.every((x) => x === null || typeof x !== 'object')) {
      const s = v.filter((x) => show(x) !== null).map((x) => show(x)).join(', ')
      if (s) out.set(path, { label, value: s.slice(0, MAX_VALUE) })
      return
    }
    v.forEach((x, i) => flatten(x, `${path}[${i}]`, join(label, itemName(x, i)), out, depth + 1))
    return
  }
  if (isPlainObject(v)) {
    for (const [k, x] of Object.entries(v)) flatten(x, path ? `${path}.${k}` : k, join(label, humanize(k)), out, depth + 1)
    return
  }
  const s = show(v instanceof Date ? v.toISOString() : v)
  if (s !== null) out.set(path, { label, value: s })
}

/** numbers that only differ in formatting ("3450" vs 3450, "12.50" vs 12.5) are not a change */
const same = (a: string | undefined, b: string | undefined) => {
  if (a === b) return true
  if (a === undefined || b === undefined) return false
  const na = Number(a.replace(/,/g, ''))
  const nb = Number(b.replace(/,/g, ''))
  return a.trim() !== '' && b.trim() !== '' && Number.isFinite(na) && Number.isFinite(nb) && na === nb
}

export type Change = { projectId: number | null; entity: string; entityId: number | null; module: string; path: string; label: string; oldValue: string | null; newValue: string | null; action: 'create' | 'update' | 'delete' }

/** changed leaves between two versions of a row of `table` */
export function diffRows(table: string, before: Record<string, unknown> | null, after: Record<string, unknown> | null): Change[] {
  const spec = TRACKED[table]
  if (!spec) return []
  const row = (after ?? before ?? {}) as Record<string, unknown>
  const skip = new Set([...ALWAYS_SKIP, ...(spec.skip ?? [])])
  const projectId = table === 'projects' ? Number(row.id) || null : Number(row.projectId) || null
  const entityId = Number(row.id) || null
  const tops = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})].filter((k) => !skip.has(k)))
  const out: Change[] = []
  for (const top of tops) {
    const module = spec.module(top, row)
    // inside a module's own data block, start the label below the block name
    const base = module !== 'Design Brief' && SUMMARY_MODULES[top] ? '' : humanize(top)
    const a = new Map<string, Leaf>()
    const b = new Map<string, Leaf>()
    flatten(before?.[top], top, base, a)
    flatten(after?.[top], top, base, b)
    for (const path of new Set([...a.keys(), ...b.keys()])) {
      const o = a.get(path)
      const n = b.get(path)
      if (same(o?.value, n?.value)) continue
      out.push({
        projectId,
        entity: table,
        entityId,
        module,
        path,
        label: (n ?? o)!.label || humanize(top),
        oldValue: o?.value ?? null,
        newValue: n?.value ?? null,
        action: !before ? 'create' : !after ? 'delete' : 'update',
      })
    }
  }
  return out
}

/* ---------------------------------------------------------------- storing */
const MAX_PER_WRITE = 1500
export async function recordFieldChanges(changes: Change[]) {
  if (!changes.length) return
  try {
    if (!(await ensureTable())) return
    const who = actor()
    let list = changes
    if (list.length > MAX_PER_WRITE) {
      const extra = list.length - MAX_PER_WRITE
      list = [...list.slice(0, MAX_PER_WRITE), { ...list[0], path: '…', label: `…and ${extra} more fields in the same save`, oldValue: null, newValue: null }]
    }
    const rows = list.map((c) => ({ ...c, label: c.label.slice(0, 600), path: c.path.slice(0, 400), module: c.module.slice(0, 100), userId: who?.id ?? null, userName: who?.name ?? 'System' }))
    // OPENJSON insert in chunks (one round trip per 500 fields)
    for (let i = 0; i < rows.length; i += 500)
      await query(
        `INSERT INTO dbo.fieldChanges (projectId, entity, entityId, module, path, label, oldValue, newValue, action, userId, userName)
         SELECT projectId, entity, entityId, module, path, label, oldValue, newValue, action, userId, userName
           FROM OPENJSON(@rows) WITH (projectId INT, entity NVARCHAR(64), entityId INT, module NVARCHAR(100), path NVARCHAR(400), label NVARCHAR(600),
                                       oldValue NVARCHAR(MAX), newValue NVARCHAR(MAX), action NVARCHAR(10), userId INT, userName NVARCHAR(200))`,
        { rows: JSON.stringify(rows.slice(i, i + 500)) },
      )
  } catch (e) {
    console.error('[changes] could not record field changes', (e as Error)?.message ?? e)
  }
}

export const trackRowChange = (table: string, before: Record<string, unknown> | null, after: Record<string, unknown> | null) => recordFieldChanges(diffRows(table, before, after))
