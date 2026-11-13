/* Where to fix things: module name (as used by checks, problems and completeness) -> page, with an optional field to focus. */

const CHAPTER: Record<string, string> = {
  'Project Details': 'design-chapters/project-details',
  'Unit Level Design': 'design-chapters/unit-level-design',
  'Project Level Design': 'design-chapters/project-level-design',
  Structure: 'design-chapters/structure',
  MEP: 'design-chapters/mep',
  'ID Specifications': 'design-chapters/id-specifications',
  'Common Area': 'design-chapters/common-area',
  'Landscape & Amenities': 'design-chapters/landscape-amenities',
  'Service Design': 'design-chapters/service-design',
  'Façade & Envelope': 'design-chapters/facade',
  'Contracting Strategy': 'design-chapters/contracting-strategy',
  'Consultant Strategy': 'design-chapters/consultant-strategy',
  'Phasing Plan': 'design-chapters/phasing-plan',
  'Project Schedule': 'design-chapters/project-schedule',
  Approvals: 'design-chapters/approvals',
  'Additional Details': 'design-chapters/additional-details',
}

/** page of a module for one project; `focus` = label of the field to scroll to and highlight */
export function moduleLink(projectId: number | string, module: string, focus?: string) {
  const base = `/dashboard/project/${projectId}`
  const path = module === 'Project Info' ? `${base}?edit=true` : CHAPTER[module] ? `${base}/${CHAPTER[module]}` : `${base}/modules`
  if (!focus) return path
  return `${path}${path.includes('?') ? '&' : '?'}focus=${encodeURIComponent(focus)}`
}

export const projectModulesLink = (projectId: number | string) => `/dashboard/project/${projectId}/modules`
export const auditLink = (projectId: number | string, name: string) => `/dashboard/audit-logs?tab=changes&projectId=${projectId}&project=${encodeURIComponent(name)}`
