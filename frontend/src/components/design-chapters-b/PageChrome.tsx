/* Shared chrome for the chapters-b design-chapter pages (back link, sticky footers, date input). */
import type { ReactNode } from 'react'
import { Calendar, ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/** "< Title" back link used above each page heading (navigate(-1)). */
export function BackLink({ label, className = 'font-bold', animated = true }: { label: string; className?: string; animated?: boolean }) {
  const navigate = useNavigate()
  return (
    <button onClick={() => navigate(-1)} className={cn('flex items-center text-[#00509d] hover:text-blue-800 transition-colors mb-4', animated && 'group', className)}>
      <ChevronLeft size={20} className={animated ? 'group-hover:-translate-x-1 transition-transform' : undefined} />
      <span>{label}</span>
    </button>
  )
}

/** Header block used by the "list" pages (Consultant / Approvals / Phasing / Additional Details). */
export function ListPageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="max-w-[1600px] mx-auto mb-6 flex justify-between items-end">
      <div>
        <BackLink label={title} />
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{title}</h1>
        <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
      </div>
    </div>
  )
}

/** Fixed footer with Cancel / "Save Project" (Landscape & Service Design style). */
export function SaveProjectFooter({ saving, onSave, innerClassName = 'max-w-[1600px] mx-auto flex justify-end gap-3' }: { saving: boolean; onSave: () => void; innerClassName?: string }) {
  const navigate = useNavigate()
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-gray-200 p-4 z-50">
      <div className={innerClassName}>
        <Button variant="outline" onClick={() => navigate(-1)} className="border-gray-200 text-gray-500 hover:bg-gray-50 px-8 py-6 rounded-xl font-bold">
          Cancel
        </Button>
        <Button
          onClick={onSave}
          disabled={saving}
          className="bg-[#00509d] hover:bg-[#003f7a] text-white px-10 py-6 rounded-xl font-bold shadow-lg shadow-blue-100 border-none"
        >
          {saving ? 'Saving...' : 'Save Project'}
        </Button>
      </div>
    </div>
  )
}

/** Fixed footer with CANCEL / SUBMIT (list pages style). */
export function SubmitFooter({ saving, onSubmit }: { saving: boolean; onSubmit: () => void }) {
  const navigate = useNavigate()
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-100 p-5 z-50">
      <div className="max-w-[1600px] mx-auto flex justify-end gap-4">
        <Button
          variant="outline"
          onClick={() => navigate(-1)}
          className="border-gray-200 text-gray-500 hover:bg-gray-50 px-10 py-7 rounded-[20px] font-black uppercase tracking-widest h-14"
        >
          Cancel
        </Button>
        <Button
          onClick={onSubmit}
          disabled={saving}
          className="bg-[#00509d] hover:bg-[#003f7a] text-white px-14 py-7 rounded-[20px] font-black uppercase tracking-widest shadow-2xl shadow-blue-200 border-none h-14"
        >
          {saving ? 'Saving...' : 'Submit'}
        </Button>
      </div>
    </div>
  )
}

/** Native date input with the calendar icon overlay used in the list tables. */
export function DateCell({ value, onChange, className }: { value: string; onChange: (v: string) => void; className: string }) {
  return (
    <div className="relative">
      <Input type="date" value={value} onChange={(e) => onChange(e.target.value)} className={className} />
      <Calendar size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
    </div>
  )
}

/** Card with icon + uppercase title header and an action on the right (list pages). */
export function ListCard({ icon, title, action, children }: { icon: ReactNode; title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="max-w-[1600px] mx-auto bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden mb-24">
      <div className="px-8 py-5 border-b flex justify-between items-center bg-gray-50/30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#00509d]/10 flex items-center justify-center text-[#00509d]">{icon}</div>
          <h2 className="text-sm font-black text-gray-800 uppercase tracking-widest">{title}</h2>
        </div>
        {action}
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  )
}

export const greenAddBtn = 'bg-[#4caf50] hover:bg-[#43a047] text-white h-9 px-4 rounded-xl text-[11px] font-bold gap-2'
export const thCls = 'px-6 py-4 text-[10px] font-bold uppercase tracking-wider'
