import { beforeEach, describe, expect, it, vi } from 'vitest'

beforeEach(() => {
  vi.resetModules()
  sessionStorage.clear()
  localStorage.clear()
  vi.stubEnv('VITE_API_URL', 'http://127.0.0.1:8799')
})

describe('api client', () => {
  it('sets bearer token on requests', async () => {
    const { default: api } = await import('./api.js')
    sessionStorage.setItem('veltrix_token', 'abc123')

    // Inject an in-memory adapter: jsdom has no network, and the fetch mock
    // below is never reached because axios defaults to the XHR adapter in a
    // browser-like environment.
    const calls = []
    api.defaults.adapter = async (config) => {
      calls.push(config)
      return { data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config }
    }

    await api.get('/test')
    expect(calls).toHaveLength(1)
    expect(calls[0].headers.Authorization).toBe('Bearer abc123')
  })
})

describe('resolveApiRoot', () => {
  const remotePage = {
    hostname: 'veltrix-frontend-9mc7.onrender.com',
    origin: 'https://veltrix-frontend-9mc7.onrender.com',
  }
  const localPage = { hostname: 'localhost', origin: 'http://localhost:3000' }

  it('falls back to the deployed backend when a build baked in a loopback URL', async () => {
    const { resolveApiRoot } = await import('./api.js')
    expect(resolveApiRoot('http://127.0.0.1:8000', remotePage))
      .toBe('https://veltrix-backend-5cwa.onrender.com/api')
    expect(resolveApiRoot('http://localhost:8000', remotePage))
      .toBe('https://veltrix-backend-5cwa.onrender.com/api')
  })

  it('keeps a loopback API URL when the app itself runs locally', async () => {
    const { resolveApiRoot } = await import('./api.js')
    expect(resolveApiRoot('http://127.0.0.1:8000', localPage)).toBe('http://127.0.0.1:8000/api')
  })

  it('normalizes real backend URLs and relative dev paths', async () => {
    const { resolveApiRoot } = await import('./api.js')
    expect(resolveApiRoot('https://veltrix-backend-5cwa.onrender.com', remotePage))
      .toBe('https://veltrix-backend-5cwa.onrender.com/api')
    expect(resolveApiRoot('https://veltrix-backend-5cwa.onrender.com/', remotePage))
      .toBe('https://veltrix-backend-5cwa.onrender.com/api')
    expect(resolveApiRoot('', localPage)).toBe('/api')
  })
})
