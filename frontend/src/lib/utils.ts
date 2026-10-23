import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** "mid-end" -> "Mid End", "enclosed_mall" -> "Enclosed Mall" */
export function titleCase(value?: string | null) {
  if (!value) return ''
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function formatDate(value?: string | Date | null, fallback = '-') {
  if (!value) return fallback
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return fallback
  return d.toISOString().slice(0, 10)
}

/** dd/mm/yyyy */
export function formatDateDMY(value?: string | Date | null, fallback = '-') {
  if (!value) return fallback
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return fallback
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

/** 15 Oct 2026 */
export function formatDateLong(value?: string | Date | null, fallback = '-') {
  if (!value) return fallback
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return fallback
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
