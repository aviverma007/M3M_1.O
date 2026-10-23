/* Common Area: /dashboard/project/:projectId/design-chapters/common-area (original CommonAreaForm). */
import SpecsPage from '@/components/design-chapters/SpecsPage'
import { COMMON_AREA_CONFIG } from '@/components/design-chapters/specsConfig'

export default function CommonAreaForm() {
  return <SpecsPage cfg={COMMON_AREA_CONFIG} />
}
