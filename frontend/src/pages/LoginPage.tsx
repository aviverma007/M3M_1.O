import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import { useAuth } from '../auth/AuthContext'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {!open && <path d="M4 4l16 16" strokeLinecap="round" />}
    </svg>
  )
}

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  // After login: return to the page that bounced the user here, otherwise pick a portfolio.
  // (RequirePortfolio sends them to the picker anyway if none is chosen yet.)
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/select-portfolio'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!EMAIL_RE.test(email.trim())) return setError('Please enter a valid email address')
    if (!password) return setError('Please enter your password')

    setSubmitting(true)
    try {
      await login(email.trim(), password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  const fieldClass =
    'w-full rounded-lg border border-gray-200 bg-field px-4 py-3 text-[16px] text-gray-900 outline-none transition focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/20'

  return (
    <AuthLayout title="Login" subtitle="Please enter your email and password to continue">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-2 block text-[16px] font-semibold text-gray-900">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={fieldClass}
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-2 block text-[16px] font-semibold text-gray-900">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${fieldClass} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute inset-y-0 right-3 flex items-center px-1 text-gray-500 hover:text-gray-700"
            >
              <EyeIcon open={!showPassword} />
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-[14px] font-semibold text-link hover:underline">
            Forgot Password?
          </Link>
        </div>

        {error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-4 w-full rounded-lg bg-brand-navy py-3 text-[16px] font-semibold text-white transition hover:bg-brand-navy-hover disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? 'Logging in…' : 'Login'}
        </button>
      </form>
    </AuthLayout>
  )
}
