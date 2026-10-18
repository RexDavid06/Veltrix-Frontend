import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import AdminViews from './AdminViews.jsx'

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
  ['admin-instruments', 'Instrument Listings'],
  ['admin-support', 'Client Services Desk — Staff Inbox'],
  ['admin-audit', 'Regulatory Audit Trail'],
]

describe('AdminViews', () => {
  it.each(cases)('renders the %s view without crashing', (view, title) => {
    const markup = renderToStaticMarkup(
      <AdminViews view={view} ctx={ctx} onNavigate={() => {}} showToast={() => {}} />
    )
    expect(markup).toContain(title)
    expect(markup).toContain('app-sidebar')
  })

  it('returns null for unknown admin views', () => {
    const markup = renderToStaticMarkup(
      <AdminViews view="admin-nope" ctx={ctx} onNavigate={() => {}} showToast={() => {}} />
    )
    expect(markup).toBe('')
  })
})
