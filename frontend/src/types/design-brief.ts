/* Design Brief (Module 4) — shapes mirror the original API responses. */

/** Keys used in GET /project/:id/design-brief (camelCase) */
export type DeptKey = 'liaison' | 'businessDevelopment' | 'land' | 'structure' | 'mep' | 'anarock'

/** URL / API path segment of a department ("/liaison", "/business-development", ...) */
export type DeptPath = 'liaison' | 'business-development' | 'land' | 'structure' | 'mep' | 'anarock'

export type BriefUser = {
  id: number
  name: string
  email?: string
  role: string
  department?: string | null
}

/** One department input record (GET /liaison?projectId=… etc.). Field values + `<field>Note` attachments are flat keys. */
export type DeptRecord = {
  id: number
  projectId: number
  assignedTo: number | null
  deadline: string | null
  receivedDate: string | null
  status: string | null
  instructions: string | null
  customFields: Record<string, string | null> | null
  revisionReasons?: string | null
  createdBy: number | null
  createdAt: string
  updatedAt: string
  Creator?: BriefUser | null
  Assignee?: BriefUser | null
  [field: string]: unknown
}

export type DesignBriefSummary = {
  id?: number
  projectId?: number
  remarks?: string
  sentToDesignTeam?: boolean
  sentAt?: string | null
  inHouseDocUrl?: string | null
  moApprovedDocUrl?: string | null
  createdAt?: string
  updatedAt?: string
  [key: string]: unknown
}

export type DesignBriefData = Partial<Record<DeptKey, DeptRecord[]>> & { summary?: DesignBriefSummary | null }

export type BriefComment = {
  id: number
  projectId: number
  department: string
  comment: string
  status: string | null
  createdAt: string
  Creator?: BriefUser | null
}

export type UploadedFile = { id: number; name: string; size: number; type: string; dataUrl: string | null; s3Url: string }

/** Outlet context provided by DesignBriefLayout to the department pages */
export type DesignBriefOutletContext = {
  setAssignmentData: (r: DeptRecord | null) => void
  activeUser: BriefUser | null
  dashboardData: DesignBriefData | null
  refreshData: () => Promise<void>
  canApprove: boolean
}
