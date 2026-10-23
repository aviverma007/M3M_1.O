/* Types for the module workspace (Module 2 Apartment Design / Module 3 Common Design / commercial chapters). */

export type ChapterStatus = 'pending' | 'active' | 'completed'

export type SectionFieldOption = { id: number; sectionFieldId?: number; fieldOption: string }

export type FieldAnswer = string | string[]

/** Saved answer of one field for the current project (null when never answered). */
export type FieldValue = {
  answer: FieldAnswer
  remark: string
  isFlaged: number
  anyOtherAnswer: string
  benchmarkAnswer?: string[]
}

export type SectionField = {
  id: number
  sectionId: number
  fieldName: string
  fieldType: 'select' | 'multiselect' | 'text' | 'number' | string
  midEndAns: string[]
  premiumAns: string[]
  affluentAns: string[]
  hiStreetAns: string[]
  enclosedMallAns: string[]
  sectionFieldOptions: SectionFieldOption[]
  fieldValue: FieldValue | null
  inputValue?: string | null
}

export type ChapterSection = { id: number; chapterId: number; title: string; sectionFields: SectionField[] }

export type Chapter = {
  id: number
  moduleId: number
  title: string
  chapterNumber: number
  status: ChapterStatus
  isLastChapter: boolean
  chapterSections: ChapterSection[]
}

export type ChapterList = { count: number; rows: Chapter[] }

/** One item of the PUT /chapter/:c (and saveAndDraft) body. */
export type ChapterAnswerInput = {
  sectionId: number
  sectionFieldId: number
  answer: FieldAnswer
  isFlaged: number
  remark: string
  benchmarkAnswer: string[]
  anyOtherAnswer: string
}

/** Original redux "sectionFields" store entry (per-field remark/flag/benchmark state). */
export type FieldMeta = {
  sectionId: number
  sectionFieldId: number
  answer: FieldAnswer
  remark: string
  isFlaged: number
  benchmarkAnswer: string[]
  anyOtherAnswer: string
}

/** Payload handed to the Compare Project dialog (saved as draft before comparing). */
export type ChapterFormData = {
  projectId?: number
  moduleId?: number
  chapterId?: number
  data: ChapterAnswerInput[]
}
