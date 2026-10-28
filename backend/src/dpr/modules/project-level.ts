import { contentPage, emptyMessage } from '../doc.js'
import type { ModuleRenderer } from './index.js'

/** TODO: real layout */
const projectLevel: ModuleRenderer = (ctx) => {
  contentPage(ctx, 'Project Level Design')
  emptyMessage(ctx, 'No data configured.')
}
export default projectLevel
