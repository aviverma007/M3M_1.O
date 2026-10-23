import { useEffect, useRef, useState } from 'react'
import { NavLink, Link, useLocation } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { Bell, ChevronDown, Clock, LogOut, MapPin } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth, useRole } from '@/auth/AuthContext'
import { http, type ApiEnvelope } from '@/api/http'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/overlays'
import { PORTFOLIO_OPTIONS, getPortfolio, switchPortfolio } from '@/state/portfolio'
import type { Notification } from '@/types'
import logo from '@/assets/images/m3m-logo.png'
import userIcon from '@/assets/images/user-avatar.png'

/* ---------------- Portfolio switcher ---------------- */
function PortfolioSwitcher() {
  const current = getPortfolio() || 'Select Portfolio'
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="flex items-center gap-2 cursor-pointer group bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
            <MapPin size={18} />
          </div>
          <div className="flex flex-col items-start leading-tight">
            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Portfolio</span>
            <p className="text-sm font-semibold text-gray-700">{current}</p>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel>Switch Portfolio</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {PORTFOLIO_OPTIONS.map((p) => (
          <DropdownMenuItem key={p.id} onClick={() => switchPortfolio(p.id)} className={current === p.id ? 'bg-blue-50 text-blue-700 font-semibold' : ''}>
            {p.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/* ---------------- Notifications bell ---------------- */
function Notifications() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => http.get<ApiEnvelope<{ count: number; rows: Notification[] }>>('/notifications', { params: { limit: 10 } }).then((r) => r.data),
    refetchInterval: 60_000,
  })
  const items = data?.rows ?? []
  const unread = items.filter((n) => !n.isRead).length
  const markRead = useMutation({
    mutationFn: (id: number) => http.put(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
  const markAll = useMutation({
    mutationFn: () => http.put('/notifications/mark-all-read'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors duration-200">
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white outline outline-2 outline-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-3 w-[380px] bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
          <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-white">
            <div className="flex items-center gap-2">
              <h3 className="font-black text-gray-900 text-[15px] uppercase tracking-tight">Notifications</h3>
              {unread > 0 && <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-black rounded-full">{unread} NEW</span>}
            </div>
            {unread > 0 && (
              <button onClick={() => markAll.mutate()} className="text-xs text-blue-600 hover:text-blue-700 font-bold transition-colors uppercase tracking-wider">
                Mark all as read
              </button>
            )}
          </div>
          <div className="max-h-[480px] overflow-y-auto custom-scrollbar">
            {isLoading && items.length === 0 ? (
              <div className="p-12 text-center bg-white">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
                <p className="mt-4 text-gray-400 text-xs font-bold uppercase tracking-widest">Fetching updates...</p>
              </div>
            ) : items.length > 0 ? (
              <div className="divide-y divide-gray-50">
                {items.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => !m.isRead && markRead.mutate(m.id)}
                    className={`p-5 flex gap-4 hover:bg-gray-50/80 transition-all cursor-pointer relative group ${m.isRead ? '' : 'bg-blue-50/30'}`}
                  >
                    {!m.isRead && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />}
                    <div
                      className={`mt-0.5 h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm border ${m.isRead ? 'bg-gray-50 text-gray-400 border-gray-100' : 'bg-blue-600 text-white border-blue-600'}`}
                    >
                      <Bell size={18} strokeWidth={2.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1.5">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${m.isRead ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-700'}`}>
                          {m.metadata?.department || m.type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                          {formatDistanceToNow(new Date(m.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p className={`text-[13px] leading-relaxed mb-2.5 ${m.isRead ? 'text-gray-600 font-medium' : 'text-gray-900 font-bold'}`}>{m.message}</p>
                      {(m.metadata?.assignedBy || m.metadata?.deadline) && (
                        <div className="flex flex-wrap gap-x-4 gap-y-2">
                          {m.metadata?.assignedBy && (
                            <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-bold">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                              <span className="text-gray-400 uppercase tracking-widest text-[9px]">By:</span>
                              {m.metadata.assignedBy}
                            </div>
                          )}
                          {m.metadata?.deadline && (
                            <div className="flex items-center gap-1.5 text-[11px] text-gray-600 font-black bg-orange-50 px-2 py-0.5 rounded border border-orange-100">
                              <Clock size={10} className="text-orange-500" strokeWidth={3} />
                              <span className="text-orange-400 uppercase tracking-widest text-[9px]">Due:</span>
                              {m.metadata.deadline}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-16 text-center bg-white">
                <div className="h-16 w-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-100">
                  <Bell size={24} className="text-gray-200" />
                </div>
                <p className="text-gray-900 font-black text-sm uppercase tracking-tight">All caught up!</p>
                <p className="text-gray-400 text-[11px] mt-1 font-bold uppercase tracking-widest">No new notifications</p>
              </div>
            )}
          </div>
          {items.length > 0 && (
            <div className="p-4 border-t border-gray-50 bg-white text-center">
              <button className="text-[11px] text-gray-400 hover:text-blue-600 font-black uppercase tracking-[0.2em] w-full transition-colors flex items-center justify-center gap-2">
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ---------------- user menu ---------------- */
function roleLabel(role: string, department: string | null) {
  if (department && !['design', 'super_admin', 'general'].includes(department.toLowerCase())) {
    const suffix = role.split('_')[1] || 'Admin'
    return `${department} ${suffix}`.replace(/_/g, ' ')
  }
  return (role || 'Admin').replace(/_/g, ' ')
}

function UserMenu() {
  const { user, logout } = useAuth()
  const display = user?.name || user?.email?.split('@')[0] || 'User'
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="flex items-center gap-2 cursor-pointer group">
          <img src={userIcon} alt="User Icon" className="rounded-full w-8 h-8 object-cover border border-gray-200" />
          <div className="flex flex-col items-start leading-tight">
            <p className="text-sm font-semibold text-gray-700 capitalize">{display}</p>
            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{roleLabel(user?.role ?? '', user?.department ?? null)}</span>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-full">
        <DropdownMenuItem onClick={() => logout()}>
          logout <LogOut />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/* ---------------- header ---------------- */
export default function Header() {
  const location = useLocation()
  const role = useRole()
  const isContributor = role === 'general_contributor'
  const nav = [
    { name: isContributor ? 'My Tasks' : 'Dashboard', path: '/dashboard', end: true },
    ...(isContributor
      ? []
      : [
          { name: 'Project Governance', path: '/project-governance', isActiveMatch: (p: string) => p.includes('/project/') },
          { name: 'Role and Access Control', path: '/dashboard/roles-access-control' },
          { name: 'Audit Logs', path: '/dashboard/audit-logs' },
        ]),
  ] as { name: string; path: string; end?: boolean; isActiveMatch?: (p: string) => boolean }[]

  return (
    <div className="w-full bg-white border-b border-gray-100 flex flex-col sticky top-0 z-50">
      <div className="flex justify-between items-center px-6 py-2 border-b border-gray-50">
        <Link to="/dashboard" className="flex items-center">
          <img src={logo} alt="M3M Logo" className="h-10 w-auto object-contain" />
        </Link>
        <div className="flex items-center gap-6">
          {['super_admin', 'design_admin', 'general_admin', 'design_contributor'].includes(role) && <PortfolioSwitcher />}
          <Notifications />
          <UserMenu />
        </div>
      </div>
      <div className="flex justify-between items-center px-6 py-1">
        <div className="flex items-center gap-8 text-black">
          {nav.map((m) => {
            const isPG = m.name === 'Project Governance'
            return (
              <NavLink
                key={m.name}
                to={m.path}
                end={m.end}
                onClick={(e) => isPG && e.preventDefault()}
                tabIndex={isPG ? -1 : undefined}
                className={({ isActive }) => {
                  const active = m.isActiveMatch ? m.isActiveMatch(location.pathname) : isActive
                  return `relative py-3 text-sm font-medium transition-colors ${isPG ? 'pointer-events-none cursor-default select-none' : ''} ${
                    active
                      ? "text-blue-600 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-blue-600"
                      : 'text-gray-500 hover:text-gray-700'
                  }`
                }}
              >
                {m.name}
              </NavLink>
            )
          })}
        </div>
      </div>
    </div>
  )
}
