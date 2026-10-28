/* Pure types for the ID Specifications / Common Area pages (shared with the backend DPR export). */
import type { SpecData, SpecEntry } from '@/types/chapters-a'

export type Item = { id: string; name: string }

export type SpecsConfig = {
  title: string
  moduleId: number
  dataKey: 'idSpecificationsData' | 'commonAreaData'
  chapters: Item[]
  /** chapter id -> catalogue chapter number */
  chapterNumber: Record<string, number>
  /** chapter number -> room id -> catalogue section title */
  sectionTitles: Record<number, Record<string, string>>
  rooms: (chapterId: string) => Item[]
  initialChapter: string
  initialRoom: string
  initialData: SpecData
  /** normalised field name -> state key (compared with key.toLowerCase(), like the original) */
  aliases: Record<string, string>
  emptyEntry: SpecEntry
  /** state keys tried, in order, when mapping a catalogue field to a state key */
  fieldKeys: string[]
  defaultOptions: Record<string, string[]>
  /** Common Area: keep ceiling sections for "ceiling" and the rest for "wall" */
  splitWallCeiling?: boolean
  /** ID Specifications: rooms can be hidden/restored, fixed-height scrolling lists, "other toilets" fallback */
  idLayout?: boolean
  saveSuccess: string
  saveError: string
  loadErrorLabel: string
}
