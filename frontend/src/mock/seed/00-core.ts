/**
 * Core seed data: users, projects, module catalogue, notifications, audit logs (roles: seed/admin.ts).
 * All names/projects here are FICTIONAL sample data.
 */
import { registerSeed } from '../db'
import { MODULE_CATALOGUE } from '../catalogue'

export const DEMO_PASSWORD = 'Password@123'

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString()

registerSeed((db) => {
  /* ---------------- users ---------------- */
  const users = [
    { name: 'Super Admin', email: 'superadmin@m3m.com', role: 'super_admin', department: null },
    { name: 'Design Admin', email: 'design.admin@m3m.com', role: 'design_admin', department: 'design' },
    { name: 'General Admin', email: 'general.admin@m3m.com', role: 'general_admin', department: null },
    { name: 'Design Contributor', email: 'design.contributor@m3m.com', role: 'design_contributor', department: 'design' },
    { name: 'Liaison Team', email: 'liaison@m3m.com', role: 'general_contributor', department: 'liaison' },
    { name: 'Business Development', email: 'bd@m3m.com', role: 'general_contributor', department: 'business_development' },
    { name: 'Land Team', email: 'land@m3m.com', role: 'general_contributor', department: 'land' },
    { name: 'Structure Team', email: 'structure@m3m.com', role: 'general_contributor', department: 'structure' },
    { name: 'MEP Team', email: 'mep@m3m.com', role: 'general_contributor', department: 'mep' },
    { name: 'Costing & Budgeting', email: 'costing@m3m.com', role: 'general_contributor', department: 'costing' },
  ]
  users.forEach((u) =>
    db.table('users').insert({
      ...u,
      phone: '9800000000',
      company: null,
      status: 'active',
      password: DEMO_PASSWORD,
      failedAttempts: 0,
      lockUntil: null,
    }),
  )

  /* ---------------- module catalogue ---------------- */
  MODULE_CATALOGUE.forEach((m) => db.table('modules').insert({ ...m, description: null, status: 'active' }))

  /* roles: seeded by seed/admin.ts (table accessRoles) */

  /* ---------------- projects ---------------- */
  const sample = [
    ['Aurora Heights', 'residential', 'premium', 'Ongoing (RERA Obtained)', 'Sector 65, Gurugram', 'Smartworld'],
    ['Cedar Greens', 'residential', 'mid-end', 'Ongoing (RERA Obtained)', 'Sector 113, Gurugram', 'Smartworld'],
    ['Skyline One', 'residential', 'affluent', 'Future (License Applied)', 'Sector 69, Gurugram', 'Smartworld'],
    ['Riverside Court', 'residential', 'mid-end', 'Delivered', 'Sector 89, Gurugram', 'Smartworld'],
    ['The Atrium Mall', 'commercial', 'enclosed_mall', 'Ongoing (RERA Obtained)', 'Sector 98, Noida', 'M3M Noida'],
    ['Palm Residences', 'residential', 'premium', 'Ongoing (RERA Obtained)', 'Sector 94, Noida', 'M3M Noida'],
    ['Market Street', 'commercial', 'hi_street', 'Future (License Applied)', 'Sector 72, Noida', 'M3M Noida'],
    ['Golf Vista', 'residential', 'affluent', 'Ongoing (RERA Obtained)', 'Golf Course Ext. Road, Gurugram', 'M3M Gurgaon'],
    ['Crest Towers', 'residential', 'premium', 'Future (License Applied)', 'Sector 79, Gurugram', 'M3M Gurgaon'],
    ['Urban Square', 'commercial', 'hi_street', 'Ongoing (RERA Obtained)', 'Sector 67, Gurugram', 'M3M Gurgaon'],
    ['Lakeview Enclave', 'residential', 'mid-end', 'Ongoing (RERA Obtained)', 'IMT Manesar, Sector M9', 'Smartworld'],
  ] as const
  sample.forEach(([name, projectType, category, cls, location, lc], i) => {
    const p = db.table('projects').insert({
      name,
      description: null,
      projectType,
      category,
      status: 'pending',
      projectOwner: 'Studio Arc',
      location,
      userId: 1,
      userName: 'Rahul Mehta',
      userEmail: 'rahul.mehta@example.com',
      userNumber: '9810000000',
      date: daysAgo(400 - i * 30).slice(0, 10),
      userDesignation: 'Project Manager',
      projectClassification: cls,
      designOwner: 'Design Studio',
      structureOwner: 'Structure Consultants',
      mepOwner: 'MEP Consultants',
      interiorDesignOwner: 'Studio Interiors',
      far_permissible: '2.5',
      site_area: '40468.6',
      site_area_acres: '10',
      locationCategory: lc,
      createdAt: daysAgo(400 - i * 30),
    })
    seedProjectModules(db, p.id as number, projectType)
  })

  /* ---------------- notifications ---------------- */
  db.table('notifications').insert({
    userId: 1,
    type: 'task_assigned',
    message: 'Structure inputs were submitted for Aurora Heights.',
    isRead: false,
    metadata: { department: 'Structure', assignedBy: 'Design Admin', deadline: null },
    createdAt: daysAgo(1),
  })
  db.table('notifications').insert({
    userId: 1,
    type: 'design_brief',
    message: 'MEP inputs were submitted for Aurora Heights.',
    isRead: true,
    metadata: { department: 'MEP' },
    createdAt: daysAgo(3),
  })

  /* ---------------- audit logs ---------------- */
  const logs = [
    ['User Login', 'Super Admin (superadmin@m3m.com) logged in successfully.'],
    ['Project Created', 'Super Admin created project "Aurora Heights".'],
    ['Design Brief Saved', 'Structure Team saved the Structure brief in "Aurora Heights".'],
    ['Design Brief Saved', 'MEP Team saved the MEP brief in "Aurora Heights".'],
    ['Task Assigned', 'Design Admin assigned Liaison inputs for "Cedar Greens".'],
    ['Chapter Saved', 'Design Contributor saved Chapter 1: Flooring in "Palm Residences".'],
  ]
  logs.forEach(([taskType, description], i) =>
    db.table('auditLogs').insert({ userId: 1, projectId: null, taskType, description, creatorName: 'Super Admin', createdAt: daysAgo(logs.length - i) }),
  )
})

/** Create the per-project module rows (status/progress) when a project is created. */
export function seedProjectModules(db: import('../db').Db, projectId: number, projectType: string) {
  db.table('modules')
    .where((m) => m.projectType === projectType)
    .forEach((m) =>
      db.table('projectModules').insert({
        projectId,
        moduleId: m.id,
        allParams: 5,
        deviations: 0,
        benchmarkParams: 5,
        flags: 0,
        complianceScore: 0,
        moduleStatus: 0,
        completedChapters: 0,
        status: 'pending',
        data: null,
      }),
    )
}
