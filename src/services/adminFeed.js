// Client for the backend's platform admin API (/api/admin/*).
// Every endpoint is guarded server-side by IsPlatformAdmin; the shared axios
// instance attaches the bearer token and handles refresh, so these helpers
// only deal with URLs, params, and response normalization.

import api, { API_ROOT } from '../api'

const ADMIN_ROOT = `${API_ROOT}/admin`

// Drop empty values so DRF never receives `?search=&role=` noise, which would
// otherwise hit optional filters with blank strings.
export function cleanParams(params = {}) {
  const out = {}
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null) return
    const text = typeof value === 'string' ? value.trim() : value
    if (text === '') return
    out[key] = text
  })
  return out
}

// List endpoints return either a DRF page ({count, next, previous, results})
// or a bare array. Normalize both so views always get { results, count }.
export function unwrapList(payload) {
  if (Array.isArray(payload)) return { results: payload, count: payload.length }
  if (payload && Array.isArray(payload.results)) {
    return { results: payload.results, count: Number(payload.count ?? payload.results.length) }
  }
  return { results: [], count: 0 }
}

// Turn a DRF error response into one human-readable string.
export function extractAdminError(error, fallback = 'The backend request failed.') {
  const data = error?.response?.data
  if (typeof data === 'string' && data.trim()) return data
  if (data && typeof data === 'object') {
    if (typeof data.detail === 'string' && data.detail) return data.detail
    for (const key of ['email', 'non_field_errors', 'message']) {
      const value = data[key]
      if (Array.isArray(value) && value.length) return String(value[0])
      if (typeof value === 'string' && value) return value
    }
  }
  if (error?.response?.status === 403) {
    return 'You do not have permission to access platform admin data.'
  }
  if (!error?.response && error?.message === 'Network Error') {
    return 'Cannot reach the server. Please check your connection and try again.'
  }
  if (error?.message) return String(error.message)
  return fallback
}

export async function fetchAdminStats() {
  const res = await api.get(`${ADMIN_ROOT}/stats/`)
  return res.data
}

export async function fetchAdminUsers(params = {}) {
  const res = await api.get(`${ADMIN_ROOT}/users/`, { params: cleanParams(params) })
  return unwrapList(res.data)
}

export async function fetchAdminUser(userId) {
  const res = await api.get(`${ADMIN_ROOT}/users/${userId}/`)
  return res.data
}

// Only { is_active, is_verified } are writable server-side; anything else is
// silently ignored by the backend serializer.
export async function updateAdminUser(userId, patch = {}) {
  const res = await api.patch(`${ADMIN_ROOT}/users/${userId}/`, cleanParams(patch))
  return res.data
}

export async function fetchAdminTransactions(params = {}) {
  const res = await api.get(`${ADMIN_ROOT}/transactions/`, { params: cleanParams(params) })
  return unwrapList(res.data)
}

export async function fetchAdminInstruments(params = {}) {
  const res = await api.get(`${ADMIN_ROOT}/instruments/`, { params: cleanParams(params) })
  return unwrapList(res.data)
}

// Only listing visibility ({ is_active }) is editable for instruments.
export async function updateAdminInstrument(instrumentId, patch = {}) {
  const res = await api.patch(`${ADMIN_ROOT}/instruments/${instrumentId}/`, cleanParams(patch))
  return res.data
}

export async function fetchAdminAudit(params = {}) {
  const res = await api.get(`${ADMIN_ROOT}/audit/`, { params: cleanParams(params) })
  return unwrapList(res.data)
}
