/* Department input catalogues — hardcoded in the original department forms. */
import type { DeptKey, DeptPath } from '@/types/design-brief'

export type BriefField = { name: string; label: string; type: 'text' }

export const LIAISON_FIELDS: BriefField[] = [
  { name: 'zoningClassificationAndLandUse', label: 'Zoning classification & land use', type: 'text' },
  { name: 'aaiHeightClearanceStatus', label: 'AAI height clearance status', type: 'text' },
  { name: 'phasingStrategyInput', label: 'Phasing strategy input', type: 'text' },
  { name: 'adjoiningRoadsStatus', label: 'Status of 24m roads adjoining the site (if any)', type: 'text' },
  { name: 'revenueRastaTreatment', label: 'Treatment for revenue rasta in the site', type: 'text' },
]

export const BD_FIELDS: BriefField[] = [
  { name: 'licenseApplication', label: 'License application', type: 'text' },
  { name: 'far', label: 'FAR', type: 'text' },
  { name: 'tdrUtilization', label: 'TDR Utilization', type: 'text' },
  { name: 'productMix', label: 'Product mix', type: 'text' },
  { name: 'phasingStrategy', label: 'Phasing strategy', type: 'text' },
]

export const LAND_FIELDS: BriefField[] = [
  { name: 'certifiedLandBoundaryForTestFitPlanning', label: 'Certified land boundary for test fit planning', type: 'text' },
  { name: 'finalLandBoundary', label: 'Final land boundary', type: 'text' },
  { name: 'finalPlotBoundary', label: 'Final plot boundary', type: 'text' },
  { name: 'htLinesOnSite', label: 'HT lines on site', type: 'text' },
  { name: 'proximityStudyOfBuildingStructure', label: 'Proximity study of building structure', type: 'text' },
  { name: 'anyMismatchInSiteBoundaries', label: 'Any mismatch in site boundaries', type: 'text' },
  { name: 'topographicalSurvey', label: 'Topographical survey', type: 'text' },
  { name: 'otherConstraints', label: 'Other constraints', type: 'text' },
]

export const STRUCTURE_FIELDS: BriefField[] = [
  { name: 'preferredStructuralSystem', label: 'Preferred structural system', type: 'text' },
  { name: 'groundwaterTableLevel', label: 'Groundwater table level', type: 'text' },
  { name: 'recommendedPlinthLevelAboveRoad', label: 'Recommended plinth level above road', type: 'text' },
  { name: 'soilBearingCapacity', label: 'Soil bearing capacity', type: 'text' },
  { name: 'foundationLevelSoil', label: 'Foundation level soil', type: 'text' },
  { name: 'typeOfFoundationSoil', label: 'Type of foundation soil', type: 'text' },
  { name: 'floodAnalysisReport', label: 'Flood analysis report', type: 'text' },
  { name: 'foundationLevelFlood', label: 'Foundation level flood', type: 'text' },
  { name: 'typeOfFoundationFlood', label: 'Type of foundation flood', type: 'text' },
]

export const MEP_FIELDS: BriefField[] = [
  { name: 'oduLocationsAndSizes', label: 'ODU locations and sizes', type: 'text' },
  { name: 'floodAnalysisReport', label: 'Flood analysis report', type: 'text' },
]

/** Summary labels used by the "All Design Input" page (original `AllDesignBrief`). */
export const SUMMARY_CATALOGUE: Record<Exclude<DeptKey, 'anarock'>, { label: string; fields: { key: string; label: string; type?: string }[] }> = {
  liaison: {
    label: 'Liaison',
    fields: [
      { key: 'zoningClassificationAndLandUse', label: 'Zoning classification & land use' },
      { key: 'aaiHeightClearanceStatus', label: 'AAI height clearance status' },
      { key: 'phasingStrategyInput', label: 'Phasing strategy input' },
      { key: 'adjoiningRoadsStatus', label: 'Status of 24m roads adjoining the site (if any)' },
      { key: 'revenueRastaTreatment', label: 'Treatment for revenue rasta in the site' },
    ],
  },
  businessDevelopment: {
    label: 'Business Development',
    fields: [
      { key: 'licenseApplication', label: 'License application' },
      { key: 'far', label: 'FAR' },
      { key: 'tdrUtilization', label: 'TDR Utilization' },
      { key: 'productMix', label: 'Product mix' },
      { key: 'phasingStrategy', label: 'Phasing strategy' },
    ],
  },
  land: {
    label: 'Land',
    fields: [
      { key: 'certifiedLandBoundaryForTestFitPlanning', label: 'Certified Land Boundary' },
      { key: 'finalLandBoundary', label: 'Final Land Boundary' },
      { key: 'finalPlotBoundary', label: 'Final Plot Boundary' },
      { key: 'htLinesOnSite', label: 'HT Lines On Site' },
      { key: 'proximityStudyOfBuildingStructure', label: 'Proximity Study' },
      { key: 'anyMismatchInSiteBoundaries', label: 'Site Boundary Mismatch' },
      { key: 'topographicalSurvey', label: 'Topographical Survey' },
      { key: 'otherConstraints', label: 'Other Constraints' },
      { key: 'encroachments', label: 'Encroachments' },
    ],
  },
  structure: {
    label: 'Structure',
    fields: [
      { key: 'preferredStructuralSystem', label: 'Preferred Structural System' },
      { key: 'groundwaterTableLevel', label: 'Groundwater Table Level' },
      { key: 'recommendedPlinthLevelAboveRoad', label: 'Recommended Plinth Level' },
      { key: 'soilBearingCapacity', label: 'Soil Bearing Capacity' },
      { key: 'foundationLevelSoil', label: 'Foundation Level (Soil)' },
      { key: 'typeOfFoundationSoil', label: 'Type of Foundation (Soil)' },
      { key: 'floodAnalysisReport', label: 'Flood Analysis Report' },
      { key: 'foundationLevelFlood', label: 'Foundation Level (Flood)' },
      { key: 'typeOfFoundationFlood', label: 'Type of Foundation (Flood)' },
    ],
  },
  mep: {
    label: 'MEP',
    fields: [
      { key: 'oduLocationsAndSizes', label: 'ODU Locations & Sizes' },
      { key: 'floodAnalysisReport', label: 'Flood Analysis Report' },
    ],
  },
}

export const DEPT_PATH_TO_KEY: Record<DeptPath, DeptKey> = {
  liaison: 'liaison',
  'business-development': 'businessDevelopment',
  land: 'land',
  structure: 'structure',
  mep: 'mep',
  anarock: 'anarock',
}

export const DEPT_KEY_TO_PATH: Record<DeptKey, DeptPath> = {
  liaison: 'liaison',
  businessDevelopment: 'business-development',
  land: 'land',
  structure: 'structure',
  mep: 'mep',
  anarock: 'anarock',
}

export const ALL_DEPTS: { path: DeptPath; key: DeptKey }[] = [
  { path: 'liaison', key: 'liaison' },
  { path: 'business-development', key: 'businessDevelopment' },
  { path: 'land', key: 'land' },
  { path: 'structure', key: 'structure' },
  { path: 'mep', key: 'mep' },
  { path: 'anarock', key: 'anarock' },
]

export const DEPT_LABEL: Record<DeptKey, string> = {
  liaison: 'Liaison',
  businessDevelopment: 'Business Development',
  land: 'Land',
  structure: 'Structure',
  mep: 'MEP',
  anarock: 'Anarock',
}

export const FIELDS_BY_KEY: Record<DeptKey, BriefField[]> = {
  liaison: LIAISON_FIELDS,
  businessDevelopment: BD_FIELDS,
  land: LAND_FIELDS,
  structure: STRUCTURE_FIELDS,
  mep: MEP_FIELDS,
  anarock: [],
}
