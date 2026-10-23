/* Roles and access control — /dashboard/roles-access-control (original page-DRxqVkEc) */
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/auth/AuthContext'
import { adminKeys, createRole, createUser, deleteUser, fetchRoles, fetchUsers, updateRole, updateUser } from '@/api/admin'
import { RolePermissionsCard } from '@/components/admin/RolePermissionsCard'
import { ModuleAccessPanel } from '@/components/admin/ModuleAccessPanel'
import { UsersPanel } from '@/components/admin/UsersPanel'
import { RoleDialog } from '@/components/admin/RoleDialog'
import { UserDialog } from '@/components/admin/UserDialog'
import { RemoveUserDialog } from '@/components/admin/RemoveUserDialog'
import { ACCESS_ROLE_RE } from '@/components/admin/constants'
import type { AccessRole, AdminUser, RoleFormValues, UserFormValues } from '@/types/admin'

type Tab = 'permissions' | 'modules' | 'users'

/** Roles visible to the current admin (module-access rows are hidden; same filters as original). */
function visibleRoles(all: AccessRole[], role: string, isSuperAdmin: boolean) {
  const roles = all.filter((r) => !ACCESS_ROLE_RE.test(r.roleName))
  if (role === 'general_admin') return roles.filter((r) => r.roleName.includes('General') || r.roleName.includes('HOD') || r.roleName.includes('general'))
  if (role === 'design_admin') return roles.filter((r) => r.roleName.includes('Design') || r.roleName.includes('design'))
  return isSuperAdmin ? roles : []
}

export default function RolesAccessPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const role = user?.role || ''
  const isSuperAdmin = role === 'super_admin' || (role as string) === 'admin' || !role

  const [tab, setTab] = useState<Tab>('permissions')
  const [roleDialogOpen, setRoleDialogOpen] = useState(false)
  const [userDialog, setUserDialog] = useState<{ open: boolean; mode: 'add' | 'edit' }>({ open: false, mode: 'add' })
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [removeOpen, setRemoveOpen] = useState(false)

  const rolesQuery = useQuery({ queryKey: adminKeys.roles, queryFn: fetchRoles })
  const usersQuery = useQuery({ queryKey: adminKeys.users, queryFn: fetchUsers })

  const roles = visibleRoles(rolesQuery.data ?? [], role, isSuperAdmin)
  const selectedRole = roles[0] ?? null
  const users = [...(usersQuery.data ?? [])].sort((a, b) =>
    a.id === user?.id ? -1 : b.id === user?.id ? 1 : new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
  )

  const reloadRoles = () => qc.invalidateQueries({ queryKey: adminKeys.roles })
  const reloadUsers = () => qc.invalidateQueries({ queryKey: adminKeys.users })

  const saveUser = async (values: UserFormValues, mode: 'add' | 'edit') => {
    try {
      if (mode === 'add') {
        await createUser(values)
        alert('User created successfully!')
        await reloadUsers()
      } else if (mode === 'edit' && selectedUser) {
        await updateUser(selectedUser.id, values)
        alert('User edited successfully!')
        await reloadUsers()
      }
    } catch (err) {
      console.error('Failed to save user data:', err)
      alert('Error saving user data: ' + ((err as Error)?.message || 'Please check console for details.'))
    }
  }

  const removeUser = async (u: AdminUser) => {
    try {
      await deleteUser(u.id)
      alert('User deleted successfully!')
      setRemoveOpen(false)
      setSelectedUser(null)
      await reloadUsers()
    } catch (err) {
      console.error('Failed to delete user:', err)
      alert('Error deleting user: ' + ((err as Error)?.message || 'Please check console for details.'))
    }
  }

  const saveRole = async (values: RoleFormValues, mode: 'create' | 'edit') => {
    try {
      const body = { roleName: values.name, description: values.description, permissions: values.permissionsList }
      if (mode === 'create') await createRole(body)
      else if (selectedRole) await updateRole(selectedRole.id, body)
      await reloadRoles()
    } catch (err) {
      console.error('Failed to save role data:', err)
      alert('Error saving role data. Please check console for details.')
    }
  }

  // The permissions card describes the selected role as a role/department pair (as in original)
  const roleName = selectedRole?.roleName?.toLowerCase() ?? ''
  const cardRole = roleName.includes('admin') ? 'general_admin' : 'general_contributor'
  const cardDept = roleName.includes('design') ? 'design' : 'pmo'

  const tabCls = (t: Tab) =>
    `pb-3 text-sm font-bold transition-colors ${
      tab === t ? 'text-[#1a1a1a] border-b-2 border-[#1a1a1a]' : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent'
    }`

  return (
    <div className="flex flex-col grow bg-gray-50 p-6 min-h-[calc(100vh-120px)]">
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 flex-grow flex flex-col p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-xl font-bold text-[#1a1a1a]">Roles and access control</h1>
            <p className="text-sm text-gray-500 mt-1">Add, view or manage roles</p>
          </div>
          <div className="flex gap-4">
            {isSuperAdmin && (
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedUser(null)
                  setUserDialog({ open: true, mode: 'add' })
                }}
                className="text-blue-600 border-blue-600 hover:bg-blue-50 font-medium px-6 rounded-md h-10"
              >
                Add user
              </Button>
            )}
            {isSuperAdmin && (
              <Button
                onClick={() => setRoleDialogOpen(true)}
                className="bg-[#4CAF50] hover:bg-[#45a049] text-white font-medium flex items-center gap-2 px-6 rounded-md h-10"
              >
                <span className="text-lg leading-none mb-[2px]">+</span> Create Role
              </Button>
            )}
          </div>
        </div>
        <div className="border-t border-gray-200 mt-2 mb-6 w-full" />
        <div className="flex gap-8">
          <div className="flex-1">
            <div className="flex border-b border-gray-100 mb-8 gap-8">
              <button className={tabCls('permissions')} onClick={() => setTab('permissions')}>
                Permissions
              </button>
              <button className={tabCls('modules')} onClick={() => setTab('modules')}>
                Module Access
              </button>
              <button className={tabCls('users')} onClick={() => setTab('users')}>
                Users ({users.length})
              </button>
            </div>
            {tab === 'modules' ? (
              <ModuleAccessPanel isSuperAdmin={isSuperAdmin} onSaved={reloadRoles} />
            ) : tab === 'permissions' ? (
              <RolePermissionsCard role={cardRole} department={cardDept} />
            ) : (
              <UsersPanel
                users={users}
                currentUserId={user?.id}
                canManage={isSuperAdmin}
                onEdit={(u) => {
                  setSelectedUser(u)
                  setUserDialog({ open: true, mode: 'edit' })
                }}
                onRemove={(u) => {
                  setSelectedUser(u)
                  setRemoveOpen(true)
                }}
              />
            )}
          </div>
        </div>
      </div>
      <RoleDialog isOpen={roleDialogOpen} onClose={() => setRoleDialogOpen(false)} mode="create" onSave={saveRole} />
      <UserDialog
        isOpen={userDialog.open}
        onClose={() => setUserDialog((s) => ({ ...s, open: false }))}
        mode={userDialog.mode}
        userData={selectedUser}
        onSave={saveUser}
      />
      <RemoveUserDialog isOpen={removeOpen} onClose={() => setRemoveOpen(false)} userData={selectedUser} onConfirm={removeUser} />
    </div>
  )
}
