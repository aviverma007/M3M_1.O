/**
 * Design Brief seed (fictional data): project 1 has Structure and MEP inputs submitted (like the live app),
 * every other department / project is "Not Assigned".
 */
import { registerSeed, type Db } from '../db'

const MARKER = 'designBriefSeed'
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString()

export function seedDesignBrief(db: Db) {
  if (db.table(MARKER).all().length) return
  db.table(MARKER).insert({ seeded: true })

  const userId = (email: string) => (db.table('users').first((u) => u.email === email)?.id as number | undefined) ?? null
  const designAdmin = userId('design.admin@m3m.com')
  const structure = userId('structure@m3m.com')
  const mep = userId('mep@m3m.com')

  db.table('briefStructure').insert({
    projectId: 1,
    preferredStructuralSystem: 'RCC shear wall with flat slab',
    preferredStructuralSystemNote: null,
    groundwaterTableLevel: '8.5 m below NGL',
    groundwaterTableLevelNote: null,
    recommendedPlinthLevelAboveRoad: '+600 mm above crown of road',
    recommendedPlinthLevelAboveRoadNote: null,
    soilBearingCapacity: '20 T/sqm at 3.0 m depth',
    soilBearingCapacityNote: null,
    foundationLevelSoil: '-4.5 m from NGL',
    foundationLevelSoilNote: null,
    typeOfFoundationSoil: 'Raft foundation',
    typeOfFoundationSoilNote: null,
    floodAnalysisReport: 'Site not in flood zone (HFL 1.2 m below NGL)',
    floodAnalysisReportNote: null,
    foundationLevelFlood: '-4.5 m from NGL',
    foundationLevelFloodNote: null,
    typeOfFoundationFlood: 'Raft with waterproofing',
    typeOfFoundationFloodNote: null,
    assignedTo: structure,
    deadline: daysAgo(4),
    receivedDate: daysAgo(6),
    status: 'Submitted',
    instructions: 'Share the geotechnical summary along with the structural system recommendation.',
    customFields: {},
    revisionReasons: null,
    createdBy: designAdmin,
    createdAt: daysAgo(14),
    updatedAt: daysAgo(6),
  })

  db.table('briefMep').insert({
    projectId: 1,
    oduLocationsAndSizes: 'Terrace level, 1.2 m x 0.9 m per unit, grouped on service ledges',
    oduLocationsAndSizesNote: null,
    floodAnalysisReport: 'No flooding risk for basement services; sump pumps at B2',
    floodAnalysisReportNote: null,
    assignedTo: mep,
    deadline: daysAgo(2),
    receivedDate: daysAgo(3),
    status: 'Submitted',
    instructions: null,
    customFields: {},
    revisionReasons: null,
    createdBy: designAdmin,
    createdAt: daysAgo(12),
    updatedAt: daysAgo(3),
  })

  db.table('designBriefComments').insert({
    projectId: 1,
    department: 'structure',
    comment: 'Please confirm the soil bearing capacity with the latest geotech report before final submission.',
    status: 'Revision Requested',
    createdBy: designAdmin,
    createdAt: daysAgo(5),
  })
}

registerSeed(seedDesignBrief)
