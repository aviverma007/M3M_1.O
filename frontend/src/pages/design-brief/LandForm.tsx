/* Land inputs (CAD + PDF per item, Encroachments) — /design-brief/land (original: LandForm-CAwwokdu) */
import DepartmentForm from '@/components/design-brief/DepartmentForm'
import { LAND_FIELDS } from '@/components/design-brief/fields'

export default function LandForm() {
  return <DepartmentForm config={{ path: 'land', title: 'Land', fields: LAND_FIELDS, look: 'standard', cadPdf: true }} />
}
