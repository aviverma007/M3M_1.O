import type { Request } from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { config } from '../config.js'
import { db, type Row } from '../db/table.js'

export type AuthUser = {
  id: number
  name: string
  email: string
  role: string
  department: string | null
  status: string
  [k: string]: unknown
}

const users = () => db.table<Row>('users')

/** Strip secrets before sending a user to the client. */
export function publicUser(u: Row) {
  const { passwordHash, failedAttempts, lockUntil, ...rest } = u // eslint-disable-line @typescript-eslint/no-unused-vars
  return rest as AuthUser
}

export function signToken(userId: number) {
  return jwt.sign({ id: userId }, config.jwtSecret, { expiresIn: config.jwtExpiresIn } as jwt.SignOptions)
}

export const hashPassword = (pw: string) => bcrypt.hash(pw, 10)
export const checkPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash)

/** Resolve the user from `Authorization: Bearer <jwt>` (null when missing/invalid/inactive). */
export async function authenticate(req: Request): Promise<AuthUser | null> {
  const h = req.headers.authorization
  if (!h?.startsWith('Bearer ')) return null
  try {
    const payload = jwt.verify(h.slice(7), config.jwtSecret) as { id: number }
    const u = await users().find(payload.id)
    if (!u || u.status !== 'active') return null
    return publicUser(u)
  } catch {
    return null
  }
}
