import { contentPage, emptyMessage } from '../doc.js'
import type { ModuleRenderer } from './index.js'

/** TODO: real layout */
const mep: ModuleRenderer = (ctx) => {
  contentPage(ctx, 'Design Considerations — MEP Parameters')
  emptyMessage(ctx, 'No data configured.')
}
export default mep
