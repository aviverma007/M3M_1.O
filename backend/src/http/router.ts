/**
 * Route registry with the SAME contract as the frontend mock (frontend/src/mock/router.ts):
 *   route('GET', '/project/:id', async ({ params, query, body, user }) => ok(data))
 * Handlers return either { status, body } (via ok/created/fail) or plain data (wrapped as ok()).
 * A body that is a Blob/Buffer is sent as a file; a string body is sent as text.
 */
import { Router, type Request, type Response, type NextFunction } from 'express'
import { authenticate, type AuthUser } from './auth.js'

export type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
export type Ctx = {
  params: Record<string, string>
  query: Record<string, string>
  body: any // eslint-disable-line @typescript-eslint/no-explicit-any
  user: AuthUser | null
  method: Method
  url: string
  req: Request
  res: Response
}
export type Result = { status: number; body: unknown; headers?: Record<string, string> }
export type Handler = (ctx: Ctx) => Promise<Result | unknown> | Result | unknown

/* -------- response helpers (same envelope as the original API) -------- */
export const ok = (data: unknown, message = 'Success'): Result => ({ status: 200, body: { success: true, status: 'success', message, data } })
export const created = (data: unknown, message = 'Created successfully'): Result => ({
  status: 201,
  body: { success: true, status: 'success', message, data },
})
export const fail = (status: number, message: string, errorCode = 'ERROR', data: unknown = null): Result => ({
  status,
  body: { success: false, status: 'Failed', statusCode: status, errorCode, message, data },
})
/** send a file/text with explicit headers */
export const file = (body: Buffer | Blob | string, contentType: string, fileName?: string): Result => ({
  status: 200,
  body,
  headers: { 'Content-Type': contentType, ...(fileName ? { 'Content-Disposition': `attachment; filename="${fileName.replace(/"/g, '')}"` } : {}) },
})

export function paginate<T>(rows: T[], page = 1, limit = 10) {
  const p = Math.max(1, Number(page) || 1)
  const l = Math.max(1, Number(limit) || 10)
  return { count: rows.length, totalPages: Math.max(1, Math.ceil(rows.length / l)), currentPage: p, rows: rows.slice((p - 1) * l, p * l) }
}

type Entry = { method: Method; pattern: string; handler: Handler; auth: boolean }
const entries: Entry[] = []

export function route(method: Method, pattern: string, handler: Handler, opts: { auth?: boolean } = {}) {
  entries.push({ method, pattern, handler, auth: opts.auth ?? true })
}

function isResult(x: unknown): x is Result {
  return !!x && typeof x === 'object' && 'status' in x && 'body' in x && typeof (x as Result).status === 'number'
}

async function send(res: Response, r: Result) {
  if (r.headers) for (const [k, v] of Object.entries(r.headers)) res.setHeader(k, v)
  const b = r.body
  if (typeof Blob !== 'undefined' && b instanceof Blob) {
    if (!res.getHeader('Content-Type')) res.setHeader('Content-Type', b.type || 'application/octet-stream')
    res.status(r.status).send(Buffer.from(await b.arrayBuffer()))
  } else if (Buffer.isBuffer(b)) {
    res.status(r.status).send(b)
  } else if (typeof b === 'string') {
    if (!res.getHeader('Content-Type')) res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.status(r.status).send(b)
  } else {
    res.status(r.status).json(b)
  }
}

/** Build the express router. Static paths are registered before parameterised ones so '/x/export' wins over '/x/:id'. */
export function buildRouter() {
  const router = Router()
  const sorted = [...entries].sort((a, b) => {
    const score = (p: string) => p.split('/').map((s) => (s.startsWith(':') ? 1 : 0)).reduce((x: number, y: number) => x * 2 + y, 0)
    return score(a.pattern) - score(b.pattern)
  })
  for (const e of sorted) {
    const method = e.method.toLowerCase() as 'get' | 'post' | 'put' | 'patch' | 'delete'
    router[method](e.pattern, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const user = await authenticate(req)
        if (e.auth && !user) return send(res, fail(401, 'Unauthorized', 'UNAUTHORIZED'))
        const query: Record<string, string> = {}
        for (const [k, v] of Object.entries(req.query)) query[k] = Array.isArray(v) ? String(v[v.length - 1]) : String(v ?? '')
        const out = await e.handler({
          params: req.params as Record<string, string>,
          query,
          body: req.body,
          user,
          method: e.method,
          url: req.path,
          req,
          res,
        })
        if (res.headersSent) return
        await send(res, isResult(out) ? out : ok(out))
      } catch (err) {
        next(err)
      }
    })
  }
  return router
}

export const registeredRoutes = () => entries.map((e) => `${e.method} ${e.pattern}`)
