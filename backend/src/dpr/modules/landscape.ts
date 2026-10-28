import { contentPage, emptyMessage } from '../doc.js'
import type { ModuleRenderer } from './index.js'

/** TODO: real layout */
const landscape: ModuleRenderer = (ctx) => {
  contentPage(ctx, 'Landscape & Amenities')
  emptyMessage(ctx, 'No data configured.')
}
export default landscape
