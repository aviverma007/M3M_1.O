/* Right "Calculated Output" panel of Project Level Design (tabs: Key Ratio / Area Statement / Additional Elements 2/2). */
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/data'
import { checkDeviation, formatBenchmark, getBenchmark, reqLabel, type BenchmarkMap } from '@/lib/benchmark'
import type { AdditionalElements2, AreaStatementInputs, ClusterConfig, KeyRatioInputs } from '@/types/chapters-a'
import { areaStatement, keyRatioFormula, n2 } from './calc'

type Param = { param: string; val: string; unit: string; subVal?: string }

const TAB = 'text-[10px] font-black tracking-widest uppercase py-2 px-4 rounded-md data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all'
const SCROLL = 'overflow-x-auto h-full max-h-[75vh] overflow-y-auto custom-scrollbar'
const GROUP_TD = 'px-6 py-2 font-black text-gray-500 uppercase tracking-tighter italic border-r'

function ParamRows({ items, benchmarks }: { items: Param[]; benchmarks: BenchmarkMap | null }) {
  return (
    <>
      {items.map((a, i) => {
        const dev = checkDeviation(a.param, String(a.val), benchmarks)
        const req = formatBenchmark(getBenchmark(a.param, benchmarks))
        return (
          <tr key={i} className={`border-b hover:bg-blue-50/30 transition-colors group ${dev ? 'bg-red-50/40' : ''}`}>
            <td className="px-6 py-3 border-r bg-gray-50/20 group-hover:bg-transparent" />
            <td className="px-6 py-3 border-r">
              <span className={`font-medium ${dev ? 'text-red-600' : 'text-gray-700'}`}>{a.param}</span>
              {req && (
                <p className="text-[10px] mt-1 text-gray-400">
                  {reqLabel()} <span className={`font-semibold ${dev ? 'text-red-500' : 'text-blue-400'}`}>{req}</span>
                </p>
              )}
            </td>
            <td className="px-6 py-3 text-center font-bold">
              <span className={`px-3 py-1 rounded-full border shadow-sm ${dev ? 'bg-red-50 border-red-200 text-red-700' : 'bg-blue-50 border-blue-100 text-blue-900'}`}>{a.val}</span>
              <span className="text-[10px] text-gray-400 ml-2 font-normal italic">{a.unit}</span>
              {a.subVal && <p className="text-[10px] text-gray-400 mt-1 font-normal">({a.subVal})</p>}
            </td>
          </tr>
        )
      })}
    </>
  )
}

function Group({ label, first = false }: { label: string; first?: boolean }) {
  return (
    <tr className={first ? 'bg-gray-100/80' : 'bg-gray-100/80 border-t'}>
      <td className={GROUP_TD} colSpan={first ? 1 : undefined}>
        {label}
      </td>
      <td className="px-6 py-2 border-r" />
      <td className="px-6 py-2" />
    </tr>
  )
}

const ratio = (a: number, b: number) => (b > 0 ? (a / b).toFixed(2) : '-')

function KeyRatioTab({ l, extra, benchmarks }: { l: KeyRatioInputs; extra: AdditionalElements2; benchmarks: BenchmarkMap | null }) {
  const efficiency: Param[] = [
    { param: 'BUA/Saleable', val: keyRatioFormula(4, l), unit: 'Ratio' },
    { param: 'Saleable/FAR', val: keyRatioFormula(5, l), unit: 'Ratio' },
    { param: 'BUA/FAR', val: ratio(n2(l.builtUpArea), n2(l.far)), unit: 'Ratio' },
    { param: 'Balcony area/FAR (%)', val: n2(l.far) > 0 ? ((n2(l.balconyArea) / n2(l.far)) * 100).toFixed(2) : '-', unit: '%' },
    { param: 'FAR Utilization', val: keyRatioFormula(27, l), unit: '%' },
    { param: 'FAR per EWS (sqft)', val: ratio(n2(l.ewsFAR), n2(l.noOfEWSUnit)), unit: 'sqft' },
  ]
  const apt: Param[] = [
    { param: 'Floor to Floor Height Apt', val: l.floorToFloorHeightApt || '', unit: 'm' },
    { param: 'No. Of Units', val: l.noOfUnits || '', unit: '#' },
  ]
  const cars = n2(l.totalNumberOfCars)
  const nonAptEff: Param[] = [
    { param: 'Basement parking efficiency', val: cars <= 0 ? '-' : ((n2(l.totalBasementArea) - n2(l.circulationArea)) / cars / 10.7639).toFixed(2), unit: 'sqm/car' },
  ]
  const nonAptCfg: Param[] = [
    { param: 'Lobby Corridor Width', val: l.lobbyCorridorWidth || '', unit: 'm' },
    { param: 'Driveway Width Basement', val: l.drivewayWidthBasement || '', unit: 'm' },
    { param: 'Floor to Floor Height Ground Lobby', val: l.floorToFloorHeightGroundLobby || '', unit: 'm' },
    { param: 'Floor to Floor Height (B1 - GF) Tower Area', val: l.floorToFloorHeightB1GFTower || '', unit: 'm' },
    { param: 'Floor to Floor Height (B1 - GF) Non Tower Area', val: l.floorToFloorHeightB1GFNonTower || '', unit: 'm' },
    { param: 'Floor to Floor Height (B2 - B1)', val: l.floorToFloorHeightB2B1 || '', unit: 'm' },
    { param: 'Floor to Floor Height (B3 - B2)', val: l.floorToFloorHeightB3B2 || '', unit: 'm' },
    { param: 'Parking bay size', val: String((extra.other as Record<string, string>).totalParkingBaySize || '-'), unit: 'sq m' },
    { param: 'No. of Basements', val: l.noOfBasements || '', unit: '#' },
  ]
  return (
    <div className={SCROLL}>
      <table className="w-full text-xs border-collapse">
        <thead className="sticky top-0 z-10 bg-white">
          <tr className="bg-[#00509d] text-white">
            <th className="px-6 py-3 text-left font-bold uppercase tracking-wider border-r border-white/10 w-1/4">Element</th>
            <th className="px-6 py-3 text-left font-bold uppercase tracking-wider border-r border-white/10 w-1/2">Parameters</th>
            <th className="px-6 py-3 text-center font-bold uppercase tracking-wider w-1/4">Value</th>
          </tr>
        </thead>
        <tbody>
          <Group label="Efficiency" first />
          <ParamRows items={efficiency} benchmarks={benchmarks} />
          <Group label="Apt Configurations" />
          <ParamRows items={apt} benchmarks={benchmarks} />
          <Group label="Non-Apt Efficiencies" />
          <ParamRows items={nonAptEff} benchmarks={benchmarks} />
          <Group label="Non-Apt Configuration" />
          <ParamRows items={nonAptCfg} benchmarks={benchmarks} />
        </tbody>
      </table>
    </div>
  )
}

/* rows of the Area Statement table (defined outside render so they don't remount) */
const AreaSec = ({ label }: { label: string }) => (
  <tr className="bg-[#00509d]/10">
    <td colSpan={3} className="px-6 py-2 font-black text-[#00509d] uppercase tracking-tighter text-[10px]">
      {label}
    </td>
  </tr>
)
const AreaRow = ({ label, mid, sqm, bold }: { label: string; mid: string; sqm: string; bold?: boolean }) => (
  <tr className={`border-b hover:bg-blue-50/30 transition-colors ${bold ? 'bg-blue-50/40' : ''}`}>
    <td className={`px-6 py-3 border-r ${bold ? 'font-bold text-[#00509d]' : 'font-medium text-gray-700'}`}>{label}</td>
    <td className={`px-6 py-3 text-center border-r text-xs ${bold ? 'font-bold text-[#00509d]' : 'text-gray-500'}`}>{mid}</td>
    <td className={`px-6 py-3 text-center text-xs ${bold ? 'font-bold text-[#00509d]' : 'text-gray-500'}`}>{sqm}</td>
  </tr>
)

function AreaStatementTab({ p }: { p: AreaStatementInputs }) {
  const a = areaStatement(p)
  const t = (o: number) => (o && o !== 0 ? Number(o.toFixed(2)).toLocaleString('en-IN') : '-')
  const r = (o: number) => (o && o !== 0 ? o.toFixed(2) : '-')
  const over = a.checkSqm > a.licensedSqm
  const c = over ? 'text-red-600' : 'text-green-600'
  return (
    <div className={SCROLL}>
      <table className="w-full text-xs border-collapse">
        <thead className="sticky top-0 z-10 bg-white">
          <tr className="bg-[#00509d] text-white">
            <th className="px-6 py-3 text-left font-bold uppercase tracking-wider border-r border-white/10 w-[45%]">Description</th>
            <th className="px-6 py-3 text-center font-bold uppercase tracking-wider border-r border-white/10 w-[20%]">Factor / Acres</th>
            <th className="px-6 py-3 text-center font-bold uppercase tracking-wider w-[35%]">Sq.m</th>
          </tr>
        </thead>
        <tbody>
          <AreaSec label="Area Summary" />
          <AreaRow label="Licensed Area of Site" mid={t(a.licensedAreaAcre) + ' ac'} sqm={t(a.licensedSqm)} />
          <AreaRow label="Residential Site (TOD + Non-TOD)" mid={t(a.residentialAcre) + ' ac'} sqm={t(a.residentialSqm)} bold />
          <AreaRow label="  · TOD Transition Land" mid={t(a.todLandAcre) + ' ac'} sqm={t(a.todSqm)} />
          <AreaRow label="  · Non-TOD Land" mid={t(a.nonTodLandAcre) + ' ac'} sqm={t(a.nonTodSqm)} />
          <AreaRow label="Commercial Site" mid={t(a.commercialAcre) + ' ac'} sqm={t(a.commSqm)} />
          <tr className={`border-b ${over ? 'bg-red-50' : 'bg-green-50'}`}>
            <td className={`px-6 py-3 border-r font-semibold text-sm ${c}`}>Check: Residential + Commercial</td>
            <td className={`px-6 py-3 text-center border-r text-xs font-semibold ${c}`}>{t(a.checkAcre)} ac</td>
            <td className={`px-6 py-3 text-center text-xs font-semibold ${c}`}>{t(a.checkSqm)}</td>
          </tr>
          <AreaSec label="FAR Calculation — TOD Transition Land" />
          <AreaRow label="Base FAR" mid={r(n2(p.todBaseFar))} sqm={t(a.todBaseFARsqm)} />
          <AreaRow label="GRIHA" mid={r(n2(p.todGriha))} sqm={t(a.todGrihaSqm)} />
          <AreaRow label="TDR" mid={r(n2(p.todTdr))} sqm={t(a.todTdrSqm)} />
          <AreaRow label="TOD Total (X)" mid={r(a.todFactorX)} sqm={t(a.todTotalFARsqm)} bold />
          <AreaSec label="FAR Calculation — Non-TOD Land" />
          <AreaRow label="Base FAR" mid={r(n2(p.nonTodBaseFar))} sqm={t(a.nonTodBaseFARsqm)} />
          <AreaRow label="GRIHA" mid={r(n2(p.nonTodGriha))} sqm={t(a.nonTodGrihaSqm)} />
          <AreaRow label="TDR" mid={r(n2(p.nonTodTdr))} sqm={t(a.nonTodTdrSqm)} />
          <AreaRow label="Non-TOD Total (Y)" mid={r(a.nonTodFactorY)} sqm={t(a.nonTodTotalFARsqm)} bold />
          <AreaSec label="FAR Summary" />
          <AreaRow label="Total Permissible Residential FAR (X+Y)" mid={r(a.blendedFAR)} sqm={t(a.totalPermissibleFARsqm)} bold />
          <AreaRow label="Proposed FAR for Residential" mid={a.proposedFarPct ? `${a.proposedFarPct.toFixed(2)}%` : '-'} sqm={t(a.proposedFARsqm)} />
          <AreaSec label="Ground Coverage" />
          <AreaRow label="Permissible Ground Coverage" mid={`${p.permissibleGcPct || 0}%`} sqm={t(a.permissibleGcSqm)} />
          <AreaRow label="Proposed Ground Coverage" mid={a.proposedGcPct ? `${a.proposedGcPct.toFixed(2)}%` : '-'} sqm={t(n2(p.proposedGcSqm))} />
        </tbody>
      </table>
    </div>
  )
}

function ClustersTab({ clusters }: { clusters: ClusterConfig[] }) {
  const pct = (a: number, b: number) => (b > 0 ? ((a / b) * 100).toFixed(2) : '-')
  return (
    <div className={SCROLL}>
      {clusters.map((c, ci) => {
        const [A, B, C, D, E, F, G, H, I, J] = [
          c.floorFAR, c.floorBUA, c.nonFARBUA, c.floorCarpetArea, c.floorShaftArea, c.structureFootprintArea, c.nonSaleableFAR,
          c.windowOpeningArea, c.externalGlazingArea, c.wallPerimeterArea,
        ].map(n2)
        const rows = [
          { param: 'Window/Carpet', formula: 'H/D', val: pct(H, D) },
          { param: 'Glazing area/Wall perimeter', formula: 'I/J', val: pct(I, J) },
          { param: 'Shaft/Floor BUA', formula: 'E/B', val: pct(E, B) },
          { param: 'Str. Footprint/BUA', formula: 'F/B', val: pct(F, B) },
          { param: 'Core Area/Floor FAR', formula: 'G/A', val: pct(G, A) },
          { param: 'Non FAR BUA/Floor BUA', formula: 'C/B', val: pct(C, B) },
        ]
        return (
          <table key={ci} className="w-full text-xs border-collapse mb-4">
            <tbody>
              <tr className="bg-gray-100/80">
                <td className="px-6 py-2 font-black text-[#00509d] uppercase tracking-tighter italic border-r" colSpan={3}>
                  {c.name || `Cluster ${ci + 1}`}
                </td>
              </tr>
              <tr className="bg-gray-50 border-b text-[10px] text-gray-400 uppercase tracking-wider">
                <td className="px-6 py-1.5 border-r">Parameter</td>
                <td className="px-6 py-1.5 border-r text-center">Value (%)</td>
                <td className="px-6 py-1.5 text-center">Formula</td>
              </tr>
              {rows.map((r, i) => (
                <tr key={i} className="border-b hover:bg-blue-50/30 transition-colors">
                  <td className="px-6 py-3 border-r w-1/2 font-medium text-[#00509d]">{r.param}</td>
                  <td className="px-6 py-3 text-center border-r font-bold text-gray-600 w-1/4">{r.val}</td>
                  <td className="px-6 py-3 text-center font-bold text-gray-400 w-1/4">{r.formula}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      })}
    </div>
  )
}

export default function OutputPanel({
  keyRatio,
  area,
  extra,
  clusters,
  benchmarks,
}: {
  keyRatio: KeyRatioInputs
  area: AreaStatementInputs
  extra: AdditionalElements2
  clusters: ClusterConfig[]
  benchmarks: BenchmarkMap | null
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col h-full min-h-[85vh]">
      <div className="bg-[#00509d] px-6 py-3 flex justify-between items-center">
        <h2 className="text-white font-semibold uppercase tracking-wider text-xs">Calculated Output</h2>
        <span className="text-[10px] text-blue-200 italic font-medium px-2 py-0.5 border border-blue-400/50 rounded-full">Auto-updated</span>
      </div>
      <Tabs defaultValue="key-ratio" className="w-full flex-1 flex flex-col">
        <TabsList className="w-full flex justify-start gap-4 px-6 py-4 bg-gray-50 border-b rounded-none h-auto">
          <TabsTrigger value="key-ratio" className={TAB}>
            Key Ratio
          </TabsTrigger>
          <TabsTrigger value="elements-1" className={TAB}>
            Area Statement
          </TabsTrigger>
          <TabsTrigger value="elements-2" className={TAB}>
            Additional Elements 2/2
          </TabsTrigger>
        </TabsList>
        <TabsContent value="key-ratio" className="flex-1 p-0 m-0">
          <KeyRatioTab l={keyRatio} extra={extra} benchmarks={benchmarks} />
        </TabsContent>
        <TabsContent value="elements-1" className="flex-1 p-0 m-0">
          <AreaStatementTab p={area} />
        </TabsContent>
        <TabsContent value="elements-2" className="flex-1 p-0 m-0">
          <ClustersTab clusters={clusters} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
