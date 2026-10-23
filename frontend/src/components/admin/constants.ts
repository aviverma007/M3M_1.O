/* Reference data hardcoded in the original Roles & Access Control page */
import type { AccessLevel } from '@/types/admin'

/** Role permission catalogue (Create Role dialog) */
export const ROLE_PERMISSIONS: { id: string; name: string }[] = [
  { id: 'loginPage', name: 'Login Page' },
  { id: 'selectProjectType', name: 'Select Project Type' },
  { id: 'selectProjectPortfolio', name: 'Select Project Portfolio' },
  { id: 'addProjectDetails', name: 'Add Project details' },
  { id: 'viewDownloadDesignBrief', name: 'View & Download Design Brief' },
  { id: 'inHouseDesignViewDownload', name: 'In house design View and Download' },
  { id: 'inHouseDesignViewUpload', name: 'In house design View and Upload' },
  { id: 'manageTimeline', name: 'Manage Timeline for each Department' },
  { id: 'editEnterInputs', name: 'Edit & Enter Department Inputs' },
  { id: 'sentFeedbackDept', name: 'Sent Feedback to department' },
  { id: 'uploadFinalDesignBrief', name: 'Upload Final Design Brief' },
  { id: 'downloadFinalDesignBrief', name: 'Download final Design Brief' },
  { id: 'sentFeedbackDesign', name: 'Sent Feedback to Design Team' },
]

/** Permission rules shown on the Permissions card, derived from role + department (as in original). */
export function rolePermissionStatus(role: string, dept: string) {
  const sa = role === 'super_admin'
  return [
    { name: 'Login Page', status: true },
    { name: 'Select Project Type', status: sa },
    { name: 'Select Project Portfolio', status: sa || ['pmo', 'design'].includes(dept) },
    { name: 'Add Project details', status: sa || dept === 'pmo' },
    { name: 'View & Download Design Brief', status: true },
    { name: 'In house design View and Download', status: true },
    { name: 'In house design View and Upload', status: sa || dept === 'design' },
    { name: 'Manage Timeline for each Department', status: sa || dept === 'pmo' },
    { name: 'Edit & Enter Department Inputs', status: sa || ['design', 'structure', 'mep', 'interior', 'pmo'].includes(dept) },
    { name: 'Sent Feedback to department', status: sa || dept === 'pmo' },
    { name: 'Upload Final Design Brief', status: sa },
    { name: 'Download final Design Brief', status: true },
    { name: 'Sent Feedback to Design Team', status: sa || ['structure', 'mep', 'interior', 'pmo'].includes(dept) },
  ]
}

export type ModuleCategory = 'Design Modules' | 'DPR Modules' | 'PMO Modules' | 'General'

export const ACCESS_MODULES: { name: string; moduleNo: number | null; category: ModuleCategory }[] = [
  { name: 'Key Ratio', moduleNo: 1, category: 'Design Modules' },
  { name: 'Apartment Design', moduleNo: 2, category: 'Design Modules' },
  { name: 'Common Design', moduleNo: 3, category: 'Design Modules' },
  { name: 'Commercial Key Ratio', moduleNo: 4, category: 'Design Modules' },
  { name: 'Pre Concept Design & Checklist', moduleNo: null, category: 'Design Modules' },
  { name: 'Structures', moduleNo: null, category: 'Design Modules' },
  { name: 'MEP', moduleNo: null, category: 'Design Modules' },
  { name: 'Design Brief', moduleNo: null, category: 'DPR Modules' },
  { name: 'Project Details + Layout Plans.', moduleNo: null, category: 'DPR Modules' },
  { name: 'Project Level Design', moduleNo: null, category: 'DPR Modules' },
  { name: 'Unit Level Design', moduleNo: null, category: 'DPR Modules' },
  { name: 'Service Design Consideration', moduleNo: null, category: 'DPR Modules' },
  { name: 'ID Specifications', moduleNo: null, category: 'DPR Modules' },
  { name: 'Common Area', moduleNo: null, category: 'DPR Modules' },
  { name: 'Landscape & Amenities', moduleNo: null, category: 'DPR Modules' },
  { name: 'Contracting Strategy', moduleNo: null, category: 'PMO Modules' },
  { name: 'Consultant Strategy', moduleNo: null, category: 'PMO Modules' },
  { name: 'Phasing Plans', moduleNo: null, category: 'PMO Modules' },
  { name: 'Project Schedule', moduleNo: null, category: 'PMO Modules' },
  { name: 'Approvals', moduleNo: null, category: 'PMO Modules' },
  { name: 'Additional Details', moduleNo: null, category: 'PMO Modules' },
  { name: 'Export Configuration', moduleNo: null, category: 'General' },
]

export const ACCESS_DEPARTMENTS: { value: string; label: string; group: 'Admin' | 'Design' | 'Other' }[] = [
  { value: 'super_admin', label: 'Super Admin', group: 'Admin' },
  { value: 'design', label: 'Design Team', group: 'Design' },
  { value: 'design_arch', label: 'Design - Arch.', group: 'Design' },
  { value: 'design_str', label: 'Design - Str.', group: 'Design' },
  { value: 'design_mep', label: 'Design - MEP.', group: 'Design' },
  { value: 'structure', label: 'Structure Design Team', group: 'Other' },
  { value: 'mep', label: 'MEP Design Team', group: 'Other' },
  { value: 'interior', label: 'Interior Design Dept.', group: 'Other' },
  { value: 'pmo', label: 'PMO Team', group: 'Other' },
  { value: 'cp', label: 'C&P', group: 'Other' },
  { value: 'liaison', label: 'Liaison', group: 'Other' },
  { value: 'pmo_budget', label: 'PMO & Budget', group: 'Other' },
  { value: 'bt', label: 'BT', group: 'Other' },
  { value: 'pl', label: 'P&L', group: 'Other' },
]

export const COMPANIES = [
  { value: 'm3m_gurgaon', label: 'M3M Gurgaon' },
  { value: 'm3m_noida', label: 'M3M Noida' },
  { value: 'smart_world', label: 'Smart World' },
]
export const COMPANY_LABELS: Record<string, string> = Object.fromEntries(COMPANIES.map((c) => [c.value, c.label]))

export const CATEGORY_BADGE: Record<ModuleCategory, string> = {
  'Design Modules': 'bg-blue-50 text-blue-700 border-blue-100',
  'DPR Modules': 'bg-purple-50 text-purple-700 border-purple-100',
  'PMO Modules': 'bg-orange-50 text-orange-700 border-orange-100',
  General: 'bg-gray-50 text-gray-600 border-gray-200',
}

/** Module-access roles are stored as roles named `<company>:<department>` */
export const moduleKey = (name: string) => `module:${name}`
export const accessRoleName = (company: string, dept: string) => `${company}:${dept}`
export const ACCESS_ROLE_RE = /^(m3m_gurgaon|m3m_noida|smart_world):/

export const ACCESS_LEVELS: AccessLevel[] = ['none', 'view', 'edit']

export const DESIGN_DEPARTMENTS = ['design', 'design_arch', 'design_str', 'design_mep']
