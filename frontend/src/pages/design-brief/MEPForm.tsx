/* MEP inputs — /design-brief/mep (original: MEPForm--4grJdkM) */
import DepartmentForm from '@/components/design-brief/DepartmentForm'
import { MEP_FIELDS } from '@/components/design-brief/fields'

export default function MEPForm() {
  return (
    <DepartmentForm
      config={{ path: 'mep', title: 'MEP', fields: MEP_FIELDS, look: 'standard', customNoteBorder: true, rootClassName: 'space-y-6', formClassName: 'space-y-6' }}
    />
  )
}
