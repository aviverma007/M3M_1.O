import { contentPage, emptyMessage } from '../doc.js'
import type { ModuleRenderer } from './index.js'

/** TODO: real layout */
const structure: ModuleRenderer = (ctx) => {
  contentPage(ctx, 'Design Considerations — Structural Parameters')
  emptyMessage(ctx, 'No data configured.')
}
export default structure
