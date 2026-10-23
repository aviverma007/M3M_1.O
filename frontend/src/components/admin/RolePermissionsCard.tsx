import { Check, ShieldCheck, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { rolePermissionStatus } from './constants'

/** Permissions summary card for a role/department pair (original "Oe"). */
export function RolePermissionsCard({ role, department }: { role: string; department: string }) {
  const permissions = rolePermissionStatus(role, department)
  const enabled = permissions.filter((p) => p.status).length

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden w-full max-w-[450px]">
      <div className="p-6 pb-4 border-b border-gray-50 flex items-center gap-4 bg-gray-50/30">
        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-[#00509d] shadow-sm border border-gray-100">
          <ShieldCheck size={24} />
        </div>
        <div className="flex flex-col">
          <h3 className="text-[16px] font-black text-[#1a1a1a] uppercase tracking-tight">
            {department ? `${department.charAt(0).toUpperCase() + department.slice(1).replace('_', ' ')} Access` : 'System Access'}
          </h3>
          <p className="text-[13px] text-gray-500 font-bold uppercase tracking-widest opacity-60">{role.replace('_', ' ')}</p>
        </div>
      </div>
      <div className="p-6">
        <h4 className="text-[13px] font-black text-[#1a1a1a] mb-5 uppercase tracking-widest opacity-80">Permissions:</h4>
        <div className="flex flex-col gap-4">
          {permissions.map((p) => (
            <div key={p.name} className="flex justify-between items-center group">
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'w-1.5 h-1.5 rounded-full transition-transform group-hover:scale-125',
                    p.status ? 'bg-[#4CAF50]' : 'bg-[#EF4444]',
                  )}
                />
                <span className={cn('text-[13px] font-bold transition-colors', p.status ? 'text-gray-700' : 'text-gray-400')}>{p.name}</span>
              </div>
              <div
                className={cn(
                  'flex items-center justify-center w-5 h-5 rounded-md transition-all',
                  p.status ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-400',
                )}
              >
                {p.status ? <Check size={14} strokeWidth={3} /> : <X size={14} strokeWidth={3} />}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-8 flex justify-center">
          <div className="bg-[#EBF5FF] text-[#0052cc] text-[11px] font-black px-4 py-2 rounded-full tracking-wider uppercase shadow-sm border border-[#0052cc]/10">
            {enabled} of {permissions.length} permissions enabled
          </div>
        </div>
      </div>
    </div>
  )
}
