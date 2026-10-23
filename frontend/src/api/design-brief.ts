import { API_MODE, http, type ApiEnvelope } from '@/api/http'
import { downloadBlob } from '@/lib/download'
import type { BriefComment, BriefUser, DesignBriefData, DesignBriefSummary, DeptRecord, UploadedFile } from '@/types/design-brief'
import type { Project } from '@/types'

/* ---------- reads ---------- */
export const getDesignBrief = (projectId: string | number) =>
  http.get<ApiEnvelope<DesignBriefData>>(`/project/${projectId}/design-brief`).then((r) => r.data)

export const getProject = (projectId: string | number) => http.get<ApiEnvelope<Project>>(`/project/${projectId}`).then((r) => r.data)

export const getDesignBriefSummary = (projectId: string | number) =>
  http.get<ApiEnvelope<DesignBriefSummary | null>>(`/project/${projectId}/design-brief-summary`).then((r) => r.data)

export const getComments = (projectId: string | number, department: string) =>
  http.get<ApiEnvelope<BriefComment[]>>(`/design-brief-comment?projectId=${projectId}&department=${department}`).then((r) => r.data ?? [])

export const getAssignees = (deptPath: string) =>
  http.get<ApiEnvelope<BriefUser[]>>(`/auth/users?assigneesFor=${deptPath}`).then((r) => r.data ?? [])

export const getDeptRecords = (deptPath: string, projectId: string | number) =>
  http.get<ApiEnvelope<{ count: number; data: DeptRecord[] }>>(`/${deptPath}?projectId=${projectId}`).then((r) => r.data?.data ?? [])

/* ---------- writes ---------- */
export const createDeptRecord = (deptPath: string, body: Record<string, unknown>) =>
  http.post<ApiEnvelope<DeptRecord>>(`/${deptPath}`, body).then((r) => r.data)

export const updateDeptRecord = (deptPath: string, id: number, body: Record<string, unknown>) =>
  http.patch<ApiEnvelope<DeptRecord>>(`/${deptPath}/${id}`, body).then((r) => r.data)

export async function uploadFile(file: File) {
  const fd = new FormData()
  fd.append('file', file)
  const res = await http.post<ApiEnvelope<UploadedFile>>('/upload', fd, { headers: {} })
  return res.data?.s3Url
}

/* ---------- downloads ---------- */
export async function downloadPdf(url: string, fileName: string) {
  const blob = await http.get<Blob>(url, { responseType: 'blob' })
  downloadBlob(blob, fileName)
}

/** pick the record used for display: one created by a general_admin, else the first (same rule as the original) */
export function primaryRecord(list?: DeptRecord[] | null) {
  if (!Array.isArray(list) || list.length === 0) return null
  return list.find((r) => r.Creator?.role === 'general_admin') ?? list[0]
}

/* ---------- uploaded files ----------
 * In mock mode uploads live in the in-browser DB and get URLs like `/mock-uploads/<id>/<file name>`;
 * they are resolved through GET /upload/:id. Real S3 URLs open normally.
 */
const MOCK_PREFIX = '/mock-uploads/'
export const isMockUpload = (url?: string | null) => API_MODE === 'mock' && !!url && url.startsWith(MOCK_PREFIX)

export async function openUploadedFile(url: string, mode: 'view' | 'download') {
  const id = url.slice(MOCK_PREFIX.length).split('/')[0]
  const res = await http.get<ApiEnvelope<UploadedFile>>(`/upload/${id}`)
  const f = res.data
  if (!f) return
  if (f.dataUrl) {
    const blob = await (await fetch(f.dataUrl)).blob()
    if (mode === 'view') {
      window.open(URL.createObjectURL(blob), '_blank', 'noopener')
      return
    }
    downloadBlob(blob, f.name, f.type || 'application/octet-stream')
  } else {
    const text = `${f.name} (${f.size} bytes, ${f.type || 'unknown type'})\nOnly the file details were kept in demo mode (file too large to store in the browser).`
    downloadBlob(text, `${f.name}.txt`, 'text/plain')
  }
}
