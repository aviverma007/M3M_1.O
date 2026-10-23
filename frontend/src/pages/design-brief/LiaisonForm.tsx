/* Liaison inputs — /design-brief/liaison (original: LiaisonForm-GhqbgbfH) */
import DepartmentForm from '@/components/design-brief/DepartmentForm'
import { LIAISON_FIELDS } from '@/components/design-brief/fields'

export default function LiaisonForm() {
  return <DepartmentForm config={{ path: 'liaison', title: 'Liaison', fields: LIAISON_FIELDS, look: 'liaison', spacer: true }} />
}
