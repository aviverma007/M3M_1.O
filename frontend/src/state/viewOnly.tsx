import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { setViewOnlyMode } from '@/api/http'

type ViewOnlyState = { isViewOnly: boolean; setViewOnly: (v: boolean) => void }
const Ctx = createContext<ViewOnlyState>({ isViewOnly: false, setViewOnly: () => {} })

/** "View Only" mode: a module opened without edit permission. Blocks all writes (see api/http.ts). */
export function ViewOnlyProvider({ children }: { children: ReactNode }) {
  const [isViewOnly, setViewOnly] = useState(false)
  useEffect(() => setViewOnlyMode(isViewOnly), [isViewOnly])
  const value = useMemo(() => ({ isViewOnly, setViewOnly }), [isViewOnly])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useViewOnly = () => useContext(Ctx)
