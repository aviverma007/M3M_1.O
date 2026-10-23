/**
 * API calls used by the "chapters-a" design-chapter pages (same paths as the original):
 *   GET/POST /project/:id/design-brief-summary         chapter data per project (merged record)
 *   PUT      /project/:id                              project details (Project Details & Layout)
 *   POST     /upload (multipart "file")                -> { s3Url }
 *   GET      /project/:id/module/:m/chapter[?chapterId] Apartment (2) / Common (3) design catalogue
 *   GET      /structure?projectId, POST /structure, PATCH /structure/:id
 *   GET      /mep?projectId, POST /mep, PATCH /mep/:id, GET /mep/:id/download-design-brief-inputs
 *   GET      /keyRatio?project_id                      (avg waiting time prefill on MEP)
 *   GET      /auth/users?assigneesFor=mep
 */
import { ApiError, http, type ApiEnvelope } from './http'
import type { Paginated, Project, User } from '@/types'
import type { ChaptersASummary, MepRecord, ModuleChapter, StructureRecord } from '@/types/chapters-a'

export async function getProject(projectId: string | number) {
  const r = await http.get<ApiEnvelope<Project>>(`/project/${projectId}`)
  return r?.data
}

export async function getSummary(projectId: string | number) {
  const r = await http.get<ApiEnvelope<ChaptersASummary | null>>(`/project/${projectId}/design-brief-summary`)
  return r?.data ?? null
}

export function saveSummary(projectId: string | number, patch: Partial<ChaptersASummary>) {
  return http.post<ApiEnvelope<ChaptersASummary>>(`/project/${projectId}/design-brief-summary`, patch)
}

export function updateProject(projectId: string | number, body: Partial<Project>) {
  return http.put<ApiEnvelope<Project>>(`/project/${projectId}`, body)
}

/** Upload one file; resolves with its URL (original: response.data.data.s3Url). */
export async function uploadFile(file: File) {
  const fd = new FormData()
  fd.append('file', file)
  const r = await http.post<ApiEnvelope<{ s3Url?: string }>>('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  return r?.data?.s3Url ?? null
}

export async function getProjectOptions() {
  const r = await http.get<ApiEnvelope<Paginated<Pick<Project, 'id' | 'name' | 'location'>>>>('/project?limit=1000&fields=id,name,location')
  return r?.data?.rows ?? []
}

export async function getModuleChapters(projectId: string | number, moduleId: number, chapterId?: number) {
  const url = `/project/${projectId}/module/${moduleId}/chapter${chapterId ? `?chapterId=${chapterId}` : ''}`
  const r = await http.get<ApiEnvelope<Paginated<ModuleChapter>>>(url)
  return r?.data?.rows ?? []
}

/* ---------------- Structure ---------------- */
export async function getStructure(projectId: string | number) {
  const r = await http.get<ApiEnvelope<{ count: number; data: StructureRecord[] }>>(`/structure?projectId=${projectId}`)
  return r?.data?.data ?? []
}
export function saveStructure(id: number | null, body: Record<string, unknown>) {
  return id ? http.patch<ApiEnvelope<StructureRecord>>(`/structure/${id}`, body) : http.post<ApiEnvelope<StructureRecord>>('/structure', body)
}

/* ---------------- MEP ---------------- */
export async function getMep(projectId: string | number) {
  const r = await http.get<ApiEnvelope<{ count: number; data: MepRecord[] }>>(`/mep?projectId=${projectId}`)
  return r?.data?.data ?? []
}
export function saveMep(id: number | null, body: Record<string, unknown>) {
  return id ? http.patch<ApiEnvelope<MepRecord>>(`/mep/${id}`, body) : http.post<ApiEnvelope<MepRecord>>('/mep', body)
}
export function downloadMepInputs(id: number) {
  return http.get<Blob>(`/mep/${id}/download-design-brief-inputs`, { responseType: 'blob' })
}
export async function getMepAssignees() {
  const r = await http.get<ApiEnvelope<User[]>>('/auth/users?assigneesFor=mep')
  return r?.data ?? []
}
export async function getKeyRatioAvgWait(projectId: string | number) {
  const r = await http.get<ApiEnvelope<{ keyRatioFields?: { avg_waiting_time?: string | number }[] }>>(`/keyRatio?project_id=${projectId}`)
  return r?.data?.keyRatioFields?.[0]?.avg_waiting_time
}

/** Same message precedence as the original: response.data.message || response.data.error || fallback */
export function errorMessage(e: unknown, fallback: string) {
  if (e instanceof ApiError) {
    const d = e.data as { error?: string } | null | undefined
    return e.message || d?.error || fallback
  }
  return fallback
}
