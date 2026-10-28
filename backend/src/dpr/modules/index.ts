import type { Ctx } from '../doc.js'
import type { DprInput, ImageLoader } from '../index.js'

export type ModuleRenderer = (ctx: Ctx, input: DprInput, loadImage: ImageLoader) => Promise<void> | void

import projectDetails from './project-details.js'
import phasingPlan from './phasing-plan.js'
import projectLevel from './project-level.js'
import unitLevel from './unit-level.js'
import { idSpecifications, commonArea } from './specs.js'
import landscape from './landscape.js'
import serviceDesign from './service-design.js'
import structure from './structure.js'
import mep from './mep.js'
import consultant from './consultant.js'
import contracting from './contracting.js'
import schedule from './schedule.js'
import approvals from './approvals.js'
import additional from './additional.js'

/** module name (as sent by the module cards / export page) -> renderer */
export const MODULE_RENDERERS: Record<string, ModuleRenderer> = {
  'Project Details + Layout Plans': projectDetails,
  'Unit Level Design': unitLevel,
  'Project Level Design': projectLevel,
  Structure: structure,
  MEP: mep,
  'ID Specifications': idSpecifications,
  'Common Area': commonArea,
  'Landscape & Amenities': landscape,
  'Service Design Consideration': serviceDesign,
  'Contracting Strategy': contracting,
  'Consultant Strategy': consultant,
  'Phasing Plan': phasingPlan,
  'Project Schedule': schedule,
  Approvals: approvals,
  'Additional Project Details': additional,
}
