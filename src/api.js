// Central API client with refresh handling and logout callback.
// Implements:
// - API_ROOT normalization (handles trailing / and optional /api)
// - axios instance that attaches Authorization header from storage
// - automatic refresh using POST { refresh } to /auth/token/refresh/
// - single-refresh queue to avoid concurrent refresh requests
// - a pluggable logout handler that callers can register

import axios from 'axios'

const RAW_API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
let API_ROOT = RAW_API.replace(/\/$/, '')
if (!API_ROOT.endsWith('/api')) API_ROOT = `${API_ROOT}/api`

const api = axios.create()

let isRefreshing = false
let refreshSubscribers = []
let logoutHandler = null

function subscribeTokenRefresh(cb) {
  refreshSubscribers.push(cb)
}

function onRefreshed(accessToken) {
  refreshSubscribers.forEach((cb) => cb(accessToken))
  refreshSubscribers = []
}

export function setLogoutHandler(handler) {
  logoutHandler = handler
}

function clearStoredTokens() {
  try {
    sessionStorage.removeItem('veltrix_token')
    sessionStorage.removeItem('veltrix_refresh')
    localStorage.removeItem('veltrix_token')
    localStorage.removeItem('veltrix_refresh')
  } catch (e) {
    // storage access issues are not a secret
  }
}

api.interceptors.request.use((config) => {
  try {
    const token = sessionStorage.getItem('veltrix_token') || localStorage.getItem('veltrix_token')
    if (token) {
      config.headers = config.headers || {}
      config.headers.Authorization = `Bearer ${token}`
    }
  } catch (e) {
    // no token logging
  }
  return config
}, (error) => Promise.reject(error))

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config
    const status = error?.response?.status

    if (status !== 401 || !originalRequest || originalRequest._retry) {
      return Promise.reject(error)
    }

    originalRequest._retry = true

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        subscribeTokenRefresh((accessToken) => {
          if (!accessToken) {
            reject(error)
            return
          }
          originalRequest.headers = originalRequest.headers || {}
          originalRequest.headers.Authorization = `Bearer ${accessToken}`
          resolve(api(originalRequest))
        })
      })
    }

    isRefreshing = true

    const refreshToken = sessionStorage.getItem('veltrix_refresh') || localStorage.getItem('veltrix_refresh')

    if (!refreshToken) {
      isRefreshing = false
      clearStoredTokens()
      if (typeof logoutHandler === 'function') {
        logoutHandler('Your session has expired. Please sign in again.')
      }
      return Promise.reject(error)
    }

    try {
      const response = await api.post(`${API_ROOT}/auth/token/refresh/`, { refresh: refreshToken })
      const accessToken = response?.data?.access
      const nextRefreshToken = response?.data?.refresh

      if (!accessToken) {
        throw new Error('Refresh did not return an access token')
      }

      try {
        sessionStorage.setItem('veltrix_token', accessToken)
        if (nextRefreshToken) {
          sessionStorage.setItem('veltrix_refresh', nextRefreshToken)
        }

        const existingPersisted = Boolean(localStorage.getItem('veltrix_token') || localStorage.getItem('veltrix_refresh'))
        if (existingPersisted) {
          localStorage.setItem('veltrix_token', accessToken)
          if (nextRefreshToken) {
            localStorage.setItem('veltrix_refresh', nextRefreshToken)
          }
        }
      } catch (e) {
        // storage access issues are not a secret
      }

      onRefreshed(accessToken)

      originalRequest.headers = originalRequest.headers || {}
      originalRequest.headers.Authorization = `Bearer ${accessToken}`

      return api(originalRequest)
    } catch (refreshError) {
      clearStoredTokens()
      if (typeof logoutHandler === 'function') {
        logoutHandler('Your session has expired. Please sign in again.')
      }
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
      refreshSubscribers = []
    }
  }
)

export { API_ROOT }
export default api