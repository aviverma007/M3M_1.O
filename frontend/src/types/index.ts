/* Shared domain types — mirror the original API's response shapes. */

export type Role = 'super_admin' | 'design_admin' | 'general_admin' | 'design_contributor' | 'general_contributor'

export type User = {
  id: number
  name: string
  email: string
  phone?: string
  role: Role
  status: 'active' | 'inactive' | string
  department: string | null
  company: string | null
  createdAt?: string
  updatedAt?: string
}

export type Portfolio = 'M3M Noida' | 'M3M Gurgaon' | 'Smartworld'

export type ProjectType = 'residential' | 'commercial' | 'mixed'
export type ProjectCategory = 'mid-end' | 'premium' | 'affluent' | 'hi_street' | 'enclosed_mall'

export type Project = {
  id: number
  name: string
  description: string | null
  projectType: ProjectType
  category: ProjectCategory
  status: string
  projectOwner: string
  location: string
  userId: number
  userName: string
  userEmail: string
  userNumber: string
  date: string
  userDesignation: string
  projectClassification: string
  designOwner: string
  structureOwner: string
  mepOwner: string
  interiorDesignOwner: string
  far_permissible: string
  site_area: string
  site_area_acres: string
  locationCategory: Portfolio | string
  createdAt: string
  updatedAt?: string
  moduleId?: number | null
}

export type Paginated<T> = { count: number; totalPages: number; currentPage: number; rows: T[] }

export type ProjectModuleProgress = {
  allParams: number
  deviations: number
  benchmarkParams: number
  flags: number
  complianceScore: number
  moduleStatus: number
  completedChapters: number
  status: 'pending' | 'active' | 'completed' | string
}

export type ProjectModule = {
  id: number
  moduleNumber: number
  name: string
  description: string | null
  status: string
  /** route segment under /dashboard/project/:id for design-brief / design-chapter modules */
  route: string | null
  projectModule: ProjectModuleProgress | null
  moduleChapters: { id: number; title: string; chapterNumber: number }[]
  firstChapterId: number | null
  originalModuleId: number
}

export type Notification = {
  id: number
  userId: number
  type: string
  message: string
  isRead: boolean
  metadata?: { department?: string; assignedBy?: string; deadline?: string | null; [k: string]: unknown }
  createdAt: string
}

export type RoleDef = {
  id: number
  roleName: string
  description: string
  permissions: { name: string; access: string; status: boolean }[]
  createdAt: string
  updatedAt: string
}

export type AuditLog = {
  id: number
  userId: number
  projectId: number | null
  taskType: string
  description: string
  createdAt: string
  Creator: { name: string }
}
