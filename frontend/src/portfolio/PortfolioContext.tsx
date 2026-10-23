import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { findPortfolio, type Portfolio, type PortfolioId } from './portfolios'

type PortfolioState = {
  portfolio: Portfolio | null
  selectPortfolio: (id: PortfolioId) => void
  clearPortfolio: () => void
}

const PortfolioContext = createContext<PortfolioState | null>(null)
const STORAGE_KEY = 'm3m.portfolio'

function readStored(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(() => findPortfolio(readStored()))

  const selectPortfolio = useCallback((id: PortfolioId) => {
    setPortfolio(findPortfolio(id))
    try {
      sessionStorage.setItem(STORAGE_KEY, id)
    } catch {
      /* storage unavailable — keep in memory */
    }
  }, [])

  const clearPortfolio = useCallback(() => {
    setPortfolio(null)
    try {
      sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
  }, [])

  const value = useMemo(
    () => ({ portfolio, selectPortfolio, clearPortfolio }),
    [portfolio, selectPortfolio, clearPortfolio],
  )
  return <PortfolioContext.Provider value={value}>{children}</PortfolioContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePortfolio() {
  const ctx = useContext(PortfolioContext)
  if (!ctx) throw new Error('usePortfolio must be used inside <PortfolioProvider>')
  return ctx
}
