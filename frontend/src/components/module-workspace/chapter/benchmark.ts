import type { FieldAnswer, SectionField } from '@/types/module-workspace'

/** Benchmark answers for the project's category (original: midEndAns / premiumAns / affluentAns / hiStreetAns / enclosedMallAns). */
export function benchmarkFor(field: SectionField, category?: string): string[] | undefined {
  switch (category) {
    case 'mid-end':
      return field.midEndAns
    case 'premium':
      return field.premiumAns
    case 'affluent':
      return field.affluentAns
    case 'hi_street':
    case 'high_street': // our seed spells High Street this way
      return field.hiStreetAns
    case 'enclosed_mall':
      return field.enclosedMallAns
    default:
      return []
  }
}

const eq = (a: unknown, b: unknown) => typeof a === 'string' && typeof b === 'string' && a.trim().toLowerCase() === b.trim().toLowerCase()

/** true = matches, false = deviates, null = nothing selected (same truth table as the original). */
export function matchesBenchmark(value: FieldAnswer | undefined, bench: string[] | undefined): boolean | null {
  if (!value || !bench) return null
  if (Array.isArray(value) && value.length > 0) return value.every((v) => bench.some((b) => eq(b, v)))
  if (typeof value === 'string') return bench.some((b) => eq(b, value))
  return false
}

/** Selected values that are not in the benchmark (multiselect message). */
export const nonMatching = (value: FieldAnswer | undefined, bench: string[] | undefined) =>
  Array.isArray(value) && bench ? value.filter((v) => !bench.some((b) => eq(b, v))) : []
