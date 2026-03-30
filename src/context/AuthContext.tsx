import { createContext, useContext, useEffect, useState } from 'react'
import axios from 'axios'

interface User {
  id: number
  first_name: string
  last_name: string
  email: string
}

interface AuthContextValue {
  user: User | null
  loading: boolean
  loginUser: (email: string, password: string) => Promise<void>
  registerUser: (payload: {
    first_name: string
    last_name: string
    email: string
    password: string
  }) => Promise<void>
  logoutUser: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = async () => {
    try {
      const { data } = await axios.get('/api/auth/me/', { withCredentials: true })
      const payload = data.response.data
      setUser(payload.authenticated ? payload.user : null)
    } finally {
      setLoading(false)
    }
  }

  const loginUser = async (email: string, password: string) => {
    const { data } = await axios.post(
      '/api/auth/login/',
      { email, password },
      { withCredentials: true }
    )
    setUser(data.response.data.user)
  }

  const registerUser = async (payload: {
    first_name: string
    last_name: string
    email: string
    password: string
  }) => {
    const { data } = await axios.post('/api/auth/register/', payload, {
      withCredentials: true,
    })
    setUser(data.response.data.user)
  }

  const logoutUser = async () => {
    await axios.post('/api/auth/logout/', {}, { withCredentials: true })
    setUser(null)
  }

  useEffect(() => {
    refreshUser()
  }, [])

  return (
    <AuthContext.Provider
      value={{ user, loading, loginUser, registerUser, logoutUser, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}