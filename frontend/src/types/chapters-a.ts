/* Shapes used by the "chapters-a" design-chapter pages (same keys as the original API). */

/* ---------------- Project Details & Layout ---------------- */
export type LayoutFile = { id: number; name: string; url: string; size: string; date: string }
export type ProjectLayout = { id: number; name: string; files: LayoutFile[]; fixed?: boolean; infoText?: string }
export type UnitRow = { type: string; count: string; size: string; area: number | string; total: number | string }
export type TypeRow = { type: string; typology: string; units: UnitRow[]; total?: number | string }
export type CustomField = { label: string; value: string; imageUrl?: string }
export type ProjectDetailsLayoutData = {
  noOfTowers?: string
  towerHeight?: string
  totalArea?: string
  layouts?: ProjectLayout[]
  tableRows?: TypeRow[]
  customFields?: CustomField[]
  customFieldsImage?: string
  grandTotalSaleable?: number
}

/* ---------------- Project Level Design ---------------- */
export type KeyRatioInputs = Record<string, string>
export type AreaStatementInputs = Record<string, string>
export type AreaRow = { category: string; bua: string; sa: string; ca: string }
export type ParkingReq = { label: string; value: string }
export type AdditionalElements2 = {
  rows: AreaRow[]
  other: Record<string, string | ParkingReq[] | undefined> & { extraParkingReqs?: ParkingReq[] }
}
export type ClusterConfig = Record<string, string> & { name: string }
export type ProjectLevelDesignData = {
  keyRatioInputs?: KeyRatioInputs
  areaStatementInputs?: AreaStatementInputs
  additionalElements2?: AdditionalElements2
  clusterConfigs?: ClusterConfig[]
  compareProjectIds?: string[]
}

/* ---------------- Unit Level Design ---------------- */
export type Typology = {
  id: number
  name: string
  type: string
  noOfUnits: string
  saleableArea: string
  coveredArea: string
  unitFar: string
  balconyAreaNonFar: string
  balconyAreaFar: string
  carpetArea: string
  coreArea: string
  unitsPerCore: string
  internalWallThickness: string
  commonWallThickness: string
  wallArea: string
  acArea: string
  circulationFar: string
  permissibleFar: string
  plan: string | null
  keyPlan: string | null
  isOpen: boolean
  grid?: Record<string, { bua: string; sa: string; ca: string }>
}

/* ---------------- ID Specifications / Common Area ---------------- */
export type SpecValue = string | string[]
export type SpecEntry = Record<string, SpecValue>
/** keyed `${chapterId}_${roomId}`; ID Specifications also stores `__hidden: string[]` */
export type SpecData = Record<string, SpecEntry | string[]>

/* ---------------- Module chapter catalogue (Apartment / Common Design) ---------------- */
export type SectionFieldOption = { id: number; fieldOption: string }
export type SectionField = {
  id: number
  fieldName: string
  fieldType: 'select' | 'multiselect' | string
  midEndAns: string[]
  premiumAns: string[]
  affluentAns: string[]
  hiStreetAns?: string[]
  enclosedMallAns?: string[]
  sectionFieldOptions: SectionFieldOption[]
  fieldValue?: unknown
  inputValue?: unknown
}
export type ChapterSection = { id: number; title: string; sectionFields: SectionField[] }
export type ModuleChapter = { id: number; moduleId: number; chapterNumber: number; title: string; status?: string; chapterSections?: ChapterSection[] }

/* ---------------- design-brief summary (only the keys these pages use) ---------------- */
export type ChaptersASummary = {
  id?: number
  projectId?: number
  projectDetailsLayoutData?: ProjectDetailsLayoutData
  projectLevelDesignData?: ProjectLevelDesignData
  unitLevelDesignData?: Typology[]
  idSpecificationsData?: SpecData
  commonAreaData?: SpecData
  [k: string]: unknown
}

/* ---------------- Structure / MEP department records ---------------- */
export type UserLite = { id: number; name: string; email?: string; role?: string; department?: string | null }
export type DynamicInput = { id: number; group: string; name: string; benchmark: string; value: string }
export type StructureRecord = {
  id: number
  projectId: number
  status?: string
  customFields?: Record<string, unknown> & { dynamicInputs?: DynamicInput[] }
  [k: string]: unknown
}
export type MepRecord = {
  id: number
  projectId: number
  status?: string
  assignedTo?: number | null
  deadline?: string | null
  customFields?: Record<string, string | null>
  Assignee?: UserLite | null
  Creator?: UserLite | null
  [k: string]: unknown
}
