import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import TopUpModal from './TopUpModal.jsx'

const render = (isOpen = true) =>
  renderToStaticMarkup(
    <TopUpModal isOpen={isOpen} onClose={() => {}} onTopUp={() => {}} currentBalance={100} />
  )

describe('TopUpModal demo labelling', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('renders nothing when simulated funding is not enabled', () => {
    vi.stubEnv('VITE_DEMO_TOPUP_ENABLED', '')
    expect(render()).toBe('')
  })

  it('renders nothing when closed', () => {
    vi.stubEnv('VITE_DEMO_TOPUP_ENABLED', '1')
    expect(render(false)).toBe('')
  })

  it('describes the action as simulated and never as a real deposit', () => {
    vi.stubEnv('VITE_DEMO_TOPUP_ENABLED', '1')
    const html = render()

    expect(html).toContain('Add Demo Funds (Simulated)')
    expect(html).toContain('Demo Amount (USD)')
    expect(html).toContain('no real money is deposited')
    expect(html).toContain('Add $2500.00 Demo Funds')
    expect(html).toContain('DEMO ACCOUNT FUNDING')

    expect(html).not.toContain('Deposit Trading Funds')
    expect(html).not.toContain('Deposit Amount (USD)')
    expect(html).not.toContain('Deposit $')
  })
})
