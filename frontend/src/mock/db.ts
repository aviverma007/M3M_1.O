/**
 * Tiny in-browser database used while the SQL Server backend doesn't exist.
 * Tables are arrays of rows with numeric `id`, persisted to localStorage.
 *
 * Shape of each table mirrors what the real backend should store, so the
 * schema can be lifted into SQL Server later (see /docs or README).
 */

const STORAGE_KEY = 'm3m.mockdb'
/** bump to force everyone's browser to reseed after seed data changes */
export const DB_VERSION = 2

type Row = { id: number; [k: string]: unknown }
type Store = { version: number; tables: Record<string, Row[]>; seq: Record<string, number> }

let store: Store | null = null
const seeders: Array<(db: Db) => void> = []

function load(): Store | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Store
    return parsed.version === DB_VERSION ? parsed : null
  } catch {
    return null
  }
}

/* Writes are coalesced into one localStorage write per task (microtask), so a save is on disk
 * before any navigation/reload can happen. */
let writeQueued = false
function flush() {
  writeQueued = false
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    /* quota / private mode: keep in memory */
  }
}
function persist() {
  if (writeQueued) return
  writeQueued = true
  queueMicrotask(flush)
}

export class Table<T extends Row = Row> {
  private name: string
  constructor(name: string) {
    this.name = name
  }
  private get rows(): T[] {
    const s = getStore()
    return (s.tables[this.name] ??= []) as T[]
  }
  all(): T[] {
    return this.rows
  }
  find(id: number | string): T | undefined {
    return this.rows.find((r) => r.id === Number(id))
  }
  where(pred: (r: T) => boolean): T[] {
    return this.rows.filter(pred)
  }
  first(pred: (r: T) => boolean): T | undefined {
    return this.rows.find(pred)
  }
  insert(row: Omit<T, 'id'> & { id?: number }): T {
    const s = getStore()
    const id = row.id ?? (s.seq[this.name] = (s.seq[this.name] ?? 0) + 1)
    if (row.id && row.id > (s.seq[this.name] ?? 0)) s.seq[this.name] = row.id
    const now = new Date().toISOString()
    const full = { createdAt: now, updatedAt: now, ...row, id } as unknown as T
    this.rows.push(full)
    persist()
    return full
  }
  update(id: number | string, patch: Partial<T>): T | undefined {
    const r = this.find(id)
    if (!r) return undefined
    Object.assign(r, patch, { updatedAt: new Date().toISOString() })
    persist()
    return r
  }
  upsert(pred: (r: T) => boolean, row: Omit<T, 'id'>): T {
    const existing = this.first(pred)
    return existing ? (this.update(existing.id, row as Partial<T>) as T) : this.insert(row)
  }
  remove(id: number | string) {
    const i = this.rows.findIndex((r) => r.id === Number(id))
    if (i >= 0) {
      this.rows.splice(i, 1)
      persist()
    }
  }
  removeWhere(pred: (r: T) => boolean) {
    const s = getStore()
    s.tables[this.name] = this.rows.filter((r) => !pred(r))
    persist()
  }
}

export type Db = { table: <T extends Row = Row>(name: string) => Table<T> }
export const db: Db = { table: (name) => new Table(name) }

/** Register a seeding function (called once on a fresh database). */
export function registerSeed(fn: (db: Db) => void) {
  seeders.push(fn)
}

function getStore(): Store {
  if (store) return store
  store = load()
  if (!store) {
    store = { version: DB_VERSION, tables: {}, seq: {} }
    for (const seed of seeders) seed(db)
    persist()
  }
  return store
}

/** Wipe local mock data and reseed (exposed on window for convenience). */
export function resetMockDb() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
  store = null
  getStore()
}

export function initDb() {
  getStore()
}
