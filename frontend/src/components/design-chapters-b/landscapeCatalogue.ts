import type { AmenityHead, LandscapeCategory } from '@/types/chapters-b'

/** Default landscape parameter table (hardcoded in the original page). */
export const DEFAULT_LANDSCAPE_CONFIG: LandscapeCategory[] = [
  {
    category: 'Landscape Access & Connectivity',
    parameters: [
      { name: 'accessTowerLobbies', label: 'Landscape Access from Tower Lobbies', type: 'switch' },
      { name: 'accessClubhouse', label: 'Landscape Access from Clubhouse', type: 'switch' },
      { name: 'typeOfAccess', label: 'Type of Access', type: 'select', options: ['Pedestrian', 'Mixed', 'Vehicular Only'] },
      { name: 'universalAccessibility', label: 'Universal Accessibility (PWD)', type: 'switch' },
    ],
  },
  {
    category: 'Landscape Planning',
    parameters: [
      { name: 'landscapeZoning', label: 'Landscape Zoning', type: 'select', options: ['Single Zone', 'Multiple Zones'] },
      {
        name: 'typeOfLandscapeZones',
        label: 'Type of Landscape Zones',
        type: 'select',
        options: ['Active', 'Passive', 'Kids', 'Senior', 'Sports', 'Wellness', 'Community'],
      },
      { name: 'totalLandscapeArea', label: 'Total Landscape Area', type: 'input', unit: 'Sq.m' },
    ],
  },
  {
    category: 'Peripheral Green Belt',
    parameters: [
      { name: 'greenBeltProvided', label: 'Green Belt Provided Along Periphery', type: 'switch' },
      { name: 'greenBeltWidth', label: 'Green Belt Width', type: 'input', unit: 'm' },
      { name: 'greenBeltPurpose', label: 'Green Belt Purpose', type: 'select', options: ['Buffer', 'Aesthetic', 'Services', 'Buffer + Services'] },
      { name: 'servicesInGreenBelt', label: 'Services Routed in Green Belt', type: 'switch' },
    ],
  },
  {
    category: 'Vehicular Circulation',
    parameters: [
      { name: 'internalDrivewayWidth', label: 'Internal Driveway Width (Typical)', type: 'input', unit: 'm' },
      { name: 'drivewayLocation', label: 'Driveway Location', type: 'select', options: ['Adjacent to Green Belt', 'Central', 'Peripheral', 'Mixed'] },
      { name: 'drivewayWidening', label: 'Driveway Widening at Tower Drop-offs', type: 'switch' },
      { name: 'dropOffWidth', label: 'Drop-off Width (Max)', type: 'input', unit: 'm' },
    ],
  },
  {
    category: 'Fire & Safety Interface',
    parameters: [
      { name: 'fireTenderAccess', label: 'Fire Tender Access Provided', type: 'switch' },
      { name: 'turningRadiusComplied', label: 'Minimum Turning Radius Complied', type: 'switch' },
    ],
  },
  {
    category: 'Design Integration',
    parameters: [
      { name: 'pedestrianSegregation', label: 'Pedestrian-Vehicular Segregation', type: 'switch' },
      { name: 'landscapeInterface', label: 'Landscape Interface with Driveway', type: 'select', options: ['Soft', 'Hard', 'Mixed'] },
    ],
  },
  {
    category: 'Documentation',
    parameters: [
      { name: 'drawingReference', label: 'Drawing Reference', type: 'select', options: ['GA', 'Landscape', 'Circulation'] },
      { name: 'remarks', label: 'Remarks', type: 'input', unit: 'Free Text' },
    ],
  },
]

/** Default amenities checklist (spelling kept identical to the original). */
export const DEFAULT_AMENITIES: AmenityHead[] = [
  {
    head: 'Club (Indoor/ Podium-linked)',
    items: [
      'Luxurious Lobby',
      'All-Day Dining',
      'Coffee Lounge',
      'Bar',
      'Sports Bar',
      'Banquet',
      'Business Centre/Meeting Rooms',
      'Business Centre/Spa',
      'Gym',
      'Creche',
      'Changing Rooms',
      'Outdoor Swimming Pool (Podium Level)',
      "Kids' Pool (Club)",
      'Jacuzzi',
    ],
  },
  {
    head: 'Sports (Outdoor/ Landscape Integrated)',
    items: [
      'Tenniz Courts',
      'Pickleball Court',
      'Padel Courts',
      'Cricket Pitch',
      'Football Court (8A size)',
      'Putting Green',
      'Outdoor Gym/Corssfit Area',
      'Joggng Track',
    ],
  },
  {
    head: 'Wellness & Leisure (Landscape)',
    items: [
      'Yoga Terrace',
      'Reflexology Garden',
      'Elderly Garden',
      'PetsPark',
      'Bio Pond',
      'Reflection Pond (with retention)',
      'Activity Lawn with Amphitheatre (Banquet Lawn)',
      'Event Lawn',
    ],
  },
  { head: 'Kids & Youth', items: ['Toddler Play Area', 'Young Adult Play Area', 'Water Play Area', 'Slide & Skating Rink'] },
  {
    head: 'Community/ Social spaces',
    items: ['Pavilion', 'Tree Pavilion', 'Temple Pavilion', 'Event Amphitheatre with Stage', 'BBQ Pits', 'Communal Plaza'],
  },
  {
    head: 'Landscape/ Green Features',
    items: ['Entry Plaza with Feature Tree', 'Allotment Organic Garden', 'Clubhouse Courtyard', 'Tower Courtyards'],
  },
  {
    head: 'Infrastructure & Connectivity',
    items: [
      'Tower Drop-offs with Arrival Feature Wall',
      'Surface Parking',
      '7.5 m Fire Tender Path',
      'Communal Plaza & Jogging Track Integrated on 7.5 m width',
    ],
  },
]
