export type User = {
  id: string
  name: string
  email: string
  role: 'superadmin' | 'admin' | 'user'
}

export type LoginResult = { token: string; user: User }

const USE_MOCK = import.meta.env.VITE_USE_MOCK_AUTH === 'true'

/**
 * Login against the backend (`POST /api/auth/login`).
 * While the backend isn't built, set VITE_USE_MOCK_AUTH=true (default in
 * .env.development) to accept any well-formed email + password of 6+ chars.
 */
export async function login(email: string, password: string): Promise<LoginResult> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 500))
    if (password.length < 6) throw new Error('Invalid email or password')
    const role: User['role'] = email.startsWith('superadmin') ? 'superadmin' : 'admin'
    return {
      token: 'mock-token',
      user: { id: '1', name: email.split('@')[0], email, role },
    }
  }

  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message ?? 'Invalid email or password')
  }
  return res.json()
}

export async function requestPasswordReset(email: string): Promise<void> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 500))
    return
  }
  const res = await fetch('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  if (!res.ok) throw new Error('Could not send reset link. Please try again.')
}
