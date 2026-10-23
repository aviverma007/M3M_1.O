import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import BrandLogo from '../components/BrandLogo'
import { usePortfolio } from '../portfolio/PortfolioContext'

/** Placeholder landing page after portfolio selection — to be replaced as screens are specified. */
export default function DashboardPage() {
  const { user, logout } = useAuth()
  const { portfolio, clearPortfolio } = usePortfolio()
  const navigate = useNavigate()

  function handleLogout() {
    clearPortfolio()
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-full bg-page">
      <header className="flex items-center justify-between gap-4 border-b border-gray-200 bg-white px-6 py-3">
        <div className="flex items-center gap-6">
          <BrandLogo className="h-8" />
          <Link
            to="/select-portfolio"
            title="Switch portfolio"
            className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-ink hover:border-accent"
          >
            <span className="h-2 w-2 rounded-full bg-accent" />
            {portfolio?.name}
            <span className="text-gray-400">▾</span>
          </Link>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="hidden text-gray-600 sm:inline">
            {user?.email} <span className="text-gray-400">({user?.role})</span>
          </span>
          <button onClick={handleLogout} className="rounded-md bg-brand-navy px-3 py-1.5 font-semibold text-white">
            Logout
          </button>
        </div>
      </header>
      <main className="p-6 text-gray-600">
        Working in <strong className="text-ink">{portfolio?.name}</strong>. Dashboard screens come next.
      </main>
    </div>
  )
}
