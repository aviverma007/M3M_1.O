/*
 * Efficiency Dashboard export: one page model drives the print preview, the PDF, the PowerPoint and the Excel file,
 * so what is previewed is what is downloaded. Built from what the dashboard shows (selected projects, filters,
 * the section tab) plus the export dialog's choices.
 */
import { isOutlier, outOfRange, rankScore, rowStats, type EffGroup, type EffRowMeta, type EffValue, type RowStats } from '@/lib/efficiency'
import type { EffProject } from '@/api/portfolio'
import { fmtIN } from '@/lib/format'

export type Tone = 'best' | 'good' | 'bad' | 'worst' | 'outlier' | 'entry' | null
export type RCell = { text: string; tone: Tone }
export type RRow = { label: string; unit: string; source: string; cells: RCell[]; avg: string; empty: boolean }
export type Band = { name: string; span: number }

export type ReportPage =
  | { kind: 'cover'; title: string; subtitle: string; meta: [string, string][]; projects: { portfolio: string; names: string[] }[] }
  | {
      kind: 'summary'
      cards: { label: string; avg: string; unit: string; range: string; best: string }[]
      watch: { project: string; heading: string; value: string; avg: string }[]
    }
  | { kind: 'table'; group: string; tone: string; part: string; projects: string[]; bands: Band[]; rows: RRow[] }
  | { kind: 'method'; part: string; rows: { group: string; label: string; formula: string; source: string; status: string }[] }

export type ReportOptions = {
  groups: string[]
  cover: boolean
  summary: boolean
  method: boolean
  hideEmpty: boolean
  /** projects per page (columns) and headings per page (rows) */
  perPage: number
  rowsPerPage: number
  /** rows of the watch list on the summary page */
  watchRows: number
}

const HEADLINE = ['superFar', 'buaSuper', 'buaFar', 'balconyFar', 'subPct', 'steelPlanned']
const fmt = (r: EffRowMeta, v: EffValue) => (v === null ? '' : typeof v === 'number' ? fmtIN(v, r.dp ?? 2) : v)
const chunk = <T>(xs: T[], n: number) => {
  const out: T[][] = []
  for (let i = 0; i < xs.length; i += n) out.push(xs.slice(i, i + n))
  return out.length ? out : [[]]
}
const STATUS: Record<string, string> = { captured: 'Coming', partial: 'Partly', missing: 'Not captured' }

function tone(r: EffRowMeta, s: RowStats, v: EffValue, id: string): Tone {
  if (outOfRange(r, v)) return 'entry'
  if (typeof v !== 'number') return null
  if (s.bestId === id) return 'best'
  if (isOutlier(r, s, v)) return 'outlier'
  const sc = rankScore(r, s, v)
  if (sc === null) return null
  return sc >= 0.66 ? 'good' : sc <= 0.33 ? 'bad' : null
}

export function buildReport(
  data: { groups: EffGroup[]; rows: EffRowMeta[] },
  projects: EffProject[],
  opt: ReportOptions,
  filters: { portfolio: string; type: string },
): ReportPage[] {
  const pages: ReportPage[] = []
  const stats: Record<string, RowStats> = {}
  for (const r of data.rows)
    stats[r.id] = rowStats(
      r,
      projects.map((p) => ({ id: String(p.id), v: p.values[r.id] })),
    )
  const groups = data.groups.filter((g) => opt.groups.includes(g.id))
  const now = new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })

  if (opt.cover) {
    const byPf: { portfolio: string; names: string[] }[] = []
    for (const p of projects) {
      const g = byPf.find((x) => x.portfolio === p.portfolio)
      if (g) g.names.push(p.name)
      else byPf.push({ portfolio: p.portfolio, names: [p.name] })
    }
    pages.push({
      kind: 'cover',
      title: 'Project Design Efficiencies',
      subtitle: 'Management review — calculated from each project’s modules in M3M_1.O',
      meta: [
        ['Prepared on', now],
        ['Projects', String(projects.length)],
        ['Portfolio', filters.portfolio],
        ['Project type', filters.type],
        ['Sections', groups.length === data.groups.length ? 'All sections' : groups.map((g) => g.title).join(', ')],
      ],
      projects: byPf,
    })
  }

  if (opt.summary) {
    const cards = HEADLINE.map((id) => data.rows.find((r) => r.id === id))
      .filter((r): r is EffRowMeta => !!r)
      .map((r) => {
        const s = stats[r.id]
        const best = projects.find((p) => String(p.id) === s.bestId)
        return {
          label: r.label,
          avg: s.avg === null ? '–' : fmtIN(s.avg, r.dp ?? 2),
          unit: r.unit ?? '',
          range: s.min === null ? '' : `${fmtIN(s.min, r.dp ?? 2)} – ${fmtIN(s.max!, r.dp ?? 2)} · ${s.n} projects`,
          best: best ? `${best.name} (${fmt(r, best.values[r.id])})` : '',
        }
      })
    const watch: { project: string; heading: string; value: string; avg: string; z: number }[] = []
    const seen = new Set<string>()
    for (const r of data.rows) {
      if (seen.has(r.label) || !opt.groups.includes(r.group)) continue
      seen.add(r.label)
      const s = stats[r.id]
      for (const p of projects) {
        const v = p.values[r.id]
        if (typeof v !== 'number' || !isOutlier(r, s, v)) continue
        watch.push({
          project: p.name,
          heading: r.label,
          value: `${fmt(r, v)}${r.unit ? ' ' + r.unit : ''}`,
          avg: fmtIN(s.avg!, r.dp ?? 2),
          z: Math.abs(v - s.avg!) / (s.sd || 1),
        })
      }
    }
    watch.sort((a, b) => b.z - a.z)
    pages.push({ kind: 'summary', cards, watch: watch.slice(0, opt.watchRows).map(({ z: _z, ...w }) => w) }) // eslint-disable-line @typescript-eslint/no-unused-vars
  }

  const colChunks = chunk(projects, Math.max(2, opt.perPage))
  for (const g of groups) {
    const rows = data.rows
      .filter((r) => r.group === g.id)
      .map((r): RRow => {
        const s = stats[r.id]
        return {
          label: r.label,
          unit: r.unit ?? '',
          source: `${r.moduleNo} ${r.module}`,
          cells: projects.map((p) => {
            const v = p.values[r.id]
            return { text: fmt(r, v), tone: tone(r, s, v, String(p.id)) }
          }),
          avg: s.avg === null ? '' : fmtIN(s.avg, r.dp ?? 2),
          empty: projects.every((p) => p.values[r.id] === null),
        }
      })
      .filter((r) => !opt.hideEmpty || !r.empty)
    if (!rows.length) continue
    const rowChunks = chunk(rows, Math.max(4, opt.rowsPerPage))
    const total = colChunks.length * rowChunks.length
    let n = 0
    colChunks.forEach((cols, ci) => {
      const start = ci * Math.max(2, opt.perPage)
      const bands: Band[] = []
      for (const p of cols) {
        const last = bands[bands.length - 1]
        if (last && last.name === p.portfolio) last.span++
        else bands.push({ name: p.portfolio, span: 1 })
      }
      for (const rs of rowChunks) {
        n++
        pages.push({
          kind: 'table',
          group: g.title,
          tone: g.tone,
          part: total > 1 ? `${n} of ${total}` : '',
          projects: cols.map((p) => p.name),
          bands,
          rows: rs.map((r) => ({ ...r, cells: r.cells.slice(start, start + cols.length) })),
        })
      }
    })
  }

  if (opt.method) {
    const rows = data.rows
      .filter((r) => opt.groups.includes(r.group))
      .map((r) => ({
        group: data.groups.find((g) => g.id === r.group)?.title ?? '',
        label: r.label,
        formula: r.formula,
        source: `${r.moduleNo} ${r.module}`,
        status: STATUS[r.status],
      }))
    const parts = chunk(rows, 16)
    parts.forEach((rs, i) => pages.push({ kind: 'method', part: parts.length > 1 ? `${i + 1} of ${parts.length}` : '', rows: rs }))
  }
  return pages
}

/* ------------------------------------------------------------------ shared colours (preview, PDF, PPT) */
export const TONE_FILL: Record<string, string> = {
  best: '#a7f3d0',
  good: '#dcfce7',
  bad: '#ffe4e6',
  worst: '#fecdd3',
  outlier: '#ffe4e6',
  entry: '#fef3c7',
}
export const TONE_TEXT: Record<string, string> = { best: '#065f46', outlier: '#e11d48', entry: '#b45309' }
export const BRAND = { blue: '#00509d', navy: '#003366', sky: '#0a6fc2', slate: '#1e293b', grey: '#64748b', line: '#e2e8f0' }

/** characters the PDF's built-in fonts can't print */
export const pdfSafe = (s: string) =>
  s
    .replace(/Σ/g, 'Sum')
    .replace(/−/g, '-')
    .replace(/[★☆]/g, '')
    .replace(/[’‘]/g, "'")
    .replace(/[^\x20-\x7E -ÿ–—•…›‹×÷²³€]/g, '')
