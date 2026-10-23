import { useAuth } from '../auth/AuthContext'
import BrandLogo from '../components/BrandLogo'

/** Placeholder landing page after login — to be replaced as screens are specified. */
export default function DashboardPage() {
  const { user, logout } = useAuth()
  return (
    <div className="min-h-full bg-page">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <BrandLogo className="h-8" />
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-600">
            {user?.email} <span className="text-gray-400">({user?.role})</span>
          </span>
          <button onClick={logout} className="rounded-md bg-brand-navy px-3 py-1.5 font-semibold text-white">
            Logout
          </button>
        </div>
      </header>
      <main className="p-6 text-gray-600">Logged in. Dashboard screens come next.</main>
    </div>
  )
}
