/* Shapes stored in the per-project design-brief summary for the chapters-b pages (same keys as the original API). */

export type FieldValue = string | boolean | undefined

/* Landscape & Amenities */
export type LandscapeParam = { name: string; label: string; type: 'switch' | 'select' | 'input'; options?: string[]; unit?: string }
export type LandscapeCategory = { category: string; parameters: LandscapeParam[] }
export type AmenityHead = { head: string; items: string[] }
export type LandscapeAmenitiesData = {
  landscapeConfig?: LandscapeCategory[]
  amenitiesList?: AmenityHead[]
  landscapeData?: Record<string, FieldValue>
  selectedAmenities?: string[]
}

/* Contracting Strategy */
export type Contractor = { id: number; name: string; grade: string; benchmark: string; previous: string; remarks: string }
export type PackageElement = { id: string; name: string; type: string; numberOfContractors: string; typeOfContractors: string; remarks: string }
export type ContractPackage = { id: number; name: string; elements: PackageElement[] }
export type ContractingStrategyData = { contractors?: Contractor[]; packages?: ContractPackage[]; availableElements?: string[] }

/* Consultant Strategy */
export type ConsultantRow = {
  id: number
  type: string
  name: string
  status: 'Appointed' | 'Not Appointed' | string
  plannedDate: string
  actualDate: string
  remarks: string
}

/* Phasing Plan */
export type Phase = {
  id: number
  name: string
  siteArea: string
  noOfTowers: string
  noOfUnits: string
  farPermissible: string
  farUtilized: string
  saPerUnit: string
  farPerUnit: string
  mapImage: string | null
}

/* Project Schedule */
export type ScheduleEntry = { task: string; duration: string; start: string; finish: string }
export type SubSchedule = ScheduleEntry & { id: number }
export type MasterSchedule = ScheduleEntry & { id: number; expanded?: boolean; subTasks: SubSchedule[] }
export type ScheduleSection = {
  id: number
  name: string
  start: string
  finish: string
  days: string | number
  durationMonths: string
  structureMonths: string
}
export type UploadedImage = { name: string; url: string; size: string }
export type ProjectScheduleData = {
  schedules?: MasterSchedule[]
  sections?: ScheduleSection[]
  uploadedImages?: UploadedImage[]
  uploadedFile?: UploadedImage
}

/* Approvals */
export type ApprovalRow = {
  id: number
  type: string
  plannedSubmission: string
  actualSubmission: string
  plannedApproval: string
  actualApproval: string
  remarks: string
}

/* Additional Project Details */
export type DetailFile = string | { name: string; url: string }
export type AdditionalDetail = { id: number; subject: string; description: string; files: DetailFile[] }

/** The per-project record behind GET/POST /project/:id/design-brief-summary (other groups add their own keys). */
export type DesignBriefSummary = {
  id?: number
  projectId?: number
  landscapeAmenitiesData?: LandscapeAmenitiesData
  serviceDesignData?: Record<string, FieldValue>
  contractingStrategyData?: ContractingStrategyData
  consultantStrategyData?: ConsultantRow[]
  phasingPlanData?: Phase[]
  projectScheduleData?: ProjectScheduleData
  approvalsData?: ApprovalRow[]
  additionalProjectDetailsData?: AdditionalDetail[]
  [k: string]: unknown
}
