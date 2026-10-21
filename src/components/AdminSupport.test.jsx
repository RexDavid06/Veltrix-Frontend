import React from 'react'
import { createRoot } from 'react-dom/client'
import { act } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AdminViews from './AdminViews.jsx'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

vi.mock('../services/adminFeed', () => ({
  cleanParams: (params) => params,
  unwrapList: (payload) => payload,
  extractAdminError: (error, fallback) => fallback,
  fetchAdminStats: async () => ({
    users: { total: 1, active: 1, verified: 1, admins: 1, new_last_7_days: 0, new_last_30_days: 0 },
    accounts: { total: 1, total_cash_balance: '0.00' },
    transactions: { total: 0, last_7_days: 0, total_volume: '0.00', by_side: { buy: 0, sell: 0 } },
    support: { open_conversations: 1, closed_conversations: 0, open_tickets: 0 },
  }),
  fetchAdminAudit: async () => ({ results: [], count: 0 }),
  fetchAdminUsers: async () => ({ results: [], count: 0 }),
  fetchAdminUser: async () => ({}),
  fetchAdminTransactions: async () => ({ results: [], count: 0 }),
  fetchAdminInstruments: async () => ({ results: [], count: 0 }),
  updateAdminUser: async () => ({}),
  updateAdminInstrument: async () => ({}),
}))

const ADMIN_PROFILE = {
  id: 1,
  username: 'root@veltrix.test',
  first_name: 'Root',
  last_name: 'Admin',
  role: 'admin',
  is_staff: true,
}

// Two conversations: the first has an unread client message, the second does
// not. The reply form renders against `activeConvo`, which defaults to the
// first when nothing has been clicked — the exact case that previously failed.
const CONVERSATIONS = [
  {
    id: 11,
    subject: 'Deposit question',
    is_active: true,
    unread_count: 2,
    client_name: 'Casey Client',
    client_email: 'casey@veltrix.test',
    account_ref: 'VX-002',
    messages: [
      { id: 101, content: 'Why is my deposit pending?', sender: { id: 2, username: 'casey', role: 'client' }, sender_id: 2 },
    ],
  },
  {
    id: 22,
    subject: 'Withdrawal question',
    is_active: true,
    unread_count: 0,
    client_name: 'Dana Client',
    client_email: 'dana@veltrix.test',
    account_ref: 'VX-003',
    messages: [],
  },
]

const settle = () => act(async () => {
  await new Promise((resolve) => { setTimeout(resolve, 0) })
})

function makeCtx(overrides = {}) {
  return {
    conversations: CONVERSATIONS,
    tickets: [],
    profile: ADMIN_PROFILE,
    onNavigate: () => {},
    onLogout: () => {},
    onSendMessage: vi.fn(async () => ({ id: 999, conversation: 11, content: 'ok' })),
    onMarkRead: vi.fn(async () => {}),
    onResolveConversation: () => {},
    onReopenConversation: () => {},
    showToast: vi.fn(),
    ...overrides,
  }
}

async function mountSupport(ctx) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  await act(async () => {
    root.render(<AdminViews view="admin-support" ctx={ctx} onNavigate={() => {}} showToast={ctx.showToast} />)
  })
  await settle()
  return { container, root }
}

function replyForm(container) {
  // The identifying text lives in the input placeholder, not the form's text.
  return Array.from(container.querySelectorAll('form'))
    .find((node) => node.querySelector('input[placeholder="Write official staff response to client…"]'))
}

async function typeReply(container, value) {
  const input = replyForm(container).querySelector('input')
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(input, value)
    input.dispatchEvent(new window.Event('input', { bubbles: true }))
  })
}

async function submitReply(container) {
  await act(async () => {
    replyForm(container).dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }))
  })
  await settle()
}

let activeRoot
afterEach(() => {
  if (activeRoot) act(() => { activeRoot.unmount() })
  activeRoot = null
})

describe('admin support inbox', () => {
  it('renders an unread badge per conversation and an aggregate total', async () => {
    const ctx = makeCtx()
    const { container, root } = await mountSupport(ctx)
    activeRoot = root

    expect(container.querySelector('[data-unread="2"]')).toBeTruthy()
    expect(container.textContent).toContain('2 unread messages')
  })

  it('marks a conversation read when its thread is opened', async () => {
    const ctx = makeCtx()
    const { container, root } = await mountSupport(ctx)
    activeRoot = root

    const caseLabel = Array.from(container.querySelectorAll('span'))
      .find((node) => node.textContent.startsWith('Case #11'))
    expect(caseLabel).toBeTruthy()
    // The clickable row is the nearest ancestor carrying the onClick handler.
    const caseRow = caseLabel.closest('div[style*="cursor"]')
    expect(caseRow).toBeTruthy()
    await act(async () => {
      caseRow.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }))
    })
    await settle()

    expect(ctx.onMarkRead).toHaveBeenCalledWith(11)
  })

  it('sends a reply to the active conversation even without an explicit click', async () => {
    const ctx = makeCtx()
    const { container, root } = await mountSupport(ctx)
    activeRoot = root

    await typeReply(container, 'We are reviewing your deposit now.')
    await submitReply(container)

    // The first conversation is the active one by default; the reply must land
    // on it, not silently no-op on a null selection.
    expect(ctx.onSendMessage).toHaveBeenCalledWith(11, 'We are reviewing your deposit now.')
    expect(ctx.showToast).toHaveBeenCalledWith('Staff reply dispatched to client.')
  })

  it('clears the draft only after the server confirms the reply', async () => {
    const ctx = makeCtx()
    const { container, root } = await mountSupport(ctx)
    activeRoot = root

    await typeReply(container, 'Acknowledged.')
    await submitReply(container)

    expect(replyForm(container).querySelector('input').value).toBe('')
  })

  it('surfaces an error and preserves the draft when the server rejects the reply', async () => {
    const failure = new Error('nope')
    failure.response = { status: 400, data: { detail: 'Conversation is closed.' } }
    const ctx = makeCtx({ onSendMessage: vi.fn(async () => { throw failure }) })
    const { container, root } = await mountSupport(ctx)
    activeRoot = root

    await typeReply(container, 'This will fail.')
    await submitReply(container)

    expect(container.textContent).toContain('Conversation is closed.')
    // The draft survives so the admin can retry without retyping.
    expect(replyForm(container).querySelector('input').value).toBe('This will fail.')
    expect(ctx.showToast).toHaveBeenCalledWith('Reply not sent: Conversation is closed.')
    expect(ctx.showToast).not.toHaveBeenCalledWith('Staff reply dispatched to client.')
  })

  it('never confirms success before the server responds', async () => {
    let release
    const pending = new Promise((resolve) => { release = resolve })
    const ctx = makeCtx({ onSendMessage: vi.fn(() => pending) })
    const { container, root } = await mountSupport(ctx)
    activeRoot = root

    await typeReply(container, 'Pending reply')
    await act(async () => {
      replyForm(container).dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }))
    })

    expect(ctx.showToast).not.toHaveBeenCalledWith('Staff reply dispatched to client.')

    await act(async () => {
      release({ id: 1, conversation: 11 })
    })
    await settle()

    expect(ctx.showToast).toHaveBeenCalledWith('Staff reply dispatched to client.')
  })
})
