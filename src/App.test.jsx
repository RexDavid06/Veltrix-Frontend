import React from 'react'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// End-to-end guardrails for role-aware routing, exercised through the real
// App component with only the network (axios) and the browser APIs jsdom
// lacks (fetch/scrollTo) stubbed.
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const ADMIN = {
  id: 1,
  email: 'root@veltrix.test',
  username: 'root@veltrix.test',
  first_name: 'Root',
  last_name: 'Admin',
  role: 'admin',
  is_verified: true,
  is_staff: true,
}

const CLIENT = {
  id: 2,
  email: 'client@veltrix.test',
  username: 'client@veltrix.test',
  first_name: 'Casey',
  last_name: 'Client',
  role: 'client',
  is_verified: false,
  is_staff: false,
}

const ADMIN_STATS = {
  users: { total: 3, active: 3, verified: 2, admins: 1, new_last_7_days: 1, new_last_30_days: 2 },
  accounts: { total: 3, total_cash_balance: '1500.00' },
  transactions: { total: 5, last_7_days: 2, total_volume: '4200.00', by_side: { buy: 3, sell: 2 } },
  support: { open_conversations: 0, closed_conversations: 1, open_tickets: 0 },
}

let App
let api
let container
let root
let sessionProfile
let profileFails
let requested

const ok = (data) => ({ data, status: 200, statusText: 'OK', headers: {}, config: {} })

function jsonError(status, data) {
  const error = new Error(`Request failed with status code ${status}`)
  error.response = { status, data }
  error.config = {}
  throw error
}

function installAdapter() {
  api.defaults.adapter = async (config) => {
    const url = String(config.url || '')
    requested.push(url)
    if (url.includes('/profile/')) {
      if (profileFails) jsonError(500, { detail: 'boom' })
      return ok(sessionProfile)
    }
    if (url.includes('/dashboard/')) return ok({ account: { cash_balance: '1500.00' }, positions: [] })
    if (url.includes('/support/')) return ok([])
    if (url.includes('/watchlist/')) return ok([])
    if (url.includes('/conversations/')) return ok([])
    if (url.includes('/admin/stats/')) return ok(ADMIN_STATS)
    if (url.includes('/admin/audit/')) return ok({ count: 0, results: [] })
    if (url.includes('/admin/users/')) return ok({ count: 0, results: [] })
    return ok({})
  }
}

function flush() {
  return act(async () => {
    await new Promise((resolve) => { setTimeout(resolve, 0) })
  })
}

async function mount() {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root.render(<App />)
  })
  await flush()
  await flush()
}

beforeEach(async () => {
  vi.resetModules()
  sessionStorage.clear()
  localStorage.clear()
  vi.stubEnv('VITE_API_URL', 'http://127.0.0.1:8799')
  sessionProfile = ADMIN
  profileFails = false
  requested = []
  window.scrollTo = () => {}
  global.fetch = async () => ({ ok: false, status: 503, json: async () => ({}) })
  api = (await import('./api.js')).default
  installAdapter()
  App = (await import('./App.jsx')).default
})

afterEach(() => {
  if (root) act(() => { root.unmount() })
  if (container && container.parentNode) container.parentNode.removeChild(container)
  root = null
  container = null
})

function signIn() {
  sessionStorage.setItem('veltrix_token', 'test-token')
}

function visit(path) {
  window.history.pushState({}, '', path)
}

describe('role-aware routing', () => {
  it('serves the admin console to an administrator at /admin', async () => {
    signIn()
    visit('/admin')
    await mount()

    expect(container.textContent).toContain('VELTRIX ADMINISTRATION')
    expect(container.textContent).toContain('Operations Control Centre')
    expect(container.textContent).not.toContain('Access denied')
    // Guards against a refetch loop: the profile must be loaded once.
    expect(requested.filter((url) => url.includes('/profile/'))).toHaveLength(1)
  })

  it('routes deep admin links from the URL', async () => {
    signIn()
    visit('/admin/users')
    await mount()

    expect(container.textContent).toContain('Client Accounts Directory')
  })

  it('shows the unauthorized screen to a signed-in non-admin', async () => {
    sessionProfile = CLIENT
    signIn()
    visit('/admin')
    await mount()

    expect(container.textContent).toContain('Access denied')
    expect(container.textContent).toContain('limited to authorized operations staff')
    expect(container.textContent).not.toContain('Operations Control Centre')
  })

  it('asks anonymous visitors to authenticate', async () => {
    visit('/admin')
    await mount()

    expect(container.textContent).toContain('Administrator sign-in required')
    expect(container.textContent).not.toContain('Operations Control Centre')
  })

  it('never renders the admin console before the role is confirmed', async () => {
    visit('/admin')
    await mount()

    expect(container.textContent).not.toContain('Operations Control Centre')
    expect(container.textContent).not.toContain('Access denied')
  })

  it('offers a retry instead of denying when the profile request fails', async () => {
    signIn()
    profileFails = true
    visit('/admin')
    await mount()

    expect(container.textContent).toMatch(/could not confirm your administrator access/i)
    expect(container.textContent).not.toContain('Access denied')
    expect(container.textContent).not.toContain('Operations Control Centre')
  })

  it('sends a signed-in administrator away from the login screen', async () => {
    signIn()
    visit('/login')
    await mount()

    expect(container.textContent).toContain('VELTRIX ADMINISTRATION')
    expect(container.textContent).not.toContain('Administrator sign-in required')
  })

  it('keeps clients out of the admin area and lands them in the workspace', async () => {
    sessionProfile = CLIENT
    signIn()
    visit('/dashboard')
    await mount()

    expect(container.textContent).not.toContain('VELTRIX ADMINISTRATION')
    expect(container.textContent).not.toContain('Access denied')
    expect(requested.some((url) => url.includes('/dashboard/'))).toBe(true)
  })
})

describe('client workspace demo labels', () => {
  it('does not show a DEMO mode tag to signed-in clients', async () => {
    sessionProfile = CLIENT
    signIn()
    visit('/dashboard')
    await mount()

    // The client Shell previously rendered a "● DEMO MODE" chip and the
    // allocation donut labelled itself "DEMO"; neither must reach clients.
    expect(container.textContent).not.toContain('DEMO MODE')
    expect(container.querySelector('.demo-chip')).toBeNull()
  })
})

describe('support unread notifications', () => {
  it('surfaces unread client messages from polls without a manual reload', async () => {
    sessionProfile = CLIENT
    signIn()
    visit('/dashboard')

    let unread = []
    api.defaults.adapter = async (config) => {
      const url = String(config.url || '')
      requested.push(url)
      if (url.includes('/profile/')) return ok(sessionProfile)
      if (url.includes('/dashboard/')) return ok({ account: { cash_balance: '1500.00' }, positions: [] })
      if (url.includes('/support/')) return ok([])
      if (url.includes('/watchlist/')) return ok([])
      if (url.includes('/conversations/')) return ok(unread)
      return ok({})
    }

    await mount()
    expect(container.textContent).not.toContain('New message from VELTRIX Support.')

    // Simulate an admin reply arriving between polls.
    unread = [{
      id: 5,
      subject: 'Deposit',
      is_active: true,
      unread_count: 1,
      messages: [{ id: 50, content: 'Your deposit cleared.', sender: { id: 1, role: 'admin' }, sender_id: 1 }],
    }]

    await act(async () => {
      await new Promise((resolve) => { setTimeout(resolve, 15000) })
    })
    await flush()

    expect(container.textContent).toContain('New message from VELTRIX Support.')
  })
})

describe('demo funding entry points', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  // Re-imports the app with the explicit Vite switch set, mirroring the
  // existing stub-before-import pattern used for VITE_API_URL.
  async function mountWithDemoTopUp(enabled) {
    vi.resetModules()
    vi.stubEnv('VITE_DEMO_TOPUP_ENABLED', enabled ? '1' : '')
    sessionProfile = CLIENT
    api = (await import('./api.js')).default
    installAdapter()
    App = (await import('./App.jsx')).default
    await mount()
  }

  it('hides every demo top-up entry point when the switch is off', async () => {
    signIn()
    visit('/dashboard')
    await mountWithDemoTopUp(false)

    // Navigation surface (Deposits) and every dashboard/portfolio/wallet CTA.
    expect(container.querySelector('[data-view="deposits"]')).toBeNull()
    expect(container.textContent).not.toContain('+ Demo Funds')
    expect(container.textContent).not.toContain('Deposit Trading Funds')
    expect(container.textContent).not.toContain('Deposit Funds')
  })

  it('shows the demo surfaces only when explicitly enabled', async () => {
    signIn()
    visit('/dashboard')
    await mountWithDemoTopUp(true)

    expect(container.querySelector('[data-view="deposits"]')).toBeTruthy()
    expect(container.textContent).toContain('+ Demo Funds (simulated)')

    const entry = Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent.includes('+ Demo Funds'))
    expect(entry).toBeTruthy()
    await act(async () => {
      entry.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }))
    })
    await flush()

    expect(container.textContent).toContain('Add Demo Funds (Simulated)')
  })

  it('reports a demo credit as simulated, never as real money', async () => {
    signIn()
    visit('/dashboard')
    await mountWithDemoTopUp(true)

    const entry = Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent.includes('+ Demo Funds'))
    await act(async () => {
      entry.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }))
    })
    await flush()

    // The support panel also renders a form; target the funding modal's form.
    const form = Array.from(container.querySelectorAll('form'))
      .find((node) => node.textContent.includes('Demo Amount'))
    expect(form).toBeTruthy()
    await act(async () => {
      form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }))
    })
    await flush()
    await flush()

    expect(container.textContent).toContain('No real money was deposited')
    expect(container.textContent).not.toContain('Successfully topped up')
  })
})
