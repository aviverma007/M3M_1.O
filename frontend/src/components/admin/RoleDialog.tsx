import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/overlays'
import { Switch } from '@/components/ui/misc'
import type { RoleFormValues } from '@/types/admin'
import { ROLE_PERMISSIONS } from './constants'

type Mode = 'create' | 'edit'
type Props = {
  isOpen: boolean
  onClose: () => void
  mode?: Mode
  roleData?: { name?: string; description?: string; permissionsList?: { name: string; status: boolean }[] } | null
  onSave: (values: RoleFormValues, mode: Mode) => void
}

const blank = () => ROLE_PERMISSIONS.map((p) => ({ ...p, status: false }))
const inputCls =
  'w-full h-11 px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium'

/** Create / edit role dialog (original "Te"). */
export function RoleDialog({ isOpen, onClose, mode = 'create', roleData = null, onSave }: Props) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [permissions, setPermissions] = useState(blank)

  useEffect(() => {
    if (!isOpen) return
    if (mode === 'edit' && roleData) {
      setName(roleData.name || '')
      setDescription(roleData.description || '')
      setPermissions((prev) =>
        prev.map((p) => {
          const found = roleData.permissionsList?.find((x) => x.name === p.name)
          return { ...p, status: found ? found.status : false }
        }),
      )
    } else {
      setName('')
      setDescription('')
      setPermissions(blank())
    }
  }, [isOpen, mode, roleData])

  const toggle = (id: string) => setPermissions((prev) => prev.map((p) => (p.id === id ? { ...p, status: !p.status } : p)))

  const save = () => {
    onSave({ name, description, permissionsList: permissions.map((p) => ({ name: p.name, status: p.status })) }, mode)
    onClose()
  }

  const enabled = permissions.filter((p) => p.status).length

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-white gap-0 rounded-2xl border-0 shadow-lg" aria-describedby={undefined}>
        <div className="flex justify-between items-center p-6 border-b border-gray-100 pb-5">
          <DialogTitle className="text-xl font-bold text-[#1a1a1a]">{mode === 'create' ? 'Create New Role' : 'Edit role'}</DialogTitle>
          <button onClick={onClose} className="text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors rounded-md p-1.5">
            <X className="w-5 h-5" />
            <span className="sr-only">Close</span>
          </button>
        </div>
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#1a1a1a]">Role Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter role name" className={inputCls} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#1a1a1a]">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter role description"
                  className={inputCls}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-[#1a1a1a] block mb-4">Permissions</label>
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
                {permissions.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-4 bg-white transition-colors hover:bg-gray-50/50">
                    <span className="text-[14px] font-semibold text-[#1a1a1a]">{p.name}</span>
                    <Switch
                      checked={p.status}
                      onCheckedChange={() => toggle(p.id)}
                      className={`${p.status ? 'bg-[#0052cc]' : 'bg-gray-200'} data-[state=checked]:bg-[#0052cc]`}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between pt-4 pb-2">
              <div className="flex items-center gap-1 text-[13px] font-semibold">
                <span className="text-[#1a1a1a]">Permissions enabled:</span>
                <span className="text-blue-500 ml-1">
                  {String(enabled).padStart(2, '0')} of {permissions.length} permissions enabled
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={onClose} className="h-10 px-6 font-semibold text-[#1a1a1a] border-gray-200 bg-white hover:bg-gray-50">
                  Cancel
                </Button>
                <Button onClick={save} className="h-10 px-6 font-semibold bg-[#4CAF50] hover:bg-[#45a049] text-white">
                  {mode === 'create' ? 'Create Role' : 'Save changes'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
