import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
const api = axios.create({ baseURL: `${BASE.replace(/\/$/, '')}/api` })

// Token storage helpers: default to sessionStorage, optional persistent localStorage
const ACCESS_KEY = 'veltrix_token'
const REFRESH_KEY = 'veltrix_refresh'
const REMEMBER_KEY = 'veltrix_remember'

export function getStoredTokens() {
  // Prefer sessionStorage (current session) unless localStorage has persisted tokens
  try {
    const sessionAccess = sessionStorage.getItem(ACCESS_KEY)
    const sessionRefresh = sessionStorage.getItem(REFRESH_KEY)
    const localAccess = localStorage.getItem(ACCESS_KEY)
    const localRefresh = localStorage.getItem(REFRESH_KEY)
    // If localStorage has an access token, treat as remembered
    if (localAccess) {
      return { access: localAccess, refresh: localRefresh, remembered: true }
    }
    if (sessionAccess) {
      return { access: sessionAccess, refresh: sessionRefresh, remembered: false }
    }
    return { access: null, refresh: null, remembered: false }
  } catch (err) {
    return { access: null, refresh: null, remembered: false }
  }
}

export function setStoredTokens({ access, refresh }, remember = false) {
  try {
    // Clear existing session storage
    sessionStorage.removeItem(ACCESS_KEY)
    sessionStorage.removeItem(REFRESH_KEY)
    // Always store in sessionStorage for current session
    if (access) sessionStorage.setItem(ACCESS_KEY, access)
    if (refresh) sessionStorage.setItem(REFRESH_KEY, refresh)
    // If user asked to be remembered, copy to localStorage
    if (remember) {
      if (access) localStorage.setItem(ACCESS_KEY, access)
      if (refresh) localStorage.setItem(REFRESH_KEY, refresh)
      localStorage.setItem(REMEMBER_KEY, '1')
    } else {
      // Ensure localStorage is cleared of tokens if not remembering
      localStorage.removeItem(ACCESS_KEY)
      localStorage.removeItem(REFRESH_KEY)
      localStorage.removeItem(REMEMBER_KEY)
    }
  } catch (err) {
    // ignore storage errors
    console.error('token storage error', err)
  }
}

export function clearStoredTokens() {
  try {
    sessionStorage.removeItem(ACCESS_KEY)
    sessionStorage.removeItem(REFRESH_KEY)
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
    localStorage.removeItem(REMEMBER_KEY)
  } catch (err) {
    // ignore
  }
}

export function getAccessToken() {
  return getStoredTokens().access
}

let isRefreshing = false
let subscribers = []
function subscribeTokenRefresh(cb) {
  subscribers.push(cb)
}
function onRefreshed(newToken) {
  subscribers.forEach((cb) => cb(newToken))
  subscribers = []
}

// Attach access token to requests
api.interceptors.request.use((config) => {
  const { access } = getStoredTokens()
  if (access) config.headers = { ...(config.headers || {}), Authorization: `Bearer ${access}` }
  return config
})

// Response interceptor to handle 401 -> attempt refresh once
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config
    if (!originalRequest || originalRequest._retry) return Promise.reject(error)

    const status = error.response ? error.response.status : null
    if (status !== 401) return Promise.reject(error)

    // Avoid attempting refresh on the refresh endpoint itself
    if (originalRequest.url && originalRequest.url.endsWith('/auth/token/refresh/')) {
      clearStoredTokens()
      return Promise.reject(error)
    }

    if (isRefreshing) {
      // Queue the request until refresh completes
      return new Promise((resolve, reject) => {
        subscribeTokenRefresh((newToken) => {
          if (!newToken) return reject(error)
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          resolve(api(originalRequest))
        })
      })
    }

    isRefreshing = true
    originalRequest._retry = true

    try {
      const { refresh } = getStoredTokens()
      if (!refresh) {
        clearStoredTokens()
        isRefreshing = false
        onRefreshed(null)
        return Promise.reject(error)
      }
      // Use a raw axios call to avoid interceptor loops
      const refreshRes = await axios.post(`${BASE.replace(/\/$/, '')}/api/auth/token/refresh/`, { refresh })
      const newAccess = refreshRes?.data?.access
      const newRefresh = refreshRes?.data?.refresh || refresh
      if (!newAccess) {
        clearStoredTokens()
        isRefreshing = false
        onRefreshed(null)
        return Promise.reject(error)
      }
      // Persist refreshed tokens in same storage mode as before
      const remembered = Boolean(localStorage.getItem(REMEMBER_KEY))
      setStoredTokens({ access: newAccess, refresh: newRefresh }, remembered)
      onRefreshed(newAccess)
      originalRequest.headers.Authorization = `Bearer ${newAccess}`
      isRefreshing = false
      return api(originalRequest)
    } catch (err) {
      clearStoredTokens()
      isRefreshing = false
      onRefreshed(null)
      return Promise.reject(err)
    }
  }
)

export default api
