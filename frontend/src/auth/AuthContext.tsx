import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getToken, http, setToken, type ApiEnvelope } from '@/api/http'
import type { User } from '@/types'
import PageLoader from '@/components/common/PageLoader'

type LoginResult = ApiEnvelope<{ accessToken: string; user: User; role: User['role'] }>

type AuthState = {
  user: User | null
  isLoggedIn: boolean
  login: (email: string, password: string) => Promise<LoginResult>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)
const PUBLIC_PATHS = ['/login', '/forgot-password', '/reset-password', '/account-locked']

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [initialized, setInitialized] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const clearSession = useCallback(() => {
    setToken(null)
    setUser(null)
    try {
      sessionStorage.clear()
    } catch {
      /* ignore */
    }
  }, [])

  const logout = useCallback(() => {
    http.post('/auth/logout').catch(() => {})
    clearSession()
    navigate('/login')
  }, [clearSession, navigate])

  const refreshUser = useCallback(async () => {
    const res = await http.get<ApiEnvelope<User>>('/auth/me')
    setUser(res.data)
  }, [])

  // restore session on first load (same flow as original: token -> /auth/me)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const isPublic = PUBLIC_PATHS.some((p) => location.pathname.startsWith(p))
      if (!getToken()) {
        if (!isPublic) navigate('/login')
        setInitialized(true)
        return
      }
      try {
        await refreshUser()
      } catch {
        if (!cancelled) {
          clearSession()
          if (!isPublic) navigate('/login')
        }
      } finally {
        if (!cancelled) setInitialized(true)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // a 401 anywhere logs the user out
  useEffect(() => {
    const onExpired = () => {
      clearSession()
      navigate('/login')
    }
    window.addEventListener('auth:expired', onExpired)
    return () => window.removeEventListener('auth:expired', onExpired)
  }, [clearSession, navigate])

  const login = useCallback(async (email: string, password: string) => {
    const res = await http.post<LoginResult>('/auth/login', { email, password })
    setToken(res.data.accessToken)
    setUser(res.data.user)
    return res
  }, [])

  const value = useMemo(() => ({ user, isLoggedIn: !!user, login, logout, refreshUser }), [user, login, logout, refreshUser])

  if (!initialized) return <PageLoader />
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

/** Lower-cased role of the current user ('' when logged out). */
// eslint-disable-next-line react-refresh/only-export-components
export function useRole() {
  const { user } = useAuth()
  return (user?.role ?? '').toLowerCase() as User['role'] | ''
}
