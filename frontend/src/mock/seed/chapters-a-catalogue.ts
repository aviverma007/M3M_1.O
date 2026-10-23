/**
 * Apartment Design (module 2) and Common Design (module 3) chapter catalogue:
 * chapters -> sections (rooms) -> fields (+ options and per-category benchmark answers).
 * Used by ID Specifications / Common Area (and the module chapter pages). Fictional reference data
 * modelled on the original's section titles / field names.
 */
import type { Db } from '../db'

type F = [name: string, type: 'select' | 'multiselect', options: string[], bench?: [mid: number[], premium: number[], affluent: number[]]]
type Sec = [title: string, fields: F[]]
type Chap = [chapterNumber: number, title: string, sections: Sec[]]

/* ---------------- shared field definitions ---------------- */
const floor = (types: string[], b: [number[], number[], number[]] = [[0], [0, 1], [1, 2]]): F[] => [
  ['Type of floor', 'select', types, b],
  ['Finish of tile/stone', 'select', ['Matte', 'Glossy', 'Satin', 'Anti Skid', 'Polished'], [[0], [0, 1], [4]]],
  ['Size of tile/stone', 'select', ['600x600 mm', '800x800 mm', '1200x600 mm', '195 X 1200 mm'], [[0], [1], [2]]],
  ['Thickness of tile/stone', 'select', ['10 mm', '10-12 mm', '16-18 mm', '18-20 mm'], [[0], [1], [2, 3]]],
  ['Skirting height', 'select', ['75 - 100 mm', '100 - 150 mm'], [[0], [0], [1]]],
  ['Level of wear resistance', 'select', ['Ac3', 'Ac4', 'Ac5'], [[0], [1], [2]]],
]
const wetFloor: F[] = [
  ['Type of floor', 'select', ['Vitrified Tiles', 'Full body tile', 'Vitrified Tile (stone finish)', 'Imported Marble'], [[0], [1], [2, 3]]],
  ['Finish of tile/stone', 'select', ['Anti Skid', 'Matte'], [[0], [0], [0, 1]]],
  ['Size of tile/stone', 'select', ['300x300 mm', '600x600 mm', '1200x600 mm'], [[0], [1], [2]]],
  ['Thickness of tile/stone', 'select', ['10 mm', '10-12 mm'], [[0], [0], [1]]],
]
const wall = (paint: string[]): F[] => [
  ['Type of paint', 'select', paint, [[1], [0], [0]]],
  ['Thickness of plaster', 'select', ['12 mm (average)', '15 mm (average)'], [[0], [0], [1]]],
  ['Type of plaster', 'select', ['Gypsum plaster', 'Cement plaster'], [[1], [0], [0]]],
  ['Color of paint', 'select', ['White', 'Matching external'], [[0], [0], [0]]],
]
const wetWall: F[] = [
  ['Type of tile', 'select', ['Glazed ceramic tiles', 'Vitrified Tiles', 'Full body tile'], [[0], [1], [2]]],
  ['Vertical distance till tile/stone to be put', 'select', ['Min. 50 mm above false ceiling', 'Full height'], [[0], [0], [1]]],
  ['Type of paint', 'select', ['Acrylic emulsion; washable paint', 'OBD'], [[1], [0], [0]]],
]
const ceiling = (fc: boolean): F[] => [
  ['Ceiling work', 'select', ['Levelled cement', 'Pre-Polished', 'as required'], [[0], [0], [1]]],
  ...(fc
    ? ([
        ['Type of false ceiling material', 'select', ['Gypsum board', 'Grid ceiling', 'Calcium silicate board'], [[1], [0], [0]]],
        ['Type of plaster inside false ceiling', 'select', ['Gypsum plaster', 'Cement plaster'], [[0], [0], [0]]],
      ] as F[])
    : []),
  ['Paint on false roof', 'select', ['Acrylic emulsion', 'OBD'], [[1], [0], [0]]],
]
const door = (opening: string[]): F[] => [
  ['Door opening', 'select', opening, [[0], [0], [0]]],
  ['Type of rebate', 'select', ['Single', 'Provision of extra rebate (outer side)'], [[0], [0], [1]]],
  ['Shutter type', 'select', ['Flush', 'Panelled'], [[0], [0], [0]]],
  ['Thickness of door shutter', 'select', ['32 mm', '35 mm', '40 mm'], [[0], [1], [2]]],
  ['Finish of door shutter', 'select', ['Laminate', 'Veneer with PU polish', 'Paint'], [[0], [1], [1]]],
  ['Finish of door frame', 'select', ['Factory fitted (modular)', 'matching shutter'], [[1], [0], [0]]],
  ['Architrave/Mouldings', 'select', ['Factory fitted (modular)', 'matching shutter'], [[1], [0], [0]]],
  ['Other accessories', 'multiselect', ['Eye piece', 'Manual door stopper', 'Handle with lock', 'Buffer'], [[1, 2], [1, 2, 3], [0, 1, 2, 3]]],
]
const elec = (extra: F[] = []): F[] => [
  ['Type of switch', 'select', ['Modular Switch / socket', 'Touch panel switch'], [[0], [0], [1]]],
  ['Switches', 'multiselect', ['Power socket', 'Light switch', 'Fan regulator', 'TV switch', 'Two way switches', 'data point'], [[0, 1, 2], [0, 1, 2, 3], [0, 1, 2, 3, 4, 5]]],
  ...extra,
]
const bath = (fx: string[]): F[] => [
  ['Counter/ledge/wall top/niche border', 'select', ['Full body tile; size as per bathroom dimensions', 'Quartz stone', 'imported Marble; size as per bathroom dimensions'], [[0], [1], [2]]],
  ['Fixtures', 'multiselect', fx, [[0, 1], [0, 1, 2], fx.map((_, i) => i)]],
  ['Bathroom accessories', 'multiselect', ['Toilet paper holder', 'Towel ring', 'Towel rod', 'Robe hook', 'Medicine Cabinet with Mirror'], [[0, 1], [0, 1, 2], [0, 1, 2, 3, 4]]],
  ['Electrical - Exhaust fan', 'select', ['8 X 8', '200 x 200 mm', 'In line exhaust'], [[0], [1], [2]]],
  ['Electrical - Geyser', 'select', ['15L', '25L', '3L'], [[0], [1], [1]]],
  ['Shower glass partitions', 'select', ['Not provided', 'Glass partition with door; toughened glass 8mm thick'], [[0], [1], [1]]],
]
const provision = (name: string, opts: string[]): F => [name, 'select', opts, [[0], [0], [1]]]

const DRY_FLOOR = ['Vitrified Tiles', 'Marble', 'Imported Marble', 'Wooden Flooring (engineered)']

/* ---------------- module 2: Apartment Design ---------------- */
const APARTMENT: Chap[] = [
  [1, 'Flooring', [
    ['Living & dining', floor(DRY_FLOOR, [[0], [1], [2]])],
    ['Master bedroom', floor(DRY_FLOOR, [[0], [0, 3], [3]])],
    ['Master toilet', wetFloor],
    ['Other Bedrooms', floor(DRY_FLOOR, [[0], [0], [0, 3]])],
    ['Other toilets', wetFloor],
    ['Kitchen', floor(['Vitrified Tiles', 'Full body heat resistant tile', 'Granite'], [[0], [0, 1], [1]])],
    ['Servant room', floor(['Vitrified Tiles', 'Ceramic tiles'], [[1], [0], [0]])],
    ['Utility Balcony', wetFloor],
    ['Other balconies', floor(['Vitrified Tile (stone finish)', 'International stone finish tiles', 'Wooden deck'], [[0], [1], [1, 2]])],
    ['Powder room', wetFloor],
    ['Puja room & Study room', floor(DRY_FLOOR, [[0], [1], [1, 2]])],
    ['Foyer', floor(DRY_FLOOR, [[0], [1], [2]])],
  ]],
  [2, 'Wall', [
    ['Living & Dining', wall(['Acrylic emulsion', 'OBD'])],
    ['Master Bedroom', wall(['Acrylic emulsion', 'OBD'])],
    ['Master Toilet', wetWall],
    ['Other Bedroom', wall(['Acrylic emulsion', 'OBD'])],
    ['Other Toilet', wetWall],
    ['Kitchen', wetWall],
    ['Servant Room', wall(['Acrylic emulsion', 'OBD'])],
    ['Balconies', wall(['Exterior grade, weatherproof', 'Acrylic emulsion'])],
    ['Powder room', wetWall],
    ['Puja room & Study room', wall(['Acrylic emulsion', 'OBD'])],
    ['Foyer', wall(['Acrylic emulsion', 'OBD'])],
  ]],
  [3, 'Ceiling', [
    ['Living & Dining', ceiling(true)],
    ['Master Bedroom', ceiling(true)],
    ['Master Toilet', ceiling(true)],
    ['Other Bedroom', ceiling(false)],
    ['Other Toilet', ceiling(true)],
    ['Kitchen', ceiling(true)],
    ['Servant Room', ceiling(false)],
    ['Balconies', ceiling(false)],
    ['Powder room', ceiling(true)],
    ['Puja room & Study room', ceiling(false)],
    ['Foyer', ceiling(true)],
  ]],
  [4, 'Doors, Frame, Lock', [
    ['Main Entrance', door(['1200 min X 2450 mm (for FTF of 3.2m)', '1200 max X 2750 mm (for FTF of 3.4m & above)'])],
    ['Master Bedroom', door(['900 min. X 2450 mm', '900 X 2250 mm'])],
    ['Master Toilet', door(['750 X 2250 mm', '800 mm (in exception cases 750 mm) Min. X 2450 mm'])],
    ['Other Bedroom', door(['900 X 2250 mm', '900 x 2450 mm'])],
    ['Other Toilets', door(['750 X 2250 mm', '800 mm (in exception cases 750 mm) Min. X 2450 mm'])],
    ['Wardrobe', [['Type of wardrobe', 'select', ['Modular Wardrobe-prelaminated shutter and carcass in master bedroom', 'Modular Wardrobe-prelaminated shutter and carcass in all bedrooms'], [[0], [1], [1]]]]],
    ['Servant Room', door(['750 X 2250 mm', '900 X 2250 mm'])],
    ['Balcony - Kitchen', door(['900 X 2250 mm', '1000 min. X 2450 mm'])],
    ['Threshold', [['Type of tile/stone', 'select', ['Granite', 'Marble', 'Quartz stone'], [[0], [1], [1]]], ['Finish of tile/stone', 'select', ['Polished', 'Matte'], [[0], [0], [0]]]]],
    ['Powder room', door(['750 X 2250 mm', '800 mm (in exception cases 750 mm) Min. X 2450 mm'])],
    ['Pooja/Study room', door(['900 X 2250 mm', '900 x 2450 mm'])],
    ['Balcony Doors Frame', [
      ['Type of frame', 'select', ['UPVC', 'Aluminium'], [[0], [1], [1]]],
      ['Height of window', 'select', ['Balcony - 2450 mm min.', 'up to beam bottom level'], [[0], [0], [1]]],
      ['Type of glass', 'select', ['Dependant on facade', 'Double glazed unit'], [[0], [0], [1]]],
    ]],
    ['Railings & Handrail', [
      ['Type of railing', 'select', ['Seamless laminated glass with aluminium top and bottom', 'MS Railing'], [[1], [0], [0]]],
      ['Glass width', 'select', ['6 mm + 6 mm (laminate) - minimum', '8 mm + 8 mm (laminate)'], [[0], [0], [1]]],
      ['Type of parapet', 'select', ['MS Railing', 'Seamless glass'], [[0], [1], [1]]],
    ]],
    ['Utility', [['Washing machine area', 'select', ['Plumbing & electrical provisions to be on the same side of utility area', 'Dedicated utility room'], [[0], [0], [1]]]]],
  ]],
  [5, 'Kitchen Goods', [
    ['Hob', [provision('Type of hob', ['4 burner hob (Glass with Auto Ignition)', '3 burner hob (Glass with Auto Ignition)']), provision('Size of hob', ['60 cm', '90 cm'])]],
    ['Chimney', [provision('Type of chimney', ['Wall mounted', 'Island']), provision('Size of chimney', ['60 cm', '90 cm'])]],
    ['Counter & back splash', [
      ['Thickness of counter', 'select', ['Granite - 16 to 18 mm', 'Quartz- 18 to 20 mm'], [[0], [1], [1]]],
      ['Vertical distance till tile/stone to be put (back splash)', 'select', ['upto 2 feet above counter top', 'Full height'], [[0], [0], [1]]],
    ]],
    ['Cabinets', [provision('Type of cabinetary', ['Modular cabinetry (HDHMR Board); handle less as much as possible', 'Modular cabinetry (HDHMR Board) with soft close trays; handle less as much as possible'])]],
    ['Sink/Drainboard', [
      provision('Type of sink', ['Single Bowl', 'Double bowl sink with drain board']),
      ['Material of sink', 'select', ['SS (Grade 304)', 'Quartz composite'], [[0], [0], [1]]],
      ['Faucet type', 'multiselect', ['Counter mounted', 'Sink mixer & valves', 'Pull-out spray'], [[0], [0, 1], [0, 1, 2]]],
    ]],
    ['Microwave', [provision('Provision of microwave', ['Provision provided in modular kitchen', 'Built in microwave'])]],
    ['Oven', [provision('Provision of oven', ['Provision provided in modular kitchen', 'Built in oven'])]],
    ['Dishwasher', [provision('Provision of dishwasher', ['Provision provided in modular kitchen', 'Dishwasher provided'])]],
    ['Geyser', [provision('Instant geyser', ['3L', '6L'])]],
    ['Water purifier', [provision('Provision of RO', ['Provision provided in modular kitchen', 'Counter RO provided'])]],
    ['Exhaust fan', [provision('Exhaust fan size', ['8 X 8', '200 x 200 mm'])]],
    ['Washing machine', [provision('Provision of washing machine', ['Provision provided', 'washing machine provided'])]],
    ['Refrigerator', [provision('Provision of refrigerator', ['Provision provided', 'Provision provided (larger space)'])]],
  ]],
  [6, 'Electricals', [
    ['Living and Dining', elec([['Other provisions', 'multiselect', ['Automated mood lighting', 'Airpurifier system'], [[], [0], [0, 1]]]])],
    ['Master Bedroom', elec([['Motion sensor', 'select', ['Installed (controller by PIR) with single bypass switch', 'Not provided'], [[1], [1], [0]]]])],
    ['Master toilet', elec()],
    ['Other Bedroom', elec()],
    ['Other Toilets', elec()],
    ['Kitchen', elec()],
    ['Servant room', elec()],
    ['Balcony / Utility space', elec()],
    ['Powder room', elec()],
    ['Pooja/Study room', elec()],
    ['Air conditioning', [['Provision for HVAC', 'multiselect', ['VRF Hi wall - All bedrooms', 'VRF 1 way cassette - All bedrooms, Living room', 'VRF Hi wall-Kitchen, servant room'], [[0], [1], [1, 2]]]]],
    ['Fire safety', [['System availability', 'select', ['As per fire NOC', 'NBC'], [[0], [0], [0]]]]],
  ]],
  [7, 'Bathroom Accessories', [
    ['Master Bathroom', bath(['Wall hung WC with concealed cistern', 'health faucet', 'Basin Mixer', 'Shower & spout', 'Bathtub'])],
    ['Other Bathroom', bath(['WC', 'health faucet', 'Basin Mixer', 'Shower & spout'])],
    ['Powder room', bath(['Wall hung WC with concealed cistern', 'health faucet', 'Basin Mixer'])],
    ['Servant Room', bath(['WC', 'health faucet', 'Spout'])],
    ['Balcony (wet) - Utility', [['Fixtures', 'multiselect', ['Spout', 'Washing machine inlet'], [[0], [0, 1], [0, 1]]]]],
  ]],
]

/* ---------------- module 3: Common Design ---------------- */
const commonFloor = (types: string[]): F[] => [
  ['Type of floor', 'select', types, [[0], [1], [2]]],
  ['Finish of tile/stone', 'select', ['Matte', 'Polished', 'Flamed', 'Anti Skid'], [[0], [1], [1]]],
  ['Size of tile/stone', 'select', ['600x600 mm', '800x800 mm', '1200x600 mm', 'As per staircase size'], [[0], [1], [2]]],
  ['Thickness of tile/stone', 'select', ['10 mm', '14-20 mm', '10 mm (as per design)'], [[0], [1], [1]]],
  ['Skirting height', 'select', ['100 mm', '100 mm (Joint of Floor & skirting)'], [[0], [0], [1]]],
]
const COMMON: Chap[] = [
  [1, 'Flooring', [
    ['Corridor, lift lobby', commonFloor(['Vitrified Tiles', 'Marble', 'Marble finish (combination of 2 colors)'])],
    ['Staircase', commonFloor(['Kota Stone', 'Granite', 'Marble'])],
    ['Entrance Lobby', commonFloor(['Vitrified Tiles', 'Marble', 'Imported Marble'])],
    ['Terrace', commonFloor(['Restile', 'vitrified tiles (as per Green rating)', 'Kota Stone'])],
    ['Basement/ podium', [
      ['Flooring treatment', 'select', ['Tremix', 'Epoxy coating'], [[0], [0], [1]]],
      ['Type of paint', 'select', ['Enamel + Acrylic paint', 'Acrylic emulsion paint'], [[0], [0], [1]]],
      ['Column guard', 'select', ['PVC + Reflective Tape', 'Rubber corner guard'], [[0], [0], [0]]],
    ]],
  ]],
  [2, 'Wall & Ceiling', [
    ['Corridor, lift', [['Type of paint', 'select', ['Acrylic emulsion', 'OBD (oil bound distemper)'], [[1], [0], [0]]], ['Type of plaster', 'select', ['Gypsum plaster', 'Plaster'], [[1], [0], [0]]]]],
    ['Staircase', [['Type of paint', 'select', ['OBD (oil bound distemper)', 'Acrylic emulsion'], [[0], [0], [1]]], ['Type of plaster', 'select', ['Plaster', 'Gypsum plaster'], [[0], [0], [1]]]]],
    ['Entrance Lobby', [['Type of paint', 'select', ['Acrylic emulsion', 'Weathersheild'], [[0], [0], [0]]], ['Enterance design', 'select', ['As per design', 'Stone cladding'], [[0], [0], [1]]]]],
    ['Terrace', [['Type of paint', 'select', ['Weathersheild', 'Acrylic emulsion'], [[0], [0], [0]]]]],
    ['Basement/ podium', [['Type of paint', 'select', ['OBD (oil bound distemper)', 'Enamel + Acrylic paint'], [[0], [0], [1]]], ['Type of plaster', 'select', ['Exposed concrete', 'Plaster'], [[0], [0], [1]]]]],
    ['Corridor, lift lobby ceiling', [['Type of false ceiling', 'select', ['Gypsum board', 'Decorative False ceiling with ceil'], [[0], [0], [1]]], ['Type of paint', 'select', ['Acrylic emulsion', 'OBD (oil bound distemper)'], [[1], [0], [0]]]]],
    ['Entrance Lobby ceiling', [['Type of false ceiling', 'select', ['Decorative False ceiling with ceil', 'Gypsum board'], [[1], [0], [0]]]]],
    ['Basement/ podium ceiling', [['Type of paint', 'select', ['OBD (oil bound distemper)', 'NA'], [[0], [0], [0]]]]],
  ]],
  [3, 'Doors and Other Facilities', [
    ['Entrance Lobby (Ground floor drop off)', [['Type of door', 'select', ['Glass door with frame', 'Automatic sliding glass door'], [[0], [1], [1]]], ['Air curtain', 'select', ['Air curtain (preferably from outside and merged seamlessly into facade)', 'Not provided'], [[1], [0], [0]]]]],
    ['Entrance Lobby (Basement drop off)', [['Type of door', 'select', ['Glass door with frame', 'Automatic sliding glass door'], [[0], [0], [1]]], ['Door shutter finish', 'select', ['Paint inside, matching the look of outside area', 'Laminate'], [[0], [0], [0]]]]],
    ['Shaft/staircase doors', [['Door coating', 'select', ['2 hr rating fire resistance, Metal Powder Coated', 'Wooden door; as per NBC 2016 Pt 4'], [[0], [0], [0]]], ['Door shutter finish', 'select', ['Paint inside, matching the look of outside area', 'Laminate'], [[0], [0], [0]]]]],
    ['Staircase Door size', [['As per fire norms', 'select', ['As per fire norms', 'Staircase Door size'], [[0], [0], [0]]]]],
    ['Entrance lobby) / Air', [['Type of AC', 'select', ['Ductable VRF', 'Cassette VRF'], [[0], [0], [0]]]]],
    ['Entrance lobby) / Facilities & services to be provided', [
      ['Facilities', 'multiselect', ['Art (painting, sculpture)', 'Furniture (Sofa, Chair, round table, sidetables)', 'Provision of BGM', 'Entertaiment services like-Pool, TT table Etc'], [[1], [0, 1], [0, 1, 2]]],
      ['Services', 'select', ['Reception desk Security Mail Room Storage area (for baggage trolley, similar) Toilets Wheelchair Cycle Parking Others as per fire norms', 'Reception desk and security only'], [[1], [0], [0]]],
    ]],
  ]],
]

const MARKER = 'chaptersACatalogueSeed'

/** Insert the module 2 / 3 chapter catalogue once (skipped if another seed already created those chapters). */
export function seedChapterCatalogue(db: Db) {
  if (db.table(MARKER).all().length) return
  db.table(MARKER).insert({ seeded: true })
  if (db.table('chapters').first((c) => c.moduleId === 2 || c.moduleId === 3)) return
  const put = (moduleId: number, chapters: Chap[]) =>
    chapters.forEach(([chapterNumber, title, sections]) => {
      const ch = db.table('chapters').insert({ moduleId, chapterNumber, title, status: 'pending' })
      sections.forEach(([secTitle, fields], si) => {
        const sec = db.table('chapterSections').insert({ chapterId: ch.id, title: secTitle, order: si + 1 })
        fields.forEach(([fieldName, fieldType, options, bench], fi) => {
          const pick = (idx: number[] = []) => idx.map((i) => options[i]).filter(Boolean)
          db.table('sectionFields').insert({
            sectionId: sec.id,
            chapterId: ch.id,
            fieldName,
            fieldType,
            order: fi + 1,
            midEndAns: pick(bench?.[0]),
            premiumAns: pick(bench?.[1]),
            affluentAns: pick(bench?.[2]),
            hiStreetAns: [],
            enclosedMallAns: [],
            options,
          })
        })
      })
    })
  put(2, APARTMENT)
  put(3, COMMON)
}
