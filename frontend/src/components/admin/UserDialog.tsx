import { useEffect, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/overlays'
import { useAuth } from '@/auth/AuthContext'
import type { AdminUser, UserFormValues } from '@/types/admin'
import { DESIGN_DEPARTMENTS } from './constants'

type Mode = 'add' | 'edit'
type Props = {
  isOpen: boolean
  onClose: () => void
  mode?: Mode
  userData?: AdminUser | null
  onSave: (values: UserFormValues, mode: Mode) => void
}

const inputCls =
  'w-full h-11 px-4 text-sm bg-white border border-gray-200 rounded-lg placeholder:text-gray-400 focus:outline-none focus:border-blue-500 transition-colors font-medium'
const selectCls =
  'w-full h-11 px-4 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors font-medium appearance-none text-gray-700'
const labelCls = 'text-xs font-semibold text-[#1a1a1a]'

function Caret() {
  return (
    <div className="absolute right-4 top-[34px] pointer-events-none text-gray-400">
      <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1 1.5L5 5.5L9 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

function SelectField({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: ReactNode }) {
  return (
    <div className="space-y-1.5 relative">
      <label className={labelCls}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={selectCls}>
        {children}
      </select>
      <Caret />
    </div>
  )
}

/** Role options depend on the chosen department (same rules as original). */
function RoleOptions({ department }: { department: string }) {
  if (!department || department === 'super_admin') {
    return (
      <>
        <option value="super_admin">Super Admin</option>
        {!department && (
          <>
            <option value="general_admin">HOD Admin</option>
            <option value="design_admin">Design Admin</option>
            <option value="general_contributor">HOD User</option>
            <option value="design_contributor">Design User</option>
          </>
        )}
      </>
    )
  }
  const isDesign = DESIGN_DEPARTMENTS.includes(department)
  return (
    <>
      <option value={isDesign ? 'design_admin' : 'general_admin'}>{isDesign ? 'Design Admin' : 'HOD Admin'}</option>
      <option value={isDesign ? 'design_contributor' : 'general_contributor'}>{isDesign ? 'Design User' : 'HOD User'}</option>
    </>
  )
}

/** Add / edit user dialog (original "Ue"). */
export function UserDialog({ isOpen, onClose, mode = 'add', userData = null, onSave }: Props) {
  const { user } = useAuth()
  const currentRole = user?.role || ''
  const canAssignRoles = currentRole === 'super_admin' || (currentRole as string) === 'admin' || !currentRole

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')
  const [department, setDepartment] = useState('')
  const [role, setRole] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    if (!isOpen) return
    const u = mode === 'edit' ? userData : null
    setName(u?.name || '')
    setEmail(u?.email || '')
    setPhone(u?.phone || '')
    setCompany(u?.company || '')
    setDepartment(u?.department || '')
    setRole(u?.role || '')
    setPassword('')
  }, [isOpen, mode, userData])

  const save = () => {
    onSave({ name, email, phone, company, department, role, password: password || undefined }, mode)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] p-8 overflow-visible bg-white gap-0 rounded-2xl border-0 shadow-xl" aria-describedby={undefined}>
        <DialogTitle className="text-xl font-bold text-[#1a1a1a] mb-6">{mode === 'add' ? 'Add New User' : 'Edit user'}</DialogTitle>
        <div className="space-y-5">
          <div className="space-y-1.5">
            <label className={labelCls}>Full Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter full name" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className={labelCls}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@m3m.in" className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Phone</label>
              <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 78546 45695" className={inputCls} />
            </div>
          </div>
          <SelectField label="Company" value={company} onChange={setCompany}>
            <option value="" disabled hidden>
              Select company
            </option>
            <option value="m3m_gurgaon">M3M Gurgaon</option>
            <option value="m3m_noida">M3M Noida</option>
            <option value="smart_world">Smart World</option>
          </SelectField>
          <div className="grid grid-cols-2 gap-4">
            <SelectField
              label="Department"
              value={department}
              onChange={(v) => {
                setDepartment(v)
                setRole('')
              }}
            >
              <option value="" disabled hidden>
                Select department
              </option>
              <option value="super_admin">Super Admin</option>
              <optgroup label="Design">
                <option value="design">Design Team</option>
                <option value="design_arch">Design - Arch.</option>
                <option value="design_str">Design - Str.</option>
                <option value="design_mep">Design - MEP.</option>
              </optgroup>
              <optgroup label="Other">
                <option value="structure">Structure Design Team</option>
                <option value="mep">MEP Design Team</option>
                <option value="interior">Interior Designing Department</option>
                <option value="pmo">PMO Team</option>
                <option value="cp">C&amp;P</option>
                <option value="liaison">Liaison</option>
                <option value="pmo_budget">PMO &amp; Budget</option>
                <option value="bt">BT</option>
                <option value="pl">P&amp;L</option>
              </optgroup>
            </SelectField>
            <SelectField label="Role" value={role} onChange={setRole}>
              <option value="" disabled hidden>
                Select role
              </option>
              {canAssignRoles && <RoleOptions department={department} />}
            </SelectField>
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>
              {mode === 'add' ? 'Password' : 'New Password'}
              {mode === 'edit' && <span className="text-gray-400 font-normal ml-1">(leave blank to keep current)</span>}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'add' ? 'Enter login password' : 'Enter new password to change'}
              className={inputCls}
            />
          </div>
          <div className="flex justify-end gap-3 pt-6">
            <Button
              variant="outline"
              onClick={onClose}
              className="h-10 px-6 font-semibold text-[13px] text-[#1a1a1a] border-gray-200 bg-white hover:bg-gray-50 shadow-sm"
            >
              Cancel
            </Button>
            <Button onClick={save} className="h-10 px-6 font-semibold text-[13px] bg-[#4CAF50] hover:bg-[#45a049] text-white shadow-sm">
              {mode === 'add' ? 'Create User' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
