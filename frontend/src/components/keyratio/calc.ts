/**
 * Key Ratio calculations — faithful port of the original main bundle helpers:
 *  - validity/benchmark checks (H3 / W3 / I3 / U3 / fee / pee / hee / mee)
 *  - dynamic height-based ranges for steel/concrete (G1 / q3 / Tee)
 *  - residential derived ratios (See) and commercial derived ratios (Dee / Oee)
 *  - rupee impact per field / section / tab (_ee + bee for residential, class n4 for commercial)
 *  - labels, units and section mapping for the residential input panel (R4 / Jae / Vv / ll / toe / aoe)
 * Keep this file free of React so the same logic can move to the backend later.
 */
import type { ComOutputField, KeyRatioForm, ResCalField } from '@/types/keyratio-compare'

/* ------------------------------------------------------------------ */
/* Generic helpers                                                     */
/* ------------------------------------------------------------------ */

export type Validity = { value: 'true' | 'false' | 'pending'; message: string; boxColor: string; textColor: string; color?: string }

/** Round to `digits` decimals (original K1). */
export const roundTo = (v: number | null | undefined, digits: number) =>
  v == null ? null : Number(Math.round(v * Math.pow(10, digits)) / Math.pow(10, digits))

/** "is empty-ish" check used to hide rupee values (original ku). */
export function isBlankNumber(v: unknown, { allowZero = false, strict = false } = {}) {
  const nil = v == null
  const zero = v === 0
  const notNum = strict && typeof v !== 'number'
  const nan = isNaN(Number(v))
  const inf = !Number.isFinite(Number(v))
  return nil || (!allowZero && zero) || notNum || nan || inf
}

/** "₹ x Cr" (original _o). */
export const crore = (v: unknown) => `₹ ${v} Cr`

/** lowercase, trimmed, spaces -> "_" (original vl / normalizeKey). */
export const normKey = (v: unknown) => (v == null ? '' : String(v).toLowerCase().trim().replaceAll(' ', '_'))

const num = (obj: KeyRatioForm, key: string) => {
  const n = parseFloat(String(obj[key]))
  return isNaN(n) ? null : n
}

/* ------------------------------------------------------------------ */
/* Benchmark validity                                                  */
/* ------------------------------------------------------------------ */

type ColorRange = { min: number; max: number; color: string }
type DynamicRange = Record<string, unknown> | string | null | undefined

const COLOR_CLASSES = (muted: boolean | undefined) => ({
  green: muted ? { boxColor: 'ring-green-300', textColor: 'text-green-300' } : { boxColor: 'ring-green-500', textColor: 'text-green-500' },
  yellow: muted ? { boxColor: 'ring-yellow-300', textColor: 'text-yellow-300' } : { boxColor: 'ring-yellow-600', textColor: 'text-yellow-600' },
  red: muted ? { boxColor: 'ring-red-300', textColor: 'text-red-300' } : { boxColor: 'ring-red-500', textColor: 'text-red-500' },
})
const GRAY = { boxColor: 'ring-gray-300', textColor: 'text-gray-300' }

function parseRangeObject(r: DynamicRange): Record<string, unknown> {
  if (typeof r === 'object' && r) return r
  return String(r)
    .replace(/^{|}$/g, '')
    .split(',')
    .reduce<Record<string, string>>((acc, part) => {
      const [k, v] = part.split(':').map((s) => s.trim())
      acc[k] = v
      return acc
    }, {})
}

function colorRangeCheck(v: number, ranges: ColorRange[]) {
  const green = ranges.filter((c) => c.color === 'green')
  const yellow = ranges.filter((c) => c.color === 'yellow')
  if (green.some((c) => v >= c.min && v <= c.max)) return { value: 'true', color: 'green', message: 'Within the benchmark' } as const
  if (yellow.some((c) => v >= c.min && v <= c.max)) return { value: 'true', color: 'yellow', message: 'Within the benchmark' } as const
  const all = [...green, ...yellow]
  if (!all.length) return { value: 'false', color: 'red', message: 'Benchmark reference data is missing' } as const
  const min = all.reduce((a, c) => Math.min(a, c.min), Infinity)
  const max = all.reduce((a, c) => Math.max(a, c.max), -Infinity)
  if (v < min) return { value: 'false', color: 'red', message: 'Value less than benchmark' } as const
  if (v > max) return { value: 'false', color: 'red', message: 'Value more than benchmark' } as const
  return { value: 'false', color: 'red', message: 'Value is outside defined ranges' } as const
}

function toColorRanges(obj: Record<string, unknown>) {
  return Object.keys(obj)
    .map((k) => {
      const m = k.match(/(-?\d+\.?\d*)-(-?\d+\.?\d*)/)
      return { min: parseFloat(m?.[1] ?? ''), max: parseFloat(m?.[2] ?? ''), color: String(obj[k]) }
    })
    .sort((a, b) => a.min - b.min)
}

function heightBucketCheck(v: number, ranges: Record<string, unknown>, height: number | null | undefined) {
  const h = Number(height)
  const bucket = h < 50 ? '<50' : h < 75 ? '<75' : h < 100 ? '<100' : '>=100'
  const scoped = ranges[bucket] as Record<string, unknown> | undefined
  return colorRangeCheck(v, toColorRanges(scoped ?? ranges))
}

function minMaxCheck(v: number, range: string | null | undefined, muted?: boolean): Validity {
  const [lo, hi] = typeof range === 'string' ? range.split('-').map(Number) : [undefined, undefined]
  const inside = v >= (lo as number) && v <= (hi as number)
  const base = inside
    ? { value: 'true' as const, message: 'Within the benchmark' }
    : v < (lo as number)
      ? { value: 'false' as const, message: 'Value less than benchmark' }
      : { value: 'false' as const, message: 'Value more than benchmark' }
  return { ...base, ...(COLOR_CLASSES(muted)[inside ? 'green' : 'red'] ?? GRAY) }
}

function lessThanCheck(v: number, range: string, muted?: boolean): Validity {
  const limit = parseFloat(range.replace('<', ''))
  const bad = v < limit
  return {
    ...(bad ? { value: 'false' as const, message: 'Value more than benchmark' } : { value: 'true' as const, message: 'Within the benchmark' }),
    ...(COLOR_CLASSES(muted)[bad ? 'red' : 'green'] ?? GRAY),
  }
}

const pending = (muted?: boolean): Validity => ({
  value: 'pending',
  message: '',
  boxColor: muted ? 'ring-gray-200' : 'ring-gray-300',
  textColor: 'opacity-0 invisible',
})

/**
 * Benchmark validity of a calculated value (original H3 for residential, W3 for commercial —
 * W3 rounds to 3 decimals for field 18 instead of always 2).
 */
export function checkValidity(
  value: unknown,
  range: string | null | undefined,
  fieldId: number | undefined,
  dynamicRange: DynamicRange,
  muted?: boolean,
  buildingHeight?: number | string | null,
  commercial = false,
): Validity {
  const n = Number(value)
  const v = commercial ? (roundTo(n, fieldId === 18 ? 3 : 2) as number) : Number(n.toFixed(2))
  if (value == null) return pending(muted)
  if (typeof value === 'string' && value.trim() === '') return pending(muted)
  if (['NA', null, undefined].includes(dynamicRange as string)) {
    return ['<', '<='].some((s) => range?.endsWith(s)) ? lessThanCheck(v, range as string, muted) : minMaxCheck(v, range, muted)
  }
  const res = heightBucketCheck(v, parseRangeObject(dynamicRange), buildingHeight as number)
  return { message: res.message, value: res.value, ...(COLOR_CLASSES(muted)[res.color as 'green'] ?? GRAY), color: res.color }
}

/* ------------------------------------------------------------------ */
/* Ranges                                                              */
/* ------------------------------------------------------------------ */

/** Height dependent range for steel (17) / concrete (18) consumption (original G1). */
export function heightRange(id: number | undefined, category: string | undefined, height: unknown): string | undefined {
  const h = Number(height)
  const pick = (o: Record<string, string>) => o[category ?? '']
  if (id === 17) {
    if (h < 50) return pick({ mid_end: '4.75-5.2', premium: '0-7.5', affluent: '0-7.5', hi_street: '6.2-7', enclosed_mall: '6.2-7' })
    if (h < 75) return pick({ mid_end: '5.2-6.1', premium: '0-7.5', affluent: '0-7.5', hi_street: '7-7.2', enclosed_mall: '7-7.2' })
    if (h < 100) return pick({ mid_end: '6.1-6.5', premium: '0-7.5', affluent: '0-7.5', hi_street: '7.2-7.5', enclosed_mall: '7.2-7.5' })
    if (h < 125) return pick({ mid_end: '6.1-6.5', premium: '7.5-8.5', affluent: '8-9', hi_street: '7.5-8', enclosed_mall: '7.5-8' })
    return pick({ mid_end: '6.1-6.5', premium: '7.5-8.5', affluent: '8-9', hi_street: '8-9', enclosed_mall: '8-9' })
  }
  if (id === 18) {
    if (h < 50) return pick({ mid_end: '0-0.046', premium: '0-0.046', affluent: '0-0.046', hi_street: '0-0.042', enclosed_mall: '0-0.042' })
    if (h < 75) return pick({ mid_end: '0-0.046', premium: '0-0.046', affluent: '0-0.046', hi_street: '0-0.045', enclosed_mall: '0-0.045' })
    if (h < 100) return pick({ mid_end: '0-0.046', premium: '0-0.046', affluent: '0-0.046', hi_street: '0-0.046', enclosed_mall: '0-0.046' })
    if (h < 125) return pick({ mid_end: '0-0.046', premium: '0-0.052', affluent: '0-0.052', hi_street: '0-0.048', enclosed_mall: '0-0.048' })
    return pick({ mid_end: '0-0.046', premium: '0-0.052', affluent: '0-0.052', hi_street: '0-0.052', enclosed_mall: '0-0.052' })
  }
  return undefined
}

const STEEL_CONCRETE_COLOR_RANGES: Record<number, Record<string, Record<string, Record<string, string>>>> = {
  17: {
    premium: {
      '<50': { '0.0000-7.5000': 'green', '7.5000-7.8750': 'yellow' },
      '<75': { '0.0000-7.5000': 'green', '7.5000-7.8750': 'yellow' },
      '<100': { '0.0000-7.5000': 'green', '7.5000-7.8750': 'yellow' },
      '>=100': { '7.5000-8.5000': 'green', '8.5000-8.9250': 'yellow' },
    },
    mid_end: {
      '<50': { '4.7500-5.2000': 'green', '5.2000-5.4600': 'yellow' },
      '<75': { '5.2000-6.1000': 'green', '6.1000-6.4050': 'yellow' },
      '>=75': { '6.1000-6.5000': 'green', '6.5000-6.8250': 'yellow' },
    },
    affluent: {
      '<50': { '0.000-7.5000': 'green', '7.5000-7.8750': 'yellow' },
      '<75': { '0.0000-7.5000': 'green', '7.5000-7.8750': 'yellow' },
      '<100': { '0.0000-7.5000': 'green', '7.5000-7.8750': 'yellow' },
      '>=100': { '8.0000-9.0000': 'green', '9.0000-9.4500': 'yellow' },
    },
  },
  18: {
    premium: {
      '<50': { '0.0000-0.0460': 'green', '0.0460-0.0480': 'yellow' },
      '<75': { '0.0000-0.0460': 'green', '0.0460-0.0480': 'yellow' },
      '<100': { '0.0000-0.0460': 'green', '0.0460-0.0480': 'yellow' },
      '>=100': { '0.0000-0.0520': 'green', '0.0520-0.0540': 'yellow' },
    },
    mid_end: {
      '<50': { '0.0000-0.0460': 'green', '0.0460-0.0480': 'yellow' },
      '<75': { '0.0000-0.0460': 'green', '0.0460-0.0480': 'yellow' },
      '>=75': { '0.0000-0.0460': 'green', '0.0460-0.0480': 'yellow' },
    },
    affluent: {
      '<50': { '0.0000-0.0460': 'green', '0.0460-0.0480': 'yellow' },
      '<75': { '0.0000-0.0460': 'green', '0.0460-0.0480': 'yellow' },
      '<100': { '0.0000-0.0460': 'green', '0.0460-0.0480': 'yellow' },
      '>=100': { '0.0000-0.0520': 'green', '0.0520-0.0550': 'yellow' },
    },
  },
}

/** Dynamic (coloured) range for a residential field (original q3). */
export function residentialDynamicRange(field: ResCalField | undefined, category: string | undefined): DynamicRange {
  const special = STEEL_CONCRETE_COLOR_RANGES[field?.id as number]
  if (special) return special[category ?? ''] ?? {}
  switch (category) {
    case 'premium':
      return field?.premium_range
    case 'mid_end':
    case 'mid-end':
      return field?.mid_end_range
    default:
      return field?.affluent_range
  }
}

/** Dynamic range for a commercial output field (original Tee). */
export function commercialDynamicRange(field: ComOutputField | undefined, category: string | undefined): DynamicRange {
  switch (category) {
    case 'premium':
      return field?.premium_range as DynamicRange
    case 'mid_end':
    case 'mid-end':
      return field?.mid_end_range as DynamicRange
    case 'hi_street':
      return field?.hi_street_range as DynamicRange
    case 'enclosed_mall':
      return field?.enclosed_mall_range as DynamicRange
    default:
      return field?.affluent_range as DynamicRange
  }
}

/** Percent-style range text for residential ids 19/16/6 (original cee) and commercial 1-4 (dee). */
function percentRange(ids: number[], id: number | undefined, range: string | undefined | null) {
  if (!ids.includes(id as number) || !range) return range
  if (range.endsWith('<')) return '>' + range.replace('<', '%')
  const [a, b] = range.split('-').map((s) => s.trim())
  return `${a}%-${b}%`
}
export const residentialRangeLabel = (id: number | undefined, range?: string | null) => percentRange([19, 16, 6], id, range)
export const commercialRangeLabel = (id: number | undefined, range?: string | null) => percentRange([1, 2, 3, 4], id, range)

/** Units shown next to a residential calculated value (original aoe). */
const RES_OUTPUT_UNITS: Record<number, string> = {
  6: '%', 7: 'm', 10: 'm', 11: 'm', 12: 'm', 13: 'm', 14: 'sq m', 15: 'sq m per car', 16: '%', 17: 'Kg/sqft', 18: 'cum/sqft',
  19: '%', 20: 'm/s', 21: 'm/s', 22: 'sec', 23: 'sq ft/tonne', 24: 'sq ft/tonne', 26: 'm', 27: '%',
}
export const residentialOutputUnit = (id: number | undefined) => RES_OUTPUT_UNITS[id as number]

/* ------------------------------------------------------------------ */
/* Residential input panel metadata                                    */
/* ------------------------------------------------------------------ */

/** Input units (original Jae). */
export const INPUT_UNITS: Record<string, string> = {
  building_height: 'm', carpet_area: 'sq m', saleable_area: 'sq m', balcony_area: 'sq m', built_up_area: 'sq m', far: '',
  total_external_wall_area: 'sq m', total_basement_area: 'sq m', circulation_area: 'sq m', service_shaft_area: 'sq m',
  window_to_area_ratio: '', total_steel_reinforcement: 'kg', total_concrete_consumption: 'cubic .m', air_conditioned_area: 'sq m',
  apartment_area: 'sq m', club_area: 'sq m', total_parking_area: 'sq m', total_number_of_cars: '', lobby_corridor_width: 'm',
  driveway_width_basement: 'm', floor_to_floor_height_ground_lobby: 'm', floor_to_floor_height_basement_b1_b2: 'm',
  floor_to_floor_height_apt: 'm', parking_bay_size: 'sq m', basement_parking_efficiency: '', circulation_efficiency: '',
  steel_consumption: 'kg/sqft', concrete_consumption: 'cum/sqft', service_core_efficiency: '', passenger_lift_speed: 'm/s',
  service_lift_speed: 'm/s', avg_waiting_time: 'sec', overall_cooling_efficiency_apt: 'sq ft/tonne',
  overall_cooling_efficiency_club: 'sq ft/tonne', car_length: 'm', car_width: 'm', air_conditioned_area_for_appartment: 'sq m',
  tonnage_per_appartment: 'tonne', air_conditioned_area_for_club: 'sq m', tonnage_of_club_house: 'tonne', clear_height: 'm',
  average_wall_area_interior_exterior_per_unit: 'sq m', average_wall_area_interior_exterior_per_basement: 'sq m',
  addition_steel: 'Kg', price_of_steel: 'Kg/tonne', additional_concrete: 'cum', price_of_concrete: 'per cum',
}
export const inputUnit = (key: string) => INPUT_UNITS[key] || ''

/** Which accordion an input key belongs to (original Vv); unmapped keys fall under "Other". */
export const INPUT_SECTION: Record<string, string> = {
  building_height: 'Efficiency', carpet_area: 'Efficiency', saleable_area: 'Efficiency', balcony_area: 'Efficiency',
  built_up_area: 'Efficiency', far: 'Efficiency', total_external_wall_area: 'Efficiency', window_to_area_ratio: 'Efficiency',
  service_shaft_area: 'Efficiency', sales_price: 'Efficiency', construction_cost_on_bua: 'Efficiency', permissible_far: 'Efficiency',
  floor_to_floor_height_apt: 'Apt Configuration/ Dimensions', no_of_units: 'Apt Configuration/ Dimensions',
  average_wall_area_interior_exterior_per_unit: 'Apt Configuration/ Dimensions',
  lobby_corridor_width: 'Non-Apt Configuration', driveway_width_basement: 'Non-Apt Configuration',
  floor_to_floor_height_ground_lobby: 'Non-Apt Configuration', floor_to_floor_height_basement_b1_b2: 'Non-Apt Configuration',
  clear_height: 'Non-Apt Configuration', average_wall_area_interior_exterior_per_basement: 'Non-Apt Configuration',
  no_of_basements: 'Non-Apt Configuration', car_length: 'Non-Apt Configuration', car_width: 'Non-Apt Configuration',
  total_basement_area: 'Non-Apt Efficiencies', circulation_area: 'Non-Apt Efficiencies', total_parking_area: 'Non-Apt Efficiencies',
  total_number_of_cars: 'Non-Apt Efficiencies', total_steel_reinforcement: 'Structure', total_concrete_consumption: 'Structure',
  air_conditioned_area_for_appartment: 'MEP', tonnage_per_appartment: 'MEP', air_conditioned_area_for_club: 'MEP',
  tonnage_of_club_house: 'MEP', passenger_lift_speed: 'MEP', service_lift_speed: 'MEP', avg_waiting_time: 'MEP',
  cost_per_tonne_apartment: 'MEP', no_of_apartments: 'MEP', cost_per_tonne_club: 'MEP', no_of_clubs: 'MEP',
  no_of_passanger_lift: 'MEP', no_of_service_lift: 'MEP',
}
export const INPUT_SECTION_ORDER: Record<string, number> = {
  Efficiency: 1, 'Apt Configuration/ Dimensions': 2, 'Non-Apt Configuration': 3, 'Non-Apt Efficiencies': 4, Structure: 5, MEP: 6, Other: 7,
}

/** Keys of keyRatioFields[0] never shown as inputs (original toe; also used by compare). */
export const HIDDEN_INPUT_KEYS = new Set([
  'id', 'project_id', 'module_id', 'createdAt', 'updatedAt', 'value', 'is_flag', 'remark',
  'cost_of_apartment_wall_construction', 'cost_of_basement_wall_construction', 'revenue_per_extra_car_slot',
  'cost_of_passenger_lift_3ms', 'cost_of_passenger_lift_3_5ms', 'cost_of_passenger_lift_4ms', 'cost_of_service_lift_2_5ms',
  'cost_of_service_lift_3ms', 'calculated_cost', 'new_loading_factor', 'price_per_steel', 'price_per_concrete',
  'new_loading_factor2', 'theoritical_maximum', 'far_permissible_maximization', 'built_up_area_optimization',
])

/** Human label for an input key (original R4). */
export function inputLabel(key: string) {
  switch (key) {
    case 'average_wall_area_interior_exterior_per_unit':
      return 'average wall area (interior + exterior) per unit'
    case 'average_wall_area_interior_exterior_per_basement':
      return 'average wall area (interior + exterior) per basement'
    case 'no_of_passanger_lift':
      return 'no. of passenger lift'
    default:
      return key.replaceAll('_', ' ').replace(/\bno\b/gi, 'no.').replaceAll('far', 'FAR').replaceAll('bua', 'BUA')
  }
}

/* ------------------------------------------------------------------ */
/* Residential derived ratios (original See + coe)                      */
/* ------------------------------------------------------------------ */

const pf = (v: unknown) => parseFloat(String(v ?? 0) || '0')
const has = (e: KeyRatioForm, ...keys: string[]) => keys.every((k) => e?.[k] != null)

const RES_FORMULAS: Record<number, (e: KeyRatioForm) => string | undefined> = {
  1: (e) => (has(e, 'carpet_area', 'total_external_wall_area', 'saleable_area', 'balcony_area') ? (parseFloat(String(pf(e.carpet_area) + pf(e.total_external_wall_area) + pf(e.balcony_area))) / pf(e.saleable_area)).toFixed(2) : undefined),
  2: (e) => (has(e, 'carpet_area', 'saleable_area') ? (pf(e.carpet_area) / pf(e.saleable_area)).toFixed(2) : undefined),
  5: (e) => (has(e, 'far', 'saleable_area') ? (pf(e.saleable_area) / pf(e.far)).toFixed(2) : undefined),
  4: (e) => (has(e, 'built_up_area', 'saleable_area') ? (pf(e.built_up_area) / pf(e.saleable_area)).toFixed(2) : undefined),
  3: (e) => (has(e, 'balcony_area', 'saleable_area') ? (pf(e.balcony_area) / pf(e.saleable_area)).toFixed(2) : undefined),
  14: (e) => (has(e, 'car_length', 'car_width') ? (pf(e.car_length) * pf(e.car_width)).toFixed(2) : undefined),
  15: (e) => (has(e, 'total_parking_area', 'total_number_of_cars') ? (pf(e.total_parking_area) / pf(e.total_number_of_cars)).toFixed(2) : undefined),
  16: (e) => (has(e, 'circulation_area', 'far') ? ((pf(e.circulation_area) / pf(e.far)) * 100).toFixed(2) : undefined),
  19: (e) => (has(e, 'service_shaft_area', 'far') ? ((pf(e.service_shaft_area) / pf(e.far)) * 100).toFixed(2) : undefined),
  23: (e) => (has(e, 'air_conditioned_area_for_appartment', 'tonnage_per_appartment') ? ((pf(e.air_conditioned_area_for_appartment) / pf(e.tonnage_per_appartment)) * 10.764).toFixed(2) : undefined),
  24: (e) => (has(e, 'air_conditioned_area_for_club', 'tonnage_of_club_house') ? ((pf(e.air_conditioned_area_for_club) / pf(e.tonnage_of_club_house)) * 10.764).toFixed(2) : undefined),
  17: (e) => (has(e, 'total_steel_reinforcement', 'built_up_area') ? (pf(e.total_steel_reinforcement) / (pf(e.built_up_area) * 10.764)).toFixed(2) : undefined),
  18: (e) => (has(e, 'total_concrete_consumption', 'built_up_area') ? (pf(e.total_concrete_consumption) / (pf(e.built_up_area) * 10.764)).toFixed(2) : undefined),
  27: (e) => (has(e, 'permissible_far', 'far') ? ((pf(e.far) / pf(e.permissible_far)) * 100).toFixed(2) : undefined),
}

/** Raw calculated value of a residential ratio (original coe). */
export function residentialRawValue(field: ResCalField, form: KeyRatioForm, depKey: 'dependecy_fields' | 'dependency_fields' = 'dependecy_fields') {
  const f = RES_FORMULAS[field?.id]
  if (f) return f(form) ?? null
  const deps = field?.[depKey]
  return deps?.length === 1 ? (form[deps[0]] as string | number | null | undefined) : null
}

/** Rounded calculated value (what the ratio box shows). */
export function residentialValue(field: ResCalField, form: KeyRatioForm, depKey: 'dependecy_fields' | 'dependency_fields' = 'dependecy_fields') {
  const raw = residentialRawValue(field, form, depKey)
  return roundTo(isNaN(raw as number) ? 0 : (raw as number), field?.field_id === 18 ? 3 : 2)
}

/* ------------------------------------------------------------------ */
/* Residential rupee impact (original wee / bee / _ee / Eee / Cee)      */
/* ------------------------------------------------------------------ */

type MinMax = { min: number; max: number; average: number } | null

/** Benchmark min/max/avg of a field for the project's category (original wee). */
export function fieldMinMax(field: ResCalField, category: string, range: string | undefined | null): MinMax {
  if ([17, 18].includes(field?.id)) {
    const [a, b] = String(range).split('-').map((s) => s.trim())
    const lo = parseFloat(a)
    const hi = parseFloat(b)
    return { min: lo, max: hi, average: (lo + hi) / 2 }
  }
  const r = field?.[category] as string | undefined
  if (!r || !r.includes('-')) return null
  const [a, b] = r.split('-').map((s) => s.trim())
  const lo = parseFloat(a)
  const hi = parseFloat(b)
  return isNaN(lo) || isNaN(hi) ? null : { min: lo, max: hi, average: (lo + hi) / 2 }
}

type FieldEntry = { field_id: number; field_value: number | null; remark: string; flag: unknown; isValid: string }

function fieldCostByName(
  name: string,
  form: KeyRatioForm,
  message: string | undefined,
  value: (n: string) => number | null,
  max: (n: string) => number,
  min: (n: string) => number,
): number | null | undefined {
  const g = (k: string) => num(form, k) as number
  switch (name) {
    case 'floor to floor height for apartment':
      return message !== 'value more than benchmark'
        ? undefined
        : ((g('floor_to_floor_height_apt') - max(name)) * g('cost_of_apartment_wall_construction') * g('average_wall_area_interior_exterior_per_unit') * g('no_of_units')) / 1e7
    case 'floor to floor height for basement':
      return message !== 'value more than benchmark'
        ? undefined
        : ((g('floor_to_floor_height_basement_b1_b2') - max(name)) * g('cost_of_basement_wall_construction') * g('average_wall_area_interior_exterior_per_basement') * g('no_of_basements')) / 1e7
    case 'Basement parking efficiency':
      return (value(name) as number) <= max(name) ? undefined : ((g('total_parking_area') / min(name) - g('total_number_of_cars')) * g('revenue_per_extra_car_slot')) / 1e7
    case 'Steel consumption (kg/sqft)': {
      const c = value(name) as number
      return c <= max(name) ? undefined : ((c - max(name)) * g('built_up_area') * 10.764 * g('price_per_steel')) / 1e7
    }
    case 'Concrete consumption (cum/sqft)': {
      const c = value(name) as number
      return c <= max(name) ? undefined : ((c - max(name)) * g('built_up_area') * 10.764 * g('price_per_concrete')) / 1e7
    }
    case 'Overall efficiency of cooling system(Apartment)': {
      const c = value(name) as number
      return c <= max(name) && c >= min(name)
        ? undefined
        : ((g('tonnage_per_appartment') - (g('air_conditioned_area_for_appartment') * 10.764) / min(name)) * g('cost_per_tonne_apartment') * g('no_of_apartments')) / 1e7
    }
    case 'Overall efficiency of cooling system(club)': {
      const c = value(name) as number
      return c <= max(name) && c >= min(name)
        ? undefined
        : ((g('tonnage_of_club_house') - (g('air_conditioned_area_for_club') * 10.764) / min(name)) * g('no_of_clubs') * g('cost_per_tonne_club')) / 1e7
    }
    case 'Service Lift Speed': {
      if (message !== 'value more than benchmark') return undefined
      const speed = g('service_lift_speed')
      const c25 = g('cost_of_service_lift_2_5ms')
      const c3 = g('cost_of_service_lift_3ms')
      const base = max(name) == 2.5 ? c25 : c3
      const cur = speed == 3 ? c3 : speed
      return g('no_of_service_lift') * (cur - base)
    }
    case 'Passenger lift speed': {
      const speed = g('passenger_lift_speed')
      if (speed <= max(name) && speed >= min(name)) return undefined
      const c35 = g('cost_of_passenger_lift_3_5ms')
      const c4 = g('cost_of_passenger_lift_4ms')
      let out: number | undefined
      if (speed == 4) {
        const base = max(name) === 3.5 ? c35 : max(name) === 4 ? c4 : (null as unknown as number)
        out = g('no_of_passanger_lift') * ((speed === 4 ? c4 : speed) - base)
      }
      return out ?? null
    }
    default:
      return null
  }
}

export type SectionCost = {
  section_id?: number
  section_cost: number
  theoreticalLoadingFactor?: number
  theoreticalApartmentEfficiencies?: number
  FARPermissibleMaximization?: string
  BuitUpAreaOptimization?: string
  newLoadingFactor?: number
  [k: string]: unknown
}

export type ResidentialComputation = {
  validity: Record<number, { validity: Validity; range: string | undefined | null }>
  values: Record<number, number | null>
  flags: Record<string, FieldEntry>
  fieldCost: Record<number, number>
  sectionCost: Record<string, SectionCost>
}

/**
 * Runs the original `uoe` effect over every calculated field in order and returns all the
 * state it would have written (validity, values, remark/flag entries, field + section rupee cost).
 * `stored` = remark/flag overrides kept in localStorage (keyed by field id).
 */
export function computeResidential(
  calc: Record<string, Record<string, ResCalField[]>> | undefined,
  form: KeyRatioForm,
  category: string,
  stored: Record<string, { isFlagged?: unknown; remark?: string }> = {},
): ResidentialComputation {
  const out: ResidentialComputation = { validity: {}, values: {}, flags: {}, fieldCost: {}, sectionCost: {} }
  const byName: Record<string, FieldEntry> = {}
  const minMax: Record<string, MinMax> = {}
  const sectionCosts: Record<string, number>[] = []

  Object.values(calc ?? {}).forEach((sections) =>
    Object.entries(sections).forEach(([sectionName, fields]) =>
      fields.forEach((f) => {
        const raw = residentialRawValue(f, form)
        const value = roundTo(isNaN(raw as number) ? 0 : (raw as number), f?.field_id === 18 ? 3 : 2)
        const range = heightRange(f?.id, category, form.building_height) ?? (f?.[category] as string | undefined)
        const validity = checkValidity(value, range, f?.id, residentialDynamicRange(f, category), false, form.building_height as number)
        minMax[f.field_name.toLowerCase().replaceAll(' ', '_')] = fieldMinMax(f, category, range)
        const s = stored[f?.id]
        const entry: FieldEntry = {
          field_id: f.id,
          field_value: value,
          remark: s ? (s.remark as string) : (f.remark ?? ''),
          flag: s ? s.isFlagged : (f.is_flag ?? false),
          isValid: validity?.value ?? 'pending',
        }
        out.validity[f.id] = { validity, range }
        out.values[f.id] = value
        byName[normKey(f.field_name)] = entry
        out.flags[normKey(f.id)] = entry
        applyFieldCost(f, sectionName, form, out, validity, sectionCosts, minMax, byName)
      }),
    ),
  )
  return out
}

/** Port of original `_ee` (cost of one field / its section). Mutates `out`. */
function applyFieldCost(
  f: ResCalField,
  sectionName: string,
  form: KeyRatioForm,
  out: ResidentialComputation,
  validity: Validity,
  sectionCosts: Record<string, number>[],
  minMax: Record<string, MinMax>,
  byName: Record<string, FieldEntry>,
) {
  const valueOf = (n: string) => {
    const v = byName[normKey(n)]?.field_value
    if (v == null) return null
    const x = Number(v)
    return Number.isFinite(x) ? x : null
  }
  if (f?.rupee_value === 0) return
  const avg = (n: string) => minMax[normKey(n)]?.average ?? 0
  const max = (n: string) => minMax[normKey(n)]?.max ?? 0
  const min = (n: string) => minMax[normKey(n)]?.min ?? 0
  const g = (k: string) => num(form, k) as number

  const aSaleFar = avg('saleable/far')
  const aCirc = avg('circulation_efficiency')
  const aBuaSale = avg('bua/saleable')
  const aCarpet = avg('carpet_area/saleable')
  const aBalcony = avg('balcony_area/saleable_area')
  const price = g('sales_price')
  const cost = g('construction_cost_on_bua')
  const saleable = g('saleable_area')
  const bua = g('built_up_area')
  const revenue = (saleable * 10.764 * price) / 1e7
  const build = (bua * 10.764 * cost) / 1e7
  const permSale = g('permissible_far') * (valueOf('saleable/far') as number)
  const permBua = permSale * (valueOf('bua/saleable') as number)
  const farGain = (permSale * 10.764 * price) / 1e7 - (permBua * 10.764 * cost) / 1e7 - (revenue - build)
  out.fieldCost[27] = farGain

  const q = g('permissible_far') * aSaleFar
  const farMax = crore(Math.round((q * 10.764 * price) / 1e7 - (q * aBuaSale * 10.764 * cost) / 1e7 - (revenue - build)))
  const buaOpt = crore(Math.round(revenue - (saleable * aBuaSale * 10.764 * cost) / 1e7 - (revenue - build)))

  if (f?.section.toLowerCase() === 'efficiency') {
    const far = (form.far as number) ?? 0
    const newSaleable = aSaleFar * far
    const newBua = aBuaSale * newSaleable
    const newCarpet = aCarpet * newSaleable
    const newBalcony = aBalcony * newSaleable
    const newCirc = aCirc * far
    const loading = (newCarpet + parseFloat(String(form.total_external_wall_area)) + newBalcony) / newSaleable
    const maxSaleable = max('saleable/far') * far
    const minBua = min('bua/saleable') * maxSaleable
    const theoLoading = (g('total_external_wall_area') + aBalcony * maxSaleable + aCarpet * maxSaleable) / maxSaleable
    const sectionCost = (newSaleable * 10.764 * price) / 1e7 - (newBua * 10.764 * cost) / 1e7 - (revenue - build)
    const theoEff = (maxSaleable * 10.764 * price) / 1e7 - (minBua * 10.764 * cost) / 1e7 - (revenue - build)
    out.sectionCost[sectionName] = {
      section_id: f?.section_id,
      section_cost: sectionCost,
      theoreticalLoadingFactor: theoLoading,
      theoreticalApartmentEfficiencies: theoEff,
      FARPermissibleMaximization: farMax,
      BuitUpAreaOptimization: buaOpt,
      newLoadingFactor: loading,
      newScalable: newSaleable,
      newBUA: newBua,
      newCarpetArea: newCarpet,
      newBalconyArea: newBalcony,
      newCirculationArea: newCirc,
    }
    return
  }
  const message = validity?.message?.toLowerCase()?.trim()
  const c = fieldCostByName(f?.field_name, form, message, valueOf, max, min) ?? 0
  sectionCosts.push({ [sectionName]: c })
  const sums: Record<string, number> = {}
  sectionCosts.forEach((o) => {
    const [k, v] = Object.entries(o)[0] || []
    if (k && v != null && !isNaN(v)) sums[k] = (sums[k] || 0) + Math.round(Number(v))
  })
  out.sectionCost[sectionName] = { section_id: f?.section_id, section_cost: sums[sectionName] }
  out.fieldCost[f.id] = c
}

/** Sum of section costs per tab (original Cee). */
export function residentialTabCost(sections: Record<string, SectionCost>) {
  const sum = (names: string[]) => names.reduce((a, n) => a + (sections[n]?.section_cost || 0), 0)
  return {
    Design: sum(['Efficiency', 'Apt Configuration/ Dimensions', 'Non-Apt Configuration', 'Non-Apt Efficiencies']),
    Structure: sum(['Coefficients', 'General']),
    MEP: sum(['Lifts', 'HVAC']),
  } as Record<string, number>
}

/* ------------------------------------------------------------------ */
/* Commercial                                                          */
/* ------------------------------------------------------------------ */

export type ComInput = { field_id: number; value: string | number | null | undefined }
export type ComOutputState = { field_id: number; field_value?: number | string | null; remark?: string | null; is_flag?: boolean | number | null; calculated_cost?: number | null }
export type ComRef = { id?: number; field_id: number; dependency?: number[]; range?: string; dynamicRange?: DynamicRange; sectionName: string; tabName: string }

const bn = (v: unknown, d: number | null = 0) => {
  const n = parseFloat(String(v))
  return isNaN(n) ? d : n
}
/** Value of input `id` from `[{field_id, value}]` (original dt). */
export const inputValue = (rows: ComInput[] | undefined, id: number) => bn(rows?.find((r) => r?.field_id === id)?.value, null)

const COM_FORMULAS: Record<number, (e: ComInput[]) => number | undefined> = {
  1: (e) => ratio(e, 2, 53, 100),
  2: (e) => ratio(e, 3, 52, 100),
  3: (e) => ratio(e, 4, 42, 100),
  4: (e) => ratio(e, 6, 1, 100),
  8: (e) => ratio(e, 11, 17),
  17: (e) => {
    const t = inputValue(e, 14)
    const n = inputValue(e, 42)
    if (t != null && n != null) return bn(t / (n * 10.764)) as number
  },
  18: (e) => {
    const t = inputValue(e, 15)
    const n = inputValue(e, 42)
    if (t != null && n != null) return bn(t / (n * 10.764)) as number
  },
  22: (e) => ratio(e, 16, 43, 10.764),
  26: (e) => ratio(e, 1, 35, 100),
  31: (e) => ratio(e, 58, 1),
  32: (e) => ratio(e, 58, 52),
  33: (e) => ratio(e, 58, 53),
  37: (e) => ratio(e, 42, 58),
  38: (e) => ratio(e, 42, 59),
  39: (e) => ratio(e, 42, 60),
  41: (e) => ratio(e, 71, 58),
  30: (e) => ratio(e, 74, 73, 100),
  44: (e) => ratio(e, 79, 77, 10.764),
}
function ratio(e: ComInput[], a: number, b: number, mult = 1) {
  const x = inputValue(e, a)
  const y = inputValue(e, b)
  if (x != null && y != null) return bn((x / y) * mult) as number
}

/** Calculated commercial output value (original Oee + K1). */
export function commercialValue(ref: { field_id: number; dependency?: number[] }, inputs: ComInput[]) {
  const f = COM_FORMULAS[ref?.field_id]
  const raw = f ? (f(inputs) ?? null) : ref?.dependency?.length === 1 ? inputValue(inputs, ref.dependency[0]) : null
  return roundTo(raw, ref?.field_id === 18 ? 3 : 2)
}

const LIFT = { SERVICE: 20, SERVICE_OFFICE: 43, PASSENGER: 19, PASSENGER_OFFICE: 42, STEEL: 17, CONCRETE: 18, PARKING: 8, COOL_RETAIL: 22, BASEMENT_HEIGHT: 16, SALEABLE_GC: 30, COOL_OFFICE: 44 }

/** Commercial cost engine (original class n4). */
export class CommercialCosts {
  private unit = 10.764
  private core = 1e7
  minMaxAvg: Record<number, MinMax | undefined> = {}
  fieldCost: Record<number, number> = {}
  sectionCost: Record<string, number> = {}
  tabCost: Record<string, number> = {}
  private height: number | null

  private inputs: Map<number, unknown>
  private outputs: Map<number, { value: unknown; range?: string; sectionName?: string }>
  private refs: ComRef[]
  private category: string | undefined

  constructor(
    inputs: Map<number, unknown>,
    outputs: Map<number, { value: unknown; range?: string; sectionName?: string }>,
    refs: ComRef[],
    category: string | undefined,
  ) {
    this.inputs = inputs
    this.outputs = outputs
    this.refs = refs
    this.category = category
    this.height = this.inp(41)
    this.run()
  }

  private run() {
    for (const r of this.refs) {
      const id = r.field_id
      const val = this.outputs.get(id)?.value
      let validity: Validity | undefined
      if (r.range?.includes('-')) {
        const range = heightRange(id, this.category, this.height) ?? r.range
        validity = checkValidity(val, range, id, r.dynamicRange, false, this.height, true)
        this.minMaxAvg[id] = this.rangeOf(range)
      }
      const c = this.costOf(id, validity?.message) as number
      this.fieldCost[id] = c
      this.sectionCost[r.sectionName] = (this.sectionCost[r.sectionName] ?? 0) + (isNaN(c) ? 0 : c)
      this.tabCost[r.tabName] = (this.tabCost[r.tabName] ?? 0) + c
    }
    const s = this.sectionFields()
    this.sectionCost.SaleableAreaMaximization = this.toNum(s.SaleableAreaMaximization)
    this.sectionCost.FARPermissibleUtilization = this.toNum(s.FARPermissibleUtilization)
    this.sectionCost.BuiltUpAreaOptimization = this.toNum(s.BuiltUpAreaOptimization)
    this.sectionCost.Saleable_GC_Maximization = this.toNum(s.Saleable_GC_Maximization)
    this.fieldCost[LIFT.SALEABLE_GC] = this.toNum(s.Saleable_GC_Maximization)
  }

  private sectionFields() {
    const [t, n, r, o, s, l, c, d, f, h, m, g, v] = [72, 63, 58, 42, 1, 61, 62, 35, 60, 59, 73, 74, 56].map((i) => this.inp(i) as number)
    const b = this.out(31) as number
    const w = this.out(37) as number
    const C = this.out(6) as number
    const E = this.minMaxAvg[31]?.average as number
    const A = this.minMaxAvg[37]?.average as number
    const R = (f / r) * c + (h / r) * l
    const O = (r * this.unit * R) / this.core
    const N = O - (o * this.unit * n) / this.core
    const z = s * E
    const q = (z * this.unit * R) / this.core - (z * A * this.unit * n) / this.core - N
    const ae = d * b
    const ee = (ae * this.unit * R) / this.core - (ae * w * this.unit * n) / this.core - N
    const $ = O - (r * A * this.unit * n) / this.core - N
    const oe = ((m * (v / 100) - g) * C * t) / this.core
    return { SaleableAreaMaximization: q, FARPermissibleUtilization: ee, BuiltUpAreaOptimization: $, Saleable_GC_Maximization: oe }
  }

  private costOf(id: number, msg?: string): number | undefined {
    switch (id) {
      case LIFT.SERVICE:
        return this.serviceLift(id, msg, 64, 65, 66)
      case LIFT.SERVICE_OFFICE:
        return this.serviceLift(id, msg, 80, 82, 83)
      case LIFT.PASSENGER:
        return this.passengerLift(id, 67, 69, 70)
      case LIFT.PASSENGER_OFFICE:
        return this.passengerLift(id, 81, 85, 86)
      case LIFT.STEEL: {
        const r = this.out(id) as number
        const o = this.minMaxAvg[id]?.max as number
        if (r <= o) return undefined
        return this.toNum(((r - o) * (this.inp(42) as number) * this.unit * (this.inp(46) ?? 55)) / this.core)
      }
      case LIFT.CONCRETE: {
        const r = this.out(id) as number
        const o = this.minMaxAvg[id]?.max as number
        if (r <= o) return 0
        return this.toNum(((r - o) * (this.inp(42) as number) * this.unit * (this.inp(47) ?? 5e3)) / this.core)
      }
      case LIFT.PARKING: {
        const r = this.out(id) as number
        const o = this.minMaxAvg[id]?.max as number
        if (r <= o) return 0
        const d = this.minMaxAvg[id]?.min as number
        return this.toNum((((this.inp(11) as number) / d - (this.inp(17) as number)) * (this.inp(44) ?? 5e5)) / this.core)
      }
      case LIFT.COOL_RETAIL:
        return this.cooling(id, 43, 16, 50)
      case LIFT.COOL_OFFICE:
        return this.cooling(id, 77, 79, 78)
      case LIFT.BASEMENT_HEIGHT: {
        if (msg !== 'Value more than benchmark') return 0
        const r = this.out(id) as number
        const o = this.minMaxAvg[id]?.max as number
        return this.toNum(((r - o) * (this.inp(45) ?? 40) * (this.inp(48) as number) * (this.inp(49) as number)) / this.core)
      }
      default:
        return 0
    }
  }

  private serviceLift(id: number, msg: string | undefined, countId: number, c25Id: number, c3Id: number) {
    if (msg !== 'Value more than benchmark') return 0
    const r = this.out(id) as number
    const c25 = this.inp(c25Id) ?? 0.66
    const c3 = this.inp(c3Id) ?? 0.7
    const base = this.minMaxAvg[id]?.max == 2.5 ? c25 : c3
    return this.toNum((this.inp(countId) as number) * ((r == 3 ? c3 : r) - base))
  }

  private passengerLift(id: number, countId: number, c35Id: number, c4Id: number) {
    const r = this.out(id) as number
    const o = this.minMaxAvg[id]?.max as number
    const s = this.minMaxAvg[id]?.min as number
    if (r <= o && r >= s) return 0
    const c35 = this.inp(c35Id) ?? 1.2
    const c4 = this.inp(c4Id) ?? 1.4
    let g: number | undefined
    if (r == 4) {
      const base = o === 2.5 ? c35 : o === 4 ? c4 : (null as unknown as number)
      g = (this.inp(countId) as number) * ((r === 4 ? c4 : r) - base)
    }
    return this.toNum(g)
  }

  private cooling(id: number, tonId: number, areaId: number, costId: number) {
    const r = this.out(id) as number
    const o = this.minMaxAvg[id]?.min as number
    const s = this.minMaxAvg[id]?.max as number
    if (r <= s && r >= o) return 0
    return this.toNum((((this.inp(tonId) as number) - ((this.inp(areaId) as number) * this.unit) / o) * (this.inp(costId) as number)) / this.core)
  }

  private rangeOf(range: string | undefined): MinMax | undefined {
    if (range?.includes('-')) {
      const [a, b] = range.split('-').map(Number)
      return { min: a, max: b, average: (a + b) / 2 }
    }
  }
  private inp(id: number) {
    const n = parseFloat(String(this.inputs.get(id)))
    return isNaN(n) ? null : n
  }
  private out(id: number) {
    const n = parseFloat(String(this.outputs.get(id)?.value))
    return isNaN(n) ? null : n
  }
  private toNum(v: number | undefined, d = 0) {
    const r = Math.round(v as number)
    return isNaN(r) ? d : r
  }
}

/** Build the commercial cost result exactly like the original Ree hook. */
export function computeCommercial(inputs: ComInput[], outputs: ComOutputState[], refs: ComRef[], category: string | undefined) {
  const inMap = new Map<number, unknown>()
  inputs?.forEach((i) => inMap.set(i.field_id, i.value))
  const outMap = new Map<number, { value: unknown; range?: string; sectionName?: string }>()
  outputs?.forEach((o, i) => outMap.set(o.field_id, { value: o.field_value, range: refs[i]?.range, sectionName: refs[i]?.sectionName }))
  return new CommercialCosts(inMap, outMap, refs, category)
}
