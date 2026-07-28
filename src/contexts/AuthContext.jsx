/**
 * @file AuthContext.jsx
 * @description React Context Provider for managing user authentication state and session state.
 */

import { createContext, useContext, useState, useEffect } from 'react'
import { getMe, logout as apiLogout } from '../api'

const AuthContext = createContext(null)

/**
 * Authentication Context Provider component.
 * Fetches current authenticated user profile on mount and provides login/logout utilities.
 *
 * @param {Object} props - Component props.
 * @param {React.ReactNode} props.children - Child elements wrapped by auth context.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined)

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => setUser(null))
  }, [])

  /**
   * Logs out current user and clears local auth state.
   */
  const logout = async () => {
    try { await apiLogout() } catch {}
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Custom React hook to access authentication context state.
 *
 * @returns {{user: Object|null|undefined, setUser: Function, logout: Function}} Auth context object.
 */
export function useAuth() {
  return useContext(AuthContext)
}

