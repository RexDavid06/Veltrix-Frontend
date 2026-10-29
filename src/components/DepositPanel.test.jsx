import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import api, { API_ROOT } from '../api'
import DepositPanel from './DepositPanel.jsx'

vi.mock('../api', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, default: { get: vi.fn(), post: vi.fn() } }
})
vi.mock('qrcode', () => ({ default: { toDataURL: vi.fn(async (address) => `data:qr,${address}`) } }))

const CONFIG_URL = `${API_ROOT}/deposits/config/`
const DEPOSITS_URL = `${API_ROOT}/deposits/`

globalThis.IS_REACT_ACT_ENVIRONMENT = true

let container
let root

function configData(overrides = {}) {
  return {
    deposits_enabled: true,
    crypto_mode: 'direct_tron',
    bank: { enabled: false, currency: '', instructions: 'Contact support.' },
    ...overrides,
  }
}

function mockLoad(deposits = [], config = configData()) {
  api.get.mockImplementation((url) => {
    if (url === CONFIG_URL) return Promise.resolve({ data: config })
    return Promise.resolve({ data: deposits })
  })
}

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  api.get.mockReset()
  api.post.mockReset()
  mockLoad()
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.clearAllMocks()
  vi.unstubAllEnvs()
})

async function settle() {
  await act(async () => { await new Promise((resolve) => { setTimeout(resolve, 0) }) })
}

async function setInput(input, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  await act(async () => {
    setter.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

async function fillAndSubmit(amount) {
  await setInput(container.querySelector('#depositAmount'), amount)
  await act(async () => {
    container.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
  await settle()
}

async function clickButton(label) {
  const button = Array.from(container.querySelectorAll('button'))
    .find((candidate) => candidate.textContent.trim() === label || candidate.textContent.trim().startsWith(label))
  expect(button).toBeTruthy()
  await act(async () => {
    button.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }))
  })
  await settle()
}

describe('Deposit panel', () => {
  it('shows the network selection entry without a payment form', async () => {
    mockLoad([], configData({ crypto_mode: 'nowpayments' }))
    await act(async () => root.render(<DepositPanel />))
    await settle()
    expect(container.textContent).toContain('Deposit funds')
    expect(container.textContent).toContain('Deposit via Crypto')
    expect(container.querySelector('#depositAmount')).toBeNull()
  })

  it('loads configuration and history, then requests only the selected network address', async () => {
    mockLoad([], configData({ crypto_mode: 'nowpayments' }))
    api.get.mockImplementation((url) => Promise.resolve({ data: url.endsWith('/USDT_ERC20/address/')
      ? { address: '0xSelected' }
      : url === CONFIG_URL ? configData({ crypto_mode: 'nowpayments' }) : [] }))
    await act(async () => root.render(<DepositPanel />))
    await settle()
    expect(api.get).toHaveBeenCalledWith(CONFIG_URL)
    expect(api.get).toHaveBeenCalledWith(DEPOSITS_URL)
    await clickButton('USDT Ethereum (ERC-20)')
    expect(api.get).toHaveBeenCalledWith(`${API_ROOT}/deposits/networks/USDT_ERC20/address/`)
    expect(api.post).not.toHaveBeenCalled()
  })

  it('does not create a crypto deposit even when legacy configuration advertises NOWPayments', async () => {
    mockLoad([], configData({ crypto_mode: 'nowpayments' }))
    await act(async () => root.render(<DepositPanel />))
    await settle()
    expect(container.textContent).toContain('deposit processing is not enabled')
    expect(container.querySelector('#depositAmount')).toBeNull()
    expect(api.post).not.toHaveBeenCalled()
  })

  it('fetches and displays the selected TRON address without creating a deposit', async () => {
    vi.stubEnv('VITE_CRYPTO_DEPOSIT_MODE', 'direct_tron')
    const shared = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'
    mockLoad([], configData({
      crypto_mode: 'direct_tron',
      tron: {
        address: shared, contract_address: shared, enabled: true, live_enabled: true,
        unique_amount_enabled: true, min_amount: '', max_amount: '',
      },
    }))
    api.get.mockImplementation((url) => Promise.resolve({ data: url.endsWith('/USDT_TRC20/address/')
      ? { address: shared }
      : url === CONFIG_URL ? configData({ crypto_mode: 'direct_tron' }) : [] }))
    await act(async () => root.render(<DepositPanel />))
    await settle()
    await clickButton('USDT TRON (TRC-20)')
    await act(async () => waitForCondition(() => container.querySelector('[data-testid="deposit-address"]')))
    expect(container.textContent).toContain(shared)
    expect(container.textContent).toContain('Deposit processing and balance crediting are not enabled')
    expect(api.post).not.toHaveBeenCalled()
  })

  it('does not accept frontend transaction-hash submissions', async () => {
    vi.stubEnv('VITE_CRYPTO_DEPOSIT_MODE', 'direct_tron')
    const txid = 'a'.repeat(64)
    const deposit = {
      id: 11, rail: 'crypto', reference: 'VELT-11', expected_amount: '5', payable_amount: '5',
      requested_amount: '5', status: 'pending', required_confirmations: 20, confirmations: 0,
      instructions: { address: 'TSharedAddress', amount: '5', note: 'Send on TRC20 only.' },
    }
    mockLoad([deposit], configData({ crypto_mode: 'direct_tron', tron: { address: 'TSharedAddress' } }))
    deposit.submitted_txid = txid
    await act(async () => root.render(<DepositPanel />))
    await settle()
    expect(container.querySelector('#txid-11')).toBeNull()
    expect(container.textContent).toContain('This is a claim, not proof of payment')
    expect(api.post).not.toHaveBeenCalled()
  })

  it('creates a manual bank request without account details', async () => {
    mockLoad([], configData({
      bank: { enabled: true, currency: 'USD', instructions: 'Contact the Veltrix support channel.' },
    }))
    api.post.mockResolvedValue({ data: {
      id: 12, rail: 'bank', asset: 'USD', reference: 'VELT-BANK12', expected_amount: '50.00',
      status: 'pending', instructions: {
        method: 'bank_transfer', reference: 'VELT-BANK12', amount: '50.00', currency: 'USD',
        message: 'Use the Veltrix support channel to request verified bank-transfer instructions.',
        account_details_provided: false,
      },
    } })
    await act(async () => root.render(<DepositPanel onNavigate={() => {}} />))
    await settle()
    await clickButton('Bank Transfer')
    await fillAndSubmit('50.00')
    expect(api.post).toHaveBeenCalledWith(`${API_ROOT}/deposits/bank/`, expect.objectContaining({ amount: '50.00' }), expect.anything())
    expect(container.textContent).toContain('No bank account details are issued automatically')
    expect(container.textContent).toContain('Contact support for verified details')
    expect(container.textContent).not.toContain('account_number')
  })

  it('always shows crypto, bank, and card options when bank is disabled', async () => {
    mockLoad([], configData({ bank: { enabled: false, currency: '', instructions: '' } }))
    await act(async () => root.render(<DepositPanel />))
    await settle()
    const tabs = Array.from(container.querySelectorAll('[role="tab"]'))
    expect(tabs).toHaveLength(3)
    expect(tabs.map((tab) => tab.getAttribute('aria-label') || tab.textContent)).toEqual(expect.arrayContaining([
      expect.stringContaining('Crypto'),
      expect.stringContaining('Bank Transfer'),
      expect.stringContaining('Card Payment'),
    ]))
    expect(container.textContent).toContain('Bank Transfer')
    expect(container.textContent).toContain('Card Payment')
    expect(container.textContent).toContain('Coming soon')
  })

  it('shows verified bank-transfer support guidance when bank is disabled', async () => {
    const navigate = vi.fn()
    mockLoad([], configData({ bank: { enabled: false, currency: '', instructions: '' } }))
    await act(async () => root.render(<DepositPanel onNavigate={navigate} />))
    await settle()
    await clickButton('Bank Transfer')
    expect(container.textContent).toContain('No bank account details are issued automatically')
    expect(container.textContent).toContain('Automated bank-transfer requests are not open on this deployment')
    expect(container.querySelector('#depositAmount')).toBeNull()
    await clickButton('Contact support for verified details')
    expect(navigate).toHaveBeenCalledWith('portal-support')
  })

  it('keeps card payments visibly disabled and cannot start a payment', async () => {
    await act(async () => root.render(<DepositPanel />))
    await settle()
    await clickButton('Card Payment')
    expect(container.textContent).toContain('Card payments are not available yet')
    const cardButton = Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent.trim() === 'Card payment coming soon')
    expect(cardButton).toBeTruthy()
    expect(cardButton.disabled).toBe(true)
    expect(container.querySelector('form')).toBeNull()
    expect(api.post).not.toHaveBeenCalled()
  })

  it('hides the crypto address and form when direct TRON deposits are not ready', async () => {
    mockLoad([], configData({ tron: { enabled: false, address: '' } }))
    await act(async () => root.render(<DepositPanel />))
    await settle()
    expect(container.querySelectorAll('[role="tab"]')).toHaveLength(3)
    expect(container.textContent).toContain('deposit processing is not enabled')
    expect(container.querySelector('#depositAmount')).toBeNull()
    expect(container.querySelector('[data-testid="deposit-address"]')).toBeNull()
  })

  it('shows the selected address without opening crypto deposit processing', async () => {
    const shared = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'
    mockLoad([], configData({
      deposits_enabled: false,
      bank: { enabled: false, currency: '', instructions: 'Contact support.' },
      tron: {
        configured: true, display_enabled: true, enabled: false,
        requests_enabled: false, live_enabled: false,
        address: shared,
        error: 'Direct TRON deposits are configured, but new deposit requests are not open on this deployment.',
      },
      methods: [
        { type: 'card', enabled: false },
        { type: 'bank_transfer', enabled: false },
        { type: 'crypto', configured: true, display_enabled: true, enabled: false, address: shared },
      ],
    }))
    api.get.mockImplementation((url) => Promise.resolve({ data: url.endsWith('/USDT_TRC20/address/')
      ? { address: shared }
      : url === CONFIG_URL ? configData({ deposits_enabled: false }) : [] }))
    await act(async () => root.render(<DepositPanel />))
    await settle()
    expect(container.querySelectorAll('[role="tab"]')).toHaveLength(3)
    await clickButton('USDT TRON (TRC-20)')
    await act(async () => waitForCondition(() => container.querySelector('[data-testid="deposit-address"]')))
    expect(container.textContent).toContain(shared)
    expect(container.textContent).toContain('Deposit processing and balance crediting are not enabled')
    expect(container.textContent).toContain('Bank Transfer')
    expect(container.textContent).toContain('Card Payment')
    expect(container.querySelector('#depositAmount')).toBeNull()
    expect(api.post).not.toHaveBeenCalled()
  })

  it.each([
    ['HTML', '<!doctype html><html><body>Not an API</body></html>'],
    ['array', []],
    ['empty object', {}],
  ])('shows a configuration error for an invalid %s response', async (_label, payload) => {
    api.get.mockImplementation((url) => url === CONFIG_URL
      ? Promise.resolve({ data: payload })
      : Promise.resolve({ data: [] }))
    await act(async () => root.render(<DepositPanel />))
    await settle()
    expect(container.textContent).toContain('Deposit configuration could not be loaded')
    expect(container.textContent).toContain('Deposit via Crypto')
    expect(container.querySelector('#depositAmount')).toBeNull()
    expect(container.querySelectorAll('[role="tab"]')).toHaveLength(3)
  })

  it('disables payment requests and offers retry when deposit config fails', async () => {
    api.get.mockImplementation((url) => url === CONFIG_URL
      ? Promise.reject(new Error('config unavailable'))
      : Promise.resolve({ data: [] }))
    await act(async () => root.render(<DepositPanel />))
    await settle()
    expect(container.textContent).toContain('Deposit configuration could not be loaded')
    expect(container.textContent).toContain('Retry')
    expect(container.querySelector('#depositAmount')).toBeNull()
    expect(container.querySelectorAll('[role="tab"]')).toHaveLength(3)
  })

  it('uses bank method config for availability, currency, and instructions', async () => {
    mockLoad([], configData({
      bank: undefined,
      tron: { enabled: false },
      methods: [
        { type: 'crypto', enabled: false },
        { type: 'bank_transfer', enabled: true, currency: 'GBP', instructions: 'Contact Veltrix admin for verified bank details.' },
        { type: 'card', enabled: false, note: 'Coming soon.' },
      ],
    }))
    await act(async () => root.render(<DepositPanel />))
    await settle()
    await clickButton('Bank Transfer')
    expect(container.textContent).toContain('Amount (GBP)')
    expect(container.textContent).toContain('Contact Veltrix admin for verified bank details')
    expect(container.querySelector('#depositAmount')).toBeTruthy()
  })
})

function waitForCondition(predicate, timeout = 2000) {
  return new Promise((resolve, reject) => {
    const start = Date.now()
    const check = () => {
      try {
        if (predicate()) return resolve()
      } catch (e) {}
      if (Date.now() - start > timeout) return reject(new Error('timeout'))
      setTimeout(check, 10)
    }
    check()
  })
}


  it('shows checking state while config is loading and does not show Not open/Unavailable prematurely', async () => {
    let resolveConfig
    const configPromise = new Promise((resolve) => { resolveConfig = resolve })
    api.get.mockImplementation((url) => {
      if (url === DEPOSITS_URL) return Promise.resolve({ data: [] })
      if (url === CONFIG_URL) return configPromise
      return Promise.resolve({ data: [] })
    })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () => {
      root.render(<DepositPanel onNavigate={() => {}} />)
    })
    expect(container.textContent).toContain('Checking available deposit options')
    const badges = Array.from(container.querySelectorAll('button[role="tab"]')).map((b) => b.textContent)
    expect(badges.join(' ')).toContain('Address only')
    await act(async () => {
      resolveConfig({ data: {
        deposits_enabled: true,
        crypto_mode: 'direct_tron',
        methods: [{ type: 'crypto', enabled: false, label: 'Crypto payment (USDT TRC20)', currency: 'USDT', network: 'TRON (TRC20)' }],
        tron: { configured: true, display_enabled: true, enabled: false, requests_enabled: false, live_enabled: false, error: 'Direct TRON deposits are configured, but new deposit requests are not open on this deployment.' }
      } })
    })
    await new Promise((r) => setTimeout(r, 50))
    await act(async () => {})
    expect(container.textContent).toContain('deposit processing is not enabled')
  })

  it('shows Not open when configured but requests disabled due to live verification', async () => {
    mockLoad([], {
      deposits_enabled: true,
      crypto_mode: 'direct_tron',
      methods: [{ type: 'crypto', enabled: false, label: 'Crypto payment (USDT TRC20)', currency: 'USDT', network: 'TRON (TRC20)' }],
      tron: { configured: true, display_enabled: true, enabled: false, requests_enabled: false, live_enabled: false, error: 'Direct TRON deposits are configured, but live verification is pending. New deposit requests are not open on this deployment.' }
    })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () => {
      root.render(<DepositPanel onNavigate={() => {}} />)
    })
    await new Promise((r) => setTimeout(r, 50))
    await act(async () => {})
    expect(container.textContent).toContain('deposit processing is not enabled')
    const badges = Array.from(container.querySelectorAll('button[role="tab"]')).map((b) => b.textContent)
    expect(badges.join(' ')).toContain('Address only')
  })
