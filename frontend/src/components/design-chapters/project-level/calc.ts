/* Calculations for the Project Level Design page (same formulas as the original). */
import type { AdditionalElements2, AreaStatementInputs, ClusterConfig, KeyRatioInputs, ProjectLevelDesignData } from '@/types/chapters-a'

const f = (v: unknown) => parseFloat(String(v ?? '')) || 0

export const KEY_RATIO_DEFAULTS: KeyRatioInputs = Object.fromEntries(
  [
    'balconyArea', 'builtUpArea', 'far', 'totalExternalWallArea', 'serviceShaftArea', 'windowToAreaRatio', 'salesPrice', 'constructionCostOnBUA',
    'permissibleFAR', 'noOfEWSUnit', 'ewsFAR', 'buildingHeight', 'carpetArea', 'saleableArea', 'floorToFloorHeightApt', 'avgWallArea', 'noOfUnits',
    'totalBasementArea', 'circulationArea', 'totalParkingArea', 'totalNumberOfCars', 'lobbyCorridorWidth', 'drivewayWidthBasement',
    'floorToFloorHeightGroundLobby', 'floorToFloorHeightB1GFTower', 'floorToFloorHeightB1GFNonTower', 'floorToFloorHeightB2B1',
    'floorToFloorHeightB3B2', 'carLength', 'carWidth', 'carHeight', 'noOfBasements',
  ].map((k) => [k, '']),
)

export const AREA_STATEMENT_DEFAULTS: AreaStatementInputs = Object.fromEntries(
  ['licensedAreaSqm', 'todLandSqm', 'nonTodLandSqm', 'commercialSqm', 'todBaseFar', 'todGriha', 'todTdr', 'nonTodBaseFar', 'nonTodGriha', 'nonTodTdr', 'proposedFarSqm', 'permissibleGcPct', 'proposedGcSqm'].map((k) => [k, '']),
)

export const ADDITIONAL_DEFAULTS = (): AdditionalElements2 => ({
  rows: ['Total', 'Residential', 'Commercial', 'Club', 'Basement', 'Circulation Area', 'Parking Area', 'External Wall', 'Service Shaft Area'].map((category) => ({ category, bua: '', sa: '', ca: '' })),
  other: {
    groundFloorEntranceLobby: '', openingsToGroundFloorLobby: '', floorToFloorHeight: '', typicalFloor: '', stilt: '', pentHouse: '', pentHousePlanning: '',
    unitsOnGroundFloor: '', surfaceDrivewayWidth: '', rampsEntryToBasementWidth: '', basementClearHeightRamp: '', basementClearHeightB1: '',
    basementClearHeightB2: '', totalFromTypologySum: '', noOfParkingSlots: '', parkingRequirement: '', fsi: '', valueInProject: '', jhkParkingSlot: '',
    extraParkingReqs: [
      { label: '2 BHK + STUDY', value: '' },
      { label: '1 BHK + STUDY', value: '' },
    ],
  },
})

export const newCluster = (name = 'Cluster 1'): ClusterConfig => ({
  name,
  floorFAR: '', floorBUA: '', nonFARBUA: '', floorCarpetArea: '', floorShaftArea: '', structureFootprintArea: '', nonSaleableFAR: '',
  windowOpeningArea: '', externalGlazingArea: '', wallPerimeterArea: '',
})

/* original key-ratio formula table (subset used here): 4 BUA/Saleable, 5 Saleable/FAR, 27 FAR utilisation */
export function keyRatioFormula(id: 4 | 5 | 27, l: KeyRatioInputs) {
  const v = { bua: l.builtUpArea, sa: l.saleableArea, far: l.far, pfar: l.permissibleFAR }
  let r: string | undefined
  if (id === 4 && v.bua != null && v.sa != null) r = (f(v.bua) / f(v.sa)).toFixed(2)
  if (id === 5 && v.far != null && v.sa != null) r = (f(v.sa) / f(v.far)).toFixed(2)
  if (id === 27 && v.pfar != null && v.far != null) r = ((f(v.far) / f(v.pfar)) * 100).toFixed(2)
  return r != null && !isNaN(Number(r)) ? r : ''
}

/** Area statement derived values */
export function areaStatement(a: AreaStatementInputs) {
  const tod = f(a.todLandSqm)
  const nonTod = f(a.nonTodLandSqm)
  const lic = f(a.licensedAreaSqm)
  const comm = f(a.commercialSqm)
  const res = tod + nonTod
  const [tb, tg, tt, nb, ng, nt] = [a.todBaseFar, a.todGriha, a.todTdr, a.nonTodBaseFar, a.nonTodGriha, a.nonTodTdr].map(f)
  const todTotal = tod * tb + tod * tg + tod * tt
  const nonTodTotal = nonTod * nb + nonTod * ng + nonTod * nt
  const totalFar = todTotal + nonTodTotal
  const proposed = f(a.proposedFarSqm)
  const gcPct = f(a.permissibleGcPct)
  const propGc = f(a.proposedGcSqm)
  const check = res + comm
  const AC = 4046.86
  return {
    residentialSqm: res, residentialAcre: res / AC, licensedAreaAcre: lic / AC, licensedSqm: lic, todLandAcre: tod / AC, todSqm: tod,
    nonTodLandAcre: nonTod / AC, nonTodSqm: nonTod, commercialAcre: comm / AC, commSqm: comm, checkSqm: check, checkAcre: check / AC,
    todBaseFARsqm: tod * tb, todGrihaSqm: tod * tg, todTdrSqm: tod * tt, todFactorX: tb + tg + tt, todTotalFARsqm: todTotal,
    nonTodBaseFARsqm: nonTod * nb, nonTodGrihaSqm: nonTod * ng, nonTodTdrSqm: nonTod * nt, nonTodFactorY: nb + ng + nt, nonTodTotalFARsqm: nonTodTotal,
    totalPermissibleFARsqm: totalFar, blendedFAR: res > 0 ? totalFar / res : 0, proposedFARsqm: proposed, proposedFarPct: totalFar > 0 ? (proposed / totalFar) * 100 : 0,
    permissibleGcSqm: res * (gcPct / 100), proposedGcPct: res > 0 ? (propGc / res) * 100 : 0,
  }
}

/** Key ratios shown in the comparison table (also computed for compared projects) */
export function comparisonRatios(d: ProjectLevelDesignData) {
  const l = d.keyRatioInputs || {}
  const rows = d.additionalElements2?.rows || []
  const cell = (cat: string, k: 'bua' | 'sa' | 'ca') => f(rows.find((r) => r.category === cat)?.[k])
  const bua = cell('Total', 'bua') || f(l.builtUpArea)
  const sa = cell('Total', 'sa') || f(l.saleableArea)
  const ca = cell('Total', 'ca') || f(l.carpetArea)
  const far = f(l.far)
  const bal = f(l.balconyArea)
  const shaft = cell('Service Shaft Area', 'bua') || f(l.serviceShaftArea)
  const cars = f(l.totalNumberOfCars)
  const wall = cell('External Wall', 'bua') || f(l.totalExternalWallArea)
  const basement = f(l.totalBasementArea)
  const circ = f(l.circulationArea)
  const ratio = (a: number, b: number) => (b > 0 ? (a / b).toFixed(2) : '-')
  const pct = (a: number, b: number) => (b > 0 ? ((a / b) * 100).toFixed(2) + '%' : '-')
  return {
    saleableFAR: ratio(sa, far),
    buaSaleable: ratio(bua, sa),
    buaFAR: ratio(bua, far),
    carpetSaleable: pct(ca, sa),
    coreEfficiency: pct(shaft, far),
    parkingEfficiency: cars > 0 ? ((basement - circ) / cars).toFixed(2) : '-',
    loadingFactor: sa > 0 ? ((ca + wall + bal) / sa).toFixed(2) : '-',
  } as Record<string, string>
}

export const n2 = (v: unknown) => f(v)
