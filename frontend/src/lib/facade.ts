/*
 * Façade & Envelope (new DPR module, residential 14 / commercial 10): inputs, options and outputs.
 * Pure functions — shared by the form, the DPR renderer (backend) and the Comparison.
 *
 * Outputs
 *   Glazing %              = glazed area ÷ façade area
 *   Façade cost            = façade area × façade cost per sq ft (of façade)
 *   Façade cost / saleable = façade cost ÷ saleable area                   (Rs. per sq ft of saleable area)
 *   Effective glass area   = glazed area × SHGC                            (sq ft that lets the sun's heat through)
 *   Heat-gain index        = effective glass area per 1,000 sq ft saleable (lower = cooler building, smaller AC load)
 *   Glass load per TR      = effective glass area ÷ installed apartment cooling (TR = tonnage per apartment × units)
 */
export type FacadeData = {
  facadeSystem?: string
  facadeSystemOther?: string
  secondarySystem?: string
  glassType?: string
  shgc?: string
  uValue?: string
  vlt?: string
  shadingDevices?: string
  railingType?: string
  cleaningMethod?: string
  facadeArea?: string
  glazedArea?: string
  facadeCostPerSqft?: string
  remarks?: string
}

export const FACADE_OPTIONS = {
  facadeSystem: ['Unitised Glazing', 'Stick Glazing (Curtain Wall)', 'Punched Windows', 'Stone Cladding', 'ACP Cladding', 'HPL Cladding', 'Paint & Texture', 'Mixed', 'Other'],
  glassType: ['Single Glazed', 'Double Glazed (DGU)', 'DGU Low-E', 'Laminated', 'DGU Laminated Low-E', 'Triple Glazed'],
  shadingDevices: ['None', 'Horizontal Fins', 'Vertical Fins', 'Louvers', 'Deep Balconies / Overhangs', 'Mixed'],
  railingType: ['Glass', 'MS', 'SS', 'Aluminium', 'Masonry Parapet', 'Mixed'],
  cleaningMethod: ['BMU', 'Gondola', 'Rope Access', 'From Balconies', 'Mixed'],
} as const

/** form layout: label, key, kind, unit, hint */
export type FacadeField = { key: keyof FacadeData; label: string; kind: 'select' | 'number' | 'text'; unit?: string; hint?: string; options?: readonly string[] }
export const FACADE_SECTIONS: { title: string; fields: FacadeField[] }[] = [
  {
    title: 'Façade System',
    fields: [
      { key: 'facadeSystem', label: 'Primary Façade System', kind: 'select', options: FACADE_OPTIONS.facadeSystem },
      { key: 'secondarySystem', label: 'Secondary System (if mixed)', kind: 'select', options: FACADE_OPTIONS.facadeSystem },
      { key: 'railingType', label: 'Railing Type', kind: 'select', options: FACADE_OPTIONS.railingType },
      { key: 'shadingDevices', label: 'Shading Devices', kind: 'select', options: FACADE_OPTIONS.shadingDevices },
      { key: 'cleaningMethod', label: 'Façade Cleaning / Maintenance', kind: 'select', options: FACADE_OPTIONS.cleaningMethod },
    ],
  },
  {
    title: 'Glass Performance',
    fields: [
      { key: 'glassType', label: 'Glass Type', kind: 'select', options: FACADE_OPTIONS.glassType },
      { key: 'shgc', label: 'SHGC (Solar Heat Gain Coefficient)', kind: 'number', hint: '0 – 1, lower lets in less heat' },
      { key: 'uValue', label: 'U-Value', kind: 'number', unit: 'W/m²K', hint: 'lower insulates better' },
      { key: 'vlt', label: 'Visible Light Transmission (VLT)', kind: 'number', unit: '%' },
    ],
  },
  {
    title: 'Areas & Cost',
    fields: [
      { key: 'facadeArea', label: 'Total Façade Area', kind: 'number', unit: 'sq ft', hint: 'all external walls incl. glazing' },
      { key: 'glazedArea', label: 'Glazed Area', kind: 'number', unit: 'sq ft' },
      { key: 'facadeCostPerSqft', label: 'Façade Cost per sq ft (of façade)', kind: 'number', unit: 'Rs./sq ft' },
    ],
  },
]

const n = (v: unknown) => {
  const x = parseFloat(String(v ?? '').replace(/,/g, ''))
  return Number.isFinite(x) ? x : null
}

export type FacadeContext = {
  /** Module 6 saleable area (sq ft) */
  saleable: number | null
  /** Module 6 Total External Wall Area (sq ft), used when the façade area isn't entered here */
  externalWallArea?: number | null
  /** installed apartment cooling, TR (MEP tonnage per apartment × units) */
  coolingTR?: number | null
}

export type FacadeOutputs = {
  facadeArea: number | null
  facadeAreaFromModule6: boolean
  glazedArea: number | null
  glazingPct: number | null
  totalCost: number | null
  costPerSaleable: number | null
  effectiveGlass: number | null
  heatGainIndex: number | null
  glassPerTR: number | null
}

export function facadeOutputs(f: FacadeData | null | undefined, c: FacadeContext): FacadeOutputs {
  const d = f ?? {}
  const own = n(d.facadeArea)
  const facadeArea = own ?? (c.externalWallArea && c.externalWallArea > 0 ? c.externalWallArea : null)
  const glazedArea = n(d.glazedArea)
  const shgc = n(d.shgc)
  const rate = n(d.facadeCostPerSqft)
  const glazingPct = facadeArea && glazedArea !== null && glazedArea <= facadeArea ? (glazedArea / facadeArea) * 100 : null
  const totalCost = facadeArea && rate ? facadeArea * rate : null
  const costPerSaleable = totalCost && c.saleable ? totalCost / c.saleable : null
  const effectiveGlass = glazedArea !== null && shgc !== null && shgc >= 0 && shgc <= 1 ? glazedArea * shgc : null
  const heatGainIndex = effectiveGlass !== null && c.saleable ? (effectiveGlass / c.saleable) * 1000 : null
  const glassPerTR = effectiveGlass !== null && c.coolingTR ? effectiveGlass / c.coolingTR : null
  return { facadeArea, facadeAreaFromModule6: own === null && facadeArea !== null, glazedArea, glazingPct, totalCost, costPerSaleable, effectiveGlass, heatGainIndex, glassPerTR }
}

/** context from a project's saved data (summary + MEP record) */
export function facadeContextOf(summary: Record<string, unknown> | null | undefined, mep: Record<string, unknown> | null | undefined): FacadeContext {
  const s = summary ?? {}
  const pl = (s.projectLevelDesignData ?? {}) as { keyRatioInputs?: Record<string, unknown> }
  const kr = pl.keyRatioInputs ?? {}
  const m = { ...((mep?.fields as object) ?? {}), ...((mep?.customFields as object) ?? {}), ...(mep ?? {}) } as Record<string, unknown>
  const tr = n(m.tonnageApartment)
  const units = n(kr.noOfUnits)
  return { saleable: n(kr.saleableArea), externalWallArea: n(kr.totalExternalWallArea), coolingTR: tr && units ? tr * units : null }
}

export const facadeText = (d: FacadeData | null | undefined, k: keyof FacadeData) => {
  const v = String(d?.[k] ?? '').trim()
  return k === 'facadeSystem' && v === 'Other' && d?.facadeSystemOther ? String(d.facadeSystemOther) : v
}
