import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function RedirectIfAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="container py-4">Loading...</div>
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

export default RedirectIfAuth