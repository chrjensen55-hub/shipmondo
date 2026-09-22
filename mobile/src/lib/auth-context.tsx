import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, ApiError, clearToken, getToken, registerUnauthorizedHandler, setToken } from './api'

type AuthState = { status: 'loading' | 'signedOut' | 'signedIn' }
type AuthContextValue = AuthState & {
  login: (identifier: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthState['status']>('loading')

  useEffect(() => {
    getToken().then((token) => setStatus(token ? 'signedIn' : 'signedOut'))
    registerUnauthorizedHandler(() => setStatus('signedOut'))
  }, [])

  async function login(identifier: string, password: string) {
    const data = await api<{ ok: true; token: string }>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    })
    await setToken(data.token)
    setStatus('signedIn')
  }

  async function logout() {
    await clearToken()
    setStatus('signedOut')
  }

  return <AuthContext.Provider value={{ status, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export { ApiError }
