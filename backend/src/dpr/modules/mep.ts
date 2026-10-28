/* Design Considerations — MEP Parameters (MEP department record). */
import { contentPage, emptyMessage } from '../doc.js'
import type { ModuleRenderer } from './index.js'
import { customLabel, inRange, isEmpty, oneOf, renderParamTable, show, type ParamRow, type ParamSection } from './param-table.js'

const TITLE = 'Design Considerations — MEP Parameters'

type Def = { name: string; label: string; unit?: string; req?: string; ok?: (v: unknown) => boolean | undefined }

const lifts = (p: 'passenger' | 'service'): Def[] => [
  { name: `${p}LiftsNo`, label: 'No. Of Lifts' },
  { name: `${p}LiftsStops`, label: 'No. Of Stops' },
  p === 'passenger'
    ? { name: `${p}LiftsSpeed`, label: 'Speed Of Lift', unit: 'm/sec', req: '3 to 3.5', ok: (v) => inRange(v, 3, 3.5) }
    : { name: `${p}LiftsSpeed`, label: 'Speed Of Lift', unit: 'm/sec', req: '0 to 2.5', ok: (v) => inRange(v, 0, 2.5) },
  p === 'passenger'
    ? { name: `${p}AverageWait`, label: 'Average Waiting Time', unit: 'sec', req: '0 to 40', ok: (v) => inRange(v, 0, 40) }
    : { name: `${p}AverageWait`, label: 'Average Waiting Time', unit: 'sec' },
  { name: `${p}LiftSizeLength`, label: 'Lift Size (Length)', unit: 'm' },
  { name: `${p}LiftSizeWidth`, label: 'Lift Size (Width)', unit: 'm' },
]

const SECTIONS: { title: string; fields: Def[] }[] = [
  { title: 'Elevators (Passenger)', fields: lifts('passenger') },
  { title: 'Elevators (Service)', fields: lifts('service') },
  {
    title: 'HVAC',
    fields: [
      { name: 'acProvisionUnits', label: 'AC Provision In Units', req: 'VRV / VRF', ok: (v) => oneOf(v, 'VRV/VRF', 'VRV / VRF') },
      { name: 'acAreaApartment', label: 'Air-Conditioned Area For Apartment', unit: 'sqm' },
      { name: 'tonnageApartment', label: 'Tonnage Per Apartment' },
      { name: 'costPerTonneApartment', label: 'Cost Per Tonne Per Apartment', unit: 'INR' },
      { name: 'acAreaClub', label: 'Air-Conditioned Area For Club', unit: 'sqm' },
      { name: 'tonnageClub', label: 'Tonnage Of Club House' },
      { name: 'efficiencyApartment', label: 'Cooling Efficiency (Apartment)', unit: 'sq ft/Tonne', req: '100 to 150', ok: (v) => inRange(v, 100, 150) },
      { name: 'efficiencyClub', label: 'Cooling Efficiency (Club)', unit: 'sq ft/Tonne', req: '150 to 200', ok: (v) => inRange(v, 150, 200) },
    ],
  },
]

const mep: ModuleRenderer = (ctx, input) => {
  const rec = (input.mep ?? {}) as Record<string, unknown>
  const custom = (rec.customFields && typeof rec.customFields === 'object' ? rec.customFields : {}) as Record<string, unknown>
  const spill = (rec.fields && typeof rec.fields === 'object' ? rec.fields : {}) as Record<string, unknown>
  const get = (k: string) => (!isEmpty(rec[k]) ? rec[k] : !isEmpty(spill[k]) ? spill[k] : custom[k])

  const sections: ParamSection[] = SECTIONS.map((s) => ({
    title: s.title,
    rows: s.fields
      .filter((f) => !isEmpty(get(f.name)))
      .map((f): ParamRow => {
        const v = get(f.name)
        return { label: f.label, value: show(v), unit: f.unit, req: f.req, ok: f.req ? f.ok?.(v) : undefined }
      }),
  }))
  // custom parameters added on the page (label -> value)
  const known = new Set(SECTIONS.flatMap((s) => s.fields.map((f) => f.name)))
  const extra = Object.entries(custom)
    .filter(([k, v]) => !k.endsWith('Note') && !known.has(k) && !isEmpty(v))
    .map(([k, v]): ParamRow => ({ label: customLabel(k), value: show(v) }))
  if (extra.length) sections.push({ title: '', rows: extra })

  if (!sections.some((s) => s.rows.length)) {
    contentPage(ctx, 'Design Considerations — MEP')
    emptyMessage(ctx, 'No MEP parameters submitted yet.')
    return
  }
  renderParamTable(ctx, TITLE, ['Per Parameter', 'Specification'], sections)
}
export default mep
