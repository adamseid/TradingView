import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import TokenPage from './pages/TokenPage'
import AddStockPage from './pages/AddStockPage'
import EditStockPage from './pages/EditStockPage'
import AuthPage from './pages/AuthPage'
import RequireAuth from './components/RequireAuth'
import RedirectIfAuth from './components/RedirectIfAuth'

function App() {
  return (
    <Routes>
      <Route
        path="/auth"
        element={
          <RedirectIfAuth>
            <AuthPage />
          </RedirectIfAuth>
        }
      />

      <Route
        path="/"
        element={
          <RequireAuth>
            <Home />
          </RequireAuth>
        }
      />

      <Route
        path="/token/:ticker"
        element={
          <RequireAuth>
            <TokenPage />
          </RequireAuth>
        }
      />

      <Route
        path="/stocks/new"
        element={
          <RequireAuth>
            <AddStockPage />
          </RequireAuth>
        }
      />

      <Route
        path="/stocks/edit"
        element={
          <RequireAuth>
            <EditStockPage />
          </RequireAuth>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
