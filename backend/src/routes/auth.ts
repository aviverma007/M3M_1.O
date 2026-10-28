/* Auth endpoints — port of frontend/src/mock/handlers/auth.ts */
import crypto from 'node:crypto'
import { db, type Row } from '../db/table.js'
import { fail, ok, route } from '../http/router.js'
import { checkPassword, hashPassword, publicUser, signToken } from '../http/auth.js'
import { audit } from '../http/helpers.js'
import { sendMail } from '../services/mail.js'
import { config } from '../config.js'

const MAX_ATTEMPTS = 5
const LOCK_MINUTES = 15
const users = () => db.table<Row>('users')

route(
  'POST',
  '/auth/login',
  async ({ body }) => {
    const email = String(body?.email ?? '').trim().toLowerCase()
    const u = await users().first({ email })
    if (!u) return fail(401, 'Invalid email or password', 'INVALID_CREDENTIALS')

    if (u.lockUntil && new Date(u.lockUntil).getTime() > Date.now()) {
      return fail(423, 'Account is locked due to too many failed attempts', 'LOCKED', { lockUntil: u.lockUntil })
    }
    if (!(await checkPassword(String(body?.password ?? ''), u.passwordHash))) {
      const attempts = Number(u.failedAttempts ?? 0) + 1
      if (attempts >= MAX_ATTEMPTS) {
        const lockUntil = new Date(Date.now() + LOCK_MINUTES * 60000).toISOString()
        await users().update(u.id, { failedAttempts: 0, lockUntil })
        await audit(publicUser(u), 'Account Locked', `${u.name} (${u.email}) was locked after ${MAX_ATTEMPTS} failed login attempts.`)
        return fail(423, 'Account is locked due to too many failed attempts', 'LOCKED', { lockUntil })
      }
      await users().update(u.id, { failedAttempts: attempts })
      return fail(401, `Invalid email or password. ${MAX_ATTEMPTS - attempts} attempt(s) left.`, 'INVALID_CREDENTIALS')
    }
    if (u.status !== 'active') return fail(403, 'Your account is inactive', 'INACTIVE')

    await users().update(u.id, { failedAttempts: 0, lockUntil: null })
    await audit(publicUser(u), 'User Login', `${u.name} (${u.email}) logged in successfully.`)
    return ok({ accessToken: signToken(u.id), user: publicUser(u), role: u.role }, 'Login successful')
  },
  { auth: false },
)

route('GET', '/auth/me', ({ user }) => ok(user))

route('POST', '/auth/logout', async ({ user }) => {
  if (user) await audit(user, 'User Logout', `${user.name} logged out.`)
  return ok(null, 'Logged out')
})

route(
  'POST',
  '/auth/forgot-password',
  async ({ body }) => {
    const email = String(body?.email ?? '').trim().toLowerCase()
    const u = await users().first({ email })
    if (!u) return fail(404, 'No account found with this email')
    const token = crypto.randomBytes(32).toString('hex')
    await db.table('passwordResets').insert({ userId: u.id, token, expiresAt: new Date(Date.now() + 60 * 60000).toISOString() })
    const link = `${config.appUrl}/reset-password?token=${token}`
    await sendMail(u.email, 'Reset your M3M password', `Use this link within 1 hour to set a new password:\n\n${link}\n\nIf you didn't ask for this, ignore this email.`)
    return ok(null, 'Reset link sent to your email')
  },
  { auth: false },
)

route(
  'POST',
  '/auth/reset-password',
  async ({ body }) => {
    const password = String(body?.password ?? '')
    if (password.length < 8) return fail(400, 'Password must be at least 8 characters long')
    const reset = await db.table<Row>('passwordResets').first({ token: String(body?.token ?? ''), usedAt: null })
    if (!reset || new Date(reset.expiresAt).getTime() < Date.now()) return fail(400, 'Invalid or expired reset link')
    await users().update(reset.userId, { passwordHash: await hashPassword(password), failedAttempts: 0, lockUntil: null })
    await db.table('passwordResets').update(reset.id, { usedAt: new Date().toISOString() })
    return ok(null, 'Password reset successfully')
  },
  { auth: false },
)
