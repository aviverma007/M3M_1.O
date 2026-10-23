import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import ProtectedRoute from './auth/ProtectedRoute'
import { PortfolioProvider } from './portfolio/PortfolioContext'
import RequirePortfolio from './portfolio/RequirePortfolio'
import LoginPage from './pages/LoginPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import SelectPortfolioPage from './pages/SelectPortfolioPage'
import DashboardPage from './pages/DashboardPage'

export default function App() {
  return (
    <AuthProvider>
      <PortfolioProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            {/* logged in */}
            <Route element={<ProtectedRoute />}>
              <Route path="/select-portfolio" element={<SelectPortfolioPage />} />

              {/* logged in + portfolio chosen */}
              <Route element={<RequirePortfolio />}>
                <Route path="/dashboard" element={<DashboardPage />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </PortfolioProvider>
    </AuthProvider>
  )
}
