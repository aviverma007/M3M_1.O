import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import { requestPasswordReset } from '../auth/authService'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return setError('Please enter a valid email address')
    }
    setStatus('sending')
    try {
      await requestPasswordReset(email.trim())
      setStatus('sent')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setStatus('idle')
    }
  }

  return (
    <AuthLayout title="Forgot Password" subtitle="Enter your email to receive a reset link">
      {status === 'sent' ? (
        <div className="space-y-6 text-center">
          <p className="rounded-md bg-green-50 px-3 py-3 text-sm text-green-800">
            If an account exists for <strong>{email}</strong>, a reset link has been sent.
          </p>
          <Link to="/login" className="font-semibold text-link hover:underline">
            Back to Login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-2 block text-[16px] font-semibold text-gray-900">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-field px-4 py-3 text-[16px] outline-none focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/20"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={status === 'sending'}
            className="mt-4 w-full rounded-lg bg-brand-navy py-3 font-semibold text-white hover:bg-brand-navy-hover disabled:opacity-70"
          >
            {status === 'sending' ? 'Sending…' : 'Send Reset Link'}
          </button>

          <p className="text-center">
            <Link to="/login" className="text-[14px] font-semibold text-link hover:underline">
              Back to Login
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  )
}
