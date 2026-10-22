import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import api from '../api'
import DepositPanel from './DepositPanel.jsx'

vi.mock('../api', () => ({ default: { get: vi.fn(), post: vi.fn() } }))

globalThis.IS_REACT_ACT_ENVIRONMENT = true

let container
let root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  api.get.mockResolvedValue({ data: [] })
  api.post.mockReset()
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.clearAllMocks()
})

describe('USDT TRC20 deposit panel', () => {
  it('shows the supported asset and network clearly', async () => {
    await act(async () => root.render(<DepositPanel />))
    expect(container.textContent).toContain('Deposit USDT on TRON')
    expect(container.textContent).toContain('Only USDT using the TRON TRC20 network is supported')
    expect(container.textContent).toContain('Deposit history')
  })

  it('creates a deposit using the entered amount and displays verified instructions', async () => {
    api.post.mockResolvedValue({ data: {
      id: 9, reference: 'NP-ORDER-9', expected_amount: '25', status: 'pending',
      instructions: { network: 'TRON (TRC20)', asset: 'USDT', address: 'TProviderPayAddress', amount: '25', note: 'Send USDT on TRC20.' },
    } })
    await act(async () => root.render(<DepositPanel />))
    const input = container.querySelector('#depositAmount')
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    await act(async () => {
      setter.call(input, '25')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () => {
      container.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    expect(api.post).toHaveBeenCalledWith('/deposits/', expect.objectContaining({ amount: '25' }), expect.objectContaining({ headers: expect.objectContaining({ 'Idempotency-Key': expect.any(String) }) }))
    expect(container.textContent).toContain('TProviderPayAddress')
    expect(container.textContent).toContain('SEND EXACTLY 25 USDT TO')
  })
})
