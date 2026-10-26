import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import api from '../api'
import DepositPanel from './DepositPanel.jsx'

vi.mock('../api', () => ({ default: { get: vi.fn(), post: vi.fn() } }))

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
    if (url === '/deposits/config/') return Promise.resolve({ data: config })
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
  it('defaults to the NOWPayments quote flow', async () => {
    mockLoad([], configData({ crypto_mode: 'nowpayments' }))
    await act(async () => root.render(<DepositPanel />))
    await settle()
    expect(container.textContent).toContain('Deposit funds')
    expect(container.textContent).toContain('quoted by NOWPayments')
    expect(container.textContent).toContain('Amount (USD)')
  })

  it('creates a NOWPayments deposit using amount_usd and displays the quote', async () => {
    mockLoad([], configData({ crypto_mode: 'nowpayments' }))
    api.post.mockResolvedValue({ data: {
      id: 9, rail: 'crypto', reference: 'NP-ORDER-9', expected_amount: '24.5', price_amount: '25.00', price_currency: 'USD',
      quoted_amount: '24.5', quoted_currency: 'USDTTRC20', quoted_network: 'TRON (TRC20)',
      veltrix_fee_amount: '0', veltrix_fee_currency: 'USD', status: 'pending', quote_confirmed: false,
      instructions: { network: 'TRON (TRC20)', asset: 'USDT', note: 'Review the quote.' },
    } })
    await act(async () => root.render(<DepositPanel />))
    await settle()
    await fillAndSubmit('25')
    expect(api.post).toHaveBeenCalledWith('/deposits/', expect.objectContaining({ amount_usd: '25' }), expect.anything())
    expect(container.textContent).toContain('USD entered:')
    expect(container.textContent).toContain('Confirm quote')
  })

  it('shows the shared address before a request and after creating one', async () => {
    vi.stubEnv('VITE_CRYPTO_DEPOSIT_MODE', 'direct_tron')
    const shared = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'
    mockLoad([], configData({
      crypto_mode: 'direct_tron',
      tron: {
        address: shared, contract_address: shared, enabled: true, live_enabled: true,
        unique_amount_enabled: true, min_amount: '', max_amount: '',
      },
    }))
    api.post.mockResolvedValue({ data: {
      id: 10, rail: 'crypto', reference: 'VELT-DIRECT10', expected_amount: '24.500001',
      requested_amount: '24.5', payable_amount: '24.500001', status: 'detected',
      confirmations: 1, required_confirmations: 20,
      qr_code: 'data:image/svg+xml;base64,PHN2Zy8+',
      instructions: { network: 'TRON (TRC20)', asset: 'USDT', address: shared, amount: '24.500001', note: 'Send on TRC20 only.' },
    } })
    await act(async () => root.render(<DepositPanel />))
    await settle()
    expect(container.textContent).toContain('USDT TRC20 RECEIVING WALLET ADDRESS')
    expect(container.textContent).toContain(shared)
    await fillAndSubmit('24.5')
    expect(api.post).toHaveBeenCalledWith('/deposits/', expect.objectContaining({ amount: '24.5' }), expect.anything())
    expect(container.textContent).toContain('SEND 24.500001 USDT TO')
    expect(container.textContent).toContain('Requested 24.5 USDT')
    expect(container.textContent).toContain('The extra amount is part of your deposit')
    expect(container.textContent).toContain('Blockchain confirmations: 1 / 20')
    const qr = container.querySelector('img[alt="QR code for the USDT deposit address"]')
    expect(qr.getAttribute('src')).toBe('data:image/svg+xml;base64,PHN2Zy8+')
  })

  it('submits a transaction hash without presenting it as proof of payment', async () => {
    vi.stubEnv('VITE_CRYPTO_DEPOSIT_MODE', 'direct_tron')
    const txid = 'a'.repeat(64)
    const deposit = {
      id: 11, rail: 'crypto', reference: 'VELT-11', expected_amount: '5', payable_amount: '5',
      requested_amount: '5', status: 'pending', required_confirmations: 20, confirmations: 0,
      instructions: { address: 'TSharedAddress', amount: '5', note: 'Send on TRC20 only.' },
    }
    mockLoad([deposit], configData({ crypto_mode: 'direct_tron', tron: { address: 'TSharedAddress' } }))
    api.post.mockResolvedValue({ data: {
      deposit: { ...deposit, submitted_txid: txid, txid_state: 'submitted_pending_verification' },
      txid, status: 'recorded', message: 'Transaction hash recorded. This is not proof of payment.',
    } })
    await act(async () => root.render(<DepositPanel />))
    await settle()
    await setInput(container.querySelector('#txid-11'), txid)
    await act(async () => {
      container.querySelector('#txid-11').closest('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    await settle()
    expect(api.post).toHaveBeenCalledWith('/deposits/11/txid/', { txid })
    expect(container.textContent).toContain('This is a claim, not proof of payment')
    expect(container.textContent).toContain('Transaction hash recorded')
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
    expect(api.post).toHaveBeenCalledWith('/deposits/bank/', expect.objectContaining({ amount: '50.00' }), expect.anything())
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
    expect(container.textContent).toContain('Direct TRON deposits are not enabled on this deployment')
    expect(container.querySelector('#depositAmount')).toBeNull()
    expect(container.textContent).not.toContain('USDT TRC20 RECEIVING WALLET ADDRESS')
  })

  it('disables payment requests and offers retry when deposit config fails', async () => {
    api.get.mockImplementation((url) => url === '/deposits/config/'
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
