import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import * as authService from './authService'
import type { User } from './authService'

type AuthState = {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)
const STORAGE_KEY = 'm3m.session'

function readSession(): { token: string; user: User } | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState(readSession)

  const login = useCallback(async (email: string, password: string) => {
    const result = await authService.login(email, password)
    setSession(result)
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(result))
    } catch {
      /* storage unavailable — session lives in memory only */
    }
  }, [])

  const logout = useCallback(() => {
    setSession(null)
    try {
      sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
  }, [])

  const value = useMemo(
    () => ({ user: session?.user ?? null, token: session?.token ?? null, login, logout }),
    [session, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
