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

const axiosInstance = axios.create()

let isRefreshing = false
let refreshSubscribers = []
let logoutHandler = null

function subscribeTokenRefresh(cb) {
  refreshSubscribers.push(cb)
}

function onRefreshed(token) {
  refreshSubscribers.forEach((cb) => cb(token))
  refreshSubscribers = []
}

export function setLogoutHandler(fn) {
  logoutHandler = fn
}

// Attach stored token to requests when available
axiosInstance.interceptors.request.use((config) => {
  try {
    const token = sessionStorage.getItem('veltrix_token') || localStorage.getItem('veltrix_token')
    if (token) {
      config.headers = config.headers || {}
      config.headers.Authorization = `Bearer ${token}`
    }
  } catch (err) {
    // avoid logging sensitive values
    console.error('Failed to access storage for auth header')
  }
  return config
}, (error) => Promise.reject(error))

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const originalRequest = error?.config
    const status = error?.response?.status

    if (status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true

      // If a refresh is already in-flight, queue the request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((accessToken) => {
            if (!accessToken) return reject(error)
            originalRequest.headers = originalRequest.headers || {}
            originalRequest.headers.Authorization = `Bearer ${accessToken}`
            resolve(axiosInstance(originalRequest))
          })
        })
      }

      isRefreshing = true

      const refreshToken = sessionStorage.getItem('veltrix_refresh') || localStorage.getItem('veltrix_refresh')
      if (!refreshToken) {
        isRefreshing = false
        // No refresh token available — force logout
        try {
          sessionStorage.removeItem('veltrix_token')
          sessionStorage.removeItem('veltrix_refresh')
          localStorage.removeItem('veltrix_token')
          localStorage.removeItem('veltrix_refresh')
        } finally {
          if (typeof logoutHandler === 'function') logoutHandler('Your session has expired — please sign in again.')
        }
        return Promise.reject(error)
      }

      // Attempt refresh
      return axiosInstance.post(`${API_ROOT}/auth/token/refresh/`, { refresh: refreshToken })
        .then((res) => {
          const newAccess = res?.data?.access
          const newRefresh = res?.data?.refresh
          if (!newAccess) {
            throw new Error('Refresh did not return a new access token')
          }

          // Store tokens session-first; persist to localStorage only if already present there
          try {
            sessionStorage.setItem('veltrix_token', newAccess)
            if (newRefresh) sessionStorage.setItem('veltrix_refresh', newRefresh)
            const hadPersistedRefresh = Boolean(localStorage.getItem('veltrix_refresh'))
            if (hadPersistedRefresh) {
              localStorage.setItem('veltrix_token', newAccess)
              if (newRefresh) localStorage.setItem('veltrix_refresh', newRefresh)
            }
          } catch (err) {
            // Do not log tokens; just continue
            console.error('Failed to persist refreshed tokens')
          }

          onRefreshed(newAccess)
          originalRequest.headers = originalRequest.headers || {}
          originalRequest.headers.Authorization = `Bearer ${newAccess}`

          return axiosInstance(originalRequest)
        })
        .catch((err) => {
          // Clear tokens and notify app
          try {
            sessionStorage.removeItem('veltrix_token')
            sessionStorage.removeItem('veltrix_refresh')
            localStorage.removeItem('veltrix_token')
            localStorage.removeItem('veltrix_refresh')
          } finally {
            if (typeof logoutHandler === 'function') logoutHandler('Your session has expired — please sign in again.')
          }
          return Promise.reject(err)
        })
        .finally(() => { isRefreshing = false })
    }

    return Promise.reject(error)
  }
)

export { API_ROOT }
export default axiosInstance
