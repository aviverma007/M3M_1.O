/** "Similar entry" checks used by Hide Entry / Enable on the compare page (original Ye / Ze / Ue / De-Pe maps). */
import type { CompareChapter, CompareProject, ComKeyRatioData } from '@/types/keyratio-compare'

/** Residential input `key` equal across all compared projects (original Ye). */
export function sameInput(key: string, projects: CompareProject[]) {
  if (!Array.isArray(projects) || projects.length < 2) return false
  for (let i = 0; i < projects.length - 1; i++) if (projects[i]?.keyRatioFields?.[0]?.[key] !== projects[i + 1]?.keyRatioFields?.[0]?.[key]) return false
  return true
}

/** Residential calculated ratio equal across all compared projects (original Ze). */
export function sameRatio(projects: CompareProject[], id: number, tab: string, section: string) {
  if (!Array.isArray(projects) || projects.length < 2) return false
  const val = (p: CompareProject) => p.keyCalFields?.[tab]?.[section]?.find((f) => f.id === id)?.value
  if ((val(projects[0]) as unknown) === false) return false
  for (let i = 0; i < projects.length - 1; i++) if (val(projects[i]) !== val(projects[i + 1])) return false
  return true
}

/**
 * Commercial: field_id -> common value (or false) across compared projects (original De / Pe Map logic).
 * A truthy entry means "all equal and non-empty".
 */
export function commonValues<T extends { field_id: number }>(projects: CompareProject[], pick: (p: CompareProject) => T[], value: (f: T) => unknown) {
  const m = new Map<number | undefined, unknown>()
  projects.forEach((p) =>
    pick(p).forEach((f) => {
      if (m.has(f?.field_id)) {
        if (m.get(f.field_id) !== false) m.set(f.field_id, m.get(f.field_id) === value(f) ? value(f) : false)
      } else m.set(f?.field_id, value(f))
    }),
  )
  return m
}

/** All inputs of a commercial project in one flat list. */
export const flatInputs = (d?: ComKeyRatioData['inputData']) => Object.values(d ?? {}).flatMap((s) => Object.values(s ?? {}).flat())

/** Chapter answers comparison of two projects (original Ue). */
export function sameAnswer(answers: unknown[], others: (string | null | undefined)[]) {
  const [a, b] = answers
  if (Array.isArray(a) && Array.isArray(b)) {
    const x = [...a].sort()
    const y = [...b].sort()
    const any = (arr: string[]) => arr.some((v) => v?.toLowerCase() === 'any other')
    if (any(x) && any(y)) return others[0]?.toLowerCase() === others[1]?.toLowerCase()
    return JSON.stringify(x) === JSON.stringify(y)
  }
  return answers.every((v) => v === a)
}

/** field id -> similar, for the requested chapter (last compared pair wins, like the original ref merge). */
export function chapterSimilarity(compared: CompareProject[]) {
  const out: Record<number, boolean> = {}
  const rows = compared[0]?.moduleData?.rows ?? []
  rows.forEach((ch: CompareChapter, ci) =>
    ch.chapterSections?.forEach((sec, si) =>
      sec.sectionFields?.forEach((f) => {
        for (let u = 0; u < compared.length - 1; u++) {
          const fa = compared[u].moduleData?.rows?.[ci]?.chapterSections?.[si]?.sectionFields?.find((x) => x.id === f.id)
          const fb = compared[u + 1].moduleData?.rows?.[ci]?.chapterSections?.[si]?.sectionFields?.find((x) => x.id === f.id)
          if (fa?.id) out[fa.id] = sameAnswer([fa?.fieldValue?.answer, fb?.fieldValue?.answer], [fa?.fieldValue?.anyOtherAnswer, fb?.fieldValue?.anyOtherAnswer])
        }
      }),
    ),
  )
  return out
}
