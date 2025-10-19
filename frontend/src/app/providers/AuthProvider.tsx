import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
  type ReactElement,
} from 'react'

interface AuthUser {
  user_id: string
  email?: string
  name?: string
  picture?: string
  [key: string]: unknown
}

interface AuthContextValue {
  user: AuthUser | null
  token: string | null
  login: (googleToken: string, userInfo: AuthUser) => void
  logout: () => void
  isAuthenticated: boolean
  loading: boolean
}

const STORAGE_KEYS = {
  TOKEN: 'google_token',
  USER: 'user_info',
} as const

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export const AuthProvider = ({ children }: PropsWithChildren): ReactElement => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedToken = localStorage.getItem(STORAGE_KEYS.TOKEN)
    const storedUser = localStorage.getItem(STORAGE_KEYS.USER)

    if (storedToken) {
      setToken(storedToken)
    }

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser) as AuthUser)
      } catch (error) {
        console.warn('Failed to parse stored user', error)
        localStorage.removeItem(STORAGE_KEYS.USER)
      }
    }

    setLoading(false)
  }, [])

  const login = useCallback((googleToken: string, userInfo: AuthUser) => {
    setToken(googleToken)
    setUser(userInfo)
    localStorage.setItem(STORAGE_KEYS.TOKEN, googleToken)
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userInfo))
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
    localStorage.removeItem(STORAGE_KEYS.TOKEN)
    localStorage.removeItem(STORAGE_KEYS.USER)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      login,
      logout,
      isAuthenticated: Boolean(token),
      loading,
    }),
    [loading, login, logout, token, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
