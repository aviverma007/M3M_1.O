import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import './index.css'
import App from './App'
import { AuthProvider } from './auth/AuthContext'
import { ViewOnlyProvider } from './state/viewOnly'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 } },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ViewOnlyProvider>
          <AuthProvider>
            {/* same root wrapper as the original app */}
            <div className="bg-gray-100">
              <App />
            </div>
          </AuthProvider>
        </ViewOnlyProvider>
      </BrowserRouter>
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  </StrictMode>,
)
