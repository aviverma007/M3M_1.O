/**
 * Seed for Roles & Access Control + Audit Logs (fictional sample data).
 *
 * Roles live in the `accessRoles` table (shape: { roleName, description, permissions[{ name, status, access? }] }),
 * which is what GET/POST/PUT /roles serve. It holds both
 *  - "role" rows (named roles with the 13 page permissions), and
 *  - module-access rows named `<company>:<department>` with `module:<Module>` permissions.
 */
import { registerSeed } from '../db'

const ROLE_PERMISSION_NAMES = [
  'Login Page',
  'Select Project Type',
  'Select Project Portfolio',
  'Add Project details',
  'View & Download Design Brief',
  'In house design View and Download',
  'In house design View and Upload',
  'Manage Timeline for each Department',
  'Edit & Enter Department Inputs',
  'Sent Feedback to department',
  'Upload Final Design Brief',
  'Download final Design Brief',
  'Sent Feedback to Design Team',
]

const MODULES: Array<[string, string]> = [
  ['Key Ratio', 'design'],
  ['Apartment Design', 'design'],
  ['Common Design', 'design'],
  ['Commercial Key Ratio', 'design'],
  ['Pre Concept Design & Checklist', 'design'],
  ['Structures', 'design'],
  ['MEP', 'design'],
  ['Design Brief', 'dpr'],
  ['Project Details + Layout Plans.', 'dpr'],
  ['Project Level Design', 'dpr'],
  ['Unit Level Design', 'dpr'],
  ['Service Design Consideration', 'dpr'],
  ['ID Specifications', 'dpr'],
  ['Common Area', 'dpr'],
  ['Landscape & Amenities', 'dpr'],
  ['Contracting Strategy', 'pmo'],
  ['Consultant Strategy', 'pmo'],
  ['Phasing Plans', 'pmo'],
  ['Project Schedule', 'pmo'],
  ['Approvals', 'pmo'],
  ['Additional Details', 'pmo'],
  ['Export Configuration', 'general'],
]

const daysAgo = (n: number, h = 10, m = 0) => {
  const d = new Date(Date.now() - n * 86400000)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

registerSeed((db) => {
  /* ---------------- named roles (13 page permissions) ---------------- */
  const roles: Array<{ roleName: string; description: string; enabled: number[] }> = [
    { roleName: 'General Contributor', description: 'PMO access — department inputs and feedback', enabled: [0, 2, 3, 4, 5, 7, 8, 9, 11, 12] },
    { roleName: 'HOD Admin', description: 'Head of department — manages department inputs and timelines', enabled: [0, 2, 3, 4, 5, 7, 8, 9, 11, 12] },
    { roleName: 'Design Admin', description: 'Manages design modules and the design team', enabled: [0, 2, 4, 5, 6, 8, 11] },
    { roleName: 'Design User', description: 'Contributes to in-house design modules', enabled: [0, 4, 5, 6, 8, 11] },
    { roleName: 'Super Admin', description: 'Full access to all modules and settings', enabled: ROLE_PERMISSION_NAMES.map((_, i) => i) },
  ]
  roles.forEach((r, i) =>
    db.table('accessRoles').insert({
      roleName: r.roleName,
      description: r.description,
      permissions: ROLE_PERMISSION_NAMES.map((name, j) => ({ name, status: r.enabled.includes(j) })),
      createdAt: daysAgo(200 - i),
    }),
  )

  /* ---------------- module access per company/department ---------------- */
  type Level = 'none' | 'view' | 'edit'
  const moduleRole = (company: string, dept: string, levelFor: (cat: string, name: string) => Level) =>
    db.table('accessRoles').insert({
      roleName: `${company}:${dept}`,
      description: `Module access for ${company} / ${dept}`,
      permissions: MODULES.map(([name, cat]) => {
        const access = levelFor(cat, name)
        return { name: `module:${name}`, access, status: access !== 'none' }
      }),
    })
  for (const company of ['m3m_gurgaon', 'm3m_noida', 'smart_world']) {
    moduleRole(company, 'super_admin', () => 'edit')
    moduleRole(company, 'design', (cat) => (cat === 'design' ? 'edit' : cat === 'dpr' ? 'view' : 'none'))
    moduleRole(company, 'pmo', (cat) => (cat === 'pmo' ? 'edit' : cat === 'general' ? 'none' : 'view'))
  }
  moduleRole('m3m_gurgaon', 'structure', (_c, n) => (n === 'Structures' ? 'edit' : n === 'Key Ratio' || n === 'Design Brief' ? 'view' : 'none'))
  moduleRole('m3m_gurgaon', 'mep', (_c, n) => (n === 'MEP' ? 'edit' : n === 'Key Ratio' || n === 'Design Brief' ? 'view' : 'none'))

  /* ---------------- extra users across departments/companies ---------------- */
  const users: Array<[string, string, string, string, string]> = [
    ['Aarav Khanna', 'aarav.khanna@m3m.in', 'design_admin', 'design', 'm3m_gurgaon'],
    ['Ishita Rao', 'ishita.rao@m3m.in', 'design_contributor', 'design_arch', 'm3m_gurgaon'],
    ['Kabir Sethi', 'kabir.sethi@m3m.in', 'design_contributor', 'design_str', 'm3m_noida'],
    ['Meera Iyer', 'meera.iyer@m3m.in', 'design_contributor', 'design_mep', 'smart_world'],
    ['Rohan Malhotra', 'rohan.malhotra@m3m.in', 'general_admin', 'pmo', 'm3m_gurgaon'],
    ['Tanvi Bhatia', 'tanvi.bhatia@m3m.in', 'general_contributor', 'interior', 'm3m_noida'],
    ['Vikram Chawla', 'vikram.chawla@m3m.in', 'general_contributor', 'cp', 'smart_world'],
    ['Ritu Kapoor', 'ritu.kapoor@m3m.in', 'general_admin', 'pmo_budget', 'smart_world'],
    ['Arjun Nair', 'arjun.nair@m3m.in', 'general_contributor', 'bt', 'm3m_gurgaon'],
    ['Sanya Gill', 'sanya.gill@m3m.in', 'general_contributor', 'pl', 'm3m_noida'],
  ]
  users.forEach(([name, email, role, department, company], i) =>
    db.table('users').insert({
      name,
      email,
      phone: `98${String(11000000 + i * 1337).padStart(8, '0')}`,
      role,
      department,
      company,
      status: 'active',
      password: 'Password@123',
      failedAttempts: 0,
      lockUntil: null,
      createdAt: daysAgo(60 - i * 4),
    }),
  )

  /* ---------------- audit logs (varied task types) ---------------- */
  const logs: Array<[string, string, string]> = [
    ['Rohan Malhotra', 'User Login', 'Rohan Malhotra (rohan.malhotra@m3m.in) logged in successfully.'],
    ['Rohan Malhotra', 'Project Creation', 'Rohan Malhotra created project "Aurora Heights".'],
    ['Super Admin', 'Task Assigned', 'Super Admin assigned Structure inputs for "Aurora Heights" to Structure Team.'],
    ['Structure Team', 'Design Brief Saved', 'Structure Team saved the Structure brief in "Aurora Heights".'],
    ['Structure Team', 'Task Completed', 'Structure Team submitted Structure inputs for "Aurora Heights".'],
    ['MEP Team', 'Design Brief Saved', 'MEP Team saved the MEP brief in "Aurora Heights".'],
    ['Aarav Khanna', 'Design Brief Uploaded', 'Aarav Khanna uploaded the final design brief for "Aurora Heights".'],
    ['Super Admin', 'User Created', 'Super Admin added user "Ishita Rao".'],
    ['Super Admin', 'User Updated', 'Super Admin updated user "Kabir Sethi".'],
    ['Ishita Rao', 'User Login', 'Ishita Rao (ishita.rao@m3m.in) logged in successfully.'],
    ['Ishita Rao', 'Review Comment Added', 'Ishita Rao added a review comment on Apartment Design in "Cedar Greens".'],
    ['Aarav Khanna', 'Review Comment Deleted', 'Aarav Khanna deleted a review comment on Common Design in "Cedar Greens".'],
    ['Rohan Malhotra', 'Project Updated', 'Rohan Malhotra updated project details of "Cedar Greens".'],
    ['Ritu Kapoor', 'PDF Exported', 'Ritu Kapoor exported the design brief PDF of "Cedar Greens".'],
    ['Tanvi Bhatia', 'Password Reset', 'Tanvi Bhatia reset their password.'],
    ['Super Admin', 'Project Deleted', 'Super Admin deleted project "Test Project 01".'],
    ['Super Admin', 'Record Deleted', 'Super Admin deleted a custom field from the Liaison brief in "Skyline One".'],
    ['Super Admin', 'User Deleted', 'Super Admin removed user "Temp Contributor".'],
    ['Meera Iyer', 'User Login', 'Meera Iyer (meera.iyer@m3m.in) logged in successfully.'],
    ['Meera Iyer', 'Design Brief Saved', 'Meera Iyer saved Chapter 2: MEP services in "Palm Residences".'],
    ['Design Admin', 'Task Assigned', 'Design Admin assigned Liaison inputs for "Cedar Greens" to Liaison Team.'],
    ['Liaison Team', 'Task Completed', 'Liaison Team submitted Liaison inputs for "Cedar Greens".'],
    ['Kabir Sethi', 'Review Comment Added', 'Kabir Sethi added a review comment on Key Ratio in "Golf Vista".'],
    ['Rohan Malhotra', 'Project Creation', 'Rohan Malhotra created project "Lakeview Enclave".'],
    ['Vikram Chawla', 'User Login', 'Vikram Chawla (vikram.chawla@m3m.in) logged in successfully.'],
    ['Vikram Chawla', 'PDF Exported', 'Vikram Chawla exported the Key Ratio report of "Urban Square".'],
    ['Super Admin', 'User Created', 'Super Admin added user "Sanya Gill".'],
    ['Ritu Kapoor', 'Project Updated', 'Ritu Kapoor updated budget details of "Market Street".'],
    ['Arjun Nair', 'User Login', 'Arjun Nair (arjun.nair@m3m.in) logged in successfully.'],
    ['Aarav Khanna', 'Design Brief Uploaded', 'Aarav Khanna uploaded the in-house design for "Crest Towers".'],
    ['Super Admin', 'Task Assigned', 'Super Admin assigned MEP inputs for "Crest Towers" to MEP Team.'],
    ['MEP Team', 'Task Completed', 'MEP Team submitted MEP inputs for "Crest Towers".'],
    ['Sanya Gill', 'Password Reset', 'Sanya Gill reset their password.'],
    ['Super Admin', 'User Updated', 'Super Admin updated user "Arjun Nair".'],
    ['Land Team', 'Design Brief Saved', 'Land Team saved the Land brief in "The Atrium Mall".'],
    ['Super Admin', 'Record Deleted', 'Super Admin deleted an uploaded drawing from "The Atrium Mall".'],
    ['Business Development', 'Design Brief Saved', 'Business Development saved the BD brief in "Golf Vista".'],
    ['Tanvi Bhatia', 'Review Comment Added', 'Tanvi Bhatia added a review comment on ID Specifications in "Palm Residences".'],
    ['Rohan Malhotra', 'Project Updated', 'Rohan Malhotra updated module owners of "Riverside Court".'],
    ['Super Admin', 'PDF Exported', 'Super Admin exported the audit summary PDF of "Aurora Heights".'],
  ]
  logs.forEach(([creatorName, taskType, description], i) =>
    db.table('auditLogs').insert({
      userId: 1,
      projectId: null,
      taskType,
      description,
      creatorName,
      createdAt: daysAgo(45 - i, 9 + (i % 9), (i * 7) % 60),
    }),
  )
})
