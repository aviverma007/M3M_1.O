import type { ScheduleEntry, ScheduleSection } from '@/types/chapters-b'

/** whole days between two ISO dates ('' when missing or finish < start) — same as original */
export function daysBetween(start?: string, finish?: string): number | '' {
  if (!start || !finish) return ''
  const s = new Date(start).getTime()
  const f = new Date(finish).getTime()
  return f < s ? '' : Math.ceil(Math.abs(f - s) / (1000 * 60 * 60 * 24))
}

/** "120 (4.0 mo)" */
export function formatDuration(v: unknown) {
  if (!v && v !== 0) return ''
  const n = Number(v)
  if (!n) return ''
  return `${n} (${(n / 30).toFixed(1)} mo)`
}

export const EMPTY_ENTRY: ScheduleEntry = { task: '', duration: '', start: '', finish: '' }

/** apply a field change and recompute duration when both dates are set */
export function withField(entry: ScheduleEntry, key: keyof ScheduleEntry, value: string): ScheduleEntry {
  const next = { ...entry, [key]: value }
  if (key === 'start' || key === 'finish') {
    const d = daysBetween(next.start, next.finish)
    if (d !== '') next.duration = String(d)
  }
  return next
}

export const DEFAULT_SECTIONS: ScheduleSection[] = ['Residential', 'Retail', 'Parking', 'Common'].map((name, i) => ({
  id: i + 1,
  name,
  start: '',
  finish: '',
  days: '',
  durationMonths: '',
  structureMonths: '',
}))
