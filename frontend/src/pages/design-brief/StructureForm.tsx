/* Structure inputs — /design-brief/structure (original: StructureForm-Gfk7tunj) */
import DepartmentForm from '@/components/design-brief/DepartmentForm'
import { STRUCTURE_FIELDS } from '@/components/design-brief/fields'

export default function StructureForm() {
  return <DepartmentForm config={{ path: 'structure', title: 'Structure', fields: STRUCTURE_FIELDS, look: 'standard', customNoteBorder: true }} />
}
