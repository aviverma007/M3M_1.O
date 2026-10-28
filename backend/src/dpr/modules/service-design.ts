/* Service Design Considerations — "Parameter | Details" table with Req: lines. */
import { SERVICE_DESIGN } from '@/components/design-chapters-b/serviceCatalogue'
import { contentPage, emptyMessage } from '../doc.js'
import type { ModuleRenderer } from './index.js'
import { isEmpty, num, oneOf, renderParamTable, show, type ParamRow, type ParamSection } from './param-table.js'

const TITLE = 'Service Design Considerations'
const yes = (v: unknown) => show(v) === 'Yes'

/** report label, Req text and pass rule per parameter (as printed by the original report) */
const RULES: Record<string, { label?: string; req?: string; ok?: (v: unknown) => boolean | undefined }> = {
  mainEntryType: { req: 'Residential (internal driveway 6m wide)', ok: (v) => oneOf(v, 'Residential') && !oneOf(v, 'Mixed') },
  internalDrivewayWidth: { req: '6 m (with 7.5m fire tender path)', ok: (v) => num(v) >= 6 },
  drivewayServing: {},
  noOfRamps: { req: 'Min 4', ok: (v) => num(v) >= 4 },
  carsPerRamp: { req: 'Min 2', ok: (v) => num(v) >= 2 },
  inwardRamp: { req: 'Yes', ok: yes },
  outwardRamp: { req: 'Yes', ok: yes },
  rampServing: { req: 'Residential Towers', ok: (v) => oneOf(v, 'Residential Towers') },
  rampSlopeCompliant: { req: 'Not explicitly stated', ok: yes },
  primaryDropOff: { req: 'Yes', ok: yes },
  usersAllowedAtDropOff: { req: 'Residents & Visitors', ok: (v) => oneOf(v, 'Both') },
  vehicleTypesAllowed: { req: '2W / 4W (both)', ok: (v) => oneOf(v, 'Both') },
  dropOffLevelOptions: { req: 'Grade + Basement', ok: (v) => oneOf(v, 'Both') },
  basementAccessControl: { req: 'Yes (Boom Barrier)', ok: yes },
  typeOfAccessControl: { req: 'Boom Barrier', ok: (v) => oneOf(v, 'Boom Barrier') },
  visitorRestriction: { req: 'Yes', ok: yes },
  fireTower: { label: 'Fire Tower', req: 'Fire Tower / Cross Ventilated', ok: (v) => oneOf(v, 'Fire Tower Only', 'Cross Ventilated') },
  fireLiftProvided: { req: 'Yes', ok: yes },
  fireLobbyProvided: { req: 'Yes', ok: yes },
  fireLiftAsService: { req: 'Yes', ok: yes },
  driversRooms: { req: 'Yes (B1 level)', ok: yes },
  serviceToilets: { req: 'Yes (B1 level)', ok: yes },
  serviceFacilitiesLocation: { req: 'Basement B1', ok: (v) => oneOf(v, 'Basement B1') },
}

const serviceDesign: ModuleRenderer = (ctx, input) => {
  const data = ((input.summary ?? {}) as Record<string, unknown>).serviceDesignData as Record<string, unknown> | undefined
  const sections: ParamSection[] = SERVICE_DESIGN.map((cat) => ({
    title: cat.category,
    rows: cat.parameters
      .filter((p) => !isEmpty(data?.[p.name]))
      .map((p): ParamRow => {
        const v = data![p.name]
        const rule = RULES[p.name] ?? { req: String(p.benchmark === true ? 'Yes' : p.benchmark), ok: (x: unknown) => show(x) === String(p.benchmark === true ? 'Yes' : p.benchmark) }
        const value = show(v)
        const unit = p.unit && /^-?[0-9.]+$/.test(value) ? p.unit : undefined
        return { label: rule.label ?? p.label, value, unit, req: rule.req, ok: rule.req === undefined ? undefined : rule.ok?.(v) ?? undefined }
      }),
  }))
  if (!sections.some((s) => s.rows.length)) {
    contentPage(ctx, TITLE)
    emptyMessage(ctx, 'No service design data configured.')
    return
  }
  renderParamTable(ctx, TITLE, ['Parameter', 'Details'], sections)
}
export default serviceDesign

