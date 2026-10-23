export type PortfolioId = 'm3m-noida' | 'm3m-gurgaon' | 'smartworld'

export type Portfolio = {
  id: PortfolioId
  name: string
  tagline: string
  icon: 'building' | 'grid' | 'home'
}

/** Portfolios a user can work in. Will come from the API once roles/access are wired. */
export const PORTFOLIOS: Portfolio[] = [
  { id: 'm3m-noida', name: 'M3M Noida', tagline: 'Premium Developments', icon: 'building' },
  { id: 'm3m-gurgaon', name: 'M3M Gurgaon', tagline: 'Luxury Projects', icon: 'grid' },
  { id: 'smartworld', name: 'Smartworld', tagline: 'Smart Living Solutions', icon: 'home' },
]

export const findPortfolio = (id: string | null | undefined) =>
  PORTFOLIOS.find((p) => p.id === id) ?? null
