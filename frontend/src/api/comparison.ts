/* Module 21 "Comparison" API (2–5 projects) */
import { http } from '@/api/http'
import type { CompareInput, RowStat } from '@/lib/projectComparison'

type Envelope<T> = { data: T }
export type ProjectOption = { id: number; name: string; location?: string; locationCategory?: string; projectType?: string }
export type PortfolioRef = { portfolio: string; projects: number; rows: Record<string, RowStat> }
export type ComparisonSet = { id: number; name: string; projectIds: number[]; creatorName?: string | null }

export async function getComparisonProjects() {
  const r = await http.get<Envelope<{ rows: ProjectOption[] }>>('/project?limit=1000&fields=id,name,location,locationCategory,projectType')
  return (r?.data?.rows ?? []).slice().sort((x, y) => x.name.localeCompare(y.name))
}

export async function getComparisonInputs(ids: (string | number)[]) {
  const r = await http.get<Envelope<{ inputs: CompareInput[] }>>(`/comparison/inputs?ids=${ids.join(',')}`)
  return r.data.inputs
}

export async function getPortfolioRef(portfolio: string) {
  const r = await http.get<Envelope<PortfolioRef>>(`/comparison/stats?portfolio=${encodeURIComponent(portfolio)}`)
  return r.data
}

export function downloadComparisonPdf(ids: (string | number)[]) {
  return http.post<Blob>('/comparison/pdf', { ids: ids.map(Number) }, { responseType: 'blob' })
}

export async function getComparisonSets() {
  const r = await http.get<Envelope<ComparisonSet[]>>('/comparison/sets')
  return r.data ?? []
}
export async function saveComparisonSet(name: string, projectIds: (string | number)[]) {
  const r = await http.post<Envelope<ComparisonSet>>('/comparison/sets', { name, projectIds: projectIds.map(Number) })
  return r.data
}
export function deleteComparisonSet(id: number) {
  return http.delete(`/comparison/sets/${id}`)
}

/** projects last compared from <projectId> (per browser; convenience only) */
const KEY = (id: string) => `m3m-comparison-ids-${id}`
export function lastCompared(projectId: string): string[] {
  try {
    const v = localStorage.getItem(KEY(projectId)) || localStorage.getItem(`m3m-comparison-b-${projectId}`) || ''
    return v.split(',').filter(Boolean)
  } catch {
    return []
  }
}
export function rememberCompared(projectId: string, ids: string[]) {
  try {
    localStorage.setItem(KEY(projectId), ids.join(','))
  } catch {
    /* storage unavailable */
  }
}

/* key-ratio drop cards: Module 6 key ratio panel + Module 1 Key Ratio, per project */
export type KrCell = { label: string; value: string; unit: string; req?: string; ok?: boolean }
export type ProjectKeyRatios = { module6: { name: string; rows: KrCell[] }[]; module1: (KrCell & { group: string })[] }
export async function getKeyRatios(ids: (string | number)[]) {
  const r = await http.get<Envelope<Record<string, ProjectKeyRatios>>>(`/comparison/key-ratios?ids=${ids.join(',')}`)
  return r.data
}
