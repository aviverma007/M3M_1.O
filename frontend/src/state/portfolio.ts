/**
 * Selected portfolio (location category). Same storage keys as the original:
 *  - localStorage.selectedPortfolio  -> 'M3M Noida' | 'M3M Gurgaon' | 'Smartworld' | 'All'
 *  - localStorage.prfilval           -> last dashboard filters ({ locationCategory, page, ... })
 * The dashboard URL also carries ?lc=<portfolio>.
 */
export const PORTFOLIO_KEY = 'selectedPortfolio'
export const FILTER_KEY = 'prfilval'

export const PORTFOLIO_OPTIONS = [
  { id: 'All', name: 'All Portfolios' },
  { id: 'M3M Noida', name: 'M3M Noida' },
  { id: 'M3M Gurgaon', name: 'M3M Gurgaon' },
  { id: 'Smartworld', name: 'Smartworld' },
]

const read = (k: string) => {
  try {
    return localStorage.getItem(k)
  } catch {
    return null
  }
}
const write = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v)
  } catch {
    /* ignore */
  }
}

export const getPortfolio = () => read(PORTFOLIO_KEY)
export const setPortfolio = (p: string) => write(PORTFOLIO_KEY, p)

export function getSavedFilters<T extends object>(): Partial<T> {
  try {
    return JSON.parse(read(FILTER_KEY) || '{}')
  } catch {
    return {}
  }
}
export function saveFilters(f: object) {
  write(FILTER_KEY, JSON.stringify(f))
}

/** Switch portfolio from the header: persists, resets page, reloads current URL with ?lc= (as original). */
export function switchPortfolio(p: string) {
  setPortfolio(p)
  saveFilters({ ...getSavedFilters(), locationCategory: p, page: 1 })
  const url = new URL(window.location.href)
  url.searchParams.set('lc', p)
  if (url.searchParams.has('page')) url.searchParams.set('page', '1')
  window.location.href = url.toString()
}
