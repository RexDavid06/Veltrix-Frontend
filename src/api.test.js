import { beforeEach, describe, expect, it, vi } from 'vitest'

beforeEach(() => {
  vi.resetModules()
  sessionStorage.clear()
  localStorage.clear()
  global.fetch = vi.fn()
  vi.stubEnv('VITE_API_URL', 'http://127.0.0.1:8799')
})

describe('api client', () => {
  it('sets bearer token on requests', async () => {
    const { default: api } = await import('./api.js')
    sessionStorage.setItem('veltrix_token', 'abc123')
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ ok: true }),
    })
    await api.get('/test')
    expect(global.fetch).toHaveBeenCalled()
    const call = global.fetch.mock.calls[0]
    expect(call[1].headers.Authorization).toBe('Bearer abc123')
  })
})
