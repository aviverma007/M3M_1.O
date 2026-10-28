import { contentPage, emptyMessage } from '../doc.js'
import type { ModuleRenderer } from './index.js'

/** TODO: real layout */
const phasingPlan: ModuleRenderer = (ctx) => {
  contentPage(ctx, 'Phasing Plan')
  emptyMessage(ctx, 'No data configured.')
}
export default phasingPlan
