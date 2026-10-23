/* Types for Roles & Access Control and Audit Logs */

/** One entry of a role's permissions list. Module-access entries use `module:<Module name>` + access level. */
export type RolePermission = { name: string; status: boolean; access?: AccessLevel }

export type AccessRole = {
  id: number
  roleName: string
  description: string
  permissions: RolePermission[]
  createdAt?: string
  updatedAt?: string
}

export type AccessLevel = 'none' | 'view' | 'edit'

export type AdminUser = {
  id: number
  name: string
  email: string
  phone?: string
  role: string
  department: string | null
  company: string | null
  status?: string
  createdAt?: string
}

/** Body of POST /auth/users and PUT /auth/users/:id (same fields as original form) */
export type UserFormValues = {
  name: string
  email: string
  phone: string
  company: string
  department: string
  role: string
  password?: string
}

export type RoleFormValues = {
  name: string
  description: string
  permissionsList: { name: string; status: boolean }[]
}

export type AuditLog = {
  id: number
  userId: number
  projectId: number | null
  taskType: string
  description: string
  createdAt: string
  Creator?: { name: string } | null
}

export type AuditLogsPage = { logs: AuditLog[]; totalLogs: number; totalPages: number; currentPage: number }
