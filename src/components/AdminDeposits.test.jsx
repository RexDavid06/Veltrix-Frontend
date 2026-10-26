// @vitest-environment jsdom
import React from 'react'
import { createRoot } from 'react-dom/client'
import { act } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AdminDeposits from './AdminDeposits.jsx'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const mocks = vi.hoisted(() => ({
  approveAdminChainTransfer: vi.fn(async () => ({})),
}))

vi.mock('../services/adminFeed', () => ({
  approveAdminBankDeposit: vi.fn(async () => ({})),
  approveAdminChainTransfer: mocks.approveAdminChainTransfer,
  assignAdminChainTransfer: vi.fn(async () => ({})),
  extractAdminError: (_error, fallback) => fallback,
  fetchAdminChainTransfers: vi.fn(async () => ({
    results: [{
      id: 31,
      txid: 'a'.repeat(64),
      event_index: 0,
      amount: '10.000001',
      status: 'detected',
      deposit_id: 7,
      confirmations: 20,
      observed_at: '2026-10-15T10:01:00Z',
      recipient_address: 'TSharedAddress',
      sender_address: 'TSenderAddress',
      block_number: 123,
      is_testnet: true,
      review_reason: '',
      attribution_reason: '',
    }],
    count: 1,
  })),
  fetchAdminDeposit: vi.fn(async () => ({})),
  fetchAdminDeposits: vi.fn(async () => ({ results: [], count: 0 })),
  fetchAdminReconciliation: vi.fn(async () => ({ runs: [], discrepancies: [] })),
  flagAdminChainTransfer: vi.fn(async () => ({})),
  rejectAdminBankDeposit: vi.fn(async () => ({})),
  resolveAdminDiscrepancy: vi.fn(async () => ({})),
  runAdminReconciliation: vi.fn(async () => ({})),
}))

const settle = () => act(async () => {
  await new Promise((resolve) => { setTimeout(resolve, 0) })
})

async function click(container, label) {
  const button = Array.from(container.querySelectorAll('button'))
    .find((candidate) => candidate.textContent.trim() === label)
  expect(button).toBeTruthy()
  await act(async () => {
    button.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }))
  })
  await settle()
}

function type(input, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  setter.call(input, value)
  input.dispatchEvent(new window.Event('input', { bubbles: true }))
}

async function mount() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  await act(async () => {
    root.render(<AdminDeposits showToast={() => {}} />)
  })
  await settle()
  return { container, root }
}

describe('AdminDeposits', () => {
  beforeEach(() => {
    mocks.approveAdminChainTransfer.mockClear()
  })

  it('links testnet transfers to Shasta and sends the mismatch override only after review', async () => {
    const { container, root } = await mount()

    await click(container, 'Chain transfers')
    await click(container, 'Review')

    const link = container.querySelector('a[href*="shasta.tronscan.org"]')
    expect(link?.getAttribute('href')).toBe(`https://shasta.tronscan.org/#/transaction/${'a'.repeat(64)}`)

    const reason = container.querySelector('input[placeholder^="Why are you"]')
    expect(reason).toBeTruthy()
    await act(async () => { type(reason, 'Verified with independent statement') })

    const mismatchLabel = Array.from(container.querySelectorAll('label'))
      .find((label) => label.textContent.includes('Accept the verified on-chain amount'))
    const mismatch = mismatchLabel?.querySelector('input[type="checkbox"]')
    await act(async () => {
      mismatch.click()
    })

    await click(container, 'Approve and credit')

    expect(mocks.approveAdminChainTransfer).toHaveBeenCalledWith(
      31,
      'Verified with independent statement',
      true,
    )

    await act(() => { root.unmount() })
  })
})
