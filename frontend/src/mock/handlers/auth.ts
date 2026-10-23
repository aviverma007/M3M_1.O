import { db } from '../db'
import { audit, fail, makeToken, ok, route, type MockUser } from '../router'

const MAX_ATTEMPTS = 5
const LOCK_MINUTES = 15

const publicUser = (u: MockUser) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, failedAttempts, lockUntil, ...rest } = u
  return rest
}

route(
  'POST',
  '/auth/login',
  ({ body }) => {
    const email = String(body?.email ?? '').trim().toLowerCase()
    const users = db.table<MockUser & { id: number }>('users')
    const u = users.first((x) => x.email.toLowerCase() === email)
    if (!u) return fail(401, 'Invalid email or password', 'INVALID_CREDENTIALS')

    if (u.lockUntil && new Date(u.lockUntil as string).getTime() > Date.now()) {
      return fail(423, 'Account is locked due to too many failed attempts', 'LOCKED', { lockUntil: u.lockUntil })
    }
    if (u.password !== body?.password) {
      const attempts = Number(u.failedAttempts ?? 0) + 1
      if (attempts >= MAX_ATTEMPTS) {
        const lockUntil = new Date(Date.now() + LOCK_MINUTES * 60000).toISOString()
        users.update(u.id, { failedAttempts: 0, lockUntil } as Partial<MockUser & { id: number }>)
        return fail(423, 'Account is locked due to too many failed attempts', 'LOCKED', { lockUntil })
      }
      users.update(u.id, { failedAttempts: attempts } as Partial<MockUser & { id: number }>)
      return fail(401, `Invalid email or password. ${MAX_ATTEMPTS - attempts} attempt(s) left.`, 'INVALID_CREDENTIALS')
    }
    if (u.status !== 'active') return fail(403, 'Your account is inactive', 'INACTIVE')

    users.update(u.id, { failedAttempts: 0, lockUntil: null } as Partial<MockUser & { id: number }>)
    audit(u, 'User Login', `${u.name} (${u.email}) logged in successfully.`)
    return ok({ accessToken: makeToken(u.id), user: publicUser(u), role: u.role }, 'Login successful')
  },
  { auth: false },
)

route('GET', '/auth/me', ({ user }) => ok(publicUser(user!)))

route('GET', '/auth/users', () =>
  ok(db.table<MockUser & { id: number }>('users').all().map(publicUser)),
)

route(
  'POST',
  '/auth/forgot-password',
  ({ body }) => {
    const email = String(body?.email ?? '').toLowerCase()
    const u = db.table<MockUser & { id: number }>('users').first((x) => x.email.toLowerCase() === email)
    if (!u) return fail(404, 'No account found with this email')
    // Mock: the reset token is the user id. The real backend emails a signed link.
    return ok({ resetLink: `/reset-password?token=mock-reset-${u.id}` }, 'Reset link sent to your email')
  },
  { auth: false },
)

route(
  'POST',
  '/auth/reset-password',
  ({ body }) => {
    const id = Number(String(body?.token ?? '').replace('mock-reset-', ''))
    const users = db.table<MockUser & { id: number }>('users')
    if (!id || !users.find(id)) return fail(400, 'Invalid or expired reset link')
    users.update(id, { password: body.password, failedAttempts: 0, lockUntil: null } as Partial<MockUser & { id: number }>)
    return ok(null, 'Password reset successfully')
  },
  { auth: false },
)

route('POST', '/auth/logout', ({ user }) => {
  if (user) audit(user, 'User Logout', `${user.name} logged out.`)
  return ok(null, 'Logged out')
})
