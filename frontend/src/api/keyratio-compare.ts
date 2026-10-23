/** Key Ratio + Compare Projects API (same endpoints / payloads as the original redux thunks). */
import { http, type ApiEnvelope } from './http'
import type { CommercialKeyRatio, CompareResponse, ResidentialKeyRatio } from '@/types/keyratio-compare'

type Saved = ApiEnvelope<Record<string, unknown>>

/** GET /keyRatio?project_id (original getKeyRatioModule) */
export const getKeyRatio = (projectId?: string) =>
  http.get<ApiEnvelope<ResidentialKeyRatio>>('/keyRatio', { params: { project_id: projectId } }).then((r) => r.data)

/** POST /keyRatio, or PUT /keyRatio/?project_id=… when the record already has an id (original saveKeyRatioModule). */
export const saveKeyRatio = (payload: Record<string, unknown>) =>
  payload.id ? http.put<Saved>(`/keyRatio/?project_id=${payload.project_id}`, payload) : http.post<Saved>('/keyRatio', payload)

/** POST /keyRatio/saveAsDraft/ (original saveAsDraftKeyRatioModule) */
export const saveKeyRatioDraft = (payload: Record<string, unknown>) =>
  http.post<Saved>(payload.id ? `/keyRatio/saveAsDraft/?project_id=${payload.project_id}` : 'keyRatio/saveAsDraft/', payload)

/** GET /commercial/create-key-ratio?project_id (original getCommercialKeyRatioModule) */
export const getCommercialKeyRatio = (projectId?: string) =>
  http.get<ApiEnvelope<CommercialKeyRatio>>('/commercial/create-key-ratio', { params: { project_id: projectId } }).then((r) => r.data)

export type CommercialSubmit = {
  projectId?: string
  keyRatioInputs: { field_id: number; value: unknown }[]
  keyOutputs: { field_id: number; field_value?: unknown; remark?: unknown; is_flag?: unknown; calculated_cost?: unknown }[]
  sectionCost?: { section_name: string; section_cost: number }[]
}

/** POST / PUT /commercial/create-key-ratio (original saveKeyRatioCommercialModule) */
export const saveCommercialKeyRatio = (id: number | null, body: CommercialSubmit) =>
  id ? http.put<Saved>(`/commercial/create-key-ratio?project_id=${body.projectId}`, body) : http.post<Saved>('/commercial/create-key-ratio', body)

/** PUT /commercial/save-as-draft (original saveAsDraftCommercialKeyRatioModule; body never carries an id there) */
export const saveCommercialDraft = (body: CommercialSubmit) => http.put<Saved>('/commercial/save-as-draft', body)

/** PUT /project/:id/save-project-module (original saveProjectModuleData) */
export const saveProjectModuleData = (projectId?: string, body: Record<string, unknown> = {}) =>
  http.put<Saved>(`/project/${projectId}/save-project-module`, body)

/** POST /compare/get-projects (original fetchCompareProjects) */
export const getCompareProjects = (body: { currentProjectId?: string; compareProjectIds: string[]; moduleId: string; chapterId: string }) =>
  http.post<ApiEnvelope<CompareResponse>>('/compare/get-projects', body)
