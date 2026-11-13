/* Change password: an admin for any user (no current password needed; also unlocks the account), or a user for themselves. */
import { useEffect, useState } from 'react'
import { Eye, EyeOff, KeyRound, LoaderCircle } from 'lucide-react'
import { toast } from 'sonner'
import { http, type ApiEnvelope } from '@/api/http'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/overlays'
import { cn } from '@/lib/utils'
import UserAvatar from './UserAvatar'

type Target = {
  id: number
  name: string
  email?: string
  avatar?: string | null
}
const inputCls =
  'w-full h-11 pl-4 pr-11 text-sm bg-white border border-gray-200 rounded-lg placeholder:text-gray-400 focus:outline-none focus:border-blue-500 transition-colors font-medium'

function strength(p: string) {
  let s = 0
  if (p.length >= 8) s++
  if (p.length >= 12) s++
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++
  if (/[0-9]/.test(p)) s++
  if (/[^A-Za-z0-9]/.test(p)) s++
  return s <= 2
    ? { label: 'Weak', color: '#DC2626', w: 33 }
    : s <= 3
      ? { label: 'Fair', color: '#D97706', w: 66 }
      : { label: 'Strong', color: '#16A34A', w: 100 }
}

function PwInput({
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  autoComplete: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={inputCls}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  )
}

export default function PasswordDialog({
  open,
  onClose,
  target,
  self,
}: {
  open: boolean
  onClose: () => void
  target: Target | null
  self?: boolean
}) {
  const [current, setCurrent] = useState('')
  const [pw, setPw] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (open) {
      setCurrent('')
      setPw('')
      setConfirm('')
    }
  }, [open])

  const problem =
    pw.length > 0 && pw.length < 8
      ? 'At least 8 characters'
      : pw && (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw))
        ? 'Use at least one letter and one number'
        : confirm && confirm !== pw
          ? "Passwords don't match"
          : null
  const ready = !!target && pw.length >= 8 && confirm === pw && !problem && (!self || current.length > 0)
  const st = strength(pw)

  const save = async () => {
    if (!ready || !target) return
    setBusy(true)
    try {
      if (self)
        await http.put<ApiEnvelope<null>>('/auth/me/password', {
          currentPassword: current,
          password: pw,
        })
      else
        await http.put<ApiEnvelope<null>>(`/auth/users/${target.id}/password`, {
          password: pw,
        })
      toast.success(self ? 'Your password has been changed' : `Password changed for ${target.name}`)
      onClose()
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? 'Could not change the password')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[420px] p-7 bg-white gap-0 rounded-2xl border-0 shadow-xl" aria-describedby={undefined}>
        <DialogTitle className="text-xl font-bold text-[#1a1a1a] flex items-center gap-2">
          <KeyRound size={20} className="text-[#005baa]" /> {self ? 'Change your password' : 'Change password'}
        </DialogTitle>
        {target && !self && (
          <div className="flex items-center gap-3 mt-4 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <UserAvatar name={target.name} avatar={target.avatar} size={36} />
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-800 truncate">{target.name}</p>
              {target.email && <p className="text-xs text-gray-500 truncate">{target.email}</p>}
            </div>
          </div>
        )}
        <form
          className="space-y-4 mt-5"
          onSubmit={(e) => {
            e.preventDefault()
            void save()
          }}
        >
          {self && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#1a1a1a]">Current password</label>
              <PwInput value={current} onChange={setCurrent} placeholder="Your current password" autoComplete="current-password" />
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#1a1a1a]">New password</label>
            <PwInput value={pw} onChange={setPw} placeholder="At least 8 characters, letters and numbers" autoComplete="new-password" />
            {pw && (
              <div className="flex items-center gap-2 pt-1">
                <div className="h-1.5 flex-1 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${st.w}%`, background: st.color }} />
                </div>
                <span className="text-[11px] font-bold" style={{ color: st.color }}>
                  {st.label}
                </span>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#1a1a1a]">Confirm new password</label>
            <PwInput value={confirm} onChange={setConfirm} placeholder="Type it again" autoComplete="new-password" />
          </div>
          <p className={cn('text-xs min-h-4', problem ? 'text-red-600 font-semibold' : 'text-gray-400')}>
            {problem ?? (self ? '' : 'This also unlocks the account if it was locked after failed logins.')}
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="h-10 px-6 font-semibold text-[13px]">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!ready || busy}
              className="h-10 px-6 font-semibold text-[13px] bg-[#005baa] hover:bg-[#004a8c] text-white"
            >
              {busy && <LoaderCircle size={14} className="animate-spin mr-1.5" />} Change password
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
