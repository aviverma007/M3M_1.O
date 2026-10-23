import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/overlays'
import avatar from '@/assets/images/user-avatar.png'
import type { AdminUser } from '@/types/admin'

type Props = { isOpen: boolean; onClose: () => void; userData?: AdminUser | null; onConfirm: (u: AdminUser) => void }

/** "Remove user" confirmation (original "Ie"). */
export function RemoveUserDialog({ isOpen, onClose, userData = null, onConfirm }: Props) {
  const confirm = () => {
    if (userData) onConfirm(userData)
    onClose()
  }
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[360px] p-6 text-center overflow-visible bg-white gap-0 rounded-2xl border-0 shadow-2xl" aria-describedby={undefined}>
        <div className="mx-auto w-12 h-12 bg-[#FEF2F2] rounded-full flex items-center justify-center mb-4">
          <Trash2 className="w-5 h-5 text-[#EF4444]" />
        </div>
        <DialogTitle asChild>
          <h3 className="text-lg font-bold text-[#1a1a1a] leading-tight mb-6">
            Are you sure you want to remove this
            <br />
            user from this role?
          </h3>
        </DialogTitle>
        {userData && (
          <div className="flex items-center gap-3 mb-8 text-left bg-white">
            <img src={avatar} alt="Avatar" className="w-10 h-10 rounded-full object-cover bg-gray-100" />
            <div className="flex flex-col flex-1">
              <span className="text-[13px] font-bold text-[#1a1a1a]">{userData.name || 'Unknown'}</span>
              <span className="text-[12px] text-gray-500 font-medium">{userData.email || 'No email'}</span>
            </div>
            <div className="px-3 py-1 bg-[#F0FDF4] text-[#16A34A] rounded-full text-xs font-semibold whitespace-nowrap">{userData.role}</div>
          </div>
        )}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 h-10 font-bold text-[13px] text-[#1a1a1a] border-gray-200 bg-white hover:bg-gray-50 shadow-sm"
          >
            Cancel
          </Button>
          <Button onClick={confirm} className="flex-1 h-10 font-bold text-[13px] bg-[#EF4444] hover:bg-[#DC2626] text-white shadow-sm border-0">
            Remove
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
