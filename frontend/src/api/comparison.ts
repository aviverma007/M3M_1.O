/* Module 21 "Comparison" API */
import { http } from '@/api/http'
import type { CompareInput } from '@/lib/projectComparison'

type Envelope<T> = { data: T }
export type ProjectOption = { id: number; name: string; location?: string; locationCategory?: string; projectType?: string }

export async function getComparisonProjects() {
  const r = await http.get<Envelope<{ rows: ProjectOption[] }>>('/project?limit=1000&fields=id,name,location,locationCategory,projectType')
  return (r?.data?.rows ?? []).slice().sort((x, y) => x.name.localeCompare(y.name))
}

export async function getComparisonPair(a: string | number, b: string | number) {
  const r = await http.get<Envelope<{ a: CompareInput; b: CompareInput }>>(`/comparison/pair?a=${a}&b=${b}`)
  return r.data
}

export function downloadComparisonPdf(a: string | number, b: string | number) {
  return http.post<Blob>('/comparison/pdf', { a: Number(a), b: Number(b) }, { responseType: 'blob' })
}

/** last project compared against <projectId> (per browser; convenience only) */
const KEY = (id: string) => `m3m-comparison-b-${id}`
export function lastCompared(projectId: string) {
  try {
    return localStorage.getItem(KEY(projectId)) || ''
  } catch {
    return ''
  }
}
export function rememberCompared(projectId: string, b: string) {
  try {
    localStorage.setItem(KEY(projectId), b)
  } catch {
    /* storage unavailable */
  }
}
