/* Business Development inputs — /design-brief/business-development (original: BusinessDevelopmentForm-BL44ay1k) */
import DepartmentForm from '@/components/design-brief/DepartmentForm'
import { BD_FIELDS } from '@/components/design-brief/fields'

export default function BusinessDevelopmentForm() {
  return <DepartmentForm config={{ path: 'business-development', title: 'Business Development', fields: BD_FIELDS, look: 'standard', spacer: true }} />
}
