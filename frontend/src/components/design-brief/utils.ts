import type { DeptRecord } from '@/types/design-brief'

export const SUPER_ADMIN_ROLES = ['super_admin', 'superadmin', 'admin', 'super admin']
export const DAY_MS = 1000 * 60 * 60 * 24

/** role -> display label (same mapping as the original) */
export function roleLabel(role?: string | null) {
  if (!role) return ''
  switch (role.toLowerCase().trim()) {
    case 'super_admin':
    case 'superadmin':
    case 'super admin':
      return 'Super Admin'
    case 'general_admin':
    case 'general admin':
      return 'HOD Admin'
    case 'design_admin':
    case 'design admin':
      return 'HOD Design'
    case 'general_contributor':
    case 'general contributor':
      return 'Contributor'
    case 'design_contributor':
    case 'design contributor':
      return 'Design Contributor'
    default:
      return role.replace(/_/g, ' ')
  }
}

export function timeAgo(value: string) {
  const d = new Date(value)
  const sec = Math.floor((Date.now() - d.getTime()) / 1000)
  if (sec < 60) return 'just now'
  const m = Math.floor(sec / 60)
  if (m < 60) return `${m} minute${m > 1 ? 's' : ''} ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} hour${h > 1 ? 's' : ''} ago`
  const days = Math.floor(h / 24)
  return days < 7 ? `${days} day${days > 1 ? 's' : ''} ago` : d.toLocaleDateString()
}

/** short form used in the layout's side comment card */
export function timeAgoShort(value: string) {
  const sec = Math.floor((Date.now() - new Date(value).getTime()) / 1000)
  if (sec < 60) return 'just now'
  const m = Math.floor(sec / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`
}

/** "15 Oct 2026" or "-" */
export const fmtShort = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'

export const isDone = (r: Pick<DeptRecord, 'status' | 'receivedDate'>) =>
  !!r.receivedDate || r.status === 'Completed' || r.status === 'Submitted' || r.status === 'Approved'

/** whole days between two instants, rounded up */
export const daysBetween = (a: Date, b: Date) => Math.ceil(Math.abs(a.getTime() - b.getTime()) / DAY_MS)

export const endOfDay = (v: string) => {
  const d = new Date(v)
  d.setHours(23, 59, 59, 999)
  return d
}
