import { useCallback, useEffect, useState } from 'react'
import { ChevronDown, Eye, Layers, Lock, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createRole, fetchRoles, updateRole } from '@/api/admin'
import type { AccessLevel } from '@/types/admin'
import {
  ACCESS_DEPARTMENTS,
  ACCESS_LEVELS,
  ACCESS_MODULES,
  CATEGORY_BADGE,
  COMPANIES,
  accessRoleName,
  moduleKey,
  type ModuleCategory,
} from './constants'

const LEVEL_BUTTONS = [
  { level: 'none' as const, label: 'None', Icon: Lock, active: 'bg-gray-100 text-gray-500 border-gray-300' },
  { level: 'view' as const, label: 'View', Icon: Eye, active: 'bg-blue-50 text-blue-600 border-blue-300' },
  { level: 'edit' as const, label: 'Edit', Icon: Pencil, active: 'bg-green-50 text-green-600 border-green-300' },
]

function AccessToggle({ value, onChange, disabled }: { value: AccessLevel; onChange: (v: AccessLevel) => void; disabled: boolean }) {
  return (
    <div className="flex rounded-lg border border-gray-200 overflow-hidden">
      {LEVEL_BUTTONS.map(({ level, label, Icon, active }) => (
        <button
          key={level}
          disabled={disabled}
          onClick={() => !disabled && onChange(level)}
          className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border-r last:border-r-0 transition-colors
                    ${value === level ? active + ' border' : 'bg-white text-gray-400 hover:bg-gray-50'}
                    ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
        >
          <Icon size={11} />
          {label}
        </button>
      ))}
    </div>
  )
}

const selectCls =
  'h-9 pl-3 pr-8 text-sm font-semibold bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors appearance-none text-[#1a1a1a]'

const grouped = ACCESS_MODULES.reduce<Record<string, typeof ACCESS_MODULES>>((acc, m) => {
  ;(acc[m.category] ??= []).push(m)
  return acc
}, {})

/** Module access matrix per company/department (original "ze"). */
export function ModuleAccessPanel({ isSuperAdmin, onSaved }: { isSuperAdmin: boolean; onSaved?: () => void }) {
  const [company, setCompany] = useState(COMPANIES[0].value)
  const [department, setDepartment] = useState(ACCESS_DEPARTMENTS[0].value)
  const [access, setAccess] = useState<Record<string, AccessLevel>>({})
  const [roleId, setRoleId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [dirty, setDirty] = useState(false)

  const load = useCallback(async (c: string, d: string) => {
    setLoading(true)
    setDirty(false)
    try {
      const role = (await fetchRoles()).find((r) => r.roleName === accessRoleName(c, d))
      const next: Record<string, AccessLevel> = {}
      ACCESS_MODULES.forEach((m) => (next[moduleKey(m.name)] = 'none'))
      if (role) {
        setRoleId(role.id)
        ;(role.permissions || [])
          .filter((p) => p.name?.startsWith('module:'))
          .forEach((p) => (next[p.name] = p.access || (p.status ? 'edit' : 'none')))
      } else setRoleId(null)
      setAccess(next)
    } catch (err) {
      console.error('Failed to load department permissions:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(company, department)
  }, [company, department, load])

  const setOne = (name: string, level: AccessLevel) => {
    setAccess((prev) => ({ ...prev, [moduleKey(name)]: level }))
    setDirty(true)
  }
  const setAll = (level: AccessLevel) => {
    const next: Record<string, AccessLevel> = {}
    ACCESS_MODULES.forEach((m) => (next[moduleKey(m.name)] = level))
    setAccess(next)
    setDirty(true)
  }

  const save = async () => {
    setSaving(true)
    try {
      const permissions = ACCESS_MODULES.map((m) => ({
        name: moduleKey(m.name),
        access: access[moduleKey(m.name)] || 'none',
        status: access[moduleKey(m.name)] !== 'none',
      }))
      if (roleId) await updateRole(roleId, { roleName: accessRoleName(company, department), permissions })
      else {
        const res = await createRole({
          roleName: accessRoleName(company, department),
          description: `Module access for ${company} / ${department}`,
          permissions,
        })
        setRoleId(res?.data?.id || null)
      }
      setDirty(false)
      onSaved?.()
    } catch (err) {
      console.error('Failed to save department permissions:', err)
      alert('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const editCount = ACCESS_MODULES.filter((m) => access[moduleKey(m.name)] === 'edit').length
  const viewCount = ACCESS_MODULES.filter((m) => access[moduleKey(m.name)] === 'view').length
  const scopeLabel = `${COMPANIES.find((c) => c.value === company)?.label} / ${ACCESS_DEPARTMENTS.find((d) => d.value === department)?.label}`

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div>
          <h2 className="text-[15px] font-bold text-[#1a1a1a]">Module Access</h2>
          <p className="text-xs text-gray-400 mt-0.5">Set module access per department — independent of role</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-3 text-xs font-semibold text-gray-400">
            <span className="text-green-600">{editCount} Edit</span>
            <span className="text-blue-500">{viewCount} View</span>
            <span>{ACCESS_MODULES.length - editCount - viewCount} None</span>
          </div>
          {isSuperAdmin && (
            <div className="flex gap-2 border-l border-gray-100 pl-4">
              {ACCESS_LEVELS.map((l) => (
                <button key={l} onClick={() => setAll(l)} className="text-xs font-semibold text-gray-400 hover:text-[#0052cc] capitalize">
                  All {l}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="px-6 py-3 bg-gray-50/60 border-b border-gray-100 flex items-center gap-4 flex-wrap">
        <span className="text-xs font-semibold text-gray-500 shrink-0">Company:</span>
        <div className="relative">
          <select value={company} onChange={(e) => setCompany(e.target.value)} className={selectCls}>
            {COMPANIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        <span className="text-xs font-semibold text-gray-400">|</span>
        <span className="text-xs font-semibold text-gray-500 shrink-0">Department:</span>
        <div className="relative">
          <select value={department} onChange={(e) => setDepartment(e.target.value)} className={selectCls}>
            {ACCESS_DEPARTMENTS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        {!roleId && !loading && (
          <span className="text-[10px] font-semibold text-amber-500 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">Not saved yet</span>
        )}
      </div>

      <div className="flex items-center gap-6 px-6 py-2.5 bg-gray-50/40 border-b border-gray-100 text-[11px] text-gray-400 font-medium">
        <span className="flex items-center gap-1.5">
          <Lock size={10} /> None — no access
        </span>
        <span className="flex items-center gap-1.5">
          <Eye size={10} className="text-blue-500" /> View — read only, saving blocked
        </span>
        <span className="flex items-center gap-1.5">
          <Pencil size={10} className="text-green-600" /> Edit — full access
        </span>
      </div>

      <div className="divide-y divide-gray-50 max-h-[440px] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-sm text-gray-400">Loading…</div>
        ) : (
          Object.entries(grouped).map(([category, modules]) => (
            <div key={category}>
              <div className="px-6 py-2 bg-gray-50/40 border-b border-gray-100">
                <span
                  className={`inline-flex items-center text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${CATEGORY_BADGE[category as ModuleCategory]}`}
                >
                  {category}
                </span>
              </div>
              {modules.map((m) => {
                const level = access[moduleKey(m.name)] || 'none'
                return (
                  <div key={m.name} className="flex items-center justify-between px-6 py-3 transition-colors hover:bg-gray-50/40">
                    <div className="flex items-center gap-3">
                      {m.moduleNo ? (
                        <span className="w-6 h-6 rounded-md bg-[#e6f0ff] flex items-center justify-center text-[10px] font-bold text-[#0052cc]">{m.moduleNo}</span>
                      ) : (
                        <span className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center">
                          <Layers size={10} className="text-gray-400" />
                        </span>
                      )}
                      <span className={`text-[13px] font-semibold ${level === 'none' ? 'text-gray-400' : 'text-[#1a1a1a]'}`}>{m.name}</span>
                    </div>
                    <AccessToggle value={level} onChange={(v) => setOne(m.name, v)} disabled={!isSuperAdmin} />
                  </div>
                )
              })}
            </div>
          ))
        )}
      </div>

      {isSuperAdmin && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/40">
          <span className={`text-xs font-medium ${dirty ? 'text-amber-500' : 'text-gray-400'}`}>
            {dirty ? `Unsaved changes for ${scopeLabel}` : 'All changes saved'}
          </span>
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => load(company, department)}
              disabled={!dirty}
              className="h-9 px-5 text-xs font-semibold text-[#1a1a1a] border-gray-200 bg-white hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button size="sm" onClick={save} disabled={!dirty || saving} className="h-9 px-5 text-xs font-semibold bg-[#0052cc] hover:bg-[#003fa3] text-white">
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
