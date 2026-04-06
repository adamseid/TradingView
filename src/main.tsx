import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { initCsrf } from './api/client'
import { Analytics } from "@vercel/analytics/next"

async function bootstrap() {
  try {
    await initCsrf()
  } catch (error) {
    console.error('Failed to initialize CSRF token', error)
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <BrowserRouter>
        <AuthProvider>
          <App />

          <Analytics />
        </AuthProvider>
      </BrowserRouter>
    </React.StrictMode>
  )
}

bootstrap()