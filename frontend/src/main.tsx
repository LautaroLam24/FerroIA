import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './tokens.css'
import './index.css'
import App from './App.tsx'
import { SessionProvider } from './auth/SessionContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SessionProvider>
      <App />
    </SessionProvider>
  </StrictMode>,
)
