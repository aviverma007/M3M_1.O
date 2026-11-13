/** grey detail line under a value: typed per project (input) or a fixed description of the chosen option */
export type ServiceDetail =
  | { kind: 'input'; name: string; placeholder: string; unit?: string; prefix?: string; onlyWhenYes?: boolean }
  | { kind: 'fixed'; text: Record<string, string> }

export type ServiceParam = {
  name: string
  label: string
  type: 'select' | 'input' | 'switch'
  options?: string[]
  unit?: string
  /** company standard; undefined = no benchmark (value shown neutral, no "Req:") */
  benchmark?: string | boolean
  detail?: ServiceDetail
  /** false = the DPR shows no "Req:" line, only the value (green when it matches the benchmark) and the detail line */
  reqInReport?: boolean
}

/** text of the grey detail line for a parameter ("Capacity: 200 KLD", "Separate soil & waste stacks", …), '' when none */
export function serviceDetailText(p: ServiceParam, values: Record<string, unknown> | undefined): string {
  const d = p.detail
  if (!d || !values) return ''
  const v = values[p.name]
  if (d.kind === 'fixed') return d.text[String(v ?? '')] ?? ''
  if (d.onlyWhenYes && !(v === true || v === 'true')) return ''
  const t = String(values[d.name] ?? '').trim()
  if (!t) return ''
  return `${d.prefix ?? ''}${t}${d.unit && /^[0-9.,]+$/.test(t) ? ` ${d.unit}` : ''}`
}

/** Hardcoded parameter catalogue + benchmark values (same as original). */
export const SERVICE_DESIGN: { category: string; parameters: ServiceParam[] }[] = [
  {
    category: 'Site Entry & Driveways',
    parameters: [
      { name: 'mainEntryType', label: 'Main Entry Type', type: 'select', options: ['Residential', 'Mixed (Residential + Commercial)', 'Commercial Only'], benchmark: 'Residential' },
      { name: 'internalDrivewayWidth', label: 'Internal Driveway Width', type: 'input', unit: 'm', benchmark: '6' },
      { name: 'drivewayServing', label: 'Driveway Serving', type: 'select', options: ['All Residential Towers', 'Select Towers', 'Commercial Only'], benchmark: 'All Residential Towers' },
    ],
  },
  {
    category: 'Vehicular Ramps & Slopes',
    parameters: [
      { name: 'noOfRamps', label: 'No. of Ramps Provided', type: 'input', benchmark: '4' },
      { name: 'carsPerRamp', label: 'Cars per Ramp', type: 'input', benchmark: '2' },
      { name: 'inwardRamp', label: 'Inward Ramp Provided', type: 'switch', benchmark: true },
      { name: 'outwardRamp', label: 'Outward Ramp Provided', type: 'switch', benchmark: true },
      { name: 'rampServing', label: 'Ramp Serving', type: 'select', options: ['Residential Towers', 'Parking Level', 'Basement'], benchmark: 'Residential Towers' },
      { name: 'rampSlopeCompliant', label: 'Ramp Slope Compliant with Codes', type: 'switch', benchmark: true },
    ],
  },
  {
    category: 'Drop-off Planning',
    parameters: [
      { name: 'primaryDropOff', label: 'Primary Tower Drop-off Provided', type: 'switch', benchmark: true },
      { name: 'usersAllowedAtDropOff', label: 'Users Allowed at Drop-off', type: 'select', options: ['Residents Only', 'Visitors Only', 'Both'], benchmark: 'Both' },
      { name: 'vehicleTypesAllowed', label: 'Vehicle Types Allowed', type: 'select', options: ['2W Only', '4W Only', 'Both (2W + 4W)'], benchmark: 'Both (2W + 4W)' },
      { name: 'dropOffLevelOptions', label: 'Drop-off Level Options', type: 'select', options: ['Grade Only', 'Basement Only', 'Both'], benchmark: 'Both' },
    ],
  },
  {
    category: 'Access Control & Security',
    parameters: [
      { name: 'basementAccessControl', label: 'Basement Access Control Provided', type: 'switch', benchmark: true },
      {
        name: 'typeOfAccessControl',
        label: 'Type of Access Control',
        type: 'select',
        options: ['Boom Barrier', 'RFID', 'Manual', 'RFID + Boom Barrier', 'Biometric'],
        benchmark: 'Boom Barrier',
      },
      { name: 'visitorRestriction', label: 'Visitor Restriction at Basement', type: 'switch', benchmark: true },
    ],
  },
  {
    category: 'Fire & Service Lifts',
    parameters: [
      { name: 'fireTower', label: 'Fire Tower Configuration', type: 'select', options: ['Fire Tower Only', 'Cross Ventilated', 'Combined Fire + Service'], benchmark: 'Cross Ventilated' },
      { name: 'fireLiftProvided', label: 'Fire Lift Provided', type: 'switch', benchmark: true },
      { name: 'fireLobbyProvided', label: 'Fire Lobby Provided', type: 'switch', benchmark: true },
      { name: 'fireLiftAsService', label: 'Fire Lift Used as Service Lift', type: 'switch', benchmark: true },
    ],
  },
  {
    category: 'Service Facilities',
    parameters: [
      { name: 'driversRooms', label: "Driver's Rooms Provided", type: 'switch', benchmark: true },
      { name: 'serviceToilets', label: 'Toilets for Service Personnel', type: 'switch', benchmark: true },
      { name: 'serviceFacilitiesLocation', label: 'Service Facilities Location', type: 'select', options: ['Basement B1', 'Basement B2', 'Ground Floor', 'Service Block'], benchmark: 'Basement B1' },
      {
        name: 'stpTechnology',
        label: 'STP Technology',
        type: 'select',
        options: ['MBBR Technology', 'SBR Technology', 'MBR Technology', 'Conventional'],
        benchmark: 'MBBR Technology',
        detail: { kind: 'input', name: 'stpCapacity', placeholder: 'STP capacity, e.g. 200', unit: 'KLD', prefix: 'Capacity: ' },
        reqInReport: false,
      },
      {
        name: 'drainageStack',
        label: 'Drainage Stack System',
        type: 'select',
        options: ['Two-Pipe Stack System', 'Single-Pipe Stack System'],
        benchmark: 'Two-Pipe Stack System',
        detail: { kind: 'fixed', text: { 'Two-Pipe Stack System': 'Separate soil & waste stacks', 'Single-Pipe Stack System': 'Common stack for soil & waste' } },
        reqInReport: false,
      },
      {
        name: 'meteringSystem',
        label: 'Metering System',
        type: 'select',
        options: ['Multi-Metering', 'Single-Point Metering'],
        benchmark: 'Multi-Metering',
        detail: { kind: 'fixed', text: { 'Multi-Metering': 'Individual metering for each unit', 'Single-Point Metering': 'Single bulk meter for the whole project' } },
        reqInReport: false,
      },
    ],
  },
  {
    category: 'Electrical & Connectivity',
    parameters: [
      { name: 'accessControl', label: 'Access Control', type: 'switch', benchmark: true, reqInReport: false },
      { name: 'evCharging', label: 'EV Charging Provision', type: 'switch', benchmark: true, reqInReport: false },
      {
        name: 'emergencyLights',
        label: 'Emergency Lights',
        type: 'switch',
        benchmark: true,
        detail: { kind: 'input', name: 'emergencyLightsLocation', placeholder: 'Where, e.g. Master Bedroom & Living / Dining', onlyWhenYes: true },
        reqInReport: false,
      },
      {
        name: 'emergencySwitch',
        label: 'Emergency Switch',
        type: 'switch',
        benchmark: true,
        detail: { kind: 'input', name: 'emergencySwitchLocation', placeholder: 'Where, e.g. Master Bathroom', onlyWhenYes: true },
        reqInReport: false,
      },
      { name: 'fibreConnectivity', label: 'Fibre Connectivity', type: 'switch', benchmark: true, reqInReport: false },
    ],
  },
  /* ---- Services sizing (Nov 2026): no company benchmarks yet, so values are shown neutral ---- */
  {
    category: 'Electrical Load & Backup',
    parameters: [
      { name: 'loadPerUnit', label: 'Connected Load per Unit', type: 'input', unit: 'kVA', reqInReport: false },
      { name: 'totalConnectedLoad', label: 'Total Connected Load', type: 'input', unit: 'kVA', reqInReport: false },
      {
        name: 'transformers',
        label: 'No. of Transformers',
        type: 'input',
        reqInReport: false,
        detail: { kind: 'input', name: 'transformerCapacity', placeholder: 'Capacity of each, e.g. 1600', unit: 'kVA', prefix: 'Each: ' },
      },
      { name: 'dgBackupUnits', label: 'DG Backup — Units', type: 'input', unit: '%', reqInReport: false },
      { name: 'dgBackupCommon', label: 'DG Backup — Common Areas', type: 'input', unit: '%', reqInReport: false },
    ],
  },
  {
    category: 'Water',
    parameters: [
      { name: 'waterDemandLpcd', label: 'Water Demand', type: 'input', unit: 'LPCD', reqInReport: false },
      { name: 'ugTankCapacity', label: 'Underground Tank Capacity', type: 'input', unit: 'KL', reqInReport: false },
      { name: 'ohTankCapacity', label: 'Overhead Tank Capacity', type: 'input', unit: 'KL', reqInReport: false },
      { name: 'wtpCapacity', label: 'WTP Capacity', type: 'input', unit: 'KLD', reqInReport: false },
      { name: 'recycledWaterPct', label: 'STP Water Reused (flushing / landscape)', type: 'input', unit: '%', reqInReport: false },
      { name: 'rwhPits', label: 'Rainwater Harvesting Pits', type: 'input', unit: 'nos', reqInReport: false },
    ],
  },
  {
    category: 'Energy & Gas',
    parameters: [
      { name: 'solarPvKwp', label: 'Solar PV', type: 'input', unit: 'kWp', reqInReport: false },
      { name: 'hotWaterSource', label: 'Hot Water Source', type: 'select', options: ['Solar', 'Heat Pump', 'Electric Geyser', 'Gas Geyser', 'Not Provided'], reqInReport: false },
      { name: 'pngPipeline', label: 'PNG Gas Pipeline', type: 'switch', reqInReport: false },
    ],
  },
  {
    category: 'Fire Safety',
    parameters: [
      { name: 'sprinklers', label: 'Sprinklers', type: 'select', options: ['Full Building', 'Basement & Common Areas Only', 'Not Provided'], reqInReport: false },
      { name: 'wetRiser', label: 'Wet Riser', type: 'switch', reqInReport: false },
      { name: 'refugeFloors', label: 'Refuge Floors', type: 'input', unit: 'nos', reqInReport: false },
    ],
  },
  {
    category: 'EV, Basement Air & Waste',
    parameters: [
      { name: 'evChargerPct', label: 'EV Charging Points', type: 'input', unit: '% of car parks', reqInReport: false },
      { name: 'jetFans', label: 'Basement Jet Fans', type: 'switch', reqInReport: false },
      { name: 'coSensors', label: 'Basement CO Sensors', type: 'switch', reqInReport: false },
      { name: 'garbageChute', label: 'Garbage Chute', type: 'switch', reqInReport: false },
      {
        name: 'owc',
        label: 'Organic Waste Converter',
        type: 'switch',
        reqInReport: false,
        detail: { kind: 'input', name: 'owcCapacity', placeholder: 'Capacity, e.g. 500', unit: 'kg/day', prefix: 'Capacity: ', onlyWhenYes: true },
      },
    ],
  },
  {
    category: 'Security & Smart Features',
    parameters: [
      { name: 'cctv', label: 'CCTV', type: 'select', options: ['Perimeter + Common Areas + Basements', 'Perimeter + Common Areas', 'Perimeter Only', 'Not Provided'], reqInReport: false },
      { name: 'videoDoorPhone', label: 'Video Door Phone', type: 'switch', reqInReport: false },
      { name: 'bms', label: 'Building Management System (BMS)', type: 'switch', reqInReport: false },
      { name: 'smartHomeLevel', label: 'Smart Home Level', type: 'select', options: ['None', 'Basic (lighting)', 'Standard (lighting + AC)', 'Full Automation'], reqInReport: false },
    ],
  },
]

/** benchmark text ("Yes", "6", …), '' when the parameter has no benchmark */
export const benchText = (p: ServiceParam) => (p.benchmark === undefined || p.benchmark === '' ? '' : p.benchmark === true ? 'Yes' : String(p.benchmark))
