/**
 * Seed for the "chapters-a" design-chapter pages (fictional sample data).
 * Chapter data lives in the per-project design-brief summary (table `designBriefSummaries`,
 * served by GET/POST /project/:id/design-brief-summary). Structure / MEP chapter values live on the
 * department records (`briefStructure` / `briefMep`, served by /structure and /mep).
 * Residential project 1 and commercial project 5 are populated.
 */
import { registerSeed, type Db } from '../db'
import { seedDesignBrief } from './design-brief'
import { seedChapterCatalogue } from './chapters-a-catalogue'
import type { ChaptersASummary, Typology } from '@/types/chapters-a'

const SUMMARY = 'designBriefSummaries'

const typology = (id: number, name: string, v: Partial<Typology>): Typology => ({
  id,
  name,
  type: '',
  noOfUnits: '',
  saleableArea: '',
  coveredArea: '',
  unitFar: '',
  balconyAreaNonFar: '',
  balconyAreaFar: '',
  carpetArea: '',
  coreArea: '',
  unitsPerCore: '',
  internalWallThickness: '',
  commonWallThickness: '',
  wallArea: '',
  acArea: '',
  circulationFar: '',
  permissibleFar: '',
  plan: null,
  keyPlan: null,
  isOpen: false,
  ...v,
})

const layouts = (names: string[], withFiles: string[]) =>
  ['Master Plan', ...names].map((name, i) => ({
    id: i,
    name,
    fixed: i === 0 ? true : undefined,
    infoText: i === 0 ? 'Site Area: 10 acres\nTowers: 6' : '',
    files: withFiles.includes(name)
      ? [{ id: 1000 + i, name: `${name.toLowerCase().replace(/\s+/g, '_')}.pdf`, url: '', size: '2.4 MB', date: '2026-08-14' }]
      : [],
  }))

const RESIDENTIAL: ChaptersASummary = {
  projectDetailsLayoutData: {
    noOfTowers: '6',
    towerHeight: '98',
    totalArea: '10',
    layouts: layouts(
      ['Site Plan Layout', 'Typical Stilt Floor', 'Typical First Floor', 'Typical Cluster Plan', 'Basement Plan', 'Floorwise Club Layout'],
      ['Master Plan', 'Site Plan Layout', 'Typical Cluster Plan'],
    ),
    tableRows: [
      {
        type: 'Residential',
        typology: 'G + D + 30',
        units: [
          { type: '2BHK + S', count: '240', size: '1450', area: 348000, total: '' },
          { type: '3BHK + S', count: '360', size: '1850', area: 666000, total: '' },
        ],
        total: 1014000,
      },
      {
        type: 'Retail',
        typology: 'G + G + 4',
        units: [
          { type: 'Commercial', count: '24', size: '650', area: 15600, total: '' },
          { type: 'Office', count: '12', size: '1200', area: 14400, total: '' },
        ],
        total: 30000,
      },
      { type: 'Club', typology: 'G + 1', units: [{ type: 'Clubhouse', count: '1', size: '32000', area: 32000, total: '' }], total: 32000 },
    ],
    customFields: [{ label: 'Approach Road Width', value: '24 m sector road' }],
    customFieldsImage: '',
    grandTotalSaleable: 1076000,
  },
  projectLevelDesignData: {
    keyRatioInputs: {
      balconyArea: '96000',
      builtUpArea: '1290000',
      far: '780000',
      totalExternalWallArea: '42000',
      serviceShaftArea: '61000',
      windowToAreaRatio: '',
      salesPrice: '14500',
      constructionCostOnBUA: '4800',
      permissibleFAR: '',
      noOfEWSUnit: '90',
      ewsFAR: '27000',
      buildingHeight: '98',
      carpetArea: '745000',
      saleableArea: '1076000',
      floorToFloorHeightApt: '3.3',
      avgWallArea: '',
      noOfUnits: '600',
      totalBasementArea: '420000',
      circulationArea: '38000',
      totalParkingArea: '360000',
      totalNumberOfCars: '1150',
      lobbyCorridorWidth: '2.4',
      drivewayWidthBasement: '6',
      floorToFloorHeightGroundLobby: '6',
      floorToFloorHeightB1GFTower: '4.5',
      floorToFloorHeightB1GFNonTower: '4.2',
      floorToFloorHeightB2B1: '3.6',
      floorToFloorHeightB3B2: '',
      carLength: '5',
      carWidth: '2.5',
      carHeight: '',
      noOfBasements: '2',
    },
    areaStatementInputs: {
      licensedAreaSqm: '40468.6',
      todLandSqm: '18000',
      nonTodLandSqm: '20000',
      commercialSqm: '2400',
      todBaseFar: '1.75',
      todGriha: '0.1',
      todTdr: '0.25',
      nonTodBaseFar: '1.75',
      nonTodGriha: '0.1',
      nonTodTdr: '0',
      proposedFarSqm: '70500',
      permissibleGcPct: '35',
      proposedGcSqm: '9800',
    },
    additionalElements2: {
      rows: [
        { category: 'Total', bua: '', sa: '', ca: '' },
        { category: 'Residential', bua: '', sa: '', ca: '' },
        { category: 'Commercial', bua: '', sa: '', ca: '' },
        { category: 'Club', bua: '', sa: '', ca: '' },
        { category: 'Basement', bua: '', sa: '', ca: '' },
        { category: 'Circulation Area', bua: '', sa: '', ca: '' },
        { category: 'Parking Area', bua: '', sa: '', ca: '' },
        { category: 'External Wall', bua: '', sa: '', ca: '' },
        { category: 'Service Shaft Area', bua: '', sa: '', ca: '' },
      ],
      other: {
        groundFloorEntranceLobby: 'Double Height',
        typicalFloor: '3.3',
        stilt: '4.5',
        pentHouse: 'Yes',
        pentHousePlanning: 'duplex',
        unitsOnGroundFloor: 'no',
        surfaceDrivewayWidth: '6',
        rampsEntryToBasementWidth: '6',
        basementClearHeightRamp: '2.4',
        basementClearHeightB1: '2.7',
        totalParkingBaySize: '12.5',
        noOfParkingSlots: '1150',
        extraParkingReqs: [
          { label: '2 BHK + STUDY', value: '1.5 per unit' },
          { label: '1 BHK + STUDY', value: '1 per unit' },
        ],
      },
    },
    clusterConfigs: [
      {
        name: 'Cluster 1',
        floorFAR: '12400',
        floorBUA: '14800',
        nonFARBUA: '1600',
        floorCarpetArea: '8600',
        floorShaftArea: '420',
        structureFootprintArea: '950',
        nonSaleableFAR: '980',
        windowOpeningArea: '1150',
        externalGlazingArea: '',
        wallPerimeterArea: '5200',
      },
    ],
    compareProjectIds: ['2', '3'],
  },
  unitLevelDesignData: [
    typology(1, 'Type 1', {
      type: '2BHK + S',
      noOfUnits: '240',
      saleableArea: '1450',
      coveredArea: '1180',
      unitFar: '1040',
      balconyAreaNonFar: '60',
      balconyAreaFar: '80',
      carpetArea: '1015',
      unitsPerCore: '4',
      wallArea: '95',
      acArea: '760',
      circulationFar: '110',
      isOpen: true,
    }),
    typology(2, 'Type 2', {
      type: '3BHK + S',
      noOfUnits: '360',
      saleableArea: '1850',
      coveredArea: '1520',
      unitFar: '1340',
      balconyAreaNonFar: '90',
      balconyAreaFar: '120',
      carpetArea: '1240',
      unitsPerCore: '4',
      wallArea: '120',
      acArea: '980',
      circulationFar: '135',
    }),
  ],
  idSpecificationsData: {
    'flooring_living-dining': { type: 'Imported Marble', finish: 'Polished', size: '1200x600 mm', thickness: '16-18 mm', skirting: '100 - 150 mm', wearResistance: 'Ac4', additional: '' },
    'flooring_master-bedroom': { type: 'Wooden Flooring (engineered)', finish: 'Matte', size: '195 X 1200 mm', thickness: '10-12 mm', skirting: '75 - 100 mm', additional: '' },
    'flooring_kitchen': { type: 'Vitrified Tiles', finish: 'Matte', size: '600x600 mm', thickness: '10 mm', additional: '' },
    __hidden: ['flooring_servant-room'],
  },
  commonAreaData: {
    'flooring_entrance-lobby': { type: 'Marble', finish: 'Polished', size: '1200x600 mm', thickness: '14-20 mm', skirting: '100 mm', additional: '' },
    'flooring_corridor-lift-lobby': { type: 'Vitrified Tiles', finish: 'Matte', size: '800x800 mm', thickness: '10 mm', skirting: '100 mm', additional: '' },
  },
}

const COMMERCIAL: ChaptersASummary = {
  projectDetailsLayoutData: {
    noOfTowers: '2',
    towerHeight: '45',
    totalArea: '4.5',
    layouts: layouts(['Site Plan Layout', 'Typical Stilt Floor', 'Typical First Floor', 'Basement Plan'], ['Master Plan']),
    tableRows: [
      { type: 'Retail', typology: 'LG + G + 3', units: [{ type: 'Anchor', count: '2', size: '42000', area: 84000, total: '' }, { type: 'Shops', count: '140', size: '650', area: 91000, total: '' }], total: 175000 },
      { type: 'Food Court', typology: 'Level 3', units: [{ type: 'Kiosks', count: '28', size: '300', area: 8400, total: '' }], total: 8400 },
      { type: 'Multiplex', typology: 'Level 4', units: [{ type: 'Screens', count: '6', size: '5500', area: 33000, total: '' }], total: 33000 },
    ],
    customFields: [],
    customFieldsImage: '',
    grandTotalSaleable: 216400,
  },
  projectLevelDesignData: {
    keyRatioInputs: {
      builtUpArea: '310000',
      saleableArea: '216400',
      carpetArea: '142000',
      far: '182000',
      buildingHeight: '45',
      balconyArea: '0',
      totalBasementArea: '150000',
      circulationArea: '12000',
      totalNumberOfCars: '420',
      noOfBasements: '2',
      lobbyCorridorWidth: '3.5',
      drivewayWidthBasement: '7',
    },
    clusterConfigs: [{ name: 'Mall Block', floorFAR: '45500', floorBUA: '52000', nonFARBUA: '4000', floorCarpetArea: '35000', floorShaftArea: '900', structureFootprintArea: '2600', nonSaleableFAR: '3800', windowOpeningArea: '', externalGlazingArea: '9800', wallPerimeterArea: '14000' }],
    compareProjectIds: [],
  },
}

/* department records shown on the Structure / MEP chapter pages */
const STRUCTURE_FIELDS = {
  towerAreaNonTypical: 'Conventional',
  towerAreaTypical: 'Monolithic Aluminium',
  nfa: 'Conventional',
  commercial: 'Conventional',
  earthquakeResistance: 'Seismic Zone IV',
  structuralSystem: 'Shear Wall System',
  typeOfStructure: 'Type 1',
  typeOfConstruction: 'Aluminium Formwork',
  expansionJoints: 'No (Benchmark)',
  designExecution: 'BIM + Tekla',
  maxGradeOfConcrete: 'M50',
  builtUpArea: '1290000',
  steelConsumptionCoefficient: '4.8',
  totalSteelConsumption: '6192000.00',
  concreteConsumptionCoefficient: '0.04',
  totalConcreteConsumption: '51600.00',
}
const MEP_FIELDS = {
  passengerLiftsNo: '4',
  passengerLiftsStops: '32',
  passengerLiftsSpeed: '3',
  passengerAverageWait: '18.67',
  passengerLiftSizeLength: '2.1',
  passengerLiftSizeWidth: '1.6',
  serviceLiftsNo: '1',
  serviceLiftsStops: '34',
  serviceLiftsSpeed: '2',
  serviceAverageWait: '119.00',
  serviceLiftSizeLength: '2.4',
  serviceLiftSizeWidth: '1.8',
  acProvisionUnits: 'VRV/VRF',
  acAreaApartment: '120',
  tonnageApartment: '9',
  costPerTonneApartment: '65000',
  acAreaClub: '2200',
  tonnageClub: '85',
  efficiencyApartment: '480',
  efficiencyClub: '280',
}

export function seedChaptersA(db: Db) {
  seedChapterCatalogue(db)
  seedDesignBrief(db)

  const t = db.table(SUMMARY)
  const put = (projectId: number, data: ChaptersASummary) => {
    if (!db.table('projects').find(projectId)) return
    const existing = t.first((s) => s.projectId === projectId)
    if (existing) t.update(existing.id, data as never)
    else t.insert({ projectId, remarks: '', sentToDesignTeam: false, sentAt: null, ...data })
  }
  put(1, RESIDENTIAL)
  put(5, COMMERCIAL)

  const designAdmin = (db.table('users').first((u) => u.email === 'design.admin@m3m.com')?.id as number | undefined) ?? null
  const mepUser = (db.table('users').first((u) => u.email === 'mep@m3m.com')?.id as number | undefined) ?? null
  const structure = db.table('briefStructure')
  const s1 = structure.first((r) => r.projectId === 1)
  if (s1) structure.update(s1.id, { customFields: { ...((s1.customFields as object) ?? {}), ...STRUCTURE_FIELDS, dynamicInputs: [] } })
  if (db.table('projects').find(5) && !structure.first((r) => r.projectId === 5))
    structure.insert({
      projectId: 5,
      status: 'Submitted',
      assignedTo: null,
      createdBy: designAdmin,
      customFields: { ...STRUCTURE_FIELDS, towerAreaTypical: 'Conventional', earthquakeResistance: 'Seismic Zone III', maxGradeOfConcrete: 'M40', builtUpArea: '310000', totalSteelConsumption: '1488000.00', totalConcreteConsumption: '12400.00', dynamicInputs: [] },
    })

  const mep = db.table('briefMep')
  const m1 = mep.first((r) => r.projectId === 1)
  if (m1) mep.update(m1.id, MEP_FIELDS)
  if (db.table('projects').find(5) && !mep.first((r) => r.projectId === 5))
    mep.insert({
      projectId: 5,
      ...MEP_FIELDS,
      passengerLiftsNo: '8',
      passengerLiftsStops: '6',
      passengerLiftsSpeed: '1.75',
      passengerAverageWait: '3.00',
      acProvisionUnits: 'Ductable',
      status: 'In Progress',
      assignedTo: mepUser,
      deadline: null,
      customFields: {},
      createdBy: designAdmin,
    })
}

registerSeed(seedChaptersA)
