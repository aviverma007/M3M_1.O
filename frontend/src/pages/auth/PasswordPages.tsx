/* Forgot password, reset password and account-locked pages (same markup/CSS as original). */
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Eye, EyeOff, LoaderCircle } from 'lucide-react'
import { http, type ApiEnvelope } from '@/api/http'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import logo from '@/assets/images/m3m-logo.png'
import background from '@/assets/images/background.png'
import buildingLocked from '@/assets/images/building-locked.png'
import '@/styles/auth-pages.css'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await http.post<ApiEnvelope<{ resetLink?: string }>>('/auth/forgot-password', { email })
      toast.success('Reset link sent to your email')
      if (import.meta.env.VITE_API_MODE === 'mock' && res.data?.resetLink) console.info('[mock] reset link:', res.data.resetLink)
      setSent(true)
    } catch (err) {
      const msg = (err as Error).message || 'Something went wrong'
      toast.error(msg)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="forgot-password-page">
      <header className="auth-header">
        <div className="header-logo">
          <img src={logo} alt="M3M Logo" />
        </div>
      </header>
      <div className="split-layout">
        <div className="side-image" style={{ backgroundImage: `url(${buildingLocked})` }}>
          <div className="image-overlay" />
        </div>
        <div className="side-content">
          {sent ? (
            <div className="auth-card success-card">
              <div className="card-logo">
                <img src={logo} alt="M3M Logo" />
              </div>
              <div className="card-header">
                <h2>Check Your Email</h2>
                <p>
                  We've sent a password reset link to <br />
                  <strong>{email}</strong>
                </p>
              </div>
              <div className="card-footer">
                <button onClick={() => navigate('/login')} className="back-link">
                  <ArrowLeft size={18} />
                  <span>Back to Login</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="auth-card">
              <div className="card-logo">
                <img src={logo} alt="M3M Logo" />
              </div>
              <div className="card-header">
                <h2>Forgot Password?</h2>
                <p>Enter the email associated with your m3m account and we'll send you instructions to reset your password.</p>
              </div>
              <form onSubmit={onSubmit} className="auth-form">
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input type="email" id="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                {error && <div className="error-message">{error}</div>}
                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
                <div className="card-footer">
                  <Link to="/login" className="back-link">
                    <ArrowLeft size={18} />
                    <span>Back to Login</span>
                  </Link>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [show1, setShow1] = useState(false)
  const [show2, setShow2] = useState(false)
  const [loading, setLoading] = useState(false)
  const [params] = useSearchParams()
  const token = params.get('token')
  const navigate = useNavigate()

  useEffect(() => {
    if (!token) setError('Invalid reset link. Token is missing.')
  }, [token])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirm) return setError('Passwords do not match')
    if (password.length < 8) return setError('Password must be at least 8 characters long')
    setLoading(true)
    try {
      await http.post('/auth/reset-password', { token, password })
      toast.success('Password reset successfully')
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      toast.error((err as Error).message || 'Something went wrong')
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'h-12 px-4 rounded-xl border-gray-200 focus:border-[#0f5ebb] focus:ring-[#0f5ebb]/10 transition-all font-medium'
  const eyeCls = 'absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors p-1'

  return (
    <div className="flex h-screen w-full overflow-hidden bg-white font-sans">
      <div className="hidden lg:block lg:w-[55%] relative overflow-hidden">
        <img src={background} alt="M3M Properties" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/5" />
        <div className="absolute top-0 left-0 right-0 h-16 bg-white/90 backdrop-blur-sm flex items-center px-10 border-b border-gray-100">
          <img src={logo} alt="M3M Logo" className="h-10 w-auto" />
        </div>
      </div>
      <div className="w-full lg:w-[45%] flex flex-col items-center justify-center p-6 sm:p-12 md:p-20 relative bg-[#f8fafc]">
        <div className="lg:hidden absolute top-8 left-8">
          <img src={logo} alt="M3M Logo" className="h-8 w-auto" />
        </div>
        <Card className="w-full max-w-[480px] shadow-2xl border-0 bg-white p-4 sm:p-8 rounded-2xl">
          <CardHeader className="text-center space-y-4 pt-4 pb-8">
            <div className="flex justify-center mb-2">
              <img src={logo} alt="M3M Logo" className="h-14 w-auto" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-3xl font-black text-gray-900 tracking-tight leading-tight">Set New Password</CardTitle>
              <CardDescription className="text-gray-400 font-medium text-sm">Almost there! Set your new password below</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 tracking-tight" htmlFor="password">
                  Enter New Password
                </label>
                <div className="relative">
                  <Input id="password" type={show1 ? 'text' : 'password'} placeholder="Min 8 characters" className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} required />
                  <button type="button" onClick={() => setShow1(!show1)} className={eyeCls}>
                    {show1 ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 tracking-tight" htmlFor="confirmPassword">
                  Confirm Password
                </label>
                <div className="relative">
                  <Input id="confirmPassword" type={show2 ? 'text' : 'password'} placeholder="Repeat your password" className={inputCls} value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
                  <button type="button" onClick={() => setShow2(!show2)} className={eyeCls}>
                    {show2 ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              {error && <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-xs font-bold animate-in fade-in slide-in-from-top-1">{error}</div>}
              <Button
                type="submit"
                className="w-full h-12 bg-[#00509d] hover:bg-[#003f7a] text-white font-bold rounded-xl text-base shadow-lg shadow-blue-900/10 transition-all transform active:scale-[0.98] disabled:opacity-50"
                disabled={loading || !token}
              >
                {loading && <LoaderCircle className="w-4 h-4 animate-spin mr-2" />}
                {loading ? 'Processing...' : 'Submit'}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center pt-4 pb-0">
            <button type="button" onClick={() => navigate('/login')} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors group">
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              Back to Login
            </button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

export function AccountLockedPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const initial = () => {
    const until = (location.state as { lockUntil?: string } | null)?.lockUntil
    if (until) {
      const s = Math.ceil((new Date(until).getTime() - Date.now()) / 1000)
      return s > 0 ? s : 0
    }
    return 180
  }
  const [seconds, setSeconds] = useState(initial)

  useEffect(() => {
    if (seconds <= 0) {
      navigate('/login')
      return
    }
    const t = setInterval(() => setSeconds((s) => s - 1), 1000)
    return () => clearInterval(t)
  }, [seconds, navigate])

  const mmss = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`

  return (
    <div className="account-locked-wrapper">
      <div className="locked-left-panel">
        <img src={buildingLocked} alt="M3M Building" />
      </div>
      <div className="locked-right-panel">
        <div className="locked-card">
          <img src={logo} alt="M3M Logo" className="locked-logo" />
          <h2>Your account has been temporarily locked</h2>
          <p>Too many failed login attempts. For security reasons, your account has been temporarily locked.</p>
          <div className="timer-box">
            <span className="timer-label">Time remaining</span>
            <div className="timer-countdown">{mmss}</div>
            <span className="timer-subtext">Please wait before trying again</span>
          </div>
          <button className="wait-btn" disabled>
            Please wait......
          </button>
          <p className="support-text">
            Need Help? Contact <a href="mailto:support@m3m.com">support@m3m.com</a>
          </p>
        </div>
      </div>
    </div>
  )
}
