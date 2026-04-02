import { createContext, useContext, useEffect, useState } from 'react'
import api from '../api/client'

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
      const { data } = await api.get('/auth/me/')
      const payload = data.response.data
      setUser(payload.authenticated ? payload.user : null)
    } finally {
      setLoading(false)
    }
  }

  const loginUser = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login/', { email, password })
    setUser(data.response.data.user)
  }

  const registerUser = async (payload: {
    first_name: string
    last_name: string
    email: string
    password: string
  }) => {
    const { data } = await api.post('/auth/register/', payload)
    setUser(data.response.data.user)
  }

  const logoutUser = async () => {
    await api.post('/auth/logout/', {})
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