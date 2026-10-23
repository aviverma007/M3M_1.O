/**
 * Per-field remark / flag / "any other" / benchmark state (original redux slice `sectionFields`,
 * action updateSectionField). Kept in a context so the form can read it when saving.
 */
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import type { FieldMeta } from '@/types/module-workspace'

type Store = {
  get: (sectionFieldId: number) => FieldMeta | undefined
  all: () => FieldMeta[]
  update: (meta: FieldMeta) => void
  version: number
}

const Ctx = createContext<Store | null>(null)

export function FieldMetaProvider({ children }: { children: ReactNode }) {
  const map = useRef(new Map<number, FieldMeta>())
  const [version, setVersion] = useState(0)
  const get = useCallback((id: number) => map.current.get(id), [])
  const all = useCallback(() => [...map.current.values()], [])
  const update = useCallback((meta: FieldMeta) => {
    const prev = map.current.get(meta.sectionFieldId)
    if (prev && JSON.stringify(prev) === JSON.stringify(meta)) return
    map.current.set(meta.sectionFieldId, meta)
    setVersion((v) => v + 1)
  }, [])
  const value = useMemo(() => ({ get, all, update, version }), [get, all, update, version])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFieldMeta() {
  const s = useContext(Ctx)
  if (!s) throw new Error('useFieldMeta must be used inside FieldMetaProvider')
  return s
}
