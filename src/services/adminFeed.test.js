import { beforeEach, describe, expect, it, vi } from 'vitest'

beforeEach(() => {
  vi.resetModules()
  sessionStorage.clear()
  localStorage.clear()
  vi.stubEnv('VITE_API_URL', 'http://127.0.0.1:8799')
})

async function setup() {
  const admin = await import('./adminFeed.js')
  const { default: api, API_ROOT } = await import('../api.js')
  const calls = []
  api.defaults.adapter = async (config) => {
    calls.push(config)
    return {
      data: { results: [], count: 0 },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }
  }
  return { admin, api, API_ROOT, calls }
}

describe('cleanParams', () => {
  it('drops empty values and trims strings', async () => {
    const { admin } = await setup()
    expect(admin.cleanParams({
      search: '  ann  ',
      role: '',
      is_active: null,
      page: undefined,
      is_verified: 'false',
      page_size: 20,
      flag: false,
    })).toEqual({ search: 'ann', is_verified: 'false', page_size: 20, flag: false })
  })
})

describe('unwrapList', () => {
  it('normalizes a DRF page payload', async () => {
    const { admin } = await setup()
    expect(admin.unwrapList({ count: 42, next: 'x', previous: null, results: [{ id: 1 }] }))
      .toEqual({ results: [{ id: 1 }], count: 42 })
  })

  it('normalizes a bare array payload', async () => {
    const { admin } = await setup()
    expect(admin.unwrapList([{ id: 1 }, { id: 2 }]))
      .toEqual({ results: [{ id: 1 }, { id: 2 }], count: 2 })
  })

  it('never throws on unexpected payloads', async () => {
    const { admin } = await setup()
    expect(admin.unwrapList({ detail: 'denied' })).toEqual({ results: [], count: 0 })
    expect(admin.unwrapList(null)).toEqual({ results: [], count: 0 })
  })
})

describe('extractAdminError', () => {
  it('surfaces DRF detail strings', async () => {
    const { admin } = await setup()
    const error = { response: { status: 400, data: { detail: 'You cannot deactivate your own account.' } } }
    expect(admin.extractAdminError(error)).toBe('You cannot deactivate your own account.')
  })

  it('explains permission failures', async () => {
    const { admin } = await setup()
    expect(admin.extractAdminError({ response: { status: 403, data: {} } }))
      .toBe('You do not have permission to access platform admin data.')
  })

  it('explains network failures', async () => {
    const { admin } = await setup()
    expect(admin.extractAdminError({ message: 'Network Error' }))
      .toMatch(/Cannot reach the server/)
  })
})

describe('admin API calls', () => {
  it('lists users at /api/admin/users/ with cleaned params and bearer token', async () => {
    const { admin, API_ROOT, calls } = await setup()
    sessionStorage.setItem('veltrix_token', 'abc123')

    await admin.fetchAdminUsers({ search: '  ann  ', role: '', page: 2, page_size: 20 })

    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe(`${API_ROOT}/admin/users/`)
    expect(calls[0].method).toBe('get')
    expect(calls[0].params).toEqual({ search: 'ann', page: 2, page_size: 20 })
    expect(calls[0].headers.Authorization).toBe('Bearer abc123')
  })

  it('fetches platform stats', async () => {
    const { admin, API_ROOT, calls } = await setup()
    await admin.fetchAdminStats()
    expect(calls[0].url).toBe(`${API_ROOT}/admin/stats/`)
    expect(calls[0].method).toBe('get')
  })

  it('patches account state flags with booleans intact', async () => {
    const { admin, API_ROOT, calls } = await setup()
    await admin.updateAdminUser(7, { is_active: false })

    expect(calls[0].url).toBe(`${API_ROOT}/admin/users/7/`)
    expect(calls[0].method).toBe('patch')
    expect(JSON.parse(calls[0].data)).toEqual({ is_active: false })
  })

  it('patches instrument listing visibility', async () => {
    const { admin, API_ROOT, calls } = await setup()
    await admin.updateAdminInstrument(3, { is_active: true })

    expect(calls[0].url).toBe(`${API_ROOT}/admin/instruments/3/`)
    expect(calls[0].method).toBe('patch')
    expect(JSON.parse(calls[0].data)).toEqual({ is_active: true })
  })

  it('filters transactions and audit entries through query params', async () => {
    const { admin, API_ROOT, calls } = await setup()

    await admin.fetchAdminTransactions({ side: 'buy', status: '', search: 'BTC' })
    await admin.fetchAdminAudit({ include_requests: '', page: 1, page_size: 20 })

    expect(calls[0].url).toBe(`${API_ROOT}/admin/transactions/`)
    expect(calls[0].params).toEqual({ side: 'buy', search: 'BTC' })
    expect(calls[1].url).toBe(`${API_ROOT}/admin/audit/`)
    expect(calls[1].params).toEqual({ page: 1, page_size: 20 })
  })
})
