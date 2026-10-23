import { useState } from 'react'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { AdminUser } from '@/types/admin'
import { COMPANY_LABELS } from './constants'

const PAGE_SIZE = 5

type Props = {
  users: AdminUser[]
  currentUserId?: number
  canManage: boolean
  onEdit: (u: AdminUser) => void
  onRemove: (u: AdminUser) => void
}

/** "All users" table with search + pagination (Users tab of the original page). */
export function UsersPanel({ users, currentUserId, canManage, onEdit, onRemove }: Props) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const q = search.toLowerCase()
  const filtered = users.filter((u) => (u.name && u.name.toLowerCase().includes(q)) || (u.email && u.email.toLowerCase().includes(q)))
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-[15px] font-bold text-[#1a1a1a]">All users</h2>
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search user"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="h-10 pl-9 pr-4 text-sm bg-white border border-gray-200 rounded-lg placeholder:text-gray-400 focus:outline-none focus:border-blue-500 transition-colors w-64"
          />
        </div>
      </div>
      <div className="border border-gray-100 rounded-lg overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-[#F8FAFC] text-gray-500 font-semibold text-xs border-b border-gray-100">
            <tr>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4">Company</th>
              <th className="px-6 py-4">Department</th>
              <th className="px-6 py-4 w-24 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">
                  No users found.
                </td>
              </tr>
            ) : (
              rows.map((u) => {
                const isMe = u.id === currentUserId
                return (
                  <tr key={u.id} className={`hover:bg-gray-50 transition-colors ${isMe ? 'bg-blue-50/40' : ''}`}>
                    <td className="px-6 py-4 text-sm font-semibold text-[#1a1a1a] flex items-center gap-2">
                      {u.name}
                      {isMe && (
                        <span className="text-[10px] font-bold bg-blue-100 text-blue-600 border border-blue-200 px-1.5 py-0.5 rounded-full">You</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{u.email}</td>
                    <td className="px-6 py-4">
                      {u.company ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-100">
                          {COMPANY_LABELS[u.company] || u.company}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-600 border border-green-100">
                        {u.department || u.role || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right flex items-center justify-end gap-3">
                      {canManage && (
                        <>
                          <button className="text-red-500 hover:text-red-700 transition-colors" onClick={() => onRemove(u)} aria-label="Remove user">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              <line x1="10" y1="11" x2="10" y2="17" />
                              <line x1="14" y1="11" x2="14" y2="17" />
                            </svg>
                          </button>
                          <button className="text-gray-400 hover:text-gray-600 transition-colors" onClick={() => onEdit(u)} aria-label="Edit user">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between pt-6">
        <div className="text-sm text-gray-500 font-medium tracking-tight">
          Page {page} of {totalPages}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="h-8 px-4 text-xs font-semibold">
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="h-8 px-4 text-xs font-semibold"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
