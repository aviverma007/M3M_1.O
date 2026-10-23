/**
 * Design-chapter pages (group "chapters-b") all read/write one per-project record:
 *   GET  /project/:id/design-brief-summary            -> { data: DesignBriefSummary }
 *   POST /project/:id/design-brief-summary  { <xxxData>: ... }  (merged into the record)
 * plus POST /upload (multipart "file") -> { data: { s3Url } }
 * and  POST /project/:id/export-dpr-pdf { selectedModules } (file download).
 */
import { useEffect, useState } from 'react'
import { ApiError, http, type ApiEnvelope } from './http'
import type { DesignBriefSummary } from '@/types/chapters-b'

export async function fetchSummary(projectId: string | number) {
  const r = await http.get<ApiEnvelope<DesignBriefSummary | null>>(`/project/${projectId}/design-brief-summary`)
  return r?.data ?? null
}

export function saveSummary(projectId: string | number, patch: Partial<DesignBriefSummary>) {
  return http.post<ApiEnvelope<DesignBriefSummary>>(`/project/${projectId}/design-brief-summary`, patch)
}

/** Upload one file; resolves with the stored URL (original: response.data.data.s3Url). */
export async function uploadFile(file: File) {
  const fd = new FormData()
  fd.append('file', file)
  const r = await http.post<ApiEnvelope<{ s3Url?: string }>>('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  return r?.data?.s3Url ?? null
}

export function exportDpr(projectId: string | number, selectedModules: string[]) {
  return http.post<Blob>(`/project/${projectId}/export-dpr-pdf`, { selectedModules }, { responseType: 'blob' })
}

/**
 * Load the summary once for a page, like the original useEffect: `apply` receives the record
 * (or null) on success, and `loading` stays true until done (+ optional extra delay the original adds).
 */
export function useSummaryLoader(
  projectId: string | undefined,
  apply: (s: DesignBriefSummary | null) => void,
  { delay = 0, label = 'data', onError }: { delay?: number; label?: string; onError?: () => void } = {},
) {
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const s = await fetchSummary(projectId ?? '')
        if (alive) apply(s)
      } catch (e) {
        console.error(`Error fetching ${label}:`, e)
        onError?.()
      } finally {
        if (delay) setTimeout(() => alive && setLoading(false), delay)
        else if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])
  return loading
}

/** Same rule as the original: server message, then server error, then a fallback. */
export function errorMessage(e: unknown, fallback: string) {
  if (e instanceof ApiError && e.errorCode !== 'VIEW_ONLY') {
    const d = e.data as { error?: string } | null | undefined
    if (e.message && !/^Request failed with status code/.test(e.message)) return e.message
    if (d?.error) return d.error
  }
  return fallback
}
