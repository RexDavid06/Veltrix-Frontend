import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createRoot } from 'react-dom/client'
import { act } from 'react'
import { describe, expect, it, vi } from 'vitest'
import AdminViews from './AdminViews.jsx'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

vi.mock('../services/adminFeed', () => ({
  cleanParams: (params) => params,
  unwrapList: (payload) => payload,
  extractAdminError: (error, fallback) => fallback,
  fetchAdminStats: async () => ({
    users: {
      total: 10, active: 8, verified: 6, admins: 2,
      new_last_7_days: 3, new_last_30_days: 7,
    },
    accounts: { total: 9, total_cash_balance: '1250.50' },
    transactions: { total: 12, last_7_days: 4, total_volume: '9900.00', by_side: { buy: 7, sell: 5 } },
    support: { open_conversations: 2, closed_conversations: 5, open_tickets: 1 },
  }),
  fetchAdminAudit: async () => ({
    results: [{
      id: 1,
      created_at: '2026-10-15T00:54:00Z',
      actor_name: 'Staff Officer',
      actor_email: 'staff@veltrix.test',
      target_email: 'client@veltrix.test',
      action: 'admin.user.verify',
      details: 'fields=[is_verified]',
    }],
    count: 1,
  }),
  fetchAdminUsers: async () => ({
    results: [{
      id: 4,
      email: 'ann@example.test',
      username: 'ann@example.test',
      first_name: 'Ann',
      last_name: 'Lee',
      role: 'client',
      is_verified: false,
      is_active: true,
      is_staff: false,
      date_joined: '2026-10-01T10:00:00Z',
      cash_balance: '250.00',
      transaction_count: 3,
    }],
    count: 1,
  }),
  fetchAdminUser: async () => ({
    id: 4,
    email: 'ann@example.test',
    username: 'ann@example.test',
    first_name: 'Ann',
    last_name: 'Lee',
    role: 'client',
    is_verified: false,
    is_active: true,
    is_staff: false,
    is_superuser: false,
    date_joined: '2026-10-01T10:00:00Z',
    last_login: '2026-10-14T08:30:00Z',
    cash_balance: '250.00',
    transaction_count: 3,
    positions: [{
      symbol: 'BTC-USD', name: 'Bitcoin', quantity: '0.5', avg_price: '60000.00', market_value: '33500.00',
    }],
    recent_transactions: [{
      id: 2,
      user_id: 4,
      user_email: 'ann@example.test',
      user_name: 'Ann Lee',
      symbol: 'BTC-USD',
      side: 'buy',
      quantity: '0.5',
      execution_price: '67000',
      amount: '33500.00',
      status: 'completed',
      created_at: '2026-10-12T09:00:00Z',
    }],
  }),
  fetchAdminTransactions: async () => ({
    results: [{
      id: 2,
      user_id: 4,
      user_email: 'ann@example.test',
      user_name: 'Ann Lee',
      symbol: 'BTC-USD',
      side: 'buy',
      quantity: '0.5',
      execution_price: '67000',
      amount: '33500.00',
      status: 'completed',
      created_at: '2026-10-12T09:00:00Z',
    }],
    count: 1,
  }),
  fetchAdminInstruments: async () => ({
    results: [{
      id: 1,
      symbol: 'BTC-USD',
      name: 'Bitcoin',
      asset_class: 'crypto',
      currency: 'USD',
      price: '67000',
      change_percent: '1.25',
      is_active: true,
    }],
    count: 1,
  }),
  fetchAdminDeposits: async () => ({
    results: [{
      id: 21,
      reference: 'VELT-21',
      user: { email: 'ann@example.test' },
      rail: 'crypto',
      asset: 'USDT',
      payable_amount: '10.000001',
      received_amount: '',
      status: 'detected',
      created_at: '2026-10-15T10:00:00Z',
      is_credited: false,
      chain_transfers: [],
      crypto: { confirmations: 2, required_confirmations: 20 },
    }],
    count: 1,
  }),
  fetchAdminChainTransfers: async () => ({
    results: [{
      id: 31,
      txid: 'a'.repeat(64),
      event_index: 0,
      amount: '10.000001',
      status: 'detected',
      deposit_id: null,
      confirmations: 2,
      observed_at: '2026-10-15T10:01:00Z',
      recipient_address: 'TSharedAddress',
      sender_address: 'TSenderAddress',
      block_number: 123,
    }],
    count: 1,
  }),
  fetchAdminReconciliation: async () => ({
    runs: [{ id: 41, rail: 'crypto', status: 'ok', provider_total: '10.000001', ledger_total: '10.000001', difference: '0', discrepancy_count: 0, ran_at: '2026-10-15T10:02:00Z' }],
    discrepancies: [],
  }),
  assignAdminChainTransfer: async () => ({}),
  approveAdminChainTransfer: async () => ({}),
  flagAdminChainTransfer: async () => ({}),
  approveAdminBankDeposit: async () => ({}),
  rejectAdminBankDeposit: async () => ({}),
  runAdminReconciliation: async () => ({}),
  resolveAdminDiscrepancy: async () => ({}),
  updateAdminUser: async () => ({}),
  updateAdminInstrument: async () => ({}),
}))

const ctx = {
  conversations: [],
  tickets: [],
  profile: null,
  onNavigate: () => {},
  onLogout: () => {},
  onSendMessage: async () => ({}),
  onResolveConversation: () => {},
  onReopenConversation: () => {},
}

const cases = [
  ['admin', 'Operations Control Centre'],
  ['admin-customers', 'Client Accounts Directory'],
  ['admin-kyc', 'KYC Verification Queue'],
  ['admin-transactions', 'Transaction Monitoring'],
  ['admin-deposits', 'Deposit Operations'],
  ['admin-instruments', 'Instrument Listings'],
  ['admin-support', 'Client Services Desk — Staff Inbox'],
  ['admin-audit', 'Regulatory Audit Trail'],
  ['admin-profile', 'Administrator Profile'],
]

const settle = () => act(async () => {
  await new Promise((resolve) => { setTimeout(resolve, 0) })
})

async function mountView(view) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  await act(async () => {
    root.render(<AdminViews view={view} ctx={ctx} onNavigate={() => {}} showToast={() => {}} />)
  })
  await settle()
  return { container, root }
}

async function click(container, label) {
  const button = Array.from(container.querySelectorAll('button'))
    .find((candidate) => candidate.textContent.trim() === label)
  expect(button).toBeTruthy()
  await act(async () => {
    button.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }))
  })
  await settle()
}

describe('AdminViews', () => {
  it.each(cases)('renders the %s view without crashing', (view, title) => {
    const markup = renderToStaticMarkup(
      <AdminViews view={view} ctx={ctx} onNavigate={() => {}} showToast={() => {}} />
    )
    expect(markup).toContain(title)
    expect(markup).toContain('app-sidebar')
  })

  it('opens a read-only client dossier from the directory', async () => {
    const { container, root } = await mountView('admin-customers')

    await click(container, 'Details')

    expect(container.textContent).toContain('ann@example.test')
    expect(container.textContent).toContain('Open positions')
    expect(container.textContent).toContain('BTC-USD')
    expect(container.textContent).toContain('Inspection only')
    // No funds can be moved from the dossier.
    expect(container.textContent).not.toContain('Deposit funds')

    await act(() => { root.unmount() })
  })

  it('inspects a transaction without exposing balance controls', async () => {
    const { container, root } = await mountView('admin-transactions')

    await click(container, 'Inspect')

    expect(container.textContent).toContain('Transaction #2')
    expect(container.textContent).toContain('EXECUTION PRICE')
    expect(container.textContent).toMatch(/no balance, deposit or withdrawal change/i)

    await act(() => { root.unmount() })
  })

  it('returns null for unknown admin views', () => {
    const markup = renderToStaticMarkup(
      <AdminViews view="admin-nope" ctx={ctx} onNavigate={() => {}} showToast={() => {}} />
    )
    expect(markup).toBe('')
  })

  it('applies the scoped admin console theme', () => {
    const markup = renderToStaticMarkup(
      <AdminViews view="admin" ctx={ctx} onNavigate={() => {}} showToast={() => {}} />
    )
    expect(markup).toContain('admin-shell')
  })
})
