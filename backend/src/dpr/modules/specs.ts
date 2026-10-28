import { contentPage, emptyMessage } from '../doc.js'
import type { ModuleRenderer } from './index.js'

/** TODO: real layout */
export const idSpecifications: ModuleRenderer = (ctx) => {
  contentPage(ctx, 'Product Mix — ID Specifications Details')
  emptyMessage(ctx, 'No data configured.')
}
export const commonArea: ModuleRenderer = (ctx) => {
  contentPage(ctx, 'Product Mix — Common Area Specifications')
  emptyMessage(ctx, 'No data configured.')
}
