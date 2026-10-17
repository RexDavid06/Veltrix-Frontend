// Central API client with refresh handling and logout callback.
// Implements:
// - API_ROOT normalization (handles trailing / and optional /api)
// - axios instance that attaches Authorization header from storage
// - automatic refresh using POST { refresh } to /auth/token/refresh/
// - single-refresh queue to avoid concurrent refresh requests
// - a pluggable logout handler that callers can register

import axios from 'axios'

// API base URL resolution order:
//   1. VITE_API_URL          (preferred)
//   2. VITE_API_BASE_URL     (accepted alias)
//   3. In development, '' -> Vite's `/api` proxy target (see vite.config.js)
//   4. In production, the deployed Render backend
const PROD_BACKEND_URL = 'https://veltrix-backend-5cwa.onrender.com'

const RAW_API = import.meta.env.VITE_API_URL !== undefined
  ? import.meta.env.VITE_API_URL
  : import.meta.env.VITE_API_BASE_URL !== undefined
    ? import.meta.env.VITE_API_BASE_URL
    : (import.meta.env.DEV ? '' : PROD_BACKEND_URL)

// Loopback hosts are only reachable on the visitor's own machine, so a
// production build must never target them: the browser blocks the http://
// request from an https:// page (mixed content) or nothing is listening, and
// axios surfaces both cases as a bare "Network Error" on register/login.
function isLoopbackHost(hostname = '') {
  const host = String(hostname).toLowerCase()
  return host === 'localhost' || host === '127.0.0.1' || host === '::1'
    || host === '[::1]' || host.endsWith('.localhost')
}

function currentPageLocation() {
  if (typeof window === 'undefined' || !window.location) return null
  return { hostname: window.location.hostname, origin: window.location.origin || '' }
}

function guardLoopback(url, page = currentPageLocation()) {
  if (typeof url !== 'string' || !url.startsWith('http')) return url
  if (!page || isLoopbackHost(page.hostname)) return url
  try {
    if (isLoopbackHost(new URL(url, page.origin || undefined).hostname)) {
      return PROD_BACKEND_URL
    }
  } catch (e) {
    // unparsable URL: keep the original value
  }
  return url
}

// Exported for tests. Normalizes a raw API base to `<base>/api` and swaps a
// loopback base for the deployed backend when the page is served remotely.
export function resolveApiRoot(rawApi, page = currentPageLocation()) {
  let root = String(guardLoopback(String(rawApi ?? ''), page)).replace(/\/$/, '')
  if (!root.endsWith('/api')) root = root ? `${root}/api` : '/api'
  return root
}

const API_ROOT = resolveApiRoot(RAW_API)

const RAW_BACKEND = import.meta.env.VITE_BACKEND_URL
  || import.meta.env.VITE_API_URL
  || import.meta.env.VITE_API_BASE_URL
  || PROD_BACKEND_URL

export const BACKEND_URL = guardLoopback(RAW_BACKEND)

export function getWsUrl(path = '') {
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  if (import.meta.env.VITE_WS_URL) {
    return `${import.meta.env.VITE_WS_URL.replace(/\/$/, '')}${cleanPath}`
  }
  const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = typeof window !== 'undefined' ? window.location.host : 'localhost:3000'
  return `${protocol}//${host}${cleanPath}`
}

// WebSocket streaming is opt-in: only connect when VITE_WS_URL is configured.
// The Django backend in this repository does not expose a Channels routing
// layer, so connecting by default would just produce repeated failed sockets.
export const WS_ENABLED = Boolean(import.meta.env.VITE_WS_URL)

const api = axios.create()

// A separate instance WITHOUT interceptors is used for the refresh call itself.
// Otherwise a 401 from the refresh endpoint would re-enter the response
// interceptor, queue behind `isRefreshing`, and never settle (a hang instead of
// a clean logout).
const refreshClient = axios.create()

// Endpoints that must never trigger the refresh-and-retry cycle.
function isAuthEndpoint(url = '') {
  return url.includes('/auth/token/refresh/') || url.includes('/auth/token/')
}

let isRefreshing = false
let refreshSubscribers = []
let logoutHandler = null

function subscribeTokenRefresh(resolve, reject) {
  refreshSubscribers.push({ resolve, reject })
}

function onRefreshed(accessToken) {
  refreshSubscribers.forEach(({ resolve }) => resolve(accessToken))
  refreshSubscribers = []
}

function onRefreshFailed(error) {
  refreshSubscribers.forEach(({ reject }) => reject(error))
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

function getStoredToken() {
  try {
    return sessionStorage.getItem('veltrix_token') || localStorage.getItem('veltrix_token') || null
  } catch (e) {
    return null
  }
}

function getStoredRefreshToken() {
  try {
    return sessionStorage.getItem('veltrix_refresh') || localStorage.getItem('veltrix_refresh') || null
  } catch (e) {
    return null
  }
}

// Best-effort server-side logout: blacklist the stored refresh token so it can
// no longer be used. Uses the interceptor-free client so a failure here can
// never re-enter the refresh flow (or block the local sign-out).
export function revokeStoredSession() {
  try {
    const refresh = getStoredRefreshToken()
    if (!refresh) return
    refreshClient.post(`${API_ROOT}/auth/logout/`, { refresh }).catch(() => {})
  } catch (e) {
    // revoking is best-effort; never block sign-out
  }
}

function bearerOf(config) {
  const header = config?.headers?.Authorization
  return typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7) : null
}

function persistAccessToken(accessToken, nextRefreshToken) {
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
    const requestUrl = originalRequest?.url || ''

    if (status !== 401 || !originalRequest || originalRequest._retry || isAuthEndpoint(requestUrl)) {
      return Promise.reject(error)
    }

    originalRequest._retry = true

    // Another in-flight refresh may have already rotated the token between this
    // request being sent and its 401 arriving. If so, don't refresh again —
    // just retry with the current token.
    const currentToken = getStoredToken()
    const usedToken = bearerOf(originalRequest)
    if (currentToken && usedToken && currentToken !== usedToken) {
      originalRequest.headers = originalRequest.headers || {}
      originalRequest.headers.Authorization = `Bearer ${currentToken}`
      return api(originalRequest)
    }

    // Another request is already refreshing: wait for its result and retry.
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        subscribeTokenRefresh(resolve, reject)
      }).then((accessToken) => {
        originalRequest.headers = originalRequest.headers || {}
        originalRequest.headers.Authorization = `Bearer ${accessToken}`
        return api(originalRequest)
      })
    }

    isRefreshing = true

    const refreshToken = getStoredRefreshToken()

    if (!refreshToken) {
      isRefreshing = false
      onRefreshFailed(error)
      clearStoredTokens()
      if (typeof logoutHandler === 'function') {
        logoutHandler('Your session has expired. Please sign in again.')
      }
      return Promise.reject(error)
    }

    try {
      const response = await refreshClient.post(`${API_ROOT}/auth/token/refresh/`, { refresh: refreshToken })
      const accessToken = response?.data?.access
      const nextRefreshToken = response?.data?.refresh

      if (!accessToken) {
        throw new Error('Refresh did not return an access token')
      }

      persistAccessToken(accessToken, nextRefreshToken)
      onRefreshed(accessToken)

      originalRequest.headers = originalRequest.headers || {}
      originalRequest.headers.Authorization = `Bearer ${accessToken}`

      return api(originalRequest)
    } catch (refreshError) {
      onRefreshFailed(refreshError)
      clearStoredTokens()
      if (typeof logoutHandler === 'function') {
        logoutHandler('Your session has expired. Please sign in again.')
      }
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  }
)

export { API_ROOT }
export default api