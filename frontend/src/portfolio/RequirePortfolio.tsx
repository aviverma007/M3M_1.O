import { Navigate, Outlet } from 'react-router-dom'
import { usePortfolio } from './PortfolioContext'

/** Pages inside the app need a portfolio chosen first. */
export default function RequirePortfolio() {
  const { portfolio } = usePortfolio()
  if (!portfolio) return <Navigate to="/select-portfolio" replace />
  return <Outlet />
}
