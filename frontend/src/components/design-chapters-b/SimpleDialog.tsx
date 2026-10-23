import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'

/** Plain fixed-overlay "Add ..." dialog used by Landscape & Amenities (original markup, not a Radix dialog). */
export default function SimpleDialog({ title, onCancel, onAdd, children }: { title: string; onCancel: () => void; onAdd: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-2xl w-96 shadow-xl">
        <h2 className="text-lg font-bold mb-4">{title}</h2>
        {children}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button className="bg-[#00509d] text-white" onClick={onAdd}>
            Add
          </Button>
        </div>
      </div>
    </div>
  )
}
