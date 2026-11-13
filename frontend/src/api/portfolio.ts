/* Portfolio (owner view): GET /portfolio — figures, completeness, data issues and health score per project */
import { http } from '@/api/http'
import type { DataIssue } from '@/lib/dataChecks'

export type HealthStatus = 'on-track' | 'attention' | 'at-risk' | 'no-data'
export type Problem = { kind: 'benchmark' | 'approval' | 'data'; module: string; text: string; severity: number }
export type Check = { module: string; label: string; value: string; unit?: string; req: string; ok: boolean }

export type PortfolioProject = {
  id: number
  name: string
  location: string
  portfolio: string
  category: string
  projectType: string
  classification: string
  lastUpdate: { at: string | null; by: string | null }
  metrics: {
    totalUnits: number | null
    residentialUnits: number | null
    saleable: number | null
    siteAcres: number | null
    towers: number | null
    gsv: number | null
    cost: number | null
    costPct: number | null
    carpetSaleable: number | null
    saleableFar: number | null
    buaSaleable: number | null
    farUtil: number | null
    carsPerUnit: number | null
    cars: number | null
    salesPrice: number | null
    costRate: number | null
  }
  approvals: { listed: number; received: number; due: number; onTime: number; overdue: number; rera: string }
  completeness: { pct: number; filled: string[]; missing: string[]; total: number }
  checks: { total: number; ok: number; failed: Check[] }
  dataIssues: DataIssue[]
  health: {
    score: number | null
    status: HealthStatus
    parts: { benchmarks: number | null; completeness: number; approvals: number | null; schedule: number | null }
    problems: Problem[]
  }
}

export type Portfolio = { generatedAt: string; weights: Record<'benchmarks' | 'completeness' | 'approvals' | 'schedule', number>; projects: PortfolioProject[] }

export async function getPortfolio() {
  const r = await http.get<{ data: Portfolio }>('/portfolio')
  return r.data
}
export async function getProjectHealth(id: string | number) {
  const r = await http.get<{ data: PortfolioProject }>(`/portfolio/${id}`)
  return r.data
}

export { isTestProject } from '@/lib/dataChecks'

export const STATUS_META: Record<HealthStatus, { label: string; color: string; bg: string; ring: string }> = {
  'on-track': { label: 'On track', color: '#15803D', bg: '#DCFCE7', ring: '#16A34A' },
  attention: { label: 'Needs attention', color: '#B45309', bg: '#FEF3C7', ring: '#F59E0B' },
  'at-risk': { label: 'At risk', color: '#B91C1C', bg: '#FEE2E2', ring: '#DC2626' },
  'no-data': { label: 'Not enough data', color: '#64748B', bg: '#F1F5F9', ring: '#94A3B8' },
}
