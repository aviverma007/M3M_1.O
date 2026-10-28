/* Notifications, roles & access control, users, audit logs — port of frontend/src/mock/handlers/admin.ts
 * (+ GET /auth/users from mock auth.ts, with the ?assigneesFor=<dept> filter used by the design-brief / MEP assignee pickers). */
import { db, type Row } from '../db/table.js'
import { query, type Params } from '../db/pool.js'
import { created, fail, file, ok, route, type Ctx } from '../http/router.js'
import { hashPassword, publicUser } from '../http/auth.js'
import { audit } from '../http/helpers.js'

const users = () => db.table<Row>('users')
const roles = () => db.table<Row>('accessRoles')
const notifications = () => db.table<Row>('notifications')

const toId = (v: unknown) => {
  const n = Number(v)
  return Number.isInteger(n) && n > 0 ? n : null
}

/** Roles & users are managed by super admins only (the UI hides every write control for other roles). */
const isSuperAdmin = (u: Ctx['user']) => !!u && ['super_admin', 'superadmin', 'admin'].includes(String(u.role).toLowerCase())
const forbidden = () => fail(403, 'You do not have permission to perform this action', 'FORBIDDEN')

/* ---------------- notifications ---------------- */
route('GET', '/notifications', async ({ user, query: q }) => {
  const limit = Math.min(Math.max(Number(q.limit) || 10, 1), 500)
  const [rows, count] = await Promise.all([
    notifications().where({ userId: user!.id }, { orderBy: 'createdAt desc, id desc', limit }),
    notifications().count({ userId: user!.id }),
  ])
  return { status: 200, body: { status: 'success', data: { count, rows } } }
})
route('PUT', '/notifications/mark-all-read', async ({ user }) => {
  await query('UPDATE dbo.notifications SET isRead = 1, updatedAt = SYSUTCDATETIME() WHERE userId = @uid AND isRead = 0', { uid: user!.id })
  return ok(null, 'All notifications marked as read')
})
route('PUT', '/notifications/:id/read', async ({ params, user }) => {
  const id = toId(params.id)
  const n = id ? await notifications().first({ id, userId: user!.id }) : undefined
  if (!n) return fail(404, 'Notification not found')
  return ok(await notifications().update(n.id, { isRead: true }), 'Marked as read')
})

/* ---------------- roles ----------------
 * `accessRoles` rows: named roles with page permissions, or module-access rows named `<company>:<department>`
 * whose permissions hold `module:<Module>` access levels.
 */
route('GET', '/roles', async () => ({ status: 200, body: { status: 200, message: 'Roles fetched', data: await roles().all() } }))
route('GET', '/roles/:id', async ({ params }) => {
  const id = toId(params.id)
  const r = id ? await roles().find(id) : undefined
  return r ? ok(r) : fail(404, 'Role not found')
})
route('POST', '/roles', async ({ body, user }) => {
  if (!isSuperAdmin(user)) return forbidden()
  const roleName = String(body?.roleName ?? '').trim()
  if (!roleName) return fail(400, 'Role name is required')
  if (await roles().first({ roleName })) return fail(409, 'Role already exists')
  const r = await roles().insert({
    roleName,
    description: body.description ?? '',
    permissions: Array.isArray(body.permissions) ? body.permissions : [],
  })
  if (!roleName.includes(':')) await audit(user, 'Role Created', `${user!.name} created role "${roleName}".`)
  return created(r, 'Role created successfully')
})
route('PUT', '/roles/:id', async ({ params, body, user }) => {
  if (!isSuperAdmin(user)) return forbidden()
  const id = toId(params.id)
  const existing = id ? await roles().find(id) : undefined
  if (!existing) return fail(404, 'Role not found')
  const patch: Record<string, unknown> = {}
  if (body?.roleName !== undefined) {
    const roleName = String(body.roleName).trim()
    if (!roleName) return fail(400, 'Role name is required')
    const clash = await roles().first({ roleName })
    if (clash && clash.id !== existing.id) return fail(409, 'Role already exists')
    patch.roleName = roleName
  }
  if (body?.description !== undefined) patch.description = body.description
  if (body?.permissions !== undefined) patch.permissions = Array.isArray(body.permissions) ? body.permissions : []
  const r = Object.keys(patch).length ? await roles().update(existing.id, patch) : existing
  if (!r) return fail(404, 'Role not found')
  await audit(user, 'Role Updated', `${user!.name} updated role "${r.roleName}".`)
  return ok(r, 'Role updated successfully')
})
route('DELETE', '/roles/:id', async ({ params, user }) => {
  if (!isSuperAdmin(user)) return forbidden()
  const id = toId(params.id)
  if (id) await roles().remove(id)
  return ok(null, 'Role deleted successfully')
})

/* ---------------- users ---------------- */
const USER_FIELDS = ['name', 'email', 'phone', 'company', 'department', 'role'] as const

/** normalise a department / department path for comparison: 'business-development' == 'business_development' == 'businessdevelopment' */
const normDept = (v: unknown) => String(v ?? '').toLowerCase().replace(/[-_\s]/g, '')
const DEPT_ALIASES: Record<string, string[]> = { businessdevelopment: ['bd'], bd: ['businessdevelopment'] }

/** GET /auth/users[?assigneesFor=<dept path>] — all users, or the members of one department (assignee pickers) */
async function listUsers({ query: q }: Ctx) {
  const all = await users().all({ orderBy: 'id' })
  const dept = normDept(q.assigneesFor)
  const rows = dept ? all.filter((u) => [dept, ...(DEPT_ALIASES[dept] ?? [])].includes(normDept(u.department))) : all
  return ok(rows.map(publicUser))
}

async function createUser({ body, user }: Ctx) {
  if (!isSuperAdmin(user)) return forbidden()
  const email = String(body?.email ?? '').trim()
  if (!email) return fail(400, 'Email is required')
  if (await users().first({ email })) return fail(409, 'A user with this email already exists')
  const u = await users().insert({
    name: body.name ?? '',
    email,
    phone: body.phone ?? '',
    role: body.role || 'general_contributor',
    department: body.department || null,
    company: body.company || null,
    status: 'active',
    passwordHash: await hashPassword(String(body.password || 'Password@123')),
    failedAttempts: 0,
    lockUntil: null,
  })
  await audit(user, 'User Created', `${user!.name} added user "${u.name}".`)
  return created(publicUser(u), 'User created successfully')
}
async function updateUser({ params, body, user }: Ctx) {
  if (!isSuperAdmin(user)) return forbidden()
  const id = toId(params.id)
  const existing = id ? await users().find(id) : undefined
  if (!existing) return fail(404, 'User not found')
  const patch: Record<string, unknown> = {}
  for (const k of USER_FIELDS) if (body?.[k] !== undefined) patch[k] = body[k] === '' && k !== 'name' && k !== 'email' ? null : body[k]
  if (patch.email !== undefined) {
    const email = String(patch.email).trim()
    if (!email) return fail(400, 'Email is required')
    const clash = await users().first({ email })
    if (clash && clash.id !== existing.id) return fail(409, 'A user with this email already exists')
    patch.email = email
  }
  if (patch.role === null) delete patch.role // role is NOT NULL
  if (body?.password) patch.passwordHash = await hashPassword(String(body.password))
  const u = Object.keys(patch).length ? await users().update(existing.id, patch) : existing
  if (!u) return fail(404, 'User not found')
  await audit(user, 'User Updated', `${user!.name} updated user "${u.name}".`)
  return ok(publicUser(u), 'User updated successfully')
}
async function deleteUser({ params, user }: Ctx) {
  if (!isSuperAdmin(user)) return forbidden()
  const id = toId(params.id)
  const u = id ? await users().find(id) : undefined
  if (!u) return fail(404, 'User not found')
  if (u.id === user!.id) return fail(400, 'You cannot delete your own account')
  await users().remove(u.id)
  await audit(user, 'User Deleted', `${user!.name} removed user "${u.name}".`)
  return ok(null, 'User deleted successfully')
}
route('GET', '/auth/users', listUsers)
route('POST', '/auth/users', createUser)
route('PUT', '/auth/users/:id', updateUser)
route('DELETE', '/auth/users/:id', deleteUser)
// legacy aliases
route('GET', '/users', listUsers)
route('POST', '/users', createUser)
route('PUT', '/users/:id', updateUser)
route('DELETE', '/users/:id', deleteUser)

/* ---------------- audit logs ----------------
 * GET /audit-logs?page&limit&search&type&fromDate&toDate -> { logs[{..., Creator{name}}], totalLogs, totalPages, currentPage }
 * GET /audit-logs/export?search&type&fromDate&toDate     -> text/csv
 * fromDate/toDate are calendar days (YYYY-MM-DD) in the app's time zone (APP_TZ_OFFSET, default +05:30 IST);
 * createdAt is stored in UTC, so the day bounds are converted to UTC instants (index-friendly).
 */
const TZ = /^[+-]\d{2}:\d{2}$/.test(process.env.APP_TZ_OFFSET ?? '') ? process.env.APP_TZ_OFFSET! : '+05:30'
const dayStart = (d: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null
  const t = new Date(`${d}T00:00:00${TZ}`)
  return Number.isNaN(t.getTime()) ? null : t
}

function logFilter(q: Record<string, string>) {
  const parts: string[] = []
  const params: Params = {}
  if (q.search) {
    params.search = `%${q.search.replace(/[[\]%_]/g, '[$&]')}%`
    parts.push(`CONCAT(ISNULL(creatorName, N''), N' ', taskType, N' ', description) LIKE @search`)
  }
  const type = q.type || q.taskType
  if (type && type !== 'all' && type !== 'All Task Types') {
    params.type = type
    parts.push('taskType = @type')
  }
  const from = dayStart(q.fromDate || q.startDate || '')
  const to = dayStart(q.toDate || q.endDate || '')
  if (from) {
    params.from = from
    parts.push('createdAt >= @from')
  }
  if (to) {
    params.to = new Date(to.getTime() + 86400000)
    parts.push('createdAt < @to')
  }
  return { where: parts.length ? `WHERE ${parts.join(' AND ')}` : '', params }
}

type LogRow = { id: number; userId: number | null; projectId: number | null; taskType: string; description: string; creatorName: string | null; createdAt: Date | string; updatedAt: Date | string }
const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : v)
const toLog = (r: LogRow) => ({ ...r, createdAt: iso(r.createdAt), updatedAt: iso(r.updatedAt), Creator: { name: r.creatorName } })

const canReadLogs = (u: Ctx['user']) => !!u && String(u.role).toLowerCase() !== 'general_contributor'

route('GET', '/audit-logs', async ({ query: q, user }) => {
  if (!canReadLogs(user)) return forbidden()
  const page = Math.max(1, Math.trunc(Number(q.page)) || 1)
  const limit = Math.min(Math.max(1, Math.trunc(Number(q.limit)) || 10), 1000)
  const { where, params } = logFilter(q)
  const [{ n }] = await query<{ n: number }>(`SELECT COUNT(*) AS n FROM dbo.auditLogs ${where}`, params)
  const rows = await query<LogRow>(
    `SELECT * FROM dbo.auditLogs ${where} ORDER BY createdAt DESC, id DESC OFFSET @off ROWS FETCH NEXT @lim ROWS ONLY`,
    { ...params, off: (page - 1) * limit, lim: limit },
  )
  return ok({ logs: rows.map(toLog), totalLogs: n, totalPages: Math.ceil(n / limit), currentPage: page })
})
route('GET', '/audit-logs/export', async ({ query: q, user }) => {
  if (!canReadLogs(user)) return forbidden()
  const esc = (v: unknown) => {
    const s = String(v ?? '')
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const { where, params } = logFilter(q)
  const rows = await query<LogRow>(`SELECT * FROM dbo.auditLogs ${where} ORDER BY createdAt DESC, id DESC`, params)
  const lines = [['S.No', 'User', 'Date & Time', 'Task Type', 'Task Description'].join(',')]
  rows.forEach((r, i) => lines.push([i + 1, r.creatorName ?? 'System', iso(r.createdAt), r.taskType, r.description].map(esc).join(',')))
  return file(lines.join('\n'), 'text/csv; charset=utf-8', 'audit-logs.csv')
})
