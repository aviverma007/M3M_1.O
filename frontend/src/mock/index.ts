/**
 * Mock API server (in-browser). Loaded only when VITE_API_MODE=mock.
 *
 * - seed/*.ts      register seed data (registerSeed)
 * - handlers/*.ts  register endpoints (route)
 *
 * Both folders are auto-imported, so adding a new file is enough.
 */
import type { Transport } from '@/api/http'
import { getToken } from '@/api/http'
import { initDb, resetMockDb } from './db'
import { dispatch } from './router'

import.meta.glob('./seed/*.ts', { eager: true })
import.meta.glob('./handlers/*.ts', { eager: true })

initDb()

declare global {
  interface Window {
    resetMockData?: () => void
  }
}
window.resetMockData = () => {
  resetMockDb()
  window.location.reload()
}

/* dev-only hook used by the visual comparison harness (scripts/compare) */
if (import.meta.env.DEV) {
  ;(window as unknown as Record<string, unknown>).__mockDispatch = async (method: string, url: string, data: unknown, token: string | null) => {
    const { dispatch: d } = await import('./router')
    let body = data
    if (typeof data === 'string') {
      try {
        body = JSON.parse(data)
      } catch {
        /* keep raw */
      }
    }
    return d(method as never, url, { data: body }, token)
  }
}

const LATENCY_MS = 250

export const mockTransport: Transport = async (method, url, opts) => {
  await new Promise((r) => setTimeout(r, LATENCY_MS))
  const res = await dispatch(method, url, opts, getToken())
  if (import.meta.env.DEV) console.debug('[mock]', method, url, res.status)
  return res
}
