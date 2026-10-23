/** Module catalogue — same module numbering/names as the original app. */

const RESIDENTIAL = [
  'Key Ratio',
  'Apartment Design',
  'Common Design',
  'Design Brief',
  'Project Details + Layout Plans.',
  'Project Level Design',
  'Unit Level Design',
  'Structures',
  'MEP',
  'ID Specifications',
  'Common Area',
  'Landscape & Amenities',
  'Service Design Consideration',
  'Contracting Strategy',
  'Consultant Strategy',
  'Phasing Plans',
  'Project Schedule',
  'Approvals',
  'Additional Details',
  'Export Configuration',
]

const COMMERCIAL = [
  'Key Ratio',
  'Commercial Complex Design Considerations',
  'Design Brief',
  'Project Details + Layout Plans.',
  'Project Level Design',
  'Structures',
  'MEP',
  'Landscape & Amenities',
  'Service Design Consideration',
  'Contracting Strategy',
  'Consultant Strategy',
  'Phasing Plans',
  'Project Schedule',
  'Approvals',
  'Additional Details',
  'Export Configuration',
]

/** Route segment for each design-chapter module (modules 5..20 open /design-chapters/<slug>). */
export const MODULE_ROUTE: Record<string, string> = {
  'Design Brief': 'design-brief',
  'Project Details + Layout Plans.': 'design-chapters/project-details',
  'Project Level Design': 'design-chapters/project-level-design',
  'Unit Level Design': 'design-chapters/unit-level-design',
  Structures: 'design-chapters/structure',
  MEP: 'design-chapters/mep',
  'ID Specifications': 'design-chapters/id-specifications',
  'Common Area': 'design-chapters/common-area',
  'Landscape & Amenities': 'design-chapters/landscape-amenities',
  'Service Design Consideration': 'design-chapters/service-design',
  'Contracting Strategy': 'design-chapters/contracting-strategy',
  'Consultant Strategy': 'design-chapters/consultant-strategy',
  'Phasing Plans': 'design-chapters/phasing-plan',
  'Project Schedule': 'design-chapters/project-schedule',
  Approvals: 'design-chapters/approvals',
  'Additional Details': 'design-chapters/additional-details',
  'Export Configuration': 'design-chapters/export-configuration',
}

export const MODULE_CATALOGUE = [
  ...RESIDENTIAL.map((name, i) => ({ id: i + 1, moduleNumber: i + 1, name, projectType: 'residential' })),
  ...COMMERCIAL.map((name, i) => ({ id: 101 + i, moduleNumber: i + 1, name, projectType: 'commercial' })),
]

/** Module-level permissions shown in Roles & Access Control (same list/categories as original). */
export const MODULE_PERMISSIONS = [
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

export const PERMISSION_CATALOGUE = MODULE_PERMISSIONS.map((m) => `module:${m.name}`)
