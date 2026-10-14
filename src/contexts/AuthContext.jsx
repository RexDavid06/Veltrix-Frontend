import React, { createContext, useCallback, useEffect, useState } from 'react'
import api, { getAccessToken, getStoredTokens, setStoredTokens, clearStoredTokens } from '../api'

export const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const initial = getStoredTokens()
  const [token, setToken] = useState(initial.access || '')
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(Boolean(initial.access))

  const fetchProfile = useCallback(async () => {
    try {
      const res = await api.get('/profile/')
      setProfile(res.data)
    } catch (err) {
      // profile not available or token invalid
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (token) {
      fetchProfile()
    } else {
      setProfile(null)
      setLoading(false)
    }
  }, [token, fetchProfile])

  const login = async ({ email, password, remember = false }) => {
    const res = await api.post('/auth/token/', { username: email, password })
    const access = res?.data?.access
    const refresh = res?.data?.refresh
    if (!access) throw new Error('No access token returned')
    setStoredTokens({ access, refresh }, remember)
    setToken(access)
    await fetchProfile()
    return res.data
  }

  const register = async ({ email, password, first_name, last_name, remember = false }) => {
    await api.post('/auth/register/', { email, password, first_name, last_name })
    // Auto-login after registration
    return login({ email, password, remember })
  }

  const logout = () => {
    clearStoredTokens()
    setToken('')
    setProfile(null)
  }

  const sendVerification = async () => {
    await api.post('/auth/send-verification/')
  }

  return (
    <AuthContext.Provider value={{ token, profile, loading, login, logout, register, sendVerification }}>
      {children}
    </AuthContext.Provider>
  )
}
