/* Types for the Key Ratio module (residential + commercial) and the Compare Projects page.
 * Shapes mirror the original API responses (GET /keyRatio, GET /commercial/create-key-ratio, POST /compare/get-projects). */

/** Flat numeric input columns of a residential key ratio record (keyRatioFields[0]). */
export type KeyRatioForm = Record<string, string | number | null | undefined>

/** One calculated ratio of a residential project (keyCalFields[tab][section][]). */
export type ResCalField = {
  id: number
  field_id?: number
  field_name: string
  tab: string
  section: string
  section_id: number
  order_id?: number
  units?: string
  mid_end?: string | null
  premium?: string | null
  affluent?: string | null
  mid_end_range?: string | Record<string, unknown> | null
  premium_range?: string | Record<string, unknown> | null
  affluent_range?: string | Record<string, unknown> | null
  dependecy_fields?: string[]
  dependency_fields?: string[]
  rupee_value?: number
  value?: number | string | null
  is_flag?: boolean | number | null
  remark?: string | null
  calculated_cost?: number | null
  [k: string]: unknown
}

export type KeyCalFields = Record<string, Record<string, ResCalField[]>>

export type ProjectOwners = { design_owner?: string | null; structure_owner?: string | null; mep_owner?: string | null }

export type ResidentialKeyRatio = {
  keyRatioFields: KeyRatioForm[]
  keyCalFields: KeyCalFields
  projectOwners: ProjectOwners
  calculatedFields?: { section_id: number; section_cost: string }[]
}

/* ---------------- commercial ---------------- */
export type ComInputField = { field_id: number; field_name: string; units?: string; value?: string | number | null; is_visible?: boolean | number }

export type ComOutputField = {
  id?: number
  field_id: number
  field_name: string
  units?: string
  is_visible?: boolean | number
  dependency?: number[]
  field_value?: number | string | null
  remark?: string | null
  is_flag?: boolean | number | null
  calculated_cost?: number | null
  [k: string]: unknown
}

export type ComKeyRatioData = {
  inputData: Record<string, Record<string, ComInputField[]>>
  outputData: Record<string, Record<string, ComOutputField[]>>
  owner?: ProjectOwners
}

export type CommercialKeyRatio = { keyRatioData: ComKeyRatioData }

/* ---------------- compare ---------------- */
export type CompareNavModule = { moduleId: number; firstChapterId: number | null } | null

export type ChapterFieldValue = { answer?: string | string[] | null; remark?: string | null; isFlaged?: number | boolean | null; anyOtherAnswer?: string | null }

export type CompareSectionField = {
  id: number
  sectionId?: number
  fieldName: string
  fieldType: string
  sectionFieldOptions: { id: number; fieldOption: string }[]
  midEndAns?: string[]
  premiumAns?: string[]
  affluentAns?: string[]
  hiStreetAns?: string[]
  enclosedMallAns?: string[]
  fieldValue?: ChapterFieldValue | null
  [k: string]: unknown
}

export type CompareChapter = {
  id: number
  title: string
  chapterNumber: number
  status: string
  isLastChapter?: boolean
  chapterSections: { id: number; title: string; sectionFields: CompareSectionField[] }[]
}

export type CompareProject = {
  id: number
  name: string
  category: string
  projectType: string
  keyRatioFields?: KeyRatioForm[]
  keyCalFields?: KeyCalFields
  inputData?: ComKeyRatioData['inputData']
  outputData?: ComKeyRatioData['outputData']
  moduleData?: { rows: CompareChapter[] }
}

export type CompareResponse = {
  currentProject: CompareProject | null
  comparedProjects: CompareProject[]
  navigation: { prevModule: CompareNavModule; nextModule: CompareNavModule }
  module?: { id: number; moduleNumber: number; name: string; projectType: string } | null
}
