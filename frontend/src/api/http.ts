/**
 * Single HTTP entry point for the app.
 *
 * Every page calls endpoints with the same paths/shape as the original API
 * (e.g. GET /project, PUT /project/:id/module/:m/chapter/:c).
 *
 *  - VITE_API_MODE=mock  -> answered by the in-browser mock database (src/mock)
 *  - VITE_API_MODE=http  -> real fetch to VITE_API_BASE_URL (the SQL Server backend)
 *
 * Responses use the original envelope: { success, message, data }.
 */

export type ApiEnvelope<T> = {
  success: boolean
  message: string
  data: T
  status?: string
  statusCode?: number
  errorCode?: string
}

export class ApiError extends Error {
  status: number
  errorCode?: string
  data?: unknown
  constructor(message: string, status: number, errorCode?: string, data?: unknown) {
    super(message)
    this.status = status
    this.errorCode = errorCode
    this.data = data
  }
}

export type RequestOptions = {
  params?: Record<string, unknown>
  data?: unknown
  headers?: Record<string, string>
  /** expect a file/blob instead of JSON */
  responseType?: 'json' | 'blob'
}

export type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export type Transport = (method: Method, url: string, opts: RequestOptions) => Promise<{ status: number; body: unknown }>

const MODE = (import.meta.env.VITE_API_MODE ?? 'mock') as 'mock' | 'http'
const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '/api/v1') as string
export const TOKEN_KEY = 'AUTH_ACCESS_TOKEN'

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}
export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* storage unavailable */
  }
}

function buildQuery(params?: Record<string, unknown>) {
  if (!params) return ''
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue
    if (Array.isArray(v)) v.forEach((x) => sp.append(k, String(x)))
    else sp.append(k, String(v))
  }
  const q = sp.toString()
  return q ? `?${q}` : ''
}

const httpTransport: Transport = async (method, url, opts) => {
  const token = getToken()
  const isForm = typeof FormData !== 'undefined' && opts.data instanceof FormData
  const res = await fetch(`${BASE_URL}${url.startsWith('/') ? url : `/${url}`}${buildQuery(opts.params)}`, {
    method,
    credentials: 'include',
    headers: {
      ...(isForm || opts.data === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      // for FormData the browser must set Content-Type itself (it adds the multipart boundary)
      ...(isForm ? Object.fromEntries(Object.entries(opts.headers ?? {}).filter(([k]) => k.toLowerCase() !== 'content-type')) : opts.headers),
    },
    body: opts.data === undefined ? undefined : isForm ? (opts.data as FormData) : JSON.stringify(opts.data),
  })
  if (opts.responseType === 'blob') return { status: res.status, body: await res.blob() }
  const text = await res.text()
  let body: unknown = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = text
  }
  return { status: res.status, body }
}

let transport: Transport = httpTransport
let mockReady: Promise<void> | null = null

async function ensureTransport() {
  if (MODE !== 'mock') return
  if (!mockReady) {
    mockReady = import('@/mock').then((m) => {
      transport = m.mockTransport
    })
  }
  await mockReady
}

/* ---- view-only mode: blocks every write while a module is opened read-only (same as original) ---- */
let viewOnly = false
export function setViewOnlyMode(on: boolean) {
  viewOnly = on
}
function showViewOnlyToast() {
  if (typeof document === 'undefined' || document.getElementById('view-only-toast')) return
  const n = document.createElement('div')
  n.id = 'view-only-toast'
  n.style.cssText =
    'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:9999;background:#1e40af;color:#fff;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600;box-shadow:0 4px 12px rgba(0,0,0,0.2);pointer-events:none;'
  n.textContent = 'View Only — changes cannot be saved in this module.'
  document.body.appendChild(n)
  setTimeout(() => n.remove(), 3000)
}

async function request<T = unknown>(method: Method, url: string, opts: RequestOptions = {}): Promise<T> {
  if (viewOnly && method !== 'GET' && !url.startsWith('/auth/')) {
    showViewOnlyToast()
    throw new ApiError('This module is view only. Changes cannot be saved.', 403, 'VIEW_ONLY')
  }
  await ensureTransport()
  const { status, body } = await transport(method, url, opts)
  if (status >= 200 && status < 300) return body as T
  const env = (body ?? {}) as Partial<ApiEnvelope<unknown>>
  if (status === 401 && !url.startsWith('/auth/login')) {
    setToken(null)
    window.dispatchEvent(new Event('auth:expired'))
  }
  throw new ApiError(env.message || `Request failed with status code ${status}`, status, env.errorCode, env.data)
}

export const http = {
  get: <T = unknown>(url: string, opts?: RequestOptions) => request<T>('GET', url, opts),
  post: <T = unknown>(url: string, data?: unknown, opts?: RequestOptions) => request<T>('POST', url, { ...opts, data }),
  put: <T = unknown>(url: string, data?: unknown, opts?: RequestOptions) => request<T>('PUT', url, { ...opts, data }),
  patch: <T = unknown>(url: string, data?: unknown, opts?: RequestOptions) => request<T>('PATCH', url, { ...opts, data }),
  delete: <T = unknown>(url: string, opts?: RequestOptions) => request<T>('DELETE', url, opts),
}

export const API_MODE = MODE
