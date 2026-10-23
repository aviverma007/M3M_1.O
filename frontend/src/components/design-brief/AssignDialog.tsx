import { UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/overlays'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { BriefUser } from '@/types/design-brief'

export type AssignForm = { memberId: string; instructions: string; dueDate: string }
export const EMPTY_ASSIGN: AssignForm = { memberId: '', instructions: '', dueDate: '' }

type Props = {
  open: boolean
  onOpenChange: (o: boolean) => void
  form: AssignForm
  onChange: (f: AssignForm) => void
  members: BriefUser[]
  onAssign: () => void
  assigning?: boolean
  /** z-index class for the member dropdown (original differs per page) */
  contentClassName?: string
}

/** "Assign to Team Member" dialog (Team Member / Instructions / Internal Due Date). */
export default function AssignDialog({ open, onOpenChange, form, onChange, members, onAssign, assigning = false, contentClassName = 'bg-white z-50' }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign to Team Member</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Team Member <span className="text-red-500">*</span>
            </label>
            <Select value={form.memberId} onValueChange={(v) => onChange({ ...form, memberId: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Select team member" />
              </SelectTrigger>
              <SelectContent className={contentClassName}>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id.toString()}>
                    {m.name}
                  </SelectItem>
                ))}
                {members.length === 0 && <div className="p-2 text-sm text-gray-500 text-center">No members found</div>}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Instructions <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              className="w-full min-h-[100px] border rounded-md p-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Add any specific instructions for this assignment..."
              value={form.instructions}
              onChange={(e) => onChange({ ...form, instructions: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Internal Due Date <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <div className="relative">
              <Input
                type="date"
                className="w-full text-sm placeholder:text-gray-400"
                value={form.dueDate}
                onChange={(e) => onChange({ ...form, dueDate: e.target.value })}
              />
            </div>
          </div>
        </div>
        <DialogFooter className="flex gap-2 sm:justify-end">
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" className="bg-[#00509d] hover:bg-[#003f7a] text-white gap-2" onClick={onAssign} disabled={assigning}>
            <UserPlus className="w-4 h-4" />
            {assigning ? 'Assigning...' : 'Assign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
