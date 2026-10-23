import { useQuery } from '@tanstack/react-query'
import { http, type ApiEnvelope } from './http'
import { downloadBlob } from '@/lib/download'
import type { Chapter, ChapterFormData, ChapterList } from '@/types/module-workspace'

export const chapterKeys = {
  all: ['chapters'] as const,
  list: (projectId?: string | number, moduleId?: string | number, chapterId?: string | number) =>
    ['chapters', String(projectId ?? ''), String(moduleId ?? ''), String(chapterId ?? '')] as const,
}

/** GET /project/:p/module/:m/chapter?chapterId=:c — all chapters of the module, the requested one with sections. */
export function useChapters(projectId?: string, moduleId?: string, chapterId?: string) {
  return useQuery({
    queryKey: chapterKeys.list(projectId, moduleId, chapterId),
    queryFn: () =>
      http
        .get<ApiEnvelope<ChapterList>>(`/project/${projectId}/module/${moduleId}/chapter${chapterId ? `?chapterId=${chapterId}` : ''}`)
        .then((r) => r.data),
    enabled: !!projectId && !!moduleId && !!chapterId,
    placeholderData: (prev) => prev,
    staleTime: 0,
  })
}

/** PUT /project/:p/module/:m/chapter/:c */
export const saveChapter = ({ projectId, moduleId, chapterId, data }: ChapterFormData) =>
  http.put<ApiEnvelope<Chapter>>(`/project/${projectId}/module/${moduleId}/chapter/${chapterId}`, data).then((r) => r.data)

/** PUT /project/:p/module/:m/chapter/saveAndDraft/:c */
export const saveChapterDraft = ({ projectId, moduleId, chapterId, data }: ChapterFormData) =>
  http.put<ApiEnvelope<Chapter>>(`/project/${projectId}/module/${moduleId}/chapter/saveAndDraft/${chapterId}`, data).then((r) => r.data)

/** PUT /project/:id/save-project-module (same thunk the original calls after each chapter save). */
export const saveProjectModule = ({ projectId, ...body }: { projectId?: number | string; moduleId?: number; completedChapters?: number }) =>
  http.put<ApiEnvelope<unknown>>(`/project/${projectId}/save-project-module`, body)

/** POST /project/:p/module/:m/import (multipart, field "file"). */
export const importModuleCsv = ({ file, projectId, moduleId }: { file: FormData; projectId?: string; moduleId?: string }) =>
  http.post<ApiEnvelope<unknown>>(`/project/${projectId}/module/${moduleId}/import`, file, { headers: { 'Content-Type': 'multipart/form-data' } })

/** POST module/sample/:id — returns { base64Url, fileFormat } (original "downloadImportFormat"). */
export async function downloadImportFormat(moduleId?: string) {
  if (!moduleId) throw new Error('Module Id Not Found.')
  const res = await http.post<ApiEnvelope<{ base64Url?: string; fileFormat?: string; content?: string }>>(`module/sample/${moduleId}`)
  const { base64Url, fileFormat = 'csv', content } = res.data ?? {}
  if (!base64Url && content) downloadBlob(content, `Import_Format.${fileFormat}`, 'text/csv')
  else if (base64Url) {
    const a = document.createElement('a')
    a.href = base64Url.startsWith('data:') ? base64Url : `data:text/csv;base64,${base64Url}`
    a.download = `Import_Format.${fileFormat}`
    document.body.appendChild(a)
    a.click()
    a.remove()
  }
  return res
}
