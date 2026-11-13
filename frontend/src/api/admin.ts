/* API calls for Roles & Access Control and Audit Logs (same paths as original) */
import { http, type ApiEnvelope } from '@/api/http'
import type { AccessRole, AdminUser, AuditLogsPage, RolePermission, UserFormValues } from '@/types/admin'

export const adminKeys = {
  roles: ['roles'] as const,
  users: ['auth-users'] as const,
  auditLogs: (params: Record<string, string>) => ['audit-logs', params] as const,
}

export async function fetchRoles(): Promise<AccessRole[]> {
  const res = await http.get<ApiEnvelope<AccessRole[]>>('/roles')
  return res?.data || []
}

export const createRole = (body: { roleName: string; description: string; permissions: RolePermission[] }) =>
  http.post<ApiEnvelope<AccessRole>>('/roles', body)

export const updateRole = (id: number, body: { roleName: string; description?: string; permissions: RolePermission[] }) =>
  http.put<ApiEnvelope<AccessRole>>(`/roles/${id}`, body)

export async function fetchUsers(): Promise<AdminUser[]> {
  const res = await http.get<ApiEnvelope<AdminUser[]>>('/auth/users')
  return res?.data || []
}

export const createUser = (body: UserFormValues) => http.post<ApiEnvelope<AdminUser>>('/auth/users', body)
export const updateUser = (id: number, body: UserFormValues) => http.put<ApiEnvelope<AdminUser>>(`/auth/users/${id}`, body)
export const deleteUser = (id: number) => http.delete<ApiEnvelope<null>>(`/auth/users/${id}`)

export async function fetchAuditLogs(params: Record<string, string>): Promise<AuditLogsPage> {
  const res = await http.get<ApiEnvelope<AuditLogsPage>>(`/audit-logs?${new URLSearchParams(params).toString()}`)
  return res.data
}

export const exportAuditLogs = (params: Record<string, string>) =>
  http.get<BlobPart>(`/audit-logs/export?${new URLSearchParams(params).toString()}`, { responseType: 'blob' })

/* field-level change history (who changed which value, old -> new) */
export type FieldChange = {
  id: number
  projectId: number | null
  projectName: string | null
  module: string
  label: string
  path: string
  oldValue: string | null
  newValue: string | null
  action: 'create' | 'update' | 'delete'
  userName: string | null
  createdAt: string
}
export type FieldChangesPage = { rows: FieldChange[]; total: number; totalPages: number; currentPage: number; modules: string[] }
export async function fetchFieldChanges(params: Record<string, string>): Promise<FieldChangesPage> {
  const res = await http.get<ApiEnvelope<FieldChangesPage>>(`/field-changes?${new URLSearchParams(params).toString()}`)
  return res.data
}
export const exportFieldChanges = (params: Record<string, string>) =>
  http.get<BlobPart>(`/field-changes/export?${new URLSearchParams(params).toString()}`, { responseType: 'blob' })
