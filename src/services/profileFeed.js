// Client for the self-service profile endpoint (GET/PATCH /api/profile/).
// The endpoint always operates on the authenticated request's user; no id is
// ever sent by the client.

import api, { API_ROOT } from '../api'

const PROFILE_URL = `${API_ROOT}/profile/`

export async function fetchProfile() {
  const res = await api.get(PROFILE_URL)
  return res.data
}

// Only send writable fields: the backend ignores privileged ones anyway, and
// never sending them keeps the intent explicit at the client boundary. Email
// is writable server-side (and keeps the login username in sync).
export async function updateProfile(patch = {}) {
  const payload = {}
  if (patch.first_name !== undefined) payload.first_name = patch.first_name
  if (patch.last_name !== undefined) payload.last_name = patch.last_name
  if (patch.email !== undefined) payload.email = patch.email
  const res = await api.patch(PROFILE_URL, payload)
  return res.data
}

/**
 * Turn a DRF validation response into a summary plus per-field messages so
 * the form can render errors next to the offending input.
 *
 * Returns { summary, fieldErrors }.
 */
export function extractProfileError(error, fallback = 'Could not save your profile.') {
  const data = error?.response?.data
  const fieldErrors = {}

  if (data && typeof data === 'object' && !Array.isArray(data)) {
    if (typeof data.detail === 'string' && data.detail) {
      return { summary: data.detail, fieldErrors }
    }
    Object.entries(data).forEach(([key, value]) => {
      const messages = Array.isArray(value) ? value : [value]
      if (messages.length) fieldErrors[key] = String(messages[0])
    })
  }

  if (Object.keys(fieldErrors).length) {
    return { summary: '', fieldErrors }
  }
  if (!error?.response && error?.message === 'Network Error') {
    return { summary: 'Cannot reach the server. Please check your connection and try again.', fieldErrors }
  }
  if (error?.response?.status === 401) {
    return { summary: 'Your session has expired. Please sign in again.', fieldErrors }
  }
  if (error?.message) return { summary: String(error.message), fieldErrors }
  return { summary: fallback, fieldErrors }
}
