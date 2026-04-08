import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

// Init theme from localStorage
const saved = localStorage.getItem('popcorn-theme')
try {
  const parsed = JSON.parse(saved || '{}')
  document.documentElement.setAttribute('data-theme', parsed?.state?.mode || 'dark')
} catch {
  document.documentElement.setAttribute('data-theme', 'dark')
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 1000 * 60 * 5, refetchOnWindowFocus: false },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-right"
          containerStyle={{ zIndex: 99999 }}
          toastOptions={{
            duration: 3000,
            style: {
              background: 'var(--color-bg-2)',
              color: 'var(--color-text)',
              border: '1px solid rgba(168,85,247,0.2)',
              borderRadius: '12px',
              fontSize: '14px',
              maxWidth: '380px',
            },
            success: { iconTheme: { primary: 'var(--color-primary)', secondary: 'white' } },
            error: { iconTheme: { primary: '#F87171', secondary: 'white' }, duration: 4000 },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
)
