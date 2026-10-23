import type { Method, RequestOptions } from '@/api/http'
import { db } from './db'

export type MockUser = { id: number; name: string; email: string; role: string; department: string | null; status: string; [k: string]: unknown }

export type MockCtx = {
  params: Record<string, string>
  query: Record<string, string>
  body: any // eslint-disable-line @typescript-eslint/no-explicit-any
  user: MockUser | null
  method: Method
  url: string
}

export type MockResult = { status: number; body: unknown }
type Handler = (ctx: MockCtx) => MockResult | unknown

type Route = { method: Method; regex: RegExp; keys: string[]; handler: Handler; auth: boolean; pattern: string }
const routes: Route[] = []

/** Register a mock endpoint. Pattern like '/project/:id/module'. Return either a MockResult or plain data (wrapped as success). */
export function route(method: Method, pattern: string, handler: Handler, opts: { auth?: boolean } = {}) {
  const keys: string[] = []
  const regex = new RegExp(
    '^' +
      pattern
        .replace(/\/$/, '')
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/:(\w+)/g, (_, k) => {
          keys.push(k)
          return '([^/]+)'
        }) +
      '/?$',
  )
  routes.push({ method, regex, keys, handler, auth: opts.auth ?? true, pattern })
}

/* -------- response helpers (same envelope as the original API) -------- */
export const ok = (data: unknown, message = 'Success'): MockResult => ({ status: 200, body: { success: true, status: 'success', message, data } })
export const created = (data: unknown, message = 'Created successfully'): MockResult => ({ status: 201, body: { success: true, status: 'success', message, data } })
export const fail = (status: number, message: string, errorCode = 'ERROR', data: unknown = null): MockResult => ({
  status,
  body: { success: false, status: 'Failed', statusCode: status, errorCode, message, data },
})

export function paginate<T>(rows: T[], page = 1, limit = 10) {
  const p = Math.max(1, Number(page) || 1)
  const l = Math.max(1, Number(limit) || 10)
  return {
    count: rows.length,
    totalPages: Math.max(1, Math.ceil(rows.length / l)),
    currentPage: p,
    rows: rows.slice((p - 1) * l, p * l),
  }
}

/* -------- session -------- */
/** Mock tokens are unsigned JWT-shaped strings so JWT-aware clients can read `exp`. */
export function makeToken(userId: number) {
  const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
  return `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ id: userId, exp: Math.floor(Date.now() / 1000) + 12 * 3600 })}.mock`
}

export function userFromToken(token: string | null | undefined): MockUser | null {
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    if (!payload?.id || (payload.exp && payload.exp * 1000 < Date.now())) return null
    return (db.table('users').find(payload.id) as MockUser | undefined) ?? null
  } catch {
    return null
  }
}

/** Record an audit-log entry, like the real backend does on each action. */
export function audit(user: MockUser | null, taskType: string, description: string, projectId: number | null = null) {
  db.table('auditLogs').insert({ userId: user?.id ?? 0, projectId, taskType, description, creatorName: user?.name ?? 'System' })
}

function stripQuery(url: string) {
  const [path, qs] = url.split('?')
  const query: Record<string, string> = {}
  if (qs) new URLSearchParams(qs).forEach((v, k) => (query[k] = v))
  return { path: (path.startsWith('/') ? path : `/${path}`).replace(/\/+$/, '') || '/', query }
}

export async function dispatch(method: Method, url: string, opts: RequestOptions, token: string | null): Promise<MockResult> {
  const { path, query } = stripQuery(url)
  for (const [k, v] of Object.entries(opts.params ?? {})) if (v !== undefined && v !== null) query[k] = String(v)

  const r = routes.find((x) => x.method === method && x.regex.test(path))
  if (!r) return fail(404, `Mock endpoint not implemented: ${method} ${path}`, 'NOT_FOUND')

  const user = userFromToken(token)
  if (r.auth && !user) return fail(401, 'Unauthorized', 'UNAUTHORIZED')

  const m = path.match(r.regex)!
  const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]))
  let body = opts.data
  if (typeof FormData !== 'undefined' && body instanceof FormData) {
    const obj: Record<string, unknown> = {}
    body.forEach((v, k) => (obj[k] = v))
    body = obj
  }
  try {
    const res = await r.handler({ params, query, body, user, method, url: path })
    if (res && typeof res === 'object' && 'status' in res && 'body' in res) return res as MockResult
    return ok(res)
  } catch (e) {
    console.error('[mock]', method, path, e)
    return fail(500, e instanceof Error ? e.message : 'Internal error')
  }
}
