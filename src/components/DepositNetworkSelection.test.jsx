import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import api, { API_ROOT } from '../api'
import QRCode from 'qrcode'
import DepositPanel from './DepositPanel.jsx'

vi.mock('../api', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, default: { get: vi.fn(), post: vi.fn() } }
})
vi.mock('qrcode', () => ({ default: { toDataURL: vi.fn(async (address) => `data:qr,${address}`) } }))

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const configUrl = `${API_ROOT}/deposits/config/`
const depositsUrl = `${API_ROOT}/deposits/`
const networkUrl = (network) => `${API_ROOT}/deposits/networks/${network}/address/`
const networkCases = [
  ['USDT Ethereum (ERC-20)', 'USDT_ERC20', `0x${'a'.repeat(40)}`],
  ['USDT TRON (TRC-20)', 'USDT_TRC20', `T${'1'.repeat(33)}`],
  ['USDT BNB Smart Chain (BEP-20)', 'USDT_BEP20', `0x${'b'.repeat(40)}`],
]
let container
let root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  api.get.mockReset()
  api.post.mockReset()
  QRCode.toDataURL.mockClear()
  api.get.mockImplementation((url) => Promise.resolve({ data: url === configUrl ? { methods: [], deposits_enabled: false } : [] }))
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.clearAllMocks()
})

async function settle() {
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)) })
}

async function click(label) {
  const button = Array.from(container.querySelectorAll('button')).find((item) => item.textContent.trim() === label || item.textContent.trim().startsWith(label))
  expect(button).toBeTruthy()
  await act(async () => button.dispatchEvent(new MouseEvent('click', { bubbles: true })))
  await settle()
}

async function render() {
  await act(async () => root.render(<DepositPanel />))
  await settle()
}

describe('crypto network selection', () => {
  it('shows a crypto entry and the three supported networks while preserving bank and card options', async () => {
    await render()
    expect(container.textContent).toContain('Deposit via Crypto')
    expect(container.textContent).toContain('USDT Ethereum (ERC-20)')
    expect(container.textContent).toContain('USDT TRON (TRC-20)')
    expect(container.textContent).toContain('USDT BNB Smart Chain (BEP-20)')
    expect(container.textContent).toContain('Bank Transfer')
    expect(container.textContent).toContain('Card Payment')
  })

  it('keeps the bank support action and the disabled card panel available', async () => {
    await render()
    await click('Bank Transfer')
    expect(container.textContent).toContain('No bank account details are issued automatically')
    await click('Card Payment')
    expect(container.textContent).toContain('Card payments are not available yet')
    const cardAction = Array.from(container.querySelectorAll('button')).find((button) => button.textContent.includes('Card payment coming soon'))
    expect(cardAction.disabled).toBe(true)
  })

  it('uses the exact API address for both copy and QR encoding', async () => {
    const address = networkCases[0][2]
    api.get.mockImplementation((url) => Promise.resolve({ data: url === networkUrl('USDT_ERC20') ? { address } : url === configUrl ? {} : [] }))
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    await render()
    await click('USDT Ethereum (ERC-20)')
    expect(api.get).toHaveBeenCalledWith(networkUrl('USDT_ERC20'))
    expect(container.querySelector('[data-testid="deposit-address"]').textContent).toBe(address)
    expect(container.querySelector('[data-testid="deposit-address-qr"]').getAttribute('src')).toBe(`data:qr,${address}`)
    expect(QRCode.toDataURL).toHaveBeenCalledWith(address, expect.anything())
    await click('Copy address')
    expect(writeText).toHaveBeenCalledWith(address)
    expect(container.textContent).toContain('Address copied')
    expect(api.post).not.toHaveBeenCalled()
  })

  it.each(networkCases)('rejects malformed %s addresses before display or QR generation', async (label, network, address) => {
    const malformed = address.slice(0, -1)
    api.get.mockImplementation((url) => Promise.resolve({ data: url === networkUrl(network) ? { address: malformed } : url === configUrl ? {} : [] }))
    await render()
    await click(label)
    expect(container.textContent).toContain('configured address is invalid for this network')
    expect(container.querySelector('[data-testid="deposit-address"]')).toBeNull()
    expect(container.querySelector('[data-testid="deposit-address-qr"]')).toBeNull()
    expect(QRCode.toDataURL).not.toHaveBeenCalled()
  })

  it('reports clipboard rejection when the fallback also fails', async () => {
    const address = networkCases[0][2]
    api.get.mockImplementation((url) => Promise.resolve({ data: url === networkUrl('USDT_ERC20') ? { address } : url === configUrl ? {} : [] }))
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } })
    document.execCommand = vi.fn(() => false)
    await render()
    await click('USDT Ethereum (ERC-20)')
    await click('Copy address')
    expect(container.textContent).toContain('Could not copy the address')
    expect(container.textContent).not.toContain('Address copied')
  })

  it('falls back to document copy when the Clipboard API is unavailable', async () => {
    const address = networkCases[1][2]
    api.get.mockImplementation((url) => Promise.resolve({ data: url === networkUrl('USDT_TRC20') ? { address } : url === configUrl ? {} : [] }))
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined })
    document.execCommand = vi.fn(() => true)
    await render()
    await click('USDT TRON (TRC-20)')
    await click('Copy address')
    expect(document.execCommand).toHaveBeenCalledWith('copy')
    expect(container.textContent).toContain('Address copied')
  })

  it('renders loading, unavailable, and API error states', async () => {
    let resolveAddress
    api.get.mockImplementation((url) => url === networkUrl('USDT_TRC20')
      ? new Promise((resolve, reject) => { resolveAddress = { resolve, reject } })
      : Promise.resolve({ data: url === configUrl ? {} : [] }))
    await render()
    const tron = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'USDT TRON (TRC-20)')
    await act(async () => tron.dispatchEvent(new MouseEvent('click', { bubbles: true })))
    expect(container.textContent).toContain('Loading receiving address…')
    await act(async () => resolveAddress.reject({ response: { status: 503, data: { detail: 'unavailable' } } }))
    await settle()
    expect(container.textContent).toContain('This network address is currently unavailable')

    api.get.mockImplementation((url) => url === networkUrl('USDT_BEP20')
      ? Promise.reject({ response: { status: 500, data: { detail: 'Service error' } } })
      : Promise.resolve({ data: url === configUrl ? {} : [] }))
    await click('USDT BNB Smart Chain (BEP-20)')
    expect(container.textContent).toContain('Service error')
    expect(container.querySelector('[role="alert"]')).toBeTruthy()
  })
})
