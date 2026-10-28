import sql from 'mssql'
import { config } from '../config.js'

const c = config.db

export const pool = new sql.ConnectionPool({
  server: c.server,
  port: c.instance ? undefined : c.port,
  database: c.database,
  user: c.user,
  password: c.password,
  options: {
    encrypt: c.encrypt,
    trustServerCertificate: c.trustServerCertificate,
    instanceName: c.instance || undefined,
    useUTC: true,
  },
  pool: { max: 20, min: 0, idleTimeoutMillis: 30_000 },
})

let connecting: Promise<sql.ConnectionPool> | null = null
export function connect() {
  if (!connecting) connecting = pool.connect()
  return connecting
}

export type Params = Record<string, unknown>

/** bind a JS value with a sensible SQL type */
function bind(req: sql.Request, name: string, v: unknown) {
  if (v === null || v === undefined) return req.input(name, sql.NVarChar(sql.MAX), null)
  if (typeof v === 'boolean') return req.input(name, sql.Bit, v)
  if (typeof v === 'number') return Number.isInteger(v) && Math.abs(v) < 2 ** 31 ? req.input(name, sql.Int, v) : req.input(name, sql.Float, v)
  if (typeof v === 'bigint') return req.input(name, sql.BigInt, v)
  if (v instanceof Date) return req.input(name, sql.DateTime2, v)
  return req.input(name, sql.NVarChar(sql.MAX), String(v))
}

/** Run a parameterised query. Use @name placeholders: query('SELECT * FROM users WHERE id = @id', { id }) */
export async function query<T = Record<string, unknown>>(text: string, params: Params = {}): Promise<T[]> {
  const p = await connect()
  const req = p.request()
  for (const [k, v] of Object.entries(params)) bind(req, k, v)
  const res = await req.query(text)
  return (res.recordset ?? []) as T[]
}

export { sql }
