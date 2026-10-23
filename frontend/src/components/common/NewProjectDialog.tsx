import type { ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Button, type ButtonProps } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/overlays'
import { useAuth } from '@/auth/AuthContext'
import { cn } from '@/lib/utils'

/** Can this user create projects? super admin, or design admin/contributor in the design department. */
// eslint-disable-next-line react-refresh/only-export-components
export function useCanCreateProject() {
  const { user } = useAuth()
  const role = user?.role?.toLowerCase() ?? ''
  const dept = user?.department?.toLowerCase() ?? ''
  return ['super_admin', 'superadmin'].includes(role) || dept === 'super_admin' || (dept === 'design' && ['design_admin', 'design_contributor', 'admin'].includes(role))
}

/** "Add New Project" button + "Enter Project Type:" dialog (Residential / Commercial / Mixed). */
export default function NewProjectDialog({ className, variant, children }: { className?: string; variant?: ButtonProps['variant']; children?: ReactNode }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const allowed = useCanCreateProject()
  if (!allowed) return null
  const go = (t: string) => navigate(`/dashboard/project?projectType=${t}`)

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children || (
          <Button className={cn('   cursor-pointer ', className)} variant={variant}>
            {pathname.endsWith('/landing') ? (
              <span> New Project</span>
            ) : (
              <span className="flex justify-center items-center gap-1 ">
                <Plus /> <span className="hidden xs:inline">Add New Project</span>
              </span>
            )}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-linear-to-b from-blue-300 via-white to-white border-0 h-60">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl xs:text-4xl  py-10 text-blue-900">Enter Project Type:</DialogTitle>
          <DialogDescription asChild>
            <div className="flex gap-2 justify-center items-center">
              <Button variant="outline" onClick={() => go('residential')} className="theamBtn">
                Residential
              </Button>
              <Button variant="outline" onClick={() => go('commercial')} className="theamBtn">
                Commercial
              </Button>
              <Button variant="outline" onClick={() => go('mixed')} className="theamBtn">
                Mixed
              </Button>
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}
