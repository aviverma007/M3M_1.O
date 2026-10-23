/**
 * Seed for the "chapters-b" design-chapter pages. Everything lives in the per-project
 * design-brief summary record (table `designBriefSummaries`, served by
 * GET/POST /project/:id/design-brief-summary in handlers/design-brief.ts).
 * Sample data is fictional. Residential project 1 and commercial project 5 are populated.
 */
import { registerSeed, type Db } from '../db'
import type { DesignBriefSummary } from '@/types/chapters-b'
import { DEFAULT_AMENITIES, DEFAULT_LANDSCAPE_CONFIG } from '@/components/design-chapters-b/landscapeCatalogue'

const SUMMARY = 'designBriefSummaries'

const consultants = (names: Record<string, [string, 'Appointed' | 'Not Appointed', string, string]>) =>
  [
    'Architect',
    'MEP Consultant',
    'Structural Consultant',
    'Landscape Consultant',
    'Landscape Consultant (Local)',
    '3D Rendering Consultant',
    'Cost Consultant (Pre Contract)',
    'Cost Consultant (Post Contract)',
    'GRIHA Consultant',
    'Proof Consultant (Structural)',
    'IIT Structural Consultant',
    'TEKLA Consultant',
    'Interior Designer',
    'Scale Model',
    'Traffic Consultant (Vertical)',
    'Traffic Consultant (Horizontal)',
    'BIM Consultant',
    'Signage Consultant',
    'Façade Consultant',
    'Lighting Consultant',
    'BOH Consultant',
  ].map((type, id) => {
    const [name, status, plannedDate, actualDate] = names[type] ?? ['', 'Not Appointed', '', '']
    return { id, type, name, status, plannedDate, actualDate, remarks: status === 'Appointed' ? 'LOI issued' : '' }
  })

const approvals = (rows: [string, string, string, string, string, string][]) =>
  rows.map(([type, plannedSubmission, actualSubmission, plannedApproval, actualApproval, remarks], id) => ({
    id,
    type,
    plannedSubmission,
    actualSubmission,
    plannedApproval,
    actualApproval,
    remarks,
  }))

const el = (id: string, name: string, type: string, numberOfContractors: string, typeOfContractors: string, remarks = '') => ({
  id,
  name,
  type,
  numberOfContractors,
  typeOfContractors,
  remarks,
})

const DEFAULT_CONTRACTORS = [
  { id: 1, name: 'NCCCL INDIA', grade: 'Grade A', benchmark: 'Prestige White Meadows (T-3 & 4); ACME Ozone, Thane', previous: '', remarks: '' },
  { id: 2, name: 'NCC', grade: 'Grade A', benchmark: 'EMAAR, Sec-62, Gurgaon; Conscient', previous: '', remarks: '' },
  { id: 3, name: 'KEC', grade: 'Grade A', benchmark: 'Godrej Aristocrat', previous: '', remarks: '' },
  { id: 4, name: 'NCCCL INDIA', grade: 'Grade B', benchmark: 'Prestige White Meadows (T-3 & 4); ACME Ozone, Thane', previous: '', remarks: '' },
  { id: 5, name: 'NCC', grade: 'Grade B', benchmark: 'EMAAR, Sec-62, Gurgaon; Conscient', previous: '', remarks: '' },
  { id: 6, name: 'KEC', grade: 'Grade B', benchmark: 'Godrej Aristocrat', previous: '', remarks: '' },
]

/* ---------------- residential (project 1) ---------------- */
const RESIDENTIAL: DesignBriefSummary = {
  landscapeAmenitiesData: {
    landscapeConfig: DEFAULT_LANDSCAPE_CONFIG,
    amenitiesList: DEFAULT_AMENITIES,
    landscapeData: {
      accessTowerLobbies: true,
      accessClubhouse: true,
      typeOfAccess: 'Pedestrian',
      universalAccessibility: true,
      landscapeZoning: 'Multiple Zones',
      typeOfLandscapeZones: 'Active',
      totalLandscapeArea: '14500',
      greenBeltProvided: true,
      greenBeltWidth: '2.5',
      greenBeltPurpose: 'Buffer + Services',
      servicesInGreenBelt: true,
      internalDrivewayWidth: '7.5',
      drivewayLocation: 'Peripheral',
      drivewayWidening: true,
      dropOffWidth: '9',
      fireTenderAccess: true,
      turningRadiusComplied: false,
      pedestrianSegregation: true,
      landscapeInterface: 'Soft',
      drawingReference: 'Landscape',
      remarks: 'Central greens linked to clubhouse deck',
    },
    selectedAmenities: [
      'Luxurious Lobby',
      'All-Day Dining',
      'Coffee Lounge',
      'Banquet',
      'Gym',
      'Creche',
      'Outdoor Swimming Pool (Podium Level)',
      "Kids' Pool (Club)",
      'Pickleball Court',
      'Joggng Track',
      'Yoga Terrace',
      'Elderly Garden',
      'PetsPark',
      'Toddler Play Area',
      'Water Play Area',
      'Pavilion',
      'BBQ Pits',
      'Entry Plaza with Feature Tree',
      'Tower Courtyards',
      '7.5 m Fire Tender Path',
    ],
  },
  serviceDesignData: {
    mainEntryType: 'Residential',
    internalDrivewayWidth: '6',
    drivewayServing: 'All Residential Towers',
    noOfRamps: '3',
    carsPerRamp: '2',
    inwardRamp: true,
    outwardRamp: true,
    rampServing: 'Residential Towers',
    rampSlopeCompliant: true,
    primaryDropOff: true,
    usersAllowedAtDropOff: 'Both',
    vehicleTypesAllowed: 'Both (2W + 4W)',
    dropOffLevelOptions: 'Grade Only',
    basementAccessControl: true,
    typeOfAccessControl: 'RFID + Boom Barrier',
    visitorRestriction: true,
    fireTower: 'Cross Ventilated',
    fireLiftProvided: true,
    fireLobbyProvided: true,
    fireLiftAsService: true,
    driversRooms: true,
    serviceToilets: true,
    serviceFacilitiesLocation: 'Basement B1',
  },
  contractingStrategyData: {
    contractors: [
      ...DEFAULT_CONTRACTORS,
      { id: 7, name: 'Northline Builders', grade: 'Grade C', benchmark: 'Riverside Court (Phase 1)', previous: 'Cedar Greens', remarks: 'Finishing works only' },
    ],
    availableElements: ['Lift & Escalator', 'Structure'],
    packages: [
      {
        id: 1,
        name: 'Package 1 - Civil & Structure',
        elements: [el('e-101', 'Facade', 'Single Contractor', '1', 'EPC', 'Unitised glazing for towers'), el('e-102', 'Fire Fighting', 'Direct', '2', 'Item rate')],
      },
      { id: 2, name: 'Package 2 - Services', elements: [el('e-103', 'HVAC', 'Multiple Contractors', '2', 'Supply & install', 'Clubhouse VRF')] },
    ],
  },
  consultantStrategyData: consultants({
    Architect: ['Studio Arc Associates', 'Appointed', '2026-01-15', '2026-01-20'],
    'MEP Consultant': ['Flowline Engineers', 'Appointed', '2026-02-01', '2026-02-10'],
    'Structural Consultant': ['Axis Structural Pvt Ltd', 'Appointed', '2026-02-01', '2026-02-05'],
    'Landscape Consultant': ['Greenfold Landscapes', 'Not Appointed', '2026-11-15', ''],
    'Cost Consultant (Pre Contract)': ['Ledger QS Partners', 'Appointed', '2026-03-01', '2026-03-12'],
    'Façade Consultant': ['', 'Not Appointed', '2026-12-01', ''],
  }),
  phasingPlanData: [
    { id: 1, name: 'Phase 1A', siteArea: '217800', noOfTowers: '3', noOfUnits: '420', farPermissible: '2.5', farUtilized: '510000', saPerUnit: '1650', farPerUnit: '1210', mapImage: null },
    { id: 2, name: 'Phase 1B', siteArea: '174240', noOfTowers: '2', noOfUnits: '300', farPermissible: '2.5', farUtilized: '415000', saPerUnit: '1820', farPerUnit: '1380', mapImage: null },
  ],
  projectScheduleData: {
    schedules: [
      {
        id: 1,
        task: 'Construction Schedule – Overall',
        duration: '1095',
        start: '2026-04-01',
        finish: '2029-03-31',
        expanded: true,
        subTasks: [
          { id: 11, task: 'Excavation & Shoring', duration: '120', start: '2026-04-01', finish: '2026-07-30' },
          { id: 12, task: 'Substructure', duration: '180', start: '2026-08-01', finish: '2027-01-28' },
          { id: 13, task: 'Superstructure (Towers A–C)', duration: '540', start: '2027-02-01', finish: '2028-07-25' },
        ],
      },
      {
        id: 2,
        task: 'Design & Approvals',
        duration: '240',
        start: '2025-10-01',
        finish: '2026-05-29',
        expanded: true,
        subTasks: [{ id: 21, task: 'Building Plan Approval', duration: '90', start: '2025-12-01', finish: '2026-03-01' }],
      },
    ],
    sections: [
      { id: 1, name: 'Residential', start: '2026-04-01', finish: '2029-03-31', days: 1095, durationMonths: '36.0', structureMonths: '24' },
      { id: 2, name: 'Retail', start: '2026-10-01', finish: '2028-09-30', days: 730, durationMonths: '24.0', structureMonths: '14' },
      { id: 3, name: 'Parking', start: '2026-04-01', finish: '2027-09-30', days: 547, durationMonths: '18.0', structureMonths: '12' },
      { id: 4, name: 'Common', start: '2027-04-01', finish: '2029-03-31', days: 730, durationMonths: '24.0', structureMonths: '10' },
    ],
    uploadedImages: [],
  },
  approvalsData: approvals([
    ['Land License', '2025-06-01', '2025-06-10', '2025-09-01', '2025-09-20', 'Received'],
    ['Zoning & Demarcation', '2025-09-25', '2025-10-02', '2025-11-15', '2025-11-28', 'Received'],
    ['Phasing Plan Approval', '2025-11-01', '2025-11-05', '2026-01-15', '', 'Under scrutiny'],
    ['Joint Development Right Permission Approval', '', '', '', '', ''],
    ['Environment Clearance (EIA)', '2026-01-10', '2026-01-18', '2026-05-30', '', 'SEIAA meeting awaited'],
    ['Consent to Establish (CTE)', '2026-06-01', '', '2026-08-01', '', ''],
    ['Building Plan', '2025-12-01', '2025-12-04', '2026-03-01', '2026-02-26', 'Approved'],
    ['RERA', '2026-03-15', '', '2026-05-15', '', ''],
  ]),
  additionalProjectDetailsData: [
    {
      id: 1,
      subject: 'Logistics Plan',
      description: 'Comprehensive site logistics including entry/exit points, material storage, and labor movement flow.',
      files: ['logistics_v1.pdf'],
    },
    {
      id: 2,
      subject: 'Key Details',
      description: 'Summary of critical project parameters including site constraints and special architectural requirements.',
      files: ['project_summary.docx'],
    },
    { id: 3, subject: 'Site Constraints', description: 'HT line along the northern boundary; 30 m setback to be maintained from the sector road.', files: [] },
  ],
}

/* ---------------- commercial (project 5) ---------------- */
const COMMERCIAL: DesignBriefSummary = {
  landscapeAmenitiesData: {
    landscapeConfig: DEFAULT_LANDSCAPE_CONFIG,
    amenitiesList: DEFAULT_AMENITIES,
    landscapeData: {
      accessTowerLobbies: false,
      accessClubhouse: false,
      typeOfAccess: 'Mixed',
      universalAccessibility: true,
      landscapeZoning: 'Single Zone',
      typeOfLandscapeZones: 'Community',
      totalLandscapeArea: '4200',
      greenBeltProvided: true,
      greenBeltWidth: '3',
      greenBeltPurpose: 'Aesthetic',
      servicesInGreenBelt: false,
      internalDrivewayWidth: '9',
      drivewayLocation: 'Peripheral',
      drivewayWidening: false,
      dropOffWidth: '12',
      fireTenderAccess: true,
      turningRadiusComplied: true,
      pedestrianSegregation: true,
      landscapeInterface: 'Hard',
      drawingReference: 'Circulation',
      remarks: 'Forecourt plaza with feature water body',
    },
    selectedAmenities: ['Luxurious Lobby', 'Coffee Lounge', 'Business Centre/Meeting Rooms', 'Communal Plaza', 'Entry Plaza with Feature Tree', 'Surface Parking', '7.5 m Fire Tender Path'],
  },
  serviceDesignData: {
    mainEntryType: 'Commercial Only',
    internalDrivewayWidth: '9',
    drivewayServing: 'Commercial Only',
    noOfRamps: '4',
    carsPerRamp: '2',
    inwardRamp: true,
    outwardRamp: true,
    rampServing: 'Basement',
    rampSlopeCompliant: true,
    primaryDropOff: true,
    usersAllowedAtDropOff: 'Visitors Only',
    vehicleTypesAllowed: 'Both (2W + 4W)',
    dropOffLevelOptions: 'Both',
    basementAccessControl: true,
    typeOfAccessControl: 'Boom Barrier',
    visitorRestriction: false,
    fireTower: 'Combined Fire + Service',
    fireLiftProvided: true,
    fireLobbyProvided: true,
    fireLiftAsService: true,
    driversRooms: true,
    serviceToilets: true,
    serviceFacilitiesLocation: 'Service Block',
  },
  contractingStrategyData: {
    contractors: DEFAULT_CONTRACTORS,
    availableElements: ['Fire Fighting', 'Structure', 'Escalators & Travelators'],
    packages: [
      { id: 1, name: 'Package 1 - Envelope', elements: [el('e-501', 'Facade', 'Direct', '1', 'Design & build', 'Structural glazing to mall front')] },
      { id: 2, name: 'Package 2 - MEP', elements: [el('e-502', 'HVAC', 'Single Contractor', '1', 'EPC'), el('e-503', 'Lift & Escalator', 'Client Supply', '1', 'OEM')] },
    ],
  },
  consultantStrategyData: consultants({
    Architect: ['Meridian Design Collective', 'Appointed', '2025-11-01', '2025-11-08'],
    'MEP Consultant': ['Coolstream MEP', 'Appointed', '2025-12-01', '2025-12-15'],
    'Structural Consultant': ['Axis Structural Pvt Ltd', 'Appointed', '2025-12-01', '2025-12-03'],
    'Traffic Consultant (Horizontal)': ['Roadwise Planners', 'Not Appointed', '2026-11-30', ''],
    'Signage Consultant': ['', 'Not Appointed', '2027-01-15', ''],
    'BOH Consultant': ['Backstage Retail Advisors', 'Appointed', '2026-02-01', '2026-02-20'],
  }),
  phasingPlanData: [
    { id: 1, name: 'Phase 1 - Mall Block', siteArea: '130680', noOfTowers: '1', noOfUnits: '180', farPermissible: '3.5', farUtilized: '440000', saPerUnit: '2400', farPerUnit: '2400', mapImage: null },
  ],
  projectScheduleData: {
    schedules: [
      {
        id: 1,
        task: 'Mall Construction – Overall',
        duration: '900',
        start: '2026-06-01',
        finish: '2028-11-17',
        expanded: true,
        subTasks: [
          { id: 11, task: 'Basement & Raft', duration: '210', start: '2026-06-01', finish: '2026-12-28' },
          { id: 12, task: 'Superstructure', duration: '420', start: '2027-01-01', finish: '2028-02-25' },
        ],
      },
    ],
    sections: [
      { id: 1, name: 'Retail', start: '2026-06-01', finish: '2028-11-17', days: 900, durationMonths: '29.6', structureMonths: '20' },
      { id: 2, name: 'Parking', start: '2026-06-01', finish: '2027-08-31', days: 456, durationMonths: '15.0', structureMonths: '11' },
      { id: 3, name: 'Common', start: '2027-06-01', finish: '2028-11-17', days: 535, durationMonths: '17.6', structureMonths: '8' },
    ],
    uploadedImages: [],
  },
  approvalsData: approvals([
    ['Land License', '2025-03-01', '2025-03-05', '2025-06-01', '2025-06-12', 'Received'],
    ['Zoning & Demarcation', '2025-06-20', '2025-06-25', '2025-08-15', '2025-08-30', 'Received'],
    ['Phasing Plan Approval', '', '', '', '', 'Not applicable (single phase)'],
    ['Joint Development Right Permission Approval', '', '', '', '', ''],
    ['Environment Clearance (EIA)', '2025-10-01', '2025-10-10', '2026-02-28', '2026-03-10', 'Received'],
    ['Consent to Establish (CTE)', '2026-03-15', '2026-03-20', '2026-05-15', '', ''],
    ['Building Plan', '2025-09-01', '2025-09-03', '2025-12-01', '2025-12-15', 'Approved'],
    ['RERA', '2026-04-01', '', '2026-06-01', '', ''],
  ]),
  additionalProjectDetailsData: [
    { id: 1, subject: 'Anchor Tenant Requirements', description: 'Hypermarket anchor needs 6 m clear height and a dedicated service bay at the rear.', files: ['anchor_brief.pdf'] },
    { id: 2, subject: 'Logistics Plan', description: 'Truck movement restricted to 11 pm - 6 am; staging yard on the east plot.', files: [] },
  ],
}

export function seedChaptersB(db: Db) {
  const t = db.table(SUMMARY)
  const put = (projectId: number, data: DesignBriefSummary) => {
    if (!db.table('projects').find(projectId)) return
    const existing = t.first((s) => s.projectId === projectId)
    if (existing) t.update(existing.id, data as never)
    else t.insert({ projectId, remarks: '', sentToDesignTeam: false, sentAt: null, ...data })
  }
  put(1, RESIDENTIAL)
  put(5, COMMERCIAL)
}

registerSeed(seedChaptersB)
