import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { http, type ApiEnvelope } from './http'
import type { Paginated, Project, ProjectModule } from '@/types'

export type ProjectFilters = {
  search?: string
  projectType?: string
  projectCategory?: string
  from?: string
  to?: string
  page?: number
  limit?: number
  locationCategory?: string
}

export const projectKeys = {
  all: ['projects'] as const,
  list: (f: ProjectFilters) => ['projects', 'list', f] as const,
  one: (id: string | number) => ['projects', 'one', String(id)] as const,
  modules: (id: string | number, type?: string) => ['projects', 'modules', String(id), type ?? ''] as const,
}

export function fetchProjects(f: ProjectFilters = {}) {
  return http
    .get<ApiEnvelope<Paginated<Project>>>('/project', {
      params: {
        search: f.search || '',
        projectType: f.projectType || '',
        projectCategory: f.projectCategory || '',
        fromDate: f.from || '',
        toDate: f.to || '',
        page: f.page || 1,
        limit: f.limit || 10,
        locationCategory: f.locationCategory || '',
        lc: f.locationCategory || '',
      },
    })
    .then((r) => r.data)
}

export function useProjects(f: ProjectFilters) {
  return useQuery({ queryKey: projectKeys.list(f), queryFn: () => fetchProjects(f), placeholderData: (prev) => prev })
}

/** Lightweight list of all projects (id, name, location) — used by compare pickers. */
export function useProjectOptions() {
  return useQuery({
    queryKey: ['projects', 'options'],
    queryFn: () =>
      http
        .get<ApiEnvelope<Paginated<Pick<Project, 'id' | 'name' | 'location'>>>>('/project', { params: { limit: 1000, fields: 'id,name,location' } })
        .then((r) => r.data.rows),
  })
}

export function useProject(id?: string | number) {
  return useQuery({
    queryKey: projectKeys.one(id ?? ''),
    queryFn: () => http.get<ApiEnvelope<Project>>(`/project/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}

export function useProjectModules(projectId?: string | number, projectType?: string) {
  return useQuery({
    queryKey: projectKeys.modules(projectId ?? '', projectType),
    queryFn: () =>
      http.get<ApiEnvelope<Paginated<ProjectModule>>>(`/project/${projectId}/module`, { params: { projectType } }).then((r) => r.data),
    enabled: !!projectId && !!projectType,
  })
}

export function useSaveProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<Project> & { id?: number | string }) =>
      id ? http.put<ApiEnvelope<Project>>(`/project/${id}`, body) : http.post<ApiEnvelope<Project>>('/project', body),
    onSuccess: (res) => {
      toast.success(res.message)
      qc.invalidateQueries({ queryKey: projectKeys.all })
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useDeleteProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => http.delete<ApiEnvelope<null>>(`/project/${id}`),
    onSuccess: (res) => {
      toast.success(res.message || 'Project deleted successfully')
      qc.invalidateQueries({ queryKey: projectKeys.all })
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

/** Download helper for export endpoints that return { fileName, mimeType, content } in mock mode. */
export function downloadFile(fileName: string, content: BlobPart, mimeType = 'application/octet-stream') {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }))
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export async function exportProject(params: {
  projectId: number | string
  projectType: string
  format: 'excel' | 'pdf' | 'csv'
  allParams?: boolean
  flags?: boolean
  deviations?: boolean
  benchmark?: boolean
}) {
  const { projectId, projectType, ...q } = params
  const res = await http.get<ApiEnvelope<{ fileName: string; mimeType: string; content: string }>>(
    `/project/${projectId}/${projectType === 'commercial' ? 'exportCommercial' : 'export'}`,
    { params: q },
  )
  downloadFile(res.data.fileName, res.data.content, res.data.mimeType)
}
