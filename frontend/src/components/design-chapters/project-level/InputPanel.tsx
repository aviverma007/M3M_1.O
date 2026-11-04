/* Left "TYPE" panel of Project Level Design: Key Ratio / Area Statement / Additional Elements 2/2 accordions. */
import { Plus, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { checkDeviation, formatBenchmark, getBenchmark, reqLabel, type BenchmarkMap } from '@/lib/benchmark'
import type { AdditionalElements2, AreaStatementInputs, ClusterConfig, KeyRatioInputs, ParkingReq } from '@/types/chapters-a'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui'
import { newCluster } from './calc'
import { fmtNum, module5Units, parkingRequired } from '@/lib/parkingRequired'

type F = { label: string; key: string; unit: string }

const H3 = 'text-[10px] font-black text-gray-400 uppercase tracking-[2px]'
const SEL_TRIGGER = 'bg-gray-50/50 border-gray-100 text-sm h-10'
const ADD_BTN =
  'text-xs text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-300 rounded px-3 py-1.5 bg-blue-50/50 transition-all flex items-center gap-1.5 font-semibold hover:shadow-sm'

const EFFICIENCY: F[] = [
  { label: 'Building Height', key: 'buildingHeight', unit: 'm' },
  { label: 'Carpet Area', key: 'carpetArea', unit: 'sq ft' },
  { label: 'Saleable Area', key: 'saleableArea', unit: 'sq ft' },
  { label: 'Balcony Area', key: 'balconyArea', unit: 'sq ft' },
  { label: 'Built Up Area', key: 'builtUpArea', unit: 'sq ft' },
  { label: 'FAR', key: 'far', unit: 'sq ft' },
  { label: 'Sales Price', key: 'salesPrice', unit: 'Rs.' },
  { label: 'Construction Cost on BUA', key: 'constructionCostOnBUA', unit: 'Rs.' },
  { label: 'Permissible FAR', key: 'permissibleFAR', unit: 'sq ft' },
  { label: 'No. of EWS Unit', key: 'noOfEWSUnit', unit: '#' },
  { label: 'EWS FAR (Sqft)', key: 'ewsFAR', unit: 'sq ft' },
]
const APT_CONFIG: F[] = [
  { label: 'Floor to Floor Height Apt', key: 'floorToFloorHeightApt', unit: 'm' },
  { label: 'No. Of Units', key: 'noOfUnits', unit: '#' },
]
const NON_APT_EFF: F[] = [
  { label: 'Total Basement Area', key: 'totalBasementArea', unit: 'sq ft' },
  { label: 'Services Area (only MEP Services Area)', key: 'circulationArea', unit: 'sq ft' },
  { label: 'Total Number of Cars', key: 'totalNumberOfCars', unit: '#' },
]
const NON_APT_CONFIG: F[] = [
  { label: 'Lobby Corridor Width', key: 'lobbyCorridorWidth', unit: 'm' },
  { label: 'Driveway Width Basement', key: 'drivewayWidthBasement', unit: 'm' },
  { label: 'Floor to Floor Height Ground Lobby', key: 'floorToFloorHeightGroundLobby', unit: 'm' },
  { label: 'Floor to Floor Height (B1 - GF) Tower Area', key: 'floorToFloorHeightB1GFTower', unit: 'm' },
  { label: 'Floor to Floor Height (B1 - GF) Non Tower Area', key: 'floorToFloorHeightB1GFNonTower', unit: 'm' },
  { label: 'Floor to Floor Height (B2 - B1)', key: 'floorToFloorHeightB2B1', unit: 'm' },
  { label: 'Floor to Floor Height (B3 - B2)', key: 'floorToFloorHeightB3B2', unit: 'm' },
  { label: 'No. of Basements', key: 'noOfBasements', unit: '#' },
]
const AREA_SUMMARY: F[] = [
  { label: 'Licensed area of site', key: 'licensedAreaSqm', unit: 'sq. m' },
  { label: 'TOD transition land', key: 'todLandSqm', unit: 'sq. m' },
  { label: 'Non-TOD land', key: 'nonTodLandSqm', unit: 'sq. m' },
  { label: 'Commercial site area', key: 'commercialSqm', unit: 'sq. m' },
]
const TOD: F[] = [
  { label: 'TOD - Base FAR factor', key: 'todBaseFar', unit: 'multiplier' },
  { label: 'TOD - GRIHA factor', key: 'todGriha', unit: 'multiplier' },
  { label: 'TOD - TDR factor', key: 'todTdr', unit: 'multiplier' },
]
const NON_TOD: F[] = [
  { label: 'Non-TOD - Base FAR factor', key: 'nonTodBaseFar', unit: 'multiplier' },
  { label: 'Non-TOD - GRIHA factor', key: 'nonTodGriha', unit: 'multiplier' },
  { label: 'Non-TOD - TDR factor', key: 'nonTodTdr', unit: 'multiplier' },
]
const UTILIZATION: F[] = [
  { label: 'Proposed FAR', key: 'proposedFarSqm', unit: 'sq.m' },
  { label: 'Permissible ground coverage', key: 'permissibleGcPct', unit: '%' },
  { label: 'Proposed ground coverage area', key: 'proposedGcSqm', unit: 'sq.m' },
]
const CLUSTER_FIELDS = [
  ['floorFAR', 'Floor FAR', 'A'],
  ['floorBUA', 'Floor BUA', 'B'],
  ['nonFARBUA', 'Non FAR BUA (Excl. Balcony)', 'C'],
  ['floorCarpetArea', 'Floor Habitable Carpet Area', 'D'],
  ['floorShaftArea', 'Floor Shaft Area', 'E'],
  ['structureFootprintArea', 'Structure Footprint Area', 'F'],
  ['nonSaleableFAR', 'Non Saleable FAR', 'G'],
  ['windowOpeningArea', 'Window Opening Area', 'H'],
  ['externalGlazingArea', 'External Glazing Area (in case of glass building)', 'I'],
  ['wallPerimeterArea', 'Wall Perimeter Area (façade)', 'J'],
]
const FLOOR_HEIGHTS: F[] = [
  { label: 'Typical Floor', key: 'typicalFloor', unit: 'm' },
  { label: 'Stilt', key: 'stilt', unit: 'm' },
]
const BASEMENT: F[] = [
  { label: 'Surface Driveway Width', key: 'surfaceDrivewayWidth', unit: 'm' },
  { label: 'Ramps & Entry to Basement Width', key: 'rampsEntryToBasementWidth', unit: 'm' },
  { label: 'Basement Clear Height (Ramp Entrance)', key: 'basementClearHeightRamp', unit: 'm' },
  { label: 'Basement Clear Height (Below Services)', key: 'basementClearHeightB1', unit: 'm' },
  { label: 'Total Parking Bay size', key: 'totalParkingBaySize', unit: 'sqm' },
  { label: 'No. of parking slots', key: 'noOfParkingSlots', unit: '#' },
]

/** Input with benchmark highlight (red ring, ●, "Req:" note) */
function BenchInput({ f, value, onChange, benchmarks, focusBg = true }: { f: F; value: string; onChange: (v: string) => void; benchmarks: BenchmarkMap | null; focusBg?: boolean }) {
  const dev = checkDeviation(f.label, value || '', benchmarks)
  const req = formatBenchmark(getBenchmark(f.label, benchmarks))
  return (
    <div className={`space-y-1.5 ${dev ? 'bg-red-50/40 rounded-lg p-2' : ''}`}>
      <label className={`text-xs font-medium flex items-center gap-1 ${dev ? 'text-red-600' : 'text-gray-500'}`}>
        {f.label}
        {dev && <span className="text-[10px] text-red-500 font-semibold">●</span>}
      </label>
      <div className="relative">
        <Input
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={focusBg ? '0' : ''}
          className={`bg-gray-50/50 text-sm h-10 pr-12 ${focusBg ? 'focus:bg-white ' : ''}${dev ? 'border-red-400 ring-1 ring-red-300' : 'border-gray-100'}`}
        />
        {f.unit && f.unit !== '#' && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-medium italic">{f.unit}</span>}
      </div>
      {dev && req && (
        <p className="text-[10px] mt-1 text-gray-400">
          {reqLabel()} <span className="font-semibold text-blue-400">{req}</span>
        </p>
      )}
    </div>
  )
}

function PlainInput({ f, value, onChange, pr }: { f: F; value: string; onChange: (v: string) => void; pr: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-gray-500">{f.label}</label>
      <div className="relative">
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="0" className={`bg-gray-50/50 text-sm h-10 ${pr} focus:bg-white border-gray-100`} />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-medium italic">{f.unit}</span>
      </div>
    </div>
  )
}

function OtherSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-gray-500">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={SEL_TRIGGER}>
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent>
          {options.map(([v, l]) => (
            <SelectItem key={v} value={v}>
              {l}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export type InputPanelProps = {
  keyRatio: KeyRatioInputs
  setKeyRatio: (v: KeyRatioInputs) => void
  area: AreaStatementInputs
  setArea: (v: AreaStatementInputs) => void
  extra: AdditionalElements2
  setExtra: (v: AdditionalElements2) => void
  clusters: ClusterConfig[]
  setClusters: (v: ClusterConfig[]) => void
  benchmarks: BenchmarkMap | null
  /** Module 5 unit table (units per type for Parking Required) */
  module5Rows?: unknown
}

/** Parking Required: ECS per unit for each Module 5 unit type; units come from Module 5; total = ECS x units */
function ParkingRequired({ reqs, setReqs, module5Rows }: { reqs: ParkingReq[]; setReqs: (r: ParkingReq[]) => void; module5Rows: unknown }) {
  const groups = Array.isArray(module5Rows) ? (module5Rows as { type?: unknown }[]) : []
  const resGroups = groups.filter((g) => /resid/i.test(String(g?.type ?? '')))
  const types = module5Units(resGroups.length ? resGroups : groups)
  const k = (s: unknown) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
  // a unit type can appear more than once in Module 5: the n-th occurrence uses the n-th row with that name
  const occ = types.map((t, i) => types.slice(0, i).filter((x) => k(x.label) === k(t.label)).length)
  const reqIndex = (label: string, n: number) => reqs.map((r, j) => ({ r, j })).filter(({ r }) => k(r.label) === k(label))[n]?.j ?? -1
  const valueOf = (label: string, n: number) => {
    const j = reqIndex(label, n)
    return j >= 0 ? reqs[j].value ?? '' : ''
  }
  const setValue = (label: string, n: number, v: string) => {
    const i = reqIndex(label, n)
    setReqs(i >= 0 ? reqs.map((r, j) => (j === i ? { ...r, value: v } : r)) : [...reqs, { label, value: v }])
  }
  const claimed = new Set(types.map((t, ti) => reqIndex(t.label, occ[ti])).filter((j) => j >= 0))
  const custom = reqs.map((r, i) => ({ r, i })).filter(({ i }) => !claimed.has(i))
  const calc = parkingRequired(reqs, module5Rows)
  const ecsTotal = (v: string, units: number) => {
    const e = parseFloat(String(v).replace(/,/g, ''))
    return Number.isFinite(e) ? fmtNum(e * units) : null
  }
  const cell = 'text-xs text-gray-600 whitespace-nowrap'
  return (
    <div className="space-y-2 mt-2">
      <label className="text-xs font-bold text-gray-700">Parking Required</label>
      {types.length === 0 && <p className="text-[11px] text-gray-400">Add unit types in Module 5 (Project Details + Layout Plans) to list them here.</p>}
      {types.map((t, ti) => {
        const v = valueOf(t.label, occ[ti])
        const tot = ecsTotal(v, t.units)
        return (
          <div key={`${t.label}-${ti}`} className="ml-2 grid grid-cols-[1fr_70px_150px] items-center gap-2">
            <span className="text-xs font-semibold text-gray-800 truncate" title={t.label}>
              {t.label}
            </span>
            <Input value={v} onChange={(e) => setValue(t.label, occ[ti], e.target.value)} placeholder="ECS" className="h-8 text-xs border-gray-200 text-center" />
            <span className={cell}>
              ECS x {t.units} Units = <b>{tot !== null ? `${tot} ECS` : '-'}</b>
            </span>
          </div>
        )
      })}
      {custom.map(({ r, i }) => (
        <div key={`c${i}`} className="ml-2 grid grid-cols-[1fr_70px_auto_auto] items-center gap-2">
          <Input value={r.label} onChange={(e) => setReqs(reqs.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} placeholder="Type name" className="h-8 text-xs border-gray-200" />
          <Input value={r.value} onChange={(e) => setReqs(reqs.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} placeholder="ECS" className="h-8 text-xs border-gray-200 text-center" />
          <span className={cell}>ECS (type not in Module 5)</span>
          <button type="button" onClick={() => setReqs(reqs.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      ))}
      <div className="ml-2 flex items-center justify-between border-t pt-2">
        <button type="button" onClick={() => setReqs([...reqs, { label: '', value: '' }])} className={ADD_BTN}>
          <Plus size={12} />
          Add Other Type
        </button>
        <span className="text-xs font-bold text-blue-900">Total Car Parks Required = {fmtNum(calc.total)} ECS</span>
      </div>
    </div>
  )
}

export default function InputPanel({ keyRatio: l, setKeyRatio, area: p, setArea, extra: n, setExtra, clusters, setClusters, benchmarks, module5Rows }: InputPanelProps) {
  const kr = (fields: F[]) => fields.map((f) => <BenchInput key={f.key} f={f} value={l[f.key]} onChange={(v) => setKeyRatio({ ...l, [f.key]: v })} benchmarks={benchmarks} />)
  const as = (fields: F[], pr: string) => fields.map((f) => <PlainInput key={f.key} f={f} value={p[f.key]} pr={pr} onChange={(v) => setArea({ ...p, [f.key]: v })} />)
  const other = n.other as Record<string, string>
  const setOther = (k: string, v: unknown) => setExtra({ ...n, other: { ...n.other, [k]: v as string } })
  const ot = (fields: F[]) =>
    fields.map((f) => <BenchInput key={f.key} f={f} value={other[f.key] || ''} onChange={(v) => setOther(f.key, v)} benchmarks={benchmarks} focusBg={false} />)
  const reqs: ParkingReq[] = n.other.extraParkingReqs || []
  const setReqs = (r: ParkingReq[]) => setExtra({ ...n, other: { ...n.other, extraParkingReqs: r } })

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      <div className="bg-[#00509d] px-6 py-3">
        <h2 className="text-white font-semibold uppercase tracking-wider text-xs">TYPE</h2>
      </div>
      <Accordion type="single" collapsible defaultValue="key-ratio" className="w-full">
        <AccordionItem value="key-ratio" className="border-b">
          <AccordionTrigger className="px-6 py-4 hover:no-underline font-bold text-blue-900 bg-blue-50/50">Key Ratio</AccordionTrigger>
          <AccordionContent className="px-6 py-6 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
            <div className="space-y-4">
              <h3 className={H3}>EFFICIENCY</h3>
              {kr(EFFICIENCY)}
            </div>
            <div className="space-y-4 border-t pt-6">
              <h3 className={H3}>APT CONFIGURATIONS</h3>
              {kr(APT_CONFIG)}
            </div>
            <div className="space-y-4 border-t pt-6">
              <h3 className={H3}>NON-APT EFFICIENCIES</h3>
              {kr(NON_APT_EFF)}
            </div>
            <div className="space-y-4 border-t pt-6">
              <h3 className={H3}>NON-APT CONFIGURATION</h3>
              {kr(NON_APT_CONFIG)}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="elements-1" className="border-b">
          <AccordionTrigger className="px-6 py-4 hover:no-underline font-bold text-blue-900 bg-blue-50/30">Area Statement</AccordionTrigger>
          <AccordionContent className="px-6 py-6 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
            <div className="space-y-4">
              <h3 className={H3}>AREA SUMMARY</h3>
              {as(AREA_SUMMARY, 'pr-16')}
            </div>
            <div className="space-y-4 border-t pt-6">
              <h3 className={H3}>FAR FACTORS — TOD TRANSITION LAND</h3>
              {as(TOD, 'pr-24')}
            </div>
            <div className="space-y-4 border-t pt-6">
              <h3 className={H3}>FAR FACTORS — NON-TOD LAND</h3>
              {as(NON_TOD, 'pr-24')}
            </div>
            <div className="space-y-4 border-t pt-6">
              <h3 className={H3}>UTILIZATION & GROUND COVERAGE</h3>
              {as(UTILIZATION, 'pr-16')}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="elements-2" className="border-0">
          <AccordionTrigger className="px-6 py-4 hover:no-underline font-bold text-blue-900 bg-blue-50/30">Additional Elements 2/2</AccordionTrigger>
          <AccordionContent className="px-6 py-6 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
            <div className="space-y-4 pt-4 border-t">
              <h3 className={H3}>Cluster Configuration</h3>
              {clusters.map((c, ci) => (
                <div key={ci} className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Input
                      value={c.name}
                      onChange={(e) => setClusters(clusters.map((x, j) => (j === ci ? { ...x, name: e.target.value } : x)))}
                      className="bg-blue-50/50 font-bold text-blue-900 text-sm h-8 border-blue-100 w-40"
                    />
                    {clusters.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setClusters(clusters.filter((_, j) => j !== ci))}
                        className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {CLUSTER_FIELDS.map(([k, label, letter]) => (
                      <div key={k} className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-blue-700 w-4 shrink-0">{letter}</span>
                        <label className="text-xs text-gray-500 flex-1">{label}</label>
                        <div className="flex items-center gap-1 w-32 shrink-0">
                          <Input
                            value={c[k] ?? ''}
                            onChange={(e) => setClusters(clusters.map((x, j) => (j === ci ? { ...x, [k]: e.target.value } : x)))}
                            placeholder="0"
                            className="bg-gray-50/50 text-sm h-8 border-gray-100 text-right"
                          />
                          <span className="text-[10px] text-gray-400 shrink-0">sqft</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => setClusters([...clusters, newCluster(`Cluster ${clusters.length + 1}`)])} className={ADD_BTN}>
                <Plus size={12} />
                Add Cluster
              </button>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <h3 className={H3}>OTHER DESIGN CONSIDERATION</h3>
              <div className="grid grid-cols-1 gap-4">
                <OtherSelect
                  label="Ground Floor Entrance Lobby"
                  value={other.groundFloorEntranceLobby || ''}
                  onChange={(v) => setOther('groundFloorEntranceLobby', v)}
                  options={[
                    ['Double Height', 'Double Height'],
                    ['Single Height', 'Single Height'],
                    ['Triple Height', 'Triple Height'],
                  ]}
                />
                {ot(FLOOR_HEIGHTS)}
                <OtherSelect
                  label="Pent House"
                  value={other.pentHouse || ''}
                  onChange={(v) => setOther('pentHouse', v)}
                  options={[
                    ['Yes', 'Yes'],
                    ['No', 'No'],
                  ]}
                />
                <div className="col-span-1 border-t mt-2 pt-2" />
                {other.pentHouse !== 'No' && (
                  <OtherSelect
                    label="Penthouse Planning"
                    value={other.pentHousePlanning || ''}
                    onChange={(v) => setOther('pentHousePlanning', v)}
                    options={[
                      ['simplex', 'Simplex'],
                      ['duplex', 'Duplex'],
                    ]}
                  />
                )}
                <OtherSelect
                  label="Units on Ground Floor?"
                  value={other.unitsOnGroundFloor || ''}
                  onChange={(v) => setOther('unitsOnGroundFloor', v)}
                  options={[
                    ['yes', 'Yes'],
                    ['no', 'No'],
                  ]}
                />
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t">
              <h3 className={H3}>BASEMENT & PARKING STRATEGY</h3>
              <div className="grid grid-cols-1 gap-4">
                {ot(BASEMENT)}
                <ParkingRequired reqs={reqs} setReqs={setReqs} module5Rows={module5Rows} />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
