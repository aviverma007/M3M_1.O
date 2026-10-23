/* ID Specifications: /dashboard/project/:projectId/design-chapters/id-specifications (original IDSpecificationsForm). */
import SpecsPage from '@/components/design-chapters/SpecsPage'
import { ID_SPECS_CONFIG } from '@/components/design-chapters/specsConfig'

export default function IDSpecificationsForm() {
  return <SpecsPage cfg={ID_SPECS_CONFIG} />
}
