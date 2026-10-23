/** Existing-projects table with row action popover (View / Edit / Compare / Delete) — original `Fe`. */
import { useEffect, useMemo, useState, type ChangeEvent, type MouseEvent } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Ellipsis, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/data'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/overlays'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogPortal, DialogTitle, DialogTrigger } from '@/components/ui/overlays'
import { http } from '@/api/http'
import { projectKeys } from '@/api/projects'
import { useAuth } from '@/auth/AuthContext'
import CompareProjectsPicker from '../CompareProjectsPicker'
import { compareIcon, editIcon, viewIcon } from '../icons'
import type { Project } from '@/types'

const COLUMNS = ['S.No.', 'Project Name', 'Project Classification', 'Project Type', 'Category', 'Location', 'User Name', 'Project Owner', 'Date']

const categoryLabel = (c?: string) => (c === 'hi_street' ? 'High Street' : c?.replaceAll('_', ' ').replaceAll('-', ' '))

/** Dialog overlay div used by the original (rendered manually inside the portal). */
const Overlay = ({ className }: { className: string }) => <div className={className} />

type Props = {
  data?: Project[]
  page: number
  limit: number
}

export default function ProjectsTable({ data, page, limit }: Props) {
  const offset = (page - 1) * limit
  const rows = data?.length ? [...data].sort((a, b) => a.id - b.id) : []
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { user } = useAuth()
  const qc = useQueryClient()
  const isSuperAdmin = ['super_admin', 'superadmin'].includes(user?.role?.toLowerCase() ?? '')

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [compareOpen, setCompareOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [searchParams] = useSearchParams()
  const fromUrl = useMemo(() => searchParams.get('projects')?.split(',').map(Number) || [], [searchParams])
  useEffect(() => setSelected(new Set(fromUrl.map(String))), [fromUrl])

  const toggle = (e: ChangeEvent<HTMLInputElement> | null, id: string | number, force = false) => {
    const key = String(id)
    setSelected((prev) => {
      const next = new Set(prev)
      if (force) {
        if (next.size < 3 || next.has(key)) next.add(key)
        return next
      }
      const checked = e!.target.checked
      if (checked && next.size < 3) next.add(key)
      else if (!checked) next.delete(key)
      return next
    })
  }
  const unselect = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.delete(String(id))
      return next
    })

  const compare = (e: MouseEvent, moduleId: number | null = 1) => {
    e.preventDefault()
    const base = pathname.split('/compare')[0]
    const qs = Array.from(selected)
      .map((id, i) => `p${i + 1}=${id}`)
      .join('&')
    navigate(`${base}/compare?module=${moduleId}&chapter=1&${qs}`)
  }

  const remove = async (id: number) => {
    setDeleting(true)
    try {
      await http.delete(`/project/${id}`)
      toast.success('Project deleted successfully')
      setDeleteId(null)
      qc.invalidateQueries({ queryKey: projectKeys.all })
    } catch (e) {
      toast.error((e as Error)?.message || 'Failed to delete project')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="rounded-md border grow flex flex-col min-h-0">
      <Table containerClassName="flex-1 overflow-y-auto bg-white">
        <TableHeader className="sticky top-0 z-10">
          <TableRow className="bg-blue-200 hover:bg-blue-200 ">
            {COLUMNS.map((c) => (
              <TableHead key={c} className="text-black text-center typo-basic-2">
                {c}
              </TableHead>
            ))}
            <TableHead className="text-black text-center typo-basic-2">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="text-center typo-basic-2">
          {rows.length > 0 ? (
            rows.map((p, i) => (
              <TableRow key={p.id} className="capitalize">
                <TableCell>{i + offset + 1}</TableCell>
                <TableCell>{p.name}</TableCell>
                <TableCell>{p.projectClassification ?? 'NA'}</TableCell>
                <TableCell>{p.projectType}</TableCell>
                <TableCell className="capitalize">{categoryLabel(p.category)}</TableCell>
                <TableCell>{p.location}</TableCell>
                <TableCell>{p.userName}</TableCell>
                <TableCell>{p.projectOwner}</TableCell>
                <TableCell>{p.date ? p.date.split('T')[0] : ''}</TableCell>
                <TableCell className="space-x-1">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="theamGray" className="cursor-pointer">
                        <Ellipsis />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="flex flex-col w-full space-y-1 p-1 ">
                      <Button variant="ghost" className="cursor-pointer justify-start text-xs" onClick={() => navigate(`/dashboard/project/${p.id}/modules`)}>
                        <img src={viewIcon} alt="View" /> View
                      </Button>
                      <Button variant="ghost" className="cursor-pointer justify-start text-xs" onClick={() => navigate(`/dashboard/project/${p.id}?edit=true`)}>
                        <img src={editIcon} alt="Edit" /> Edit
                      </Button>
                      <Dialog
                        modal={false}
                        open={compareOpen}
                        onOpenChange={(open) => {
                          setCompareOpen(open)
                          if (open) toggle(null, p.id, true)
                          else unselect(p.id)
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button variant="ghost" className="cursor-pointer justify-start text-xs">
                            <img src={compareIcon} alt="View" /> Compare
                          </Button>
                        </DialogTrigger>
                        <DialogPortal>
                          <Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/80" />
                          <DialogContent className="sm:w-[450px] w-full min-h-[400px] p-0">
                            <DialogHeader className="hidden">
                              <DialogTitle />
                              <DialogDescription />
                            </DialogHeader>
                            <CompareProjectsPicker selectedProjects={selected} handleCheckboxChange={(e, id) => toggle(e, id)} currentProjectType={p.projectType} />
                            <Button variant="btnBlue" disabled={selected.size === 1} className="cursor-pointer absolute bottom-1.5 left-1.5" onClick={(e) => compare(e, p.moduleId)}>
                              Compare
                            </Button>
                          </DialogContent>
                        </DialogPortal>
                      </Dialog>
                      {isSuperAdmin && (
                        <Button
                          variant="ghost"
                          className="cursor-pointer justify-start text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setDeleteId(p.id)}
                        >
                          <Trash2 size={14} /> Delete
                        </Button>
                      )}
                    </PopoverContent>
                  </Popover>
                  {isSuperAdmin && deleteId === p.id && (
                    <Dialog open onOpenChange={(o) => !o && setDeleteId(null)}>
                      <DialogPortal>
                        <Overlay className="fixed inset-0 z-50 bg-black/80" />
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle className="text-red-600">Delete Project</DialogTitle>
                            <DialogDescription>
                              Are you sure you want to delete <span className="font-semibold">{p.name}</span>? This action cannot be undone.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="flex justify-end gap-3 mt-4">
                            <Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleting}>
                              Cancel
                            </Button>
                            <Button variant="destructive" onClick={() => remove(p.id)} disabled={deleting}>
                              {deleting ? 'Deleting...' : 'Delete'}
                            </Button>
                          </div>
                        </DialogContent>
                      </DialogPortal>
                    </Dialog>
                  )}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell className="h-24 text-center" colSpan={COLUMNS.length + 1}>
                No Data Found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
