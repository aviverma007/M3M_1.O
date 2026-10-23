/* /select-location (portfolio) and /select-portfolio (existing vs new projects) — same as original. */
import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Building2, CirclePlus, House, LayoutGrid } from 'lucide-react'
import { useAuth } from '@/auth/AuthContext'
import NewProjectDialog, { useCanCreateProject } from '@/components/common/NewProjectDialog'
import { getPortfolio, getSavedFilters, saveFilters, setPortfolio } from '@/state/portfolio'
import logo from '@/assets/images/m3m-logo.png'

const CheckBadge = () => (
  <div className="absolute top-4 right-4 bg-green-500 rounded-lg p-1 text-white shadow-sm ring-2 ring-white">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  </div>
)

function Shell({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-screen bg-[#F0F2F5] flex flex-col font-sans text-gray-800">
      <div className="px-8 py-4 text-sm font-semibold text-gray-500">M3M India</div>
      <div className="flex-1 flex flex-col items-center justify-center -mt-16">
        <div
          className={`bg-white rounded-xl shadow-lg border border-gray-100 p-12 ${wide ? 'max-w-6xl min-h-[600px]' : 'max-w-4xl min-h-[550px]'} w-full mx-6 flex flex-col items-center relative justify-center`}
        >
          <div className="absolute top-8 left-8">
            <img src={logo} alt="M3M Logo" className="h-10 w-auto" />
          </div>
          <div className="text-center mb-16 max-w-2xl">
            <div className="w-16 h-1.5 bg-green-500 mx-auto mb-10 rounded-full" />
            <h1 className="text-4xl font-extrabold text-blue-950 mb-4 antialiased">Select Project Portfolio</h1>
            <p className="text-gray-500 text-lg font-medium">Choose the portfolio you want to work with. You can switch this later from the header.</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}

function OptionCard({ selected, onClick, icon, title, subtitle }: { selected: boolean; onClick: () => void; icon: ReactNode; title: string; subtitle?: string }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative bg-white p-10 rounded-xl border-2 transition-all cursor-pointer flex flex-col items-center text-center group ${selected ? 'border-green-500 bg-green-50/20' : 'border-gray-100 hover:border-gray-300'}`}
    >
      {selected && <CheckBadge />}
      <div className={`w-16 h-16 rounded-xl flex items-center justify-center mb-6 transition-all shadow-inner ${selected ? 'bg-white' : 'bg-blue-50 group-hover:bg-blue-100'}`}>{icon}</div>
      <h3 className={`text-xl font-bold text-blue-950 ${subtitle ? 'mb-2 truncate w-full px-2' : ''}`}>{title}</h3>
      {subtitle && <p className="text-gray-400 text-sm font-medium">{subtitle}</p>}
    </motion.div>
  )
}

const nextBtn = (enabled: boolean) =>
  `px-32 py-5 rounded-xl font-bold text-xl transition-all duration-300 ${enabled ? 'bg-green-600 text-white hover:bg-green-700 shadow-md transform hover:-translate-y-0.5' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`

const PORTFOLIOS = [
  { id: 'M3M Noida', title: 'M3M Noida', subtitle: 'Premium Developments', icon: <Building2 className="text-blue-600" size={24} /> },
  { id: 'M3M Gurgaon', title: 'M3M Gurgaon', subtitle: 'Luxury Projects', icon: <LayoutGrid className="text-blue-600" size={24} /> },
  { id: 'Smartworld', title: 'Smartworld', subtitle: 'Smart Living Solutions', icon: <House className="text-blue-600" size={24} /> },
]

/** Step 1: choose portfolio. */
export function SelectLocationPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [selected, setSelected] = useState<string | null>(null)

  const next = () => {
    if (!selected) return
    setPortfolio(selected)
    saveFilters({ ...getSavedFilters(), locationCategory: selected, page: 1 })
    navigate(user?.role === 'general_admin' ? `/dashboard?lc=${encodeURIComponent(selected)}` : '/select-portfolio')
  }

  return (
    <Shell wide>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full mb-16">
        {PORTFOLIOS.map((p) => (
          <OptionCard key={p.id} selected={selected === p.id} onClick={() => setSelected(p.id)} icon={p.icon} title={p.title} subtitle={p.subtitle} />
        ))}
      </div>
      <button onClick={next} disabled={!selected} className={nextBtn(!!selected)}>
        NEXT
      </button>
    </Shell>
  )
}

/** Step 2: existing projects or create a new one (new only for users who can create projects). */
export function SelectPortfolioPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const canCreate = useCanCreateProject()
  const [choice, setChoice] = useState<'existing' | 'new' | null>(null)
  const dashboardUrl = () => {
    const p = getPortfolio()
    return `/dashboard${p ? `?lc=${encodeURIComponent(p)}` : ''}`
  }

  useEffect(() => {
    if (user?.role === 'general_admin') navigate(dashboardUrl(), { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role])

  return (
    <Shell>
      <div className={`grid grid-cols-1 ${canCreate ? 'md:grid-cols-2' : 'max-w-md'} gap-8 w-full mb-16`}>
        <OptionCard selected={choice === 'existing'} onClick={() => setChoice('existing')} icon={<Building2 className="text-blue-600" size={24} />} title="Existing Projects" />
        {canCreate && <OptionCard selected={choice === 'new'} onClick={() => setChoice('new')} icon={<CirclePlus className="text-blue-600" size={24} />} title="New Projects" />}
      </div>
      <div className="flex justify-center w-full">
        {choice === 'new' ? (
          <NewProjectDialog>
            <button className={nextBtn(true)}>NEXT</button>
          </NewProjectDialog>
        ) : (
          <button onClick={() => choice === 'existing' && navigate(dashboardUrl())} disabled={!choice} className={`${nextBtn(!!choice)} transform`}>
            NEXT
          </button>
        )}
      </div>
    </Shell>
  )
}
