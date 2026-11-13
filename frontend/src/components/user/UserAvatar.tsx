/* A user's avatar: their chosen emoji, otherwise their initials on a colour picked from their name. */
import { cn } from '@/lib/utils'

const COLORS = ['#2563EB', '#0891B2', '#059669', '#65A30D', '#D97706', '#DC2626', '#DB2777', '#7C3AED', '#4F46E5', '#0F766E']
const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('') || '?'
const colorOf = (name: string) => COLORS[[...name].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) % COLORS.length]

export default function UserAvatar({
  name,
  avatar,
  size = 32,
  className,
}: {
  name?: string | null
  avatar?: string | null
  size?: number
  className?: string
}) {
  const n = name || 'User'
  if (avatar)
    return (
      <span
        className={cn(
          'inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-50 to-orange-100 border border-orange-200/70 select-none',
          className,
        )}
        style={{
          width: size,
          height: size,
          fontSize: size * 0.58,
          lineHeight: 1,
        }}
        title={n}
        aria-label={n}
      >
        {avatar}
      </span>
    )
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white select-none', className)}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: colorOf(n),
      }}
      title={n}
      aria-label={n}
    >
      {initials(n)}
    </span>
  )
}
