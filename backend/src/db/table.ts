/**
 * Table helper — the async, SQL Server-backed equivalent of the frontend mock's `db.table(name)`.
 *
 * - Column metadata is read from SQL Server once (INFORMATION_SCHEMA + check constraints), so:
 *     JSON columns (NVARCHAR(MAX) with an ISJSON check)  <-> parsed objects/arrays
 *     BIT columns                                         <-> booleans
 *     DATETIME2 columns                                   <-> ISO strings (UTC)
 *     DECIMAL columns                                     <-> numbers
 * - Optional `spill` column: keys that aren't real columns are stored in that JSON column and
 *   merged back into the row on read (used for flexible form records).
 * - Optional `scope`: fixed filter + insert values (e.g. designBriefInputs scoped to one department).
 *
 * Filters are plain objects: { projectId: 1, status: 'active', id: [1,2,3] (IN), assignedTo: null (IS NULL) }.
 */
import { query, type Params } from './pool.js'

export type Row = { id: number; [k: string]: any } // eslint-disable-line @typescript-eslint/no-explicit-any
export type Filter = Record<string, unknown>
export type ListOpts = { orderBy?: string; limit?: number; offset?: number }

type ColMeta = { name: string; type: string; json: boolean }
type TableMeta = { cols: Map<string, ColMeta> }
const metaCache = new Map<string, Promise<TableMeta>>()

async function loadMeta(table: string): Promise<TableMeta> {
  const cols = await query<{ name: string; type: string }>(
    `SELECT COLUMN_NAME AS name, DATA_TYPE AS type FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = @t`,
    { t: table },
  )
  if (!cols.length) throw new Error(`Table dbo.${table} not found — run database/02_schema.sql`)
  const checks = await query<{ col: string }>(
    `SELECT c.name AS col FROM sys.check_constraints cc
       JOIN sys.columns c ON c.object_id = cc.parent_object_id AND c.column_id = cc.parent_column_id
      WHERE cc.parent_object_id = OBJECT_ID(@t) AND cc.definition LIKE '%isjson%'`,
    { t: `dbo.${table}` },
  )
  const jsonCols = new Set(checks.map((c) => c.col))
  return { cols: new Map(cols.map((c) => [c.name, { name: c.name, type: c.type.toLowerCase(), json: jsonCols.has(c.name) }])) }
}
function meta(table: string) {
  let m = metaCache.get(table)
  if (!m) {
    m = loadMeta(table)
    m.catch(() => metaCache.delete(table))
    metaCache.set(table, m)
  }
  return m
}

const q = (name: string) => `[${name.replace(/]/g, ']]')}]`

export class Table<T extends Row = Row> {
  readonly name: string
  private spill?: string
  private scope: Filter
  constructor(name: string, opts: { spill?: string; scope?: Filter } = {}) {
    this.name = name
    this.spill = opts.spill
    this.scope = opts.scope ?? {}
  }

  /* ---------- conversion ---------- */
  private fromDb(m: TableMeta, r: Record<string, unknown>): T {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(r)) {
      const c = m.cols.get(k)
      if (!c) {
        out[k] = v
        continue
      }
      if (v === null || v === undefined) out[k] = null
      else if (c.json) {
        try {
          out[k] = JSON.parse(String(v))
        } catch {
          out[k] = v
        }
      } else if (c.type === 'bit') out[k] = Boolean(v)
      else if (v instanceof Date) out[k] = v.toISOString()
      else if (c.type === 'decimal' || c.type === 'numeric' || c.type === 'float' || c.type === 'real') out[k] = Number(v)
      else if (c.type === 'bigint') out[k] = Number(v)
      else out[k] = v
    }
    if (this.spill) {
      const extra = out[this.spill]
      delete out[this.spill]
      if (extra && typeof extra === 'object' && !Array.isArray(extra)) for (const [k, v] of Object.entries(extra)) if (!(k in out)) out[k] = v
    }
    return out as T
  }

  /** split a JS row into real column values (converted) and spill values */
  private toDb(m: TableMeta, row: Record<string, unknown>) {
    const cols: Record<string, unknown> = {}
    const extra: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(row)) {
      if (k === 'id' || k === 'createdAt' || k === 'updatedAt' || v === undefined) continue
      const c = m.cols.get(k)
      if (!c || k === this.spill) {
        if (this.spill) extra[k] = v
        continue
      }
      if (v === null) cols[k] = null
      else if (c.json) cols[k] = JSON.stringify(v)
      else if (c.type === 'bit') cols[k] = v === true || v === 1 || v === '1' || v === 'true'
      else if (c.type === 'datetime2' || c.type === 'datetime') cols[k] = v instanceof Date ? v : new Date(String(v))
      else if (c.type === 'int' || c.type === 'bigint') cols[k] = v === '' ? null : Number.isFinite(Number(v)) ? Math.trunc(Number(v)) : null
      else if (c.type === 'decimal' || c.type === 'float' || c.type === 'numeric') cols[k] = v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null
      else cols[k] = typeof v === 'object' ? JSON.stringify(v) : String(v)
    }
    return { cols, extra }
  }

  private whereClause(m: TableMeta, filter: Filter, params: Params) {
    const all = { ...filter, ...this.scope }
    const parts: string[] = []
    let i = 0
    for (const [k, v] of Object.entries(all)) {
      if (v === undefined) continue
      if (!m.cols.has(k)) throw new Error(`Unknown column ${this.name}.${k} in filter`)
      if (v === null) parts.push(`${q(k)} IS NULL`)
      else if (Array.isArray(v)) {
        if (!v.length) parts.push('1 = 0')
        else parts.push(`${q(k)} IN (${v.map((x) => ((params[`f${i}`] = x), `@f${i++}`)).join(', ')})`)
      } else {
        params[`f${i}`] = typeof v === 'boolean' ? v : v
        parts.push(`${q(k)} = @f${i++}`)
      }
    }
    return parts.length ? `WHERE ${parts.join(' AND ')}` : ''
  }

  private order(m: TableMeta, orderBy?: string) {
    if (!orderBy) return 'ORDER BY [id]'
    const terms = orderBy.split(',').map((t) => {
      const [col, dir] = t.trim().split(/\s+/)
      if (!m.cols.has(col)) throw new Error(`Unknown column ${this.name}.${col} in orderBy`)
      return `${q(col)} ${/^desc$/i.test(dir ?? '') ? 'DESC' : 'ASC'}`
    })
    return `ORDER BY ${terms.join(', ')}`
  }

  /* ---------- reads ---------- */
  /** rows matching an equality filter */
  async where(filter: Filter = {}, opts: ListOpts = {}): Promise<T[]> {
    const m = await meta(this.name)
    const params: Params = {}
    let sqlText = `SELECT * FROM dbo.${q(this.name)} ${this.whereClause(m, filter, params)} ${this.order(m, opts.orderBy)}`
    if (opts.limit !== undefined) {
      params.__off = opts.offset ?? 0
      params.__lim = opts.limit
      sqlText += ' OFFSET @__off ROWS FETCH NEXT @__lim ROWS ONLY'
    }
    return (await query(sqlText, params)).map((r) => this.fromDb(m, r))
  }
  all(opts: ListOpts = {}) {
    return this.where({}, opts)
  }
  async first(filter: Filter = {}, opts: ListOpts = {}): Promise<T | undefined> {
    return (await this.where(filter, { ...opts, limit: 1 }))[0]
  }
  async find(id: number | string): Promise<T | undefined> {
    const n = Number(id)
    if (!Number.isFinite(n)) return undefined
    return this.first({ id: n })
  }
  async count(filter: Filter = {}): Promise<number> {
    const m = await meta(this.name)
    const params: Params = {}
    const r = await query<{ n: number }>(`SELECT COUNT(*) AS n FROM dbo.${q(this.name)} ${this.whereClause(m, filter, params)}`, params)
    return r[0]?.n ?? 0
  }

  /* ---------- writes ---------- */
  async insert(row: Partial<T> & Record<string, unknown>): Promise<T> {
    const m = await meta(this.name)
    const { cols, extra } = this.toDb(m, { ...row, ...this.scope })
    if (this.spill && Object.keys(extra).length) cols[this.spill] = JSON.stringify(extra)
    const keys = Object.keys(cols)
    const params: Params = {}
    keys.forEach((k, i) => (params[`v${i}`] = cols[k]))
    const sqlText = keys.length
      ? `INSERT INTO dbo.${q(this.name)} (${keys.map(q).join(', ')}) OUTPUT INSERTED.* VALUES (${keys.map((_, i) => `@v${i}`).join(', ')})`
      : `INSERT INTO dbo.${q(this.name)} OUTPUT INSERTED.* DEFAULT VALUES`
    const [r] = await query(sqlText, params)
    return this.fromDb(m, r)
  }

  async update(id: number | string, patch: Partial<T> & Record<string, unknown>): Promise<T | undefined> {
    const m = await meta(this.name)
    const { cols, extra } = this.toDb(m, patch)
    if (this.spill && Object.keys(extra).length) {
      const current = await query<Record<string, unknown>>(`SELECT ${q(this.spill)} AS s FROM dbo.${q(this.name)} WHERE id = @id`, { id: Number(id) })
      if (!current.length) return undefined
      let merged: Record<string, unknown> = {}
      try {
        merged = current[0].s ? JSON.parse(String(current[0].s)) : {}
      } catch {
        merged = {}
      }
      cols[this.spill] = JSON.stringify({ ...merged, ...extra })
    }
    const keys = Object.keys(cols)
    const params: Params = { id: Number(id) }
    keys.forEach((k, i) => (params[`v${i}`] = cols[k]))
    const set = [...keys.map((k, i) => `${q(k)} = @v${i}`), '[updatedAt] = SYSUTCDATETIME()'].join(', ')
    const scopeParams: Params = {}
    const scopeWhere = this.whereClause(m, {}, scopeParams)
    Object.assign(params, scopeParams)
    const [r] = await query(
      `UPDATE dbo.${q(this.name)} SET ${set} OUTPUT INSERTED.* ${scopeWhere ? `${scopeWhere} AND` : 'WHERE'} id = @id`,
      params,
    )
    return r ? this.fromDb(m, r) : undefined
  }

  /** update the first row matching `filter`, or insert `row` (+ filter values) */
  async upsert(filter: Filter, row: Partial<T> & Record<string, unknown>): Promise<T> {
    const existing = await this.first(filter)
    return existing ? ((await this.update(existing.id, row)) as T) : this.insert({ ...filter, ...row } as Partial<T> & Record<string, unknown>)
  }

  async remove(id: number | string) {
    const m = await meta(this.name)
    const params: Params = { id: Number(id) }
    const w = this.whereClause(m, {}, params)
    await query(`DELETE FROM dbo.${q(this.name)} ${w ? `${w} AND` : 'WHERE'} id = @id`, params)
  }

  async removeWhere(filter: Filter) {
    const m = await meta(this.name)
    const params: Params = {}
    const w = this.whereClause(m, filter, params)
    if (!w) throw new Error(`Refusing to delete every row of ${this.name} without a filter`)
    await query(`DELETE FROM dbo.${q(this.name)} ${w}`, params)
  }
}

/** Startup check: JSON-column detection needs VIEW DEFINITION on the database. */
export async function verifySchemaAccess() {
  const m = await meta('accessRoles')
  if (!m.cols.get('permissions')?.json) {
    throw new Error('The DB login cannot read column constraints. Run: GRANT VIEW DEFINITION TO [m3m_app]; in the M3M_One database (see database/01_create_database.sql).')
  }
}

/** db.table('projects') — same entry point the mock used */
export const db = {
  table: <T extends Row = Row>(name: string, opts?: { spill?: string; scope?: Filter }) => new Table<T>(name, opts),
}
