/*
 * Façade & Envelope (DPR module 14 / commercial 10) — per the Smartworld requirement document (Nov 2026).
 *
 * A project has any number of FAÇADE SYSTEMS (curtain wall, sliding windows, stone cladding …); each system has its own
 * configuration (A), glass specification & performance (B), areas (C), cost (D) and design governance (E).
 * Shared by the form, the DPR renderer (backend) and the Comparison, so all three use the same fields, rules and maths.
 *
 * Stored in designBriefSummaries.extra.facadeData as { version: 2, systems: FacadeSystem[], remarks }.
 * Older single-entry data ({ facadeSystem, glassType, shgc … }) is converted to one system on read (normalizeFacade).
 */

/* ------------------------------------------------------------------ options (standard terminology for all projects) */
export const OPT = {
  assembly: [
    'Curtain Wall System',
    'Aluminium Window System',
    'Aluminium Sliding Door System',
    'Fixed Glazing System',
    'Structural Glazing System',
    'Stone Cladding',
    'ACP Cladding',
    'HPL Cladding',
    'Metal Cladding',
    'GFRC / GRC Cladding',
    'Precast Concrete Cladding',
    'Paint & Texture Finish',
    'Architectural Louvers / Screens',
    'Skylight / Roof Glazing',
    'Other',
  ],
  curtainWallType: ['Unitised Curtain Wall', 'Stick-Built Curtain Wall', 'Semi-Unitised Curtain Wall', 'Structural Glazing', 'Spider Glazing', 'Other'],
  windowType: [
    'Horizontal Sliding',
    'Lift & Slide',
    'Multi-Track Sliding',
    'Vertical Sliding',
    'Casement – Side Hung',
    'Top Hung',
    'Tilt & Turn',
    'Fixed Glazing',
    'Slide & Fold',
    'Hinged Door',
    'Other',
  ],
  aluminiumClass: ['Proprietary / Standard System', 'Semi-Customised System', 'Bespoke / Custom-Engineered System', 'Not Applicable'],
  yesNoNa: ['Yes', 'No', 'N.A.'],
  yesNo: ['Yes', 'No'],
  aluminiumFinish: ['Powder Coated', 'PVDF Coated', 'Anodised', 'Mill Finish', 'Other'],
  railingType: ['Toughened Glass Railing', 'Laminated Glass Railing', 'Metal Railing', 'Aluminium Railing', 'Stainless Steel Railing', 'Other'],
  shading: ['Aluminium Louvers', 'Vertical Fins', 'Horizontal Fins', 'Metal Screens', 'External Blinds', 'Pergola', 'None', 'Other'],
  cleaning: ['BMU', 'Gondola', 'Rope Access', 'Manual Cleaning', 'Other'],
  glazingConfig: ['SGU – Single Glazed Unit', 'DGU – Double Glazed Unit', 'TGU – Triple Glazed Unit', 'Other'],
  cavityFilling: ['Air', 'Argon', 'Other', 'Not Applicable'],
  glassCoating: ['Clear', 'Tinted', 'Reflective', 'Low-E', 'Solar Control', 'Low-E + Solar Control', 'No Coating', 'Other'],
  heatTreatment: ['Annealed', 'Heat Strengthened', 'Fully Toughened', 'Laminated', 'Heat Strengthened Laminated', 'Toughened Laminated', 'Other'],
  spacer: ['Aluminium Spacer', 'Warm Edge Spacer', 'Other', 'Not Applicable'],
  gst: ['Inclusive', 'Exclusive'],
  commercialStage: ['Budgetary Estimate', 'Tender Cost', 'Awarded Cost', 'Revised Cost', 'Actual Cost'],
  designStage: ['Concept Design', 'Design Development', 'GFC Drawings', 'Shop Drawing Stage', 'Execution Stage', 'Completed'],
  approval: ['Not Submitted', 'Under Review', 'Approved', 'Approved with Comments', 'Rejected', 'Not Applicable'],
  testing: ['Air Infiltration Test', 'Water Penetration Test', 'Structural / Wind Load Test', 'On-site Testing', 'Other'],
} as const

/* ------------------------------------------------------------------ one façade system */
export type FacadeDoc = { name: string; url: string }
export type FacadeSystem = {
  id: string
  /** where it is used, e.g. "Tower A–C typical floors", "Podium retail" (comparison by tower / system) */
  name?: string
  assembly?: string
  assemblyOther?: string
  curtainWallType?: string
  windowType?: string
  aluminiumClass?: string
  aluSeries?: string
  aluDepth?: string
  aluThickness?: string
  aluAlloy?: string
  thermalBreak?: string
  aluFinish?: string
  aluColour?: string
  hardwareMake?: string
  slidingTracks?: string
  railingType?: string
  shading?: string[]
  cleaning?: string
  glazingConfig?: string
  outerGlass?: string
  innerGlass?: string
  cavity?: string
  interlayer?: string
  cavityFilling?: string
  glassCoating?: string
  heatTreatment?: string
  laminated?: string
  spacer?: string
  glassMake?: string
  uCentre?: string
  uWindow?: string
  shgc?: string
  vlt?: string
  extReflect?: string
  intReflect?: string
  acousticRw?: string
  wallArea?: string
  glazedArea?: string
  opaqueArea?: string
  windowArea?: string
  curtainWallArea?: string
  railingLength?: string
  panels?: string
  aluWeight?: string
  glassWeight?: string
  costTotal?: string
  costAluminium?: string
  costGlass?: string
  costCladding?: string
  costRailing?: string
  costShading?: string
  costInstallation?: string
  gst?: string
  commercialStage?: string
  consultant?: string
  contractor?: string
  designStage?: string
  windPositive?: string
  windNegative?: string
  apprStructural?: string
  apprShop?: string
  apprMaterial?: string
  mockup?: string
  testing?: string[]
  testingStatus?: string
  documents?: FacadeDoc[]
  remarks?: string
}
export type FacadeData = { version: 2; systems: FacadeSystem[]; remarks?: string }

/* ------------------------------------------------------------------ what each assembly needs */
const GLAZED = new Set(['Curtain Wall System', 'Aluminium Window System', 'Aluminium Sliding Door System', 'Fixed Glazing System', 'Structural Glazing System', 'Skylight / Roof Glazing'])
const ALUMINIUM = new Set([...GLAZED, 'Architectural Louvers / Screens'])
const WINDOW = new Set(['Aluminium Window System', 'Aluminium Sliding Door System', 'Fixed Glazing System'])
const CLADDING = new Set(['Stone Cladding', 'ACP Cladding', 'HPL Cladding', 'Metal Cladding', 'GFRC / GRC Cladding', 'Precast Concrete Cladding', 'Paint & Texture Finish', 'Architectural Louvers / Screens'])
const isOther = (s: FacadeSystem) => s.assembly === 'Other'
export const kind = (s: FacadeSystem) => ({
  glazed: GLAZED.has(s.assembly ?? '') || isOther(s),
  aluminium: ALUMINIUM.has(s.assembly ?? '') || isOther(s),
  window: WINDOW.has(s.assembly ?? '') || isOther(s),
  curtainWall: s.assembly === 'Curtain Wall System',
  cladding: CLADDING.has(s.assembly ?? '') || isOther(s),
  sliding: /sliding|slide/i.test(s.windowType ?? '') || s.assembly === 'Aluminium Sliding Door System',
  multiPane: /^(DGU|TGU)/.test(s.glazingConfig ?? '') || s.glazingConfig === 'Other',
  laminated: s.laminated === 'Yes' || /laminated/i.test(s.heatTreatment ?? ''),
})

/* ------------------------------------------------------------------ form layout (one list for form, DPR and checks) */
export type Need = 'mandatory' | 'recommended' | 'optional' | 'conditional'
export type FField = {
  key: keyof FacadeSystem
  label: string
  type: 'select' | 'multi' | 'number' | 'text' | 'yesno'
  options?: readonly string[]
  unit?: string
  need: Need
  /** shown only when true */
  when?: (s: FacadeSystem) => boolean
  /** mandatory only when true (mandatory fields without it are always mandatory) */
  requiredWhen?: (s: FacadeSystem) => boolean
  hint?: string
}
export type FSection = { id: string; title: string; when?: (s: FacadeSystem) => boolean; fields: FField[] }

const k = kind
export const SECTIONS: FSection[] = [
  {
    id: 'A',
    title: 'A · Façade System & Configuration',
    fields: [
      { key: 'name', label: 'System Name / Location', type: 'text', need: 'optional', hint: 'e.g. Tower A–C typical floors, Podium retail' },
      { key: 'assembly', label: 'Primary Façade Assembly', type: 'select', options: OPT.assembly, need: 'mandatory' },
      { key: 'assemblyOther', label: 'Specify Assembly', type: 'text', need: 'conditional', when: isOther },
      { key: 'curtainWallType', label: 'Curtain Wall Construction Type', type: 'select', options: OPT.curtainWallType, need: 'conditional', when: (s) => k(s).curtainWall },
      { key: 'windowType', label: 'Window / Door Type', type: 'select', options: OPT.windowType, need: 'conditional', when: (s) => k(s).window },
      { key: 'aluminiumClass', label: 'Aluminium System Classification', type: 'select', options: OPT.aluminiumClass, need: 'mandatory', when: (s) => k(s).aluminium, requiredWhen: (s) => ALUMINIUM.has(s.assembly ?? '') },
    ],
  },
  {
    id: 'A5',
    title: 'A · Aluminium Technical Details',
    when: (s) => k(s).aluminium,
    fields: [
      { key: 'aluSeries', label: 'Aluminium System / Series Name', type: 'text', need: 'optional' },
      { key: 'aluDepth', label: 'Aluminium Profile Depth', type: 'number', unit: 'mm', need: 'optional' },
      { key: 'aluThickness', label: 'Aluminium Profile Thickness', type: 'number', unit: 'mm', need: 'optional' },
      { key: 'aluAlloy', label: 'Aluminium Alloy & Temper', type: 'text', need: 'optional', hint: 'e.g. 6063-T6' },
      { key: 'thermalBreak', label: 'Thermal Break', type: 'select', options: OPT.yesNoNa, need: 'recommended' },
      { key: 'aluFinish', label: 'Aluminium Surface Finish', type: 'select', options: OPT.aluminiumFinish, need: 'recommended' },
      { key: 'aluColour', label: 'Aluminium Finish Colour', type: 'text', need: 'optional' },
      { key: 'hardwareMake', label: 'Hardware Make / Manufacturer', type: 'text', need: 'optional' },
      { key: 'slidingTracks', label: 'Number of Sliding Tracks', type: 'number', need: 'conditional', when: (s) => k(s).sliding },
    ],
  },
  {
    id: 'A6',
    title: 'A · Other Façade Components',
    fields: [
      { key: 'railingType', label: 'Railing Type', type: 'select', options: OPT.railingType, need: 'optional' },
      { key: 'shading', label: 'Shading Devices', type: 'multi', options: OPT.shading, need: 'optional' },
      { key: 'cleaning', label: 'Façade Cleaning System', type: 'select', options: OPT.cleaning, need: 'recommended' },
    ],
  },
  {
    id: 'B1',
    title: 'B · Glass Configuration',
    when: (s) => k(s).glazed,
    fields: [
      { key: 'glazingConfig', label: 'Glazing Configuration', type: 'select', options: OPT.glazingConfig, need: 'mandatory', requiredWhen: (s) => GLAZED.has(s.assembly ?? '') },
      { key: 'outerGlass', label: 'Outer Glass Thickness', type: 'number', unit: 'mm', need: 'recommended' },
      { key: 'innerGlass', label: 'Inner Glass Thickness', type: 'number', unit: 'mm', need: 'conditional', when: (s) => k(s).multiPane },
      { key: 'cavity', label: 'Cavity Thickness', type: 'number', unit: 'mm', need: 'conditional', when: (s) => k(s).multiPane },
      { key: 'laminated', label: 'Laminated Glass', type: 'select', options: OPT.yesNo, need: 'recommended' },
      { key: 'interlayer', label: 'Interlayer Thickness', type: 'number', unit: 'mm', need: 'conditional', when: (s) => k(s).laminated },
      { key: 'cavityFilling', label: 'Cavity Filling', type: 'select', options: OPT.cavityFilling, need: 'optional', when: (s) => k(s).multiPane },
      { key: 'glassCoating', label: 'Glass Coating', type: 'select', options: OPT.glassCoating, need: 'recommended' },
      { key: 'heatTreatment', label: 'Heat Treatment', type: 'select', options: OPT.heatTreatment, need: 'recommended' },
      { key: 'spacer', label: 'Spacer Type', type: 'select', options: OPT.spacer, need: 'optional', when: (s) => k(s).multiPane },
      { key: 'glassMake', label: 'Glass Manufacturer', type: 'text', need: 'optional' },
    ],
  },
  {
    id: 'B2',
    title: 'B · Glass Performance',
    when: (s) => k(s).glazed,
    fields: [
      { key: 'uCentre', label: 'U-Value (Centre of Glass)', type: 'number', unit: 'W/m²K', need: 'recommended' },
      { key: 'uWindow', label: 'U-Value (Whole Window)', type: 'number', unit: 'W/m²K', need: 'recommended' },
      { key: 'shgc', label: 'SHGC', type: 'number', need: 'recommended', hint: 'between 0 and 1, from the approved glass datasheet' },
      { key: 'vlt', label: 'VLT – Visible Light Transmission', type: 'number', unit: '%', need: 'recommended' },
      { key: 'extReflect', label: 'External Reflectance', type: 'number', unit: '%', need: 'optional' },
      { key: 'intReflect', label: 'Internal Reflectance', type: 'number', unit: '%', need: 'optional' },
      { key: 'acousticRw', label: 'Acoustic Performance (Rw)', type: 'number', unit: 'dB', need: 'optional' },
    ],
  },
  {
    id: 'C',
    title: 'C · Areas & Quantities (this system only)',
    fields: [
      { key: 'wallArea', label: 'Total External Wall Area', type: 'number', unit: 'sq ft', need: 'mandatory', hint: 'the part of the façade this system covers' },
      { key: 'glazedArea', label: 'Total Glazed Area', type: 'number', unit: 'sq ft', need: 'mandatory', when: (s) => k(s).glazed, requiredWhen: (s) => GLAZED.has(s.assembly ?? '') },
      { key: 'opaqueArea', label: 'Total Opaque Cladding Area', type: 'number', unit: 'sq ft', need: 'recommended' },
      { key: 'windowArea', label: 'Aluminium Window Area', type: 'number', unit: 'sq ft', need: 'recommended', when: (s) => k(s).window },
      { key: 'curtainWallArea', label: 'Curtain Wall Area', type: 'number', unit: 'sq ft', need: 'recommended', when: (s) => k(s).curtainWall || isOther(s) },
      { key: 'railingLength', label: 'Balcony Railing Quantity / Length', type: 'number', unit: 'rmt', need: 'optional' },
      { key: 'panels', label: 'Number of Windows / Panels', type: 'number', unit: 'nos', need: 'optional' },
      { key: 'aluWeight', label: 'Total Aluminium Weight', type: 'number', unit: 'MT', need: 'optional', when: (s) => k(s).aluminium },
      { key: 'glassWeight', label: 'Total Glass Weight', type: 'number', unit: 'MT', need: 'optional', when: (s) => k(s).glazed },
    ],
  },
  {
    id: 'D',
    title: 'D · Façade Cost & Commercials',
    fields: [
      { key: 'costTotal', label: 'Total Façade Package Cost', type: 'number', unit: 'Rs. Cr', need: 'recommended' },
      { key: 'costAluminium', label: 'Aluminium System Cost', type: 'number', unit: 'Rs. Cr', need: 'optional', when: (s) => k(s).aluminium },
      { key: 'costGlass', label: 'Glass Cost', type: 'number', unit: 'Rs. Cr', need: 'optional', when: (s) => k(s).glazed },
      { key: 'costCladding', label: 'Cladding Cost', type: 'number', unit: 'Rs. Cr', need: 'optional', when: (s) => k(s).cladding },
      { key: 'costRailing', label: 'Railing Cost', type: 'number', unit: 'Rs. Cr', need: 'optional' },
      { key: 'costShading', label: 'Shading System Cost', type: 'number', unit: 'Rs. Cr', need: 'optional' },
      { key: 'costInstallation', label: 'Installation Cost', type: 'number', unit: 'Rs. Cr', need: 'optional' },
      { key: 'gst', label: 'GST Inclusion', type: 'select', options: OPT.gst, need: 'recommended' },
      { key: 'commercialStage', label: 'Commercial Stage', type: 'select', options: OPT.commercialStage, need: 'recommended' },
    ],
  },
  {
    id: 'E',
    title: 'E · Design & Technical Governance',
    fields: [
      { key: 'consultant', label: 'Façade Consultant', type: 'text', need: 'optional' },
      { key: 'contractor', label: 'Façade Contractor', type: 'text', need: 'optional' },
      { key: 'designStage', label: 'Design Stage', type: 'select', options: OPT.designStage, need: 'recommended' },
      { key: 'windPositive', label: 'Wind Pressure – Positive', type: 'number', unit: 'kPa', need: 'optional' },
      { key: 'windNegative', label: 'Wind Pressure – Negative', type: 'number', unit: 'kPa', need: 'optional' },
      { key: 'apprStructural', label: 'Structural Design Approval', type: 'select', options: OPT.approval, need: 'optional' },
      { key: 'apprShop', label: 'Shop Drawing Approval', type: 'select', options: OPT.approval, need: 'optional' },
      { key: 'apprMaterial', label: 'Material Approval', type: 'select', options: OPT.approval, need: 'optional' },
      { key: 'mockup', label: 'Mock-up Testing', type: 'select', options: OPT.approval, need: 'optional' },
      { key: 'testing', label: 'Performance Testing', type: 'multi', options: OPT.testing, need: 'optional' },
      { key: 'testingStatus', label: 'Performance Testing Status', type: 'select', options: OPT.approval, need: 'optional', when: (s) => (s.testing ?? []).length > 0 },
    ],
  },
]

export const visible = (f: FField, s: FacadeSystem) => !f.when || f.when(s)
export const sectionVisible = (sec: FSection, s: FacadeSystem) => !sec.when || sec.when(s)
export const isRequired = (f: FField, s: FacadeSystem) => f.need === 'mandatory' && visible(f, s) && (!f.requiredWhen || f.requiredWhen(s))

const blank = (v: unknown) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && v.length === 0)

/** "System 2: Total Glazed Area" … — mandatory fields left empty (saving is blocked until they are filled) */
export function missingMandatory(d: FacadeData) {
  const out: { system: number; key: keyof FacadeSystem; label: string }[] = []
  d.systems.forEach((s, i) => {
    for (const sec of SECTIONS) {
      if (!sectionVisible(sec, s)) continue
      for (const f of sec.fields) if (isRequired(f, s) && blank(s[f.key])) out.push({ system: i, key: f.key, label: f.label })
    }
  })
  return out
}

/* ------------------------------------------------------------------ numbers */
export const n = (v: unknown) => {
  if (v === undefined || v === null || String(v).trim() === '') return null
  const x = parseFloat(String(v).replace(/,/g, ''))
  return Number.isFinite(x) ? x : null
}
const sum = (xs: (number | null)[]) => {
  const v = xs.filter((x): x is number => x !== null)
  return v.length ? v.reduce((a, b) => a + b, 0) : null
}
const CR = 1e7

/** per-system checks that point at double counting / impossible areas */
export function areaWarnings(s: FacadeSystem) {
  const w: string[] = []
  const wall = n(s.wallArea)
  const glazed = n(s.glazedArea)
  const opaque = n(s.opaqueArea)
  if (wall !== null && glazed !== null && glazed > wall) w.push('Glazed area is larger than the external wall area.')
  if (wall !== null && glazed !== null && opaque !== null && glazed + opaque > wall * 1.001) w.push('Glazed + opaque area is more than the external wall area — check for double counting.')
  const sh = n(s.shgc)
  if (sh !== null && (sh < 0 || sh > 1)) w.push('SHGC must be between 0 and 1.')
  return w
}

export type SystemOutputs = {
  wall: number | null
  glazed: number | null
  opaque: number | null
  wwr: number | null
  opaquePct: number | null
  costCr: number | null
  costPerSqftFacade: number | null
  costPerSqftSaleable: number | null
  glassCostPerSqft: number | null
}
export function systemOutputs(s: FacadeSystem, saleable: number | null): SystemOutputs {
  const wall = n(s.wallArea)
  const glazed = kind(s).glazed ? n(s.glazedArea) : null
  const opaque = n(s.opaqueArea)
  const costCr = n(s.costTotal)
  const glassCr = n(s.costGlass)
  return {
    wall,
    glazed,
    opaque,
    wwr: wall && glazed !== null && glazed <= wall ? (glazed / wall) * 100 : null,
    opaquePct: wall && opaque !== null && opaque <= wall ? (opaque / wall) * 100 : null,
    costCr,
    costPerSqftFacade: costCr !== null && wall ? (costCr * CR) / wall : null,
    costPerSqftSaleable: costCr !== null && saleable ? (costCr * CR) / saleable : null,
    glassCostPerSqft: glassCr !== null && glazed ? (glassCr * CR) / glazed : null,
  }
}

/** area-weighted value over the glazed systems — only when every glazed system with an area has the value */
function weighted(systems: FacadeSystem[], key: 'shgc' | 'uCentre' | 'uWindow' | 'vlt') {
  const g = systems.filter((s) => kind(s).glazed && (n(s.glazedArea) ?? 0) > 0)
  if (!g.length || g.some((s) => n(s[key]) === null)) return null
  const area = g.reduce((a, s) => a + n(s.glazedArea)!, 0)
  return g.reduce((a, s) => a + n(s.glazedArea)! * n(s[key])!, 0) / area
}

export type FacadeSummary = {
  systems: number
  facadeArea: number | null
  glazedArea: number | null
  opaqueArea: number | null
  wwr: number | null
  opaquePct: number | null
  avgShgc: number | null
  avgUCentre: number | null
  avgUWindow: number | null
  avgVlt: number | null
  shgcWeightedArea: number | null
  costCr: number | null
  costPerSqftFacade: number | null
  costPerSqftSaleable: number | null
  /** costs entered at different commercial stages / GST bases — the total mixes scopes */
  mixedScope: string | null
  /** systems' external wall area vs Module 6 Total External Wall Area */
  module6WallArea: number | null
}
export function facadeSummary(d: FacadeData, ctx: FacadeContext): FacadeSummary {
  const sys = d.systems
  const facadeArea = sum(sys.map((s) => n(s.wallArea)))
  const glazedArea = sum(sys.map((s) => (kind(s).glazed ? n(s.glazedArea) : null)))
  const opaqueArea = sum(sys.map((s) => n(s.opaqueArea)))
  const costCr = sum(sys.map((s) => n(s.costTotal)))
  const shgcW = sys.filter((s) => kind(s).glazed && n(s.glazedArea) !== null && n(s.shgc) !== null)
  const stages = [...new Set(sys.filter((s) => n(s.costTotal) !== null).map((s) => s.commercialStage || 'stage not given'))]
  const gst = [...new Set(sys.filter((s) => n(s.costTotal) !== null).map((s) => s.gst || 'GST not given'))]
  const mixed = [stages.length > 1 ? `stages: ${stages.join(', ')}` : '', gst.length > 1 ? `GST: ${gst.join(', ')}` : ''].filter(Boolean).join('; ')
  return {
    systems: sys.length,
    facadeArea,
    glazedArea,
    opaqueArea,
    wwr: facadeArea && glazedArea !== null && glazedArea <= facadeArea ? (glazedArea / facadeArea) * 100 : null,
    opaquePct: facadeArea && opaqueArea !== null && opaqueArea <= facadeArea ? (opaqueArea / facadeArea) * 100 : null,
    avgShgc: weighted(sys, 'shgc'),
    avgUCentre: weighted(sys, 'uCentre'),
    avgUWindow: weighted(sys, 'uWindow'),
    avgVlt: weighted(sys, 'vlt'),
    shgcWeightedArea: shgcW.length ? shgcW.reduce((a, s) => a + n(s.glazedArea)! * n(s.shgc)!, 0) : null,
    costCr,
    costPerSqftFacade: costCr !== null && facadeArea ? (costCr * CR) / facadeArea : null,
    costPerSqftSaleable: costCr !== null && ctx.saleable ? (costCr * CR) / ctx.saleable : null,
    mixedScope: mixed || null,
    module6WallArea: ctx.externalWallArea ?? null,
  }
}

/* ------------------------------------------------------------------ reading saved data (incl. the first, single-entry version) */
const OLD_ASSEMBLY: Record<string, Partial<FacadeSystem>> = {
  'Unitised Glazing': { assembly: 'Curtain Wall System', curtainWallType: 'Unitised Curtain Wall' },
  'Stick Glazing (Curtain Wall)': { assembly: 'Curtain Wall System', curtainWallType: 'Stick-Built Curtain Wall' },
  'Punched Windows': { assembly: 'Aluminium Window System' },
  'Stone Cladding': { assembly: 'Stone Cladding' },
  'ACP Cladding': { assembly: 'ACP Cladding' },
  'HPL Cladding': { assembly: 'HPL Cladding' },
  'Paint & Texture': { assembly: 'Paint & Texture Finish' },
}
const OLD_GLASS: Record<string, Partial<FacadeSystem>> = {
  'Single Glazed': { glazingConfig: 'SGU – Single Glazed Unit' },
  'Double Glazed (DGU)': { glazingConfig: 'DGU – Double Glazed Unit' },
  'DGU Low-E': { glazingConfig: 'DGU – Double Glazed Unit', glassCoating: 'Low-E' },
  Laminated: { laminated: 'Yes' },
  'DGU Laminated Low-E': { glazingConfig: 'DGU – Double Glazed Unit', glassCoating: 'Low-E', laminated: 'Yes' },
  'Triple Glazed': { glazingConfig: 'TGU – Triple Glazed Unit' },
}
const OLD_RAILING: Record<string, string> = { Glass: 'Toughened Glass Railing', MS: 'Metal Railing', SS: 'Stainless Steel Railing', Aluminium: 'Aluminium Railing' }
const OLD_SHADING: Record<string, string> = { 'Horizontal Fins': 'Horizontal Fins', 'Vertical Fins': 'Vertical Fins', Louvers: 'Aluminium Louvers', None: 'None' }
const OLD_CLEAN: Record<string, string> = { BMU: 'BMU', Gondola: 'Gondola', 'Rope Access': 'Rope Access', 'From Balconies': 'Manual Cleaning' }

let seq = 0
export const newSystemId = () => `fs-${Date.now().toString(36)}-${(seq++).toString(36)}`
export const newSystem = (): FacadeSystem => ({ id: newSystemId(), shading: [], testing: [], documents: [] })

/** any saved shape -> { version: 2, systems } */
export function normalizeFacade(raw: unknown): FacadeData {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  if (Array.isArray(o.systems)) return { version: 2, systems: (o.systems as FacadeSystem[]).map((s) => ({ ...s, id: s.id || newSystemId() })), remarks: (o.remarks as string) ?? '' }
  const str = (k: string) => String(o[k] ?? '').trim()
  if (!str('facadeSystem') && !str('glassType') && !str('facadeArea') && !str('glazedArea')) return { version: 2, systems: [], remarks: str('remarks') }
  // first version: one entry for the whole project
  const area = n(o.facadeArea)
  const rate = n(o.facadeCostPerSqft)
  const s: FacadeSystem = {
    id: newSystemId(),
    name: 'Whole project (converted from the first version)',
    ...(OLD_ASSEMBLY[str('facadeSystem')] ?? (str('facadeSystem') ? { assembly: 'Other', assemblyOther: str('facadeSystem') === 'Other' ? str('facadeSystemOther') : str('facadeSystem') } : {})),
    ...(OLD_GLASS[str('glassType')] ?? {}),
    railingType: OLD_RAILING[str('railingType')] ?? (str('railingType') ? 'Other' : undefined),
    shading: OLD_SHADING[str('shadingDevices')] ? [OLD_SHADING[str('shadingDevices')]] : [],
    cleaning: OLD_CLEAN[str('cleaningMethod')] ?? (str('cleaningMethod') ? 'Other' : undefined),
    shgc: str('shgc') || undefined,
    uCentre: str('uValue') || undefined,
    vlt: str('vlt') || undefined,
    wallArea: str('facadeArea') || undefined,
    glazedArea: str('glazedArea') || undefined,
    costTotal: area && rate ? String(Math.round(((area * rate) / CR) * 100) / 100) : undefined,
    testing: [],
    documents: [],
  }
  return { version: 2, systems: [s], remarks: str('remarks') }
}

export type FacadeContext = {
  /** Module 6 saleable area (sq ft) */
  saleable: number | null
  /** Module 6 Total External Wall Area (sq ft), shown as a check against the systems' areas */
  externalWallArea?: number | null
}
export function facadeContextOf(summary: Record<string, unknown> | null | undefined): FacadeContext {
  const kr = ((summary?.projectLevelDesignData ?? {}) as { keyRatioInputs?: Record<string, unknown> }).keyRatioInputs ?? {}
  return { saleable: n(kr.saleableArea), externalWallArea: n(kr.totalExternalWallArea) }
}

/** display label of a system: "Curtain Wall System — Unitised Curtain Wall (Tower A–C)" */
export function systemTitle(s: FacadeSystem, i?: number) {
  const a = s.assembly === 'Other' ? s.assemblyOther || 'Other' : s.assembly || 'Façade system'
  const sub = s.curtainWallType || s.windowType || ''
  return `${i !== undefined ? `System ${i + 1} · ` : ''}${a}${sub ? ` — ${sub}` : ''}${s.name ? ` (${s.name})` : ''}`
}

/** a field's value as text ("Yes", "Powder Coated", "12 mm", "Aluminium Louvers, Vertical Fins") */
export function fieldText(s: FacadeSystem, f: FField) {
  const v = s[f.key]
  if (Array.isArray(v)) return v.length ? (v as string[]).join(', ') : ''
  return String(v ?? '').trim()
}
