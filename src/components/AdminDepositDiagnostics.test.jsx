import React from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import api from '../api'
import AdminDepositDiagnostics from './AdminDepositDiagnostics.jsx'

vi.mock('../api', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, default: { get: vi.fn(), post: vi.fn() } }
})

globalThis.IS_REACT_ACT_ENVIRONMENT = true

let container
let root

describe('AdminDepositDiagnostics', () => {
  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    api.get.mockReset()
  })

  afterEach(async () => {
    await root.unmount()
    container.remove()
  })

  it('runs diagnostics and displays sanitized config and history results', async () => {
    api.get.mockImplementation((url) => {
      if (String(url).includes('/deposits/config/')) {
        return Promise.resolve({
          status: 200,
          data: {
            crypto_mode: 'direct_tron',
            deposits_enabled: true,
            networks: [
              { id: 'tron_trc20', key: 'TRC20', enabled: true, display_enabled: true, address: 'TABC' },
              { id: 'eth_erc20', key: 'ERC20', enabled: true, display_enabled: true, address: '0xABC' },
              { id: 'bsc_bep20', key: 'BEP20', enabled: true, display_enabled: true },
            ],
          },
        })
      }
      if (String(url).endsWith('/deposits/') || String(url).includes('/deposits')) {
        return Promise.resolve({ status: 200, data: [] })
      }
      return Promise.reject(new Error('unknown'))
    })

    await React.act(async () => {
      root.render(<AdminDepositDiagnostics />)
    })

    const button = Array.from(container.querySelectorAll('button')).find((b) => b.textContent.includes('Run Diagnostics'))
    await React.act(async () => {
      button.click()
    })

    expect(container.textContent).toContain('HTTP status: 200')
    expect(container.textContent).toContain('crypto_mode: direct_tron')
    expect(container.textContent).toContain('tron_trc20')
    expect(container.textContent).toContain('eth_erc20')
    expect(container.textContent).toContain('bsc_bep20')
    expect(container.textContent).not.toContain('TABC')
    expect(container.textContent).not.toContain('0xABC')
  })

  it('sanitizes errors and does not show raw responses', async () => {
    api.get.mockImplementation((url) => {
      if (String(url).includes('/deposits/config/')) {
        const err = new Error('Request failed')
        err.response = { status: 503, data: { detail: 'Service unavailable' } }
        return Promise.reject(err)
      }
      const err2 = new Error('Request failed')
      err2.response = { status: 401, data: { detail: 'Unauthorized' } }
      return Promise.reject(err2)
    })

    await React.act(async () => {
      root.render(<AdminDepositDiagnostics />)
    })

    const button = Array.from(container.querySelectorAll('button')).find((b) => b.textContent.includes('Run Diagnostics'))
    await React.act(async () => {
      button.click()
    })

    expect(container.textContent).toContain('Failed')
    expect(container.textContent).toContain('Service unavailable')
    expect(container.textContent).toContain('Unauthorized')
  })

  it('discovers networks from methods[].networks when top-level networks missing', async () => {
    api.get.mockImplementation((url) => {
      if (String(url).includes('/deposits/config/')) {
        return Promise.resolve({
          status: 200,
          data: {
            crypto_mode: 'direct_tron',
            deposits_enabled: true,
            methods: [
              {
                type: 'crypto',
                networks: [
                  { id: 'tron_trc20', key: 'TRC20', enabled: true, display_enabled: true },
                  { id: 'eth_erc20', key: 'ERC20', enabled: false, display_enabled: true },
                  { id: 'bsc_bep20', key: 'BEP20', enabled: true, display_enabled: true },
                ],
              },
            ],
          },
        })
      }
      if (String(url).endsWith('/deposits/') || String(url).includes('/deposits')) {
        return Promise.resolve({ status: 200, data: [] })
      }
      return Promise.reject(new Error('unknown'))
    })

    await React.act(async () => {
      root.render(<AdminDepositDiagnostics />)
    })

    const button = Array.from(container.querySelectorAll('button')).find((b) => b.textContent.includes('Run Diagnostics'))
    await React.act(async () => {
      button.click()
    })

    expect(container.textContent).toContain('methods[].networks')
    expect(container.textContent).toContain('tron_trc20')
    expect(container.textContent).toContain('eth_erc20')
    expect(container.textContent).toContain('bsc_bep20')
  })

  it('reports unavailable networks safely when configuration missing', async () => {
    api.get.mockImplementation((url) => {
      if (String(url).includes('/deposits/config/')) {
        return Promise.resolve({
          status: 200,
          data: {
            crypto_mode: 'direct_tron',
            deposits_enabled: true,
            networks: [],
          },
        })
      }
      if (String(url).endsWith('/deposits/') || String(url).includes('/deposits')) {
        return Promise.resolve({ status: 200, data: [] })
      }
      return Promise.reject(new Error('unknown'))
    })

    await React.act(async () => {
      root.render(<AdminDepositDiagnostics />)
    })

    const button = Array.from(container.querySelectorAll('button')).find((b) => b.textContent.includes('Run Diagnostics'))
    await React.act(async () => {
      button.click()
    })

    expect(container.textContent).toContain('networks found in: none')
    expect(container.textContent).toContain('tron_trc20')
    expect(container.textContent).toContain('no')
  })
})
