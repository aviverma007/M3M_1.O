export type ServiceParam = { name: string; label: string; type: 'select' | 'input' | 'switch'; options?: string[]; unit?: string; benchmark: string | boolean }

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
    ],
  },
]
