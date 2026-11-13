/*
 * Module 6 club figures (stored in projectLevelDesignData.additionalElements2.other). Only Clubhouse Area is entered
 * (Key Ratio › Efficiency, under EWS FAR); the other fields below are read if present in older data.
 *
 *   Club area per unit       = clubhouse area ÷ units
 *   Pool area per unit       = pool area ÷ units
 *   Amenities per 100 units  = (amenities ticked in Landscape & Amenities + facilities marked Yes here that
 *                               aren't already in that list) ÷ units × 100
 * The entrance lobby height is the existing "Ground Floor Entrance Lobby" input of Module 6.
 */
export type AmenityField = { key: string; label: string; kind: 'number' | 'yesno'; unit?: string; match?: RegExp }
export const AMENITY_FIELDS: AmenityField[] = [
  { key: 'clubhouseArea', label: 'Clubhouse Area', kind: 'number', unit: 'sq ft' },
  { key: 'poolArea', label: 'Swimming Pool Area (water body)', kind: 'number', unit: 'sq ft' },
  { key: 'sportsCourts', label: 'No. of Sports Courts', kind: 'number', unit: '#' },
  { key: 'kidsZone', label: 'Kids Zone', kind: 'yesno', match: /kid|child|creche|tot/i },
  { key: 'seniorZone', label: 'Senior Citizen Zone', kind: 'yesno', match: /senior|elder/i },
  { key: 'petZone', label: 'Pet Zone', kind: 'yesno', match: /\bpet/i },
  { key: 'coWorking', label: 'Co-working Space', kind: 'yesno', match: /co-?work|business cent/i },
  { key: 'inCampusRetail', label: 'In-campus Retail / Convenience Store', kind: 'yesno', match: /retail|convenience|store|shop/i },
]

const n = (v: unknown) => {
  const x = parseFloat(String(v ?? '').replace(/,/g, ''))
  return Number.isFinite(x) ? x : null
}
const yes = (v: unknown) => /^(yes|true)$/i.test(String(v ?? ''))

export type AmenityOutputs = {
  clubArea: number | null
  clubPerUnit: number | null
  poolPerUnit: number | null
  courts: number | null
  amenityCount: number
  amenitiesPer100: number | null
  lobby: string
}

export function amenityOutputs(other: Record<string, unknown> | null | undefined, units: number | null, landscapeSelected: unknown): AmenityOutputs {
  const o = other ?? {}
  const selected = Array.isArray(landscapeSelected) ? landscapeSelected.map(String) : []
  const extra = AMENITY_FIELDS.filter((f) => f.kind === 'yesno' && yes(o[f.key]) && !selected.some((s) => f.match?.test(s))).length
  const amenityCount = selected.length + extra
  const club = n(o.clubhouseArea)
  const pool = n(o.poolArea)
  return {
    clubArea: club,
    clubPerUnit: club !== null && units ? club / units : null,
    poolPerUnit: pool !== null && units ? pool / units : null,
    courts: n(o.sportsCourts),
    amenityCount,
    amenitiesPer100: amenityCount && units ? (amenityCount / units) * 100 : null,
    lobby: String(o.groundFloorEntranceLobby ?? ''),
  }
}

/** from a saved summary */
export function amenityOutputsOf(summary: Record<string, unknown> | null | undefined): AmenityOutputs {
  const s = summary ?? {}
  const pl = (s.projectLevelDesignData ?? {}) as { keyRatioInputs?: Record<string, unknown>; additionalElements2?: { other?: Record<string, unknown> } }
  const la = (s.landscapeAmenitiesData ?? {}) as { selectedAmenities?: unknown }
  return amenityOutputs(pl.additionalElements2?.other, n(pl.keyRatioInputs?.noOfUnits), la.selectedAmenities)
}
