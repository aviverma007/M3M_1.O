/* Pure benchmark helpers for the ID Specifications / Common Area pages (shared with the backend DPR export). */
import type { ModuleChapter, SectionField, SpecValue } from '@/types/chapters-a'
import type { SpecsConfig } from './specsTypes'

export const norm = (s?: string | null) => (s ? s.toLowerCase().replace(/[\r\n]+/g, ' ').replace(/[^a-z0-9]/g, '') : '')

export const categoryKey = (c?: string | null) => {
  const v = (c || '').toLowerCase()
  if (v === 'premium') return 'premiumAns'
  if (v === 'affluent') return 'affluentAns'
  if (v === 'hi_street') return 'hiStreetAns'
  if (v === 'enclosed_mall') return 'enclosedMallAns'
  return 'midEndAns'
}

/** true / false / null(no benchmark) — same rules as the original */
export function matchesBenchmark(value: SpecValue | undefined, bench: string[]) {
  if (!value || !Array.isArray(bench) || bench.length === 0) return null
  const b = bench.map((o) => String(o).trim().toLowerCase())
  if (Array.isArray(value)) return value.length === 0 ? null : value.every((o) => b.includes(String(o).trim().toLowerCase()))
  if (typeof value === 'string') return value.trim() ? b.includes(value.trim().toLowerCase()) : null
  return false
}

/** catalogue field for (chapter, room, state key) — same lookup as the page */
export function findSpecField(cfg: SpecsConfig, chapters: ModuleChapter[], chapterId: string, roomId: string, key: string): SectionField | null {
  const num = cfg.chapterNumber[chapterId]
  const active = chapters.find((c) => c.chapterNumber === num)
  if (!active?.chapterSections) return null
  const keyMatches = (fieldName: string) => {
    const n = norm(fieldName)
    const k = key.toLowerCase()
    return n === k || cfg.aliases[n] === k
  }
  const sectionAllowed = (title: string) => {
    if (!cfg.splitWallCeiling) return true
    const t = norm(title)
    return !((chapterId === 'ceiling' && !t.includes('ceiling')) || (chapterId === 'wall' && t.includes('ceiling')))
  }
  let field: SectionField | undefined
  const title = cfg.sectionTitles[num]?.[roomId] || ''
  if (title) {
    const t = norm(title)
    const sec =
      active.chapterSections.find((s) => sectionAllowed(s.title) && norm(s.title) === t) ||
      active.chapterSections.find((s) => {
        const c = norm(s.title)
        return sectionAllowed(s.title) && (c.includes(t) || t.includes(c))
      })
    field = sec?.sectionFields?.find((f) => keyMatches(f.fieldName))
  }
  if (!field)
    for (const s of active.chapterSections) {
      if (!sectionAllowed(s.title) || !s.sectionFields) continue
      field = s.sectionFields.find((f) => keyMatches(f.fieldName))
      if (field) break
    }
  return field ?? null
}
