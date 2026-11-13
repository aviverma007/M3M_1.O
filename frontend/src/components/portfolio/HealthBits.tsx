/* Health score ring, status pill, completeness badge and the ranked problem list (portfolio + project pages). */
import { AlertTriangle, CalendarClock, Database, Gauge } from 'lucide-react'
import { cn } from '@/lib/utils'
import { STATUS_META, type HealthStatus, type Problem } from '@/api/portfolio'

export function HealthRing({ score, status, size = 56, stroke = 6 }: { score: number | null; status: HealthStatus; size?: number; stroke?: number }) {
  const m = STATUS_META[status]
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const v = score ?? 0
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} title={`Health ${score ?? '—'} · ${m.label}`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E2E8F0" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={m.ring}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v / 100)}
          style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(0.22,1,0.36,1)' }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-black" style={{ color: m.color, fontSize: size * 0.3 }}>
        {score ?? '—'}
      </span>
    </div>
  )
}

export function StatusPill({ status, className }: { status: HealthStatus; className?: string }) {
  const m = STATUS_META[status]
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider rounded-full px-2.5 py-1', className)} style={{ color: m.color, background: m.bg }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.ring }} />
      {m.label}
    </span>
  )
}

export function CompletenessBadge({ pct, missing }: { pct: number; missing?: string[] }) {
  const color = pct >= 80 ? '#15803D' : pct >= 50 ? '#B45309' : '#B91C1C'
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] font-semibold rounded-md px-2 py-1 bg-slate-50 border border-slate-200"
      title={missing?.length ? `Not filled: ${missing.join(', ')}` : 'All modules filled'}
    >
      <Database size={12} style={{ color }} />
      Data <b style={{ color }}>{pct}%</b>
    </span>
  )
}

const KIND_ICON = { benchmark: Gauge, approval: CalendarClock, data: AlertTriangle } as const

export function ProblemList({ problems, limit = 3, compact }: { problems: Problem[]; limit?: number; compact?: boolean }) {
  if (!problems.length) return <p className="text-xs text-green-700 font-semibold">No problems found.</p>
  return (
    <ol className="space-y-1.5">
      {problems.slice(0, limit).map((p, i) => {
        const Icon = KIND_ICON[p.kind]
        const hot = p.severity >= 0.7
        return (
          <li key={i} className={cn('flex items-start gap-2', compact ? 'text-[11px]' : 'text-xs')}>
            <span className={cn('mt-0.5 shrink-0 rounded-md p-1', hot ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600')}>
              <Icon size={12} />
            </span>
            <span className="text-gray-700 leading-snug">
              <span className="text-gray-400 font-semibold">{p.module}: </span>
              {p.text}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

/** the four score parts with their weights */
export function HealthBreakdown({ parts, weights }: { parts: Record<string, number | null>; weights: Record<string, number> }) {
  const LABEL: Record<string, string> = { benchmarks: 'Within benchmark', completeness: 'Data completeness', approvals: 'Approvals received', schedule: 'Milestones on time' }
  return (
    <div className="space-y-2">
      {Object.keys(LABEL).map((k) => {
        const v = parts[k]
        const color = v === null ? '#CBD5E1' : v >= 75 ? '#16A34A' : v >= 50 ? '#F59E0B' : '#DC2626'
        return (
          <div key={k}>
            <div className="flex justify-between text-[11px]">
              <span className="text-gray-600 font-semibold">
                {LABEL[k]} <span className="text-gray-400 font-normal">· weight {weights[k]}%</span>
              </span>
              <span className="font-bold" style={{ color: v === null ? '#94A3B8' : color }}>
                {v === null ? 'no data' : `${Math.round(v)}%`}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-100 mt-1 overflow-hidden">
              <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${v ?? 0}%`, background: color }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
