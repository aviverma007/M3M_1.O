/* Notifications, roles & access control, users, audit logs */
import { db } from '../db'
import { audit, created, fail, ok, route, type MockCtx, type MockUser } from '../router'

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

/* ---------------- roles ----------------
 * Served from the `accessRoles` table (seed/admin.ts). Rows are either named roles with the 13 page permissions
 * ({ name, status }) or module-access rows named `<company>:<department>` with `module:<Module>` permissions
 * ({ name, access: none|view|edit, status }). Same shape the original frontend reads.
 */
const ROLES = 'accessRoles'
route('GET', '/roles', () => ({ status: 200, body: { status: 200, message: 'Roles fetched', data: db.table(ROLES).all() } }))
route('GET', '/roles/:id', ({ params }) => {
  const r = db.table(ROLES).find(params.id)
  return r ? ok(r) : fail(404, 'Role not found')
})
route('POST', '/roles', ({ body, user }) => {
  if (!body?.roleName) return fail(400, 'Role name is required')
  if (db.table<Row>(ROLES).first((r) => r.roleName === body.roleName)) return fail(409, 'Role already exists')
  const r = db.table(ROLES).insert({ roleName: body.roleName, description: body.description ?? '', permissions: body.permissions ?? [] })
  if (!String(body.roleName).includes(':')) audit(user, 'Role Created', `${user!.name} created role "${body.roleName}".`)
  return created(r, 'Role created successfully')
})
route('PUT', '/roles/:id', ({ params, body, user }) => {
  const patch: Record<string, unknown> = {}
  for (const k of ['roleName', 'description', 'permissions']) if (body?.[k] !== undefined) patch[k] = body[k]
  const r = db.table(ROLES).update(params.id, patch)
  if (!r) return fail(404, 'Role not found')
  audit(user, 'Role Updated', `${user!.name} updated role "${r.roleName}".`)
  return ok(r, 'Role updated successfully')
})
route('DELETE', '/roles/:id', ({ params }) => {
  db.table(ROLES).remove(params.id)
  return ok(null, 'Role deleted successfully')
})

/* ---------------- users (admin) — original uses /auth/users (GET lives in auth.ts) ---------------- */
const publicUser = (u: Row) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, failedAttempts, lockUntil, ...rest } = u
  return rest
}
const USER_FIELDS = ['name', 'email', 'phone', 'company', 'department', 'role'] as const

function createUser({ body, user }: MockCtx) {
  if (!body?.email) return fail(400, 'Email is required')
  if (db.table<Row>('users').first((u) => String(u.email).toLowerCase() === String(body.email).toLowerCase()))
    return fail(409, 'A user with this email already exists')
  const u = db.table<Row>('users').insert({
    name: body.name ?? '',
    email: body.email,
    phone: body.phone ?? '',
    role: body.role || 'general_contributor',
    department: body.department || null,
    company: body.company || null,
    status: 'active',
    password: body.password || 'Password@123',
    failedAttempts: 0,
    lockUntil: null,
  })
  audit(user, 'User Created', `${user!.name} added user "${u.name}".`)
  return created(publicUser(u), 'User created successfully')
}
function updateUser({ params, body, user }: MockCtx) {
  const patch: Record<string, unknown> = {}
  for (const k of USER_FIELDS) if (body?.[k] !== undefined) patch[k] = body[k] === '' && k !== 'name' && k !== 'email' ? null : body[k]
  if (body?.password) patch.password = body.password
  const u = db.table<Row>('users').update(params.id, patch)
  if (!u) return fail(404, 'User not found')
  audit(user, 'User Updated', `${user!.name} updated user "${u.name}".`)
  return ok(publicUser(u), 'User updated successfully')
}
function deleteUser({ params, user }: MockCtx) {
  const u = db.table<Row>('users').find(params.id) as MockUser | undefined
  if (!u) return fail(404, 'User not found')
  db.table('users').remove(params.id)
  audit(user, 'User Deleted', `${user!.name} removed user "${u.name}".`)
  return ok(null, 'User deleted successfully')
}
route('POST', '/auth/users', createUser)
route('PUT', '/auth/users/:id', updateUser)
route('DELETE', '/auth/users/:id', deleteUser)
// legacy aliases
route('GET', '/users', () => ok(db.table<Row>('users').all().map(publicUser)))
route('POST', '/users', createUser)
route('PUT', '/users/:id', updateUser)
route('DELETE', '/users/:id', deleteUser)

/* ---------------- audit logs ----------------
 * GET /audit-logs?page&limit&search&type&fromDate&toDate -> { logs[{..., Creator{name}}], totalLogs, totalPages, currentPage }
 * GET /audit-logs/export?search&type&fromDate&toDate     -> text/csv
 */
function filterLogs(query: Record<string, string>) {
  let rows = db.table<Row>('auditLogs').all().slice()
  if (query.search) {
    const s = query.search.toLowerCase()
    rows = rows.filter((r) => `${r.creatorName} ${r.taskType} ${r.description}`.toLowerCase().includes(s))
  }
  const type = query.type || query.taskType
  if (type && type !== 'all' && type !== 'All Task Types') rows = rows.filter((r) => r.taskType === type)
  const localDay = (v: unknown) => {
    const d = new Date(String(v))
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
  const from = query.fromDate || query.startDate
  const to = query.toDate || query.endDate
  if (from) rows = rows.filter((r) => localDay(r.createdAt) >= from)
  if (to) rows = rows.filter((r) => localDay(r.createdAt) <= to)
  return rows.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
}
const withCreator = (r: Row) => ({ ...r, Creator: { name: r.creatorName } })

route('GET', '/audit-logs', ({ query }) => {
  const rows = filterLogs(query)
  const page = Number(query.page) || 1
  const limit = Number(query.limit) || 10
  return ok({
    logs: rows.slice((page - 1) * limit, page * limit).map(withCreator),
    totalLogs: rows.length,
    totalPages: Math.ceil(rows.length / limit),
    currentPage: page,
  })
})
route('GET', '/audit-logs/export', ({ query }) => {
  const esc = (v: unknown) => {
    const s = String(v ?? '')
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [['S.No', 'User', 'Date & Time', 'Task Type', 'Task Description'].join(',')]
  filterLogs(query).forEach((r, i) => lines.push([i + 1, r.creatorName ?? 'System', r.createdAt, r.taskType, r.description].map(esc).join(',')))
  return { status: 200, body: lines.join('\n') }
})
