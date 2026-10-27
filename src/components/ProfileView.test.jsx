import React from 'react'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// jsdom + React's own act are already available in this project (the vitest
// environment is jsdom); no testing-library dependency is added. ProfileView
// and the api client are imported after vi.resetModules() so the injected
// adapter and the component under test share one axios instance.
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const SERVER_PROFILE = {
  id: 4,
  email: 'ann@example.test',
  username: 'ann@example.test',
  first_name: 'Ann',
  last_name: 'Lee',
  role: 'admin',
  is_verified: false,
  is_staff: true,
}

const CLIENT_PROFILE = {
  ...SERVER_PROFILE,
  role: 'client',
  is_staff: false,
}

let api
let ProfileView
let container
let root
let requests

// Let queued promises (axios chains) settle inside act.
function flush() {
  return act(async () => {
    await new Promise((resolve) => { setTimeout(resolve, 0) })
  })
}

async function mount(ctx) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root.render(<ProfileView ctx={ctx} />)
  })
  await flush()
}

function setResponse(handler) {
  api.defaults.adapter = async (config) => {
    requests.push({ method: config.method, url: config.url, body: config.data })
    return handler(config)
  }
}

const ok = (data) => ({ data, status: 200, statusText: 'OK', headers: {}, config: {} })
const badRequest = (data) => {
  const error = new Error('Request failed with status code 400')
  error.response = { status: 400, data }
  error.config = {}
  throw error
}

function fill(input, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  setter.call(input, value)
  input.dispatchEvent(new window.Event('input', { bubbles: true }))
}

function field(container, id) {
  return container.querySelector(`#${id}`)
}

async function submit() {
  await act(async () => {
    container.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }))
  })
  await flush()
}

beforeEach(async () => {
  vi.resetModules()
  sessionStorage.clear()
  localStorage.clear()
  vi.stubEnv('VITE_API_URL', 'http://127.0.0.1:8799')
  api = (await import('../api.js')).default
  ProfileView = (await import('./ProfileView.jsx')).default
  requests = []
})

afterEach(() => {
  if (root) act(() => { root.unmount() })
  if (container && container.parentNode) container.parentNode.removeChild(container)
  root = null
  container = null
})

describe('ProfileView', () => {
  it('shows the backend record, including role and verification', async () => {
    setResponse(() => ok(SERVER_PROFILE))
    const ctx = { profile: null, onProfileSaved: vi.fn(), showToast: vi.fn(), onLogout: vi.fn() }

    await mount(ctx)

    const html = container.innerHTML
    expect(requests[0].method).toBe('get')
    expect(html).toContain('ann@example.test')
    expect(html).toContain('Administrator')
    expect(html).toContain('Pending verification')
    expect(html).toContain('VX-004')
    // The account record still displays the backend email read-only, while the
    // admin edit form exposes it for changes.
    expect(field(container, 'profileEmail').readOnly).toBe(true)
    expect(field(container, 'profileEmailEdit').value).toBe('ann@example.test')
    expect(container.querySelectorAll('input[readonly]').length).toBe(1)
  })

  it('saves the name through PATCH and reports success', async () => {
    let call = 0
    setResponse(() => {
      call += 1
      return ok(call === 1 ? SERVER_PROFILE : { ...SERVER_PROFILE, first_name: 'Anna', last_name: 'Nguyen' })
    })
    const onProfileSaved = vi.fn()
    const showToast = vi.fn()
    await mount({ profile: null, onProfileSaved, showToast, onLogout: vi.fn() })

    await act(async () => { fill(field(container, 'profileFirstName'), 'Anna') })
    await act(async () => { fill(field(container, 'profileLastName'), 'Nguyen') })
    await submit()

    const patch = requests.find((r) => r.method === 'patch')
    expect(patch).toBeTruthy()
    expect(JSON.parse(patch.body)).toEqual({
      email: 'ann@example.test',
      first_name: 'Anna',
      last_name: 'Nguyen',
    })
    expect(onProfileSaved).toHaveBeenCalledWith(expect.objectContaining({ first_name: 'Anna' }))
    expect(showToast).toHaveBeenCalledWith('Profile updated.')
    expect(container.innerHTML).toContain('Anna Nguyen')
  })

  it('lets an administrator change their email through PATCH', async () => {
    const updated = { ...SERVER_PROFILE, email: 'new@example.test', username: 'new@example.test' }
    let call = 0
    setResponse(() => {
      call += 1
      return ok(call === 1 ? SERVER_PROFILE : updated)
    })
    const onProfileSaved = vi.fn()
    await mount({ profile: null, onProfileSaved, showToast: vi.fn(), onLogout: vi.fn() })

    await act(async () => { fill(field(container, 'profileEmailEdit'), 'new@example.test') })
    await submit()

    const patch = requests.find((r) => r.method === 'patch')
    expect(patch).toBeTruthy()
    expect(JSON.parse(patch.body)).toEqual({
      email: 'new@example.test',
      first_name: 'Ann',
      last_name: 'Lee',
    })
    expect(onProfileSaved).toHaveBeenCalledWith(expect.objectContaining({ email: 'new@example.test' }))
    expect(field(container, 'profileEmail').value).toBe('new@example.test')
  })

  it('renders field-level backend errors against the right input', async () => {
    let call = 0
    setResponse(() => {
      call += 1
      if (call === 1) return ok(SERVER_PROFILE)
      return badRequest({ first_name: ['This field may not be blank.'] })
    })
    await mount({ profile: null, onProfileSaved: vi.fn(), showToast: vi.fn(), onLogout: vi.fn() })

    await act(async () => { fill(field(container, 'profileFirstName'), 'X') })
    await submit()

    expect(container.innerHTML).toContain('This field may not be blank.')
    expect(container.querySelector('#profileFirstNameError')).toBeTruthy()
    expect(field(container, 'profileFirstName').getAttribute('aria-invalid')).toBe('true')
  })

  it('keeps a name-only form for clients: privileged fields are never editable inputs', async () => {
    setResponse(() => ok(CLIENT_PROFILE))
    await mount({ profile: null, onProfileSaved: vi.fn(), showToast: vi.fn(), onLogout: vi.fn() })

    expect(container.querySelectorAll('input:not([readonly])').length).toBe(2)
    const names = Array.from(container.querySelectorAll('input:not([readonly])')).map((input) => input.name)
    expect(names.sort()).toEqual(['first_name', 'last_name'])
    expect(container.querySelector('#profileEmailEdit')).toBeNull()
    expect(field(container, 'profileEmail').readOnly).toBe(true)
  })

  it('falls back to the in-app profile when the refresh fails', async () => {
    setResponse(() => { throw new Error('Network Error') })
    await mount({ profile: SERVER_PROFILE, onProfileSaved: vi.fn(), showToast: vi.fn(), onLogout: vi.fn() })

    expect(container.innerHTML).toContain('ann@example.test')
    expect(container.innerHTML).toContain('Administrator')
  })

  it('offers a retry when there is nothing to show', async () => {
    setResponse(() => { throw new Error('Network Error') })
    await mount({ profile: null, onProfileSaved: vi.fn(), showToast: vi.fn(), onLogout: vi.fn() })

    expect(container.innerHTML).toMatch(/Retry/)
    expect(container.innerHTML).toMatch(/Cannot reach the server/)
  })
})
