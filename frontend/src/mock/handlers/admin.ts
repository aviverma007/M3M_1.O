/* Notifications, roles & access control, users, audit logs */
import { db } from '../db'
import { audit, created, fail, ok, route, type MockUser } from '../router'

type Row = { id: number; [k: string]: any } // eslint-disable-line @typescript-eslint/no-explicit-any

/* ---------------- notifications ---------------- */
route('GET', '/notifications', ({ user, query }) => {
  const rows = db
    .table<Row>('notifications')
    .where((n) => n.userId === user!.id)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
  return { status: 200, body: { status: 'success', data: { count: rows.length, rows: rows.slice(0, Number(query.limit) || 10) } } }
})
route('PUT', '/notifications/mark-all-read', ({ user }) => {
  db.table<Row>('notifications').where((n) => n.userId === user!.id).forEach((n) => db.table<Row>('notifications').update(n.id, { isRead: true }))
  return ok(null, 'All notifications marked as read')
})
route('PUT', '/notifications/:id/read', ({ params }) => ok(db.table<Row>('notifications').update(params.id, { isRead: true }), 'Marked as read'))

/** helper for other handlers: notify a user */
export function notify(userId: number, type: string, message: string, metadata: Record<string, unknown> = {}) {
  db.table('notifications').insert({ userId, type, message, isRead: false, metadata })
}

/* ---------------- roles ---------------- */
route('GET', '/roles', () => ({ status: 200, body: { status: 200, message: 'Roles fetched', data: db.table('roles').all() } }))
route('POST', '/roles', ({ body, user }) => {
  if (!body?.roleName) return fail(400, 'Role name is required')
  const r = db.table('roles').insert({ roleName: body.roleName, description: body.description ?? '', permissions: body.permissions ?? [] })
  audit(user, 'Role Created', `${user!.name} created role "${body.roleName}".`)
  return created(r, 'Role created successfully')
})
route('PUT', '/roles/:id', ({ params, body, user }) => {
  const r = db.table('roles').update(params.id, body)
  if (!r) return fail(404, 'Role not found')
  audit(user, 'Role Updated', `${user!.name} updated role "${r.roleName}".`)
  return ok(r, 'Role updated successfully')
})
route('DELETE', '/roles/:id', ({ params }) => {
  db.table('roles').remove(params.id)
  return ok(null, 'Role deleted successfully')
})

/* ---------------- users (admin) ---------------- */
const publicUser = (u: Row) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, failedAttempts, lockUntil, ...rest } = u
  return rest
}
route('GET', '/users', () => ok(db.table<Row>('users').all().map(publicUser)))
route('POST', '/users', ({ body, user }) => {
  if (!body?.email) return fail(400, 'Email is required')
  if (db.table<Row>('users').first((u) => u.email.toLowerCase() === String(body.email).toLowerCase())) return fail(409, 'A user with this email already exists')
  const u = db.table<Row>('users').insert({
    name: body.name,
    email: body.email,
    phone: body.phone ?? '',
    role: body.role ?? 'general_contributor',
    department: body.department ?? null,
    company: null,
    status: 'active',
    password: body.password || 'Password@123',
    failedAttempts: 0,
    lockUntil: null,
  })
  audit(user, 'User Created', `${user!.name} added user "${u.name}".`)
  return created(publicUser(u), 'User added successfully')
})
route('PUT', '/users/:id', ({ params, body, user }) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, ...patch } = body ?? {}
  const u = db.table<Row>('users').update(params.id, patch)
  if (!u) return fail(404, 'User not found')
  audit(user, 'User Updated', `${user!.name} updated user "${u.name}".`)
  return ok(publicUser(u), 'User updated successfully')
})
route('DELETE', '/users/:id', ({ params, user }) => {
  const u = db.table<Row>('users').find(params.id) as MockUser | undefined
  db.table('users').remove(params.id)
  audit(user, 'User Removed', `${user!.name} removed user "${u?.name ?? params.id}".`)
  return ok(null, 'User removed successfully')
})

/* ---------------- audit logs ---------------- */
route('GET', '/audit-logs', ({ query }) => {
  let rows = db.table<Row>('auditLogs').all().slice()
  if (query.search) {
    const s = query.search.toLowerCase()
    rows = rows.filter((r) => `${r.creatorName} ${r.taskType} ${r.description}`.toLowerCase().includes(s))
  }
  if (query.taskType && query.taskType !== 'all') rows = rows.filter((r) => r.taskType === query.taskType)
  if (query.startDate || query.fromDate) rows = rows.filter((r) => String(r.createdAt).slice(0, 10) >= (query.startDate || query.fromDate))
  if (query.endDate || query.toDate) rows = rows.filter((r) => String(r.createdAt).slice(0, 10) <= (query.endDate || query.toDate))
  rows.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
  const page = Number(query.page) || 1
  const limit = Number(query.limit) || 10
  return ok({
    logs: rows.slice((page - 1) * limit, page * limit).map((r) => ({ ...r, Creator: { name: r.creatorName } })),
    totalLogs: rows.length,
    totalPages: Math.max(1, Math.ceil(rows.length / limit)),
    currentPage: page,
  })
})
