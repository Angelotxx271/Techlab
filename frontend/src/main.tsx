import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import ErrorBoundary from './components/common/ErrorBoundary.tsx'
import { UserProvider } from './contexts/UserContext.tsx'
import { ThemeProvider } from './contexts/ThemeContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <UserProvider>
          <App />
        </UserProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
)
