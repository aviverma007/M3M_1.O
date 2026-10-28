/** Seed for the "projects" group: department tasks assigned to general contributors (fictional). */
import { registerSeed } from '../db'

const daysFromNow = (n: number) => new Date(Date.now() + n * 86400000).toISOString()

registerSeed((db) => {
  const projects = db.table('projects').all()
  const byName = (n: string) => projects.find((p) => p.name === n)
  const tasks: [string, string, string, string, number][] = [
    // [project, department, deptKey(user department), status, deadline offset days]
    ['Aurora Heights', 'Structure', 'structure', 'Submitted', 10],
    ['Aurora Heights', 'MEP', 'mep', 'Submitted', 10],
    ['Cedar Greens', 'Liaison', 'liaison', 'Assigned', 7],
    ['Cedar Greens', 'Structure', 'structure', 'In Progress', -2],
    ['Palm Residences', 'Business Development', 'bd', 'Assigned', 14],
    ['Palm Residences', 'Land', 'land', 'Pending', 5],
    ['Golf Vista', 'MEP', 'mep', 'Assigned', -1],
  ]
  tasks.forEach(([name, department, departmentKey, status, offset]) => {
    const p = byName(name)
    if (!p) return
    db.table('contributorTasks').insert({
      projectId: p.id,
      department,
      departmentKey,
      status,
      assignedBy: 'Design Admin',
      deadline: daysFromNow(offset),
      date: daysFromNow(-20),
    })
  })
})
