import React, { useState } from 'react'
import AppSidebar from './AppSidebar'
import DataTable from './DataTable'
import { MarketTable, MarketRowsTable } from './MarketTable'
import { DEMO_TRANSACTIONS, formatCurrency, formatPrice } from '../data'

function Shell({ view, title, subtitle, admin, onNavigate, children }) {
  return (
    <div className="app-shell">
      <AppSidebar active={view} admin={admin} onNavigate={onNavigate} />
      <section className="app-main">
        <div className="app-topline">
          <div>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <span className="demo-chip">● DEMO MODE</span>
        </div>
        {children}
      </section>
    </div>
  )
}

function Allocation() {
  return (
    <div className="allocation">
      <div className="donut" />
      <div className="legend">
        <span>Crypto · 42%</span>
        <span>Indices · 26%</span>
        <span>Commodities · 18%</span>
        <span>Other · 14%</span>
      </div>
    </div>
  )
}

function MiniChart() {
  return (
    <svg className="mini-chart" viewBox="0 0 500 190" preserveAspectRatio="none" aria-label="Illustrative portfolio chart">
      <g stroke="#ffffff0e">
        <path d="M0 30H500M0 70H500M0 110H500M0 150H500" />
      </g>
      <path
        d="M0 150 C35 142 45 118 80 132 S120 80 155 102 S195 115 225 70 S275 96 310 56 S350 73 390 42 S450 55 500 18"
        fill="none"
        stroke="#8be3b5"
        strokeWidth="3"
      />
    </svg>
  )
}

function statusCell(value) {
  if (value === 'pending') return <span className="status pending">Pending</span>
  if (value === 'review') return <span className="status review">Demo</span>
  if (value === 'completed') return <span className="status">Completed</span>
  return value
}

function Overview({ ctx }) {
  const {
    marketRows,
    onNavigate,
    showToast,
    dashboard,
    watchlist = [],
    onOpenTrade,
    onOpenTopUp,
    onToggleWatchlist,
  } = ctx

  const topRows = marketRows.slice(0, 4)
  const cash = dashboard?.account?.cash_balance !== undefined
    ? Number(dashboard.account.cash_balance)
    : 10000.0

  const positions = dashboard?.positions || []
  const positionsValue = positions.reduce((sum, p) => sum + Number(p.market_value || 0), 0)
  const totalValue = dashboard ? cash + positionsValue : 24680.5

  return (
    <>
      <div className="admin-warn">
        All figures below correlate directly with your demo backend account. Simulated trades execute atomically against DRF models.
      </div>

      <div className="stat-grid">
        <div className="app-card">
          <span className="stat-label">DEMO PORTFOLIO VALUE</span>
          <div className="stat-value">{formatCurrency(totalValue)}</div>
          <span className="stat-change">
            {positions.length > 0 ? `${positions.length} active positions` : '↗ +4.28% illustrative'}
          </span>
        </div>

        <div className="app-card">
          <span className="stat-label">AVAILABLE CASH BALANCE</span>
          <div className="stat-value">{formatCurrency(cash)}</div>
          <div style={{ marginTop: 4 }}>
            <button
              type="button"
              className="text-link"
              style={{ background: 'none', border: 0, cursor: 'pointer', padding: 0 }}
              onClick={onOpenTopUp}
            >
              + Deposit demo funds ↗
            </button>
          </div>
        </div>

        <div className="app-card">
          <span className="stat-label">WATCHLIST</span>
          <div className="stat-value">{String(watchlist.length || 8).padStart(2, '0')}</div>
          <span className="muted-copy">Monitored instruments</span>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="app-card">
          <div className="section-row">
            <div>
              <h3>Portfolio overview</h3>
              <div className="muted-copy">Illustrative movement over time</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ padding: '5px 10px', fontSize: 10 }}
                onClick={() => onOpenTrade('AAPL')}
              >
                + New Trade ↗
              </button>
              <span className="status">LIVE DEMO</span>
            </div>
          </div>
          <MiniChart />
          <div className="chart-axis">
            <span>SEP 01</span>
            <span>SEP 10</span>
            <span>SEP 20</span>
            <span>OCT 01</span>
            <span>OCT 09</span>
          </div>
        </div>

        <div className="app-card">
          <h3>Allocation preview</h3>
          <div className="muted-copy">Sample portfolio composition</div>
          <Allocation />
        </div>
      </div>

      <div className="app-card" style={{ marginTop: 15 }}>
        <div className="section-row">
          <div>
            <h3>Market watch</h3>
            <div className="muted-copy">Top instruments — click Trade to execute simulated orders</div>
          </div>
          <button className="btn btn-outline" data-view="markets" onClick={() => onNavigate('markets')}>
            All markets ↗
          </button>
        </div>
        <MarketRowsTable
          rows={topRows}
          onToast={showToast}
          onTrade={onOpenTrade}
          onToggleWatchlist={onToggleWatchlist}
          watchlist={watchlist}
        />
      </div>
    </>
  )
}

function Portfolio({ ctx }) {
  const { dashboard, onNavigate, onOpenTrade, onOpenTopUp } = ctx
  const cash = dashboard?.account?.cash_balance !== undefined
    ? Number(dashboard.account.cash_balance)
    : 10000.0
  const positions = dashboard?.positions || []
  const hasPositions = positions.length > 0
  const positionsTotal = positions.reduce((sum, p) => sum + Number(p.market_value || 0), 0)
  const total = dashboard ? cash + positionsTotal : 24680.5

  return (
    <>
      <div className="admin-warn">
        This is simulated portfolio information connected to the Django REST backend. Executed orders automatically update open positions and unrealized PnL.
      </div>

      <div className="page-grid">
        <div className="app-card">
          <span className="stat-label">DEMO PORTFOLIO TOTAL</span>
          <div className="stat-value">{formatCurrency(total)}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#93a79b', fontSize: 11, marginTop: 8 }}>
            <span>Cash: <b style={{ color: 'var(--green)' }}>{formatCurrency(cash)}</b></span>
            <span>Positions Value: <b>{formatCurrency(positionsTotal)}</b></span>
          </div>
          <div style={{ marginTop: 14 }}>
            <button className="btn btn-primary" style={{ marginRight: 8, padding: '7px 14px' }} onClick={() => onOpenTrade('AAPL')}>
              Execute Trade ↗
            </button>
            <button className="btn btn-outline" style={{ padding: '7px 14px' }} onClick={onOpenTopUp}>
              + Top up balance
            </button>
          </div>
          <Allocation />
        </div>

        <div className="app-card">
          <div className="section-row">
            <div>
              <h3>Open Positions</h3>
              <div className="muted-copy">{positions.length} active holding{positions.length === 1 ? '' : 's'}</div>
            </div>
            {hasPositions && (
              <button className="btn btn-outline" style={{ padding: '5px 9px', fontSize: 10 }} onClick={() => onOpenTrade('AAPL', 'buy')}>
                + Buy more
              </button>
            )}
          </div>

          {hasPositions ? (
            <div style={{ marginTop: 12 }}>
              <DataTable
                headings={['INSTRUMENT', 'QTY', 'AVG PRICE', 'MARKET VALUE', 'UNREALIZED PnL', 'ACTION']}
                rows={positions.map((p) => {
                  const pnl = Number(p.unrealized_pnl || 0)
                  const pnlClass = pnl >= 0 ? 'positive' : 'negative'
                  const pnlSign = pnl >= 0 ? '+' : ''
                  return [
                    <span className="asset-symbol" key={p.id}>
                      <b>{p.symbol}</b>
                    </span>,
                    Number(p.quantity).toLocaleString('en-US', { maximumFractionDigits: 4 }),
                    formatPrice(p.avg_price),
                    formatPrice(p.market_value),
                    <span className={pnlClass} key={`pnl-${p.id}`}>
                      {pnlSign}{formatPrice(pnl)}
                    </span>,
                    <button
                      className="btn btn-outline"
                      style={{ padding: '4px 8px', fontSize: 10, borderColor: 'var(--red)', color: 'var(--red)' }}
                      key={`close-${p.id}`}
                      onClick={() => onOpenTrade(p.symbol, 'sell')}
                    >
                      Sell
                    </button>,
                  ]
                })}
              />
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">◈</div>
              <p>You have no open positions in your demo portfolio yet.</p>
              <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => onNavigate('markets')}>
                Browse markets & buy instruments ↗
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function Accounts({ ctx }) {
  const { dashboard, profile, onOpenTopUp } = ctx
  const cash = dashboard?.account?.cash_balance !== undefined
    ? Number(dashboard.account.cash_balance)
    : 10000.0

  return (
    <>
      <div className="page-grid">
        <div className="app-card">
          <span className="stat-label">DEMO ACCOUNT · {profile?.email || 'PRIMARY'}</span>
          <h3 style={{ fontSize: 22, marginTop: 14 }}>Veltrix Demo Account</h3>
          <p className="muted-copy">Account ID: VX-DEMO-{profile?.id || '001'} · Currency: USD</p>
          <div className="stat-value">{formatCurrency(cash)}</div>
          <span className="status">Active Simulation</span>
          <div style={{ marginTop: 16 }}>
            <button className="btn btn-primary" onClick={onOpenTopUp}>
              + Top up demo funds ↗
            </button>
          </div>
        </div>

        <div className="app-card">
          <span className="stat-label">ACCOUNT LIMITS & STATUS</span>
          <h3 style={{ fontSize: 22, marginTop: 14 }}>Simulation Tier</h3>
          <p className="muted-copy">Role: {profile?.role || 'client'} · Verification: {profile?.is_verified ? 'Verified' : 'Simulated'}</p>
          <ul style={{ padding: '12px 0 0', listStyle: 'none', margin: '14px 0 0', borderTop: '1px solid var(--line)' }}>
            <li style={{ fontSize: 11, margin: '6px 0', color: '#c2d1c7' }}>✓ Instant simulated market execution</li>
            <li style={{ fontSize: 11, margin: '6px 0', color: '#c2d1c7' }}>✓ Live catalog & Yahoo Finance snapshot quotes</li>
            <li style={{ fontSize: 11, margin: '6px 0', color: '#c2d1c7' }}>✓ Automated transaction logging</li>
          </ul>
        </div>
      </div>
    </>
  )
}

function Money({ view, ctx }) {
  const { dashboard, onNavigate, onOpenTopUp } = ctx
  const title = { wallet: 'Wallet', deposits: 'Deposits', withdrawals: 'Withdrawals' }[view]
  const cash = dashboard?.account?.cash_balance !== undefined
    ? Number(dashboard.account.cash_balance)
    : 8240.0

  return (
    <>
      <div className="admin-warn">
        This is a simulated wallet interface. You can deposit simulated funds directly into your demo account via the top-up endpoint.
      </div>
      <div className="stat-grid">
        <div className="app-card">
          <span className="stat-label">SIMULATED CASH BALANCE</span>
          <div className="stat-value">{formatCurrency(cash)}</div>
          <span className="muted-copy">Available for simulated trading</span>
        </div>
        <div className="app-card">
          <span className="stat-label">TRANSACTIONS LOGGED</span>
          <div className="stat-value">{dashboard?.transactions?.length || '04'}</div>
          <span className="muted-copy">On backend ledger</span>
        </div>
      </div>
      <div className="app-card">
        <h3>{view === 'withdrawals' ? 'Withdrawal Preview' : view === 'deposits' ? 'Deposit Simulated Funds' : 'Wallet Activity'}</h3>
        <p className="muted-copy">
          {view === 'deposits'
            ? 'Add demo cash to test larger trades without real financial commitments.'
            : 'Simulated cash management for testing portfolio operations.'}
        </p>
        <div className="app-actions">
          <button className="btn btn-primary" onClick={onOpenTopUp}>
            + Top Up Demo Funds ↗
          </button>
          <button className="btn btn-outline" data-view="transactions" onClick={() => onNavigate('transactions')}>
            View Ledger Activity
          </button>
        </div>
      </div>
    </>
  )
}

function Transactions({ ctx }) {
  const { dashboard } = ctx
  const rawTx = dashboard?.transactions || []
  const rows = rawTx.length
    ? rawTx.map((tx) => [
        <b key={`side-${tx.id}`} style={{ textTransform: 'uppercase', color: tx.side === 'buy' ? 'var(--green)' : 'var(--gold)' }}>{tx.side}</b>,
        tx.symbol || 'USD Deposit',
        new Date(tx.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        formatCurrency(tx.amount),
        <span className="status" key={`st-${tx.id}`}>{tx.status}</span>,
      ])
    : DEMO_TRANSACTIONS.map((t) => [t[0], t[1], t[2], t[3], statusCell(t[4])])

  return (
    <>
      <div className="admin-warn">
        Ledger records recorded by Django REST Framework. Each buy, sell, or top-up automatically creates a completed transaction.
      </div>
      <div className="app-card">
        <DataTable headings={['ACTIVITY', 'INSTRUMENT / DETAIL', 'DATE', 'AMOUNT', 'STATUS']} rows={rows} />
        <div className="mobile-note">Swipe horizontally to view all columns.</div>
      </div>
    </>
  )
}

function Kyc({ ctx }) {
  const { showToast, profile } = ctx
  return (
    <>
      <div className="admin-warn">
        Do not upload real identity documents. This demo demonstrates the verification workflow.
      </div>
      <div className="app-card">
        <span className={profile?.is_verified ? 'status' : 'status pending'}>
          {profile?.is_verified ? 'Verified' : 'Simulation Profile'}
        </span>
        <h3 style={{ fontSize: 21, marginTop: 18 }}>Verify your identity</h3>
        <p className="muted-copy">
          A production service would explain required documents, collect consent, securely transfer files, and provide a review status.
        </p>
        <form
          id="kycForm"
          onSubmit={(event) => {
            event.preventDefault()
            showToast('Simulated verification details saved.')
          }}
        >
          <div className="form-group">
            <label>Country of residence</label>
            <select required defaultValue="Nigeria">
              <option value="">Choose a country</option>
              <option>Nigeria</option>
              <option>United Kingdom</option>
              <option>United States</option>
              <option>Germany</option>
              <option>Other</option>
            </select>
          </div>
          <div className="form-group">
            <label>Document type</label>
            <select required defaultValue="Passport">
              <option value="">Select a document</option>
              <option>Government-issued ID</option>
              <option>Passport</option>
              <option>Proof of address</option>
            </select>
          </div>
          <div className="form-group">
            <label>Sample file selection (not uploaded)</label>
            <input type="file" accept=".pdf,.png,.jpg,.jpeg" />
          </div>
          <button className="btn btn-primary" type="submit">Preview verification step</button>
        </form>
      </div>
    </>
  )
}

function Support({ ctx }) {
  const {
    token,
    tickets,
    conversations = [],
    showToast,
    onCreateTicket,
    onCreateConversation,
    onSendMessage,
  } = ctx

  const [activeTab, setActiveTab] = useState('conversations')
  const [selectedConvoId, setSelectedConvoId] = useState(null)
  const [chatInput, setChatInput] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')

  if (!token) {
    return (
      <div className="app-card">
        <div className="section-row">
          <div>
            <h3>Conversation preview</h3>
            <div className="muted-copy">Sample ticket #VX-1042 · Demo</div>
          </div>
          <span className="status">Open demo</span>
        </div>
        <div className="support-thread">
          <div className="chat-bubble">
            <span className="chat-meta">VELTRIX SUPPORT · SAMPLE</span>
            Hello! Welcome to the demo support centre. How can we help you today?
          </div>
          <div className="chat-bubble agent">
            <span className="chat-meta">YOU · EXAMPLE</span>
            I’d like to understand how account verification works.
          </div>
        </div>
        <button className="btn btn-primary" data-view="login" onClick={() => ctx.onNavigate('login')}>
          Sign in to open a demo ticket
        </button>
      </div>
    )
  }

  const handleTicketSubmit = async (e) => {
    e.preventDefault()
    const ok = await onCreateTicket({ subject, message })
    if (ok) {
      setSubject('')
      setMessage('')
    }
  }

  const handleCreateConvo = async (e) => {
    e.preventDefault()
    if (!onCreateConversation) return
    const convo = await onCreateConversation(subject, message)
    if (convo) {
      setSubject('')
      setMessage('')
      setSelectedConvoId(convo.id)
    }
  }

  const handleSendChat = async (e) => {
    e.preventDefault()
    if (!chatInput.trim() || !selectedConvoId || !onSendMessage) return
    await onSendMessage(selectedConvoId, chatInput.trim())
    setChatInput('')
  }

  const activeConvo = conversations.find((c) => c.id === selectedConvoId) || conversations[0]

  return (
    <>
      <div className="admin-warn">
        Connected to Django REST Support APIs (`/api/support/` and `/api/conversations/`). You can submit tickets and exchange live messages with support threads.
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <button
          type="button"
          className="btn btn-outline"
          style={{
            background: activeTab === 'conversations' ? '#8be3b516' : 'transparent',
            borderColor: activeTab === 'conversations' ? 'var(--green)' : 'var(--line)',
            color: activeTab === 'conversations' ? 'var(--green)' : '#9eafa4',
          }}
          onClick={() => setActiveTab('conversations')}
        >
          Support Conversations ({conversations.length})
        </button>
        <button
          type="button"
          className="btn btn-outline"
          style={{
            background: activeTab === 'tickets' ? '#8be3b516' : 'transparent',
            borderColor: activeTab === 'tickets' ? 'var(--green)' : 'var(--line)',
            color: activeTab === 'tickets' ? 'var(--green)' : '#9eafa4',
          }}
          onClick={() => setActiveTab('tickets')}
        >
          Tickets ({tickets.length})
        </button>
      </div>

      {activeTab === 'conversations' ? (
        <div className="page-grid">
          {/* Conversation List / Creation */}
          <div className="app-card">
            <h3>Support Threads</h3>
            <div className="muted-copy">Active support chats</div>

            {conversations.length > 0 ? (
              <div style={{ display: 'grid', gap: 8, margin: '14px 0' }}>
                {conversations.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => setSelectedConvoId(c.id)}
                    style={{
                      padding: 10,
                      borderRadius: 4,
                      cursor: 'pointer',
                      border: '1px solid ' + (c.id === (activeConvo?.id) ? 'var(--green)' : 'var(--line)'),
                      background: c.id === (activeConvo?.id) ? '#163326' : '#101e17',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700 }}>
                      <span>{c.subject}</span>
                      <span className="status">{c.is_active ? 'Active' : 'Closed'}</span>
                    </div>
                    {c.last_message && (
                      <p style={{ margin: '4px 0 0', fontSize: 10, color: '#8ca094' }}>
                        {c.last_message.content || c.last_message.text || 'Message'}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 11, color: '#8ca094', margin: '14px 0' }}>No active conversations yet.</p>
            )}

            <form onSubmit={handleCreateConvo} style={{ borderTop: '1px solid var(--line)', paddingTop: 14 }}>
              <h4>Start New Conversation</h4>
              <div className="form-group">
                <label>Subject</label>
                <input required placeholder="e.g. Account Verification Query" value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Initial Message</label>
                <textarea rows={2} required placeholder="How can we help?" value={message} onChange={(e) => setMessage(e.target.value)} />
              </div>
              <button className="btn btn-primary" type="submit">Start Conversation ↗</button>
            </form>
          </div>

          {/* Active Conversation Detail */}
          <div className="app-card">
            {activeConvo ? (
              <>
                <div className="section-row">
                  <div>
                    <h3>{activeConvo.subject}</h3>
                    <div className="muted-copy">Conversation #{activeConvo.id}</div>
                  </div>
                  <span className="status">{activeConvo.is_active ? 'Connected' : 'Closed'}</span>
                </div>

                <div className="support-thread" style={{ maxHeight: 320, overflowY: 'auto' }}>
                  {(activeConvo.messages || []).map((msg, idx) => {
                    const isUser = msg.sender === 'user' || msg.sender === profile?.username || msg.is_user
                    return (
                      <div className={`chat-bubble ${isUser ? 'agent' : ''}`} key={msg.id || idx}>
                        <span className="chat-meta">{isUser ? 'YOU' : 'VELTRIX SUPPORT'}</span>
                        {msg.content || msg.text}
                      </div>
                    )
                  })}
                </div>

                {activeConvo.is_active && (
                  <form onSubmit={handleSendChat} style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                    <input
                      style={{ flex: 1, background: '#08110f', border: '1px solid #2b4135', color: '#fff', padding: 10, borderRadius: 3 }}
                      placeholder="Type a message…"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                    />
                    <button className="btn btn-primary" type="submit">Send</button>
                  </form>
                )}
              </>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">✳</div>
                <p>Select or create a conversation to message support.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="app-card">
          <div className="section-row">
            <div>
              <h3>Traditional Tickets</h3>
              <div className="muted-copy">{tickets.length} ticket{tickets.length === 1 ? '' : 's'} on record</div>
            </div>
            <span className="status">REST API</span>
          </div>

          {tickets.length > 0 ? (
            <div className="support-thread">
              {tickets.map((ticket) => (
                <div className="chat-bubble" key={ticket.id}>
                  <span className="chat-meta">
                    {ticket.subject} · {ticket.status} · {new Date(ticket.created_at || Date.now()).toLocaleString()}
                  </span>
                  {ticket.message}
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">✳</div>
              No tickets yet.
            </div>
          )}

          <form id="supportForm" onSubmit={handleTicketSubmit}>
            <div className="form-group">
              <label htmlFor="supportSubject">Subject</label>
              <input id="supportSubject" required placeholder="Brief summary" value={subject} onChange={(event) => setSubject(event.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="supportMessage">Your message</label>
              <textarea id="supportMessage" rows={3} required placeholder="Write a message…" value={message} onChange={(event) => setMessage(event.target.value)} />
            </div>
            <button className="btn btn-primary" type="submit">Create Ticket ↗</button>
          </form>
        </div>
      )}
    </>
  )
}

function Settings({ ctx }) {
  const { token, profile, showToast } = ctx
  if (token && profile) {
    return (
      <div className="app-card">
        <h3>User Profile</h3>
        <div className="form-group"><label>Email</label><div><b>{profile.email}</b></div></div>
        <div className="form-group"><label>Name</label><div><b>{profile.first_name || profile.last_name ? `${profile.first_name} ${profile.last_name}`.trim() : profile.username}</b></div></div>
        <div className="form-group"><label>Account Role</label><div><span className="status">{profile.role || 'client'}</span></div></div>
        <div className="form-group"><label>Verification</label><div>{profile.is_verified ? 'Verified' : 'Simulated (Unverified)'}</div></div>
        <p className="form-note">Data retrieved from `/api/profile/` with JWT Bearer authentication.</p>
      </div>
    )
  }
  return (
    <div className="app-card">
      <h3>Profile preferences</h3>
      <form id="settingsForm" onSubmit={(event) => { event.preventDefault(); showToast('Demo only — settings were not saved.') }}>
        <div className="form-group"><label>Display name</label><input placeholder="Demo user" /></div>
        <div className="form-group">
          <label>Notification preference</label>
          <select defaultValue="Important updates">
            <option>Important updates</option>
            <option>All notifications</option>
            <option>Essential only</option>
          </select>
        </div>
        <button className="btn btn-primary" type="submit">Preview settings</button>
      </form>
      <p className="form-note">Sign in to a demo account to view profile details from the backend.</p>
    </div>
  )
}

const OVERVIEW = { view: 'portal', title: 'Good morning.', subtitle: 'Here’s your demo workspace at a glance.' }

export default function AppViews({ view, ctx }) {
  if (view === 'portal') {
    return <Shell view="portal" title={OVERVIEW.title} subtitle={OVERVIEW.subtitle} onNavigate={ctx.onNavigate}><Overview ctx={ctx} /></Shell>
  }
  if (view === 'markets') {
    return (
      <Shell view="markets" title="Markets" subtitle="Explore a sample set of instruments and illustrative prices." onNavigate={ctx.onNavigate}>
        {ctx.marketLoading ? (
          <div className="app-card"><div className="muted-copy">Loading demo markets…</div></div>
        ) : (
          <MarketTable
            rows={ctx.marketRows}
            onToast={ctx.showToast}
            onTrade={ctx.onOpenTrade}
            onToggleWatchlist={ctx.onToggleWatchlist}
            watchlist={ctx.watchlist}
          />
        )}
      </Shell>
    )
  }
  if (view === 'portfolio') {
    return <Shell view="portfolio" title="Portfolio" subtitle="A visual preview of your demo holdings and asset allocation." onNavigate={ctx.onNavigate}><Portfolio ctx={ctx} /></Shell>
  }
  if (view === 'accounts') {
    return <Shell view="accounts" title="Accounts" subtitle="Manage account profiles in this demo." onNavigate={ctx.onNavigate}><Accounts ctx={ctx} /></Shell>
  }
  if (view === 'wallet' || view === 'deposits' || view === 'withdrawals') {
    const titles = {
      wallet: ['Wallet', 'Demo financial interfaces — simulated cash management.'],
      deposits: ['Deposits', 'Top up simulated funds for demo trading.'],
      withdrawals: ['Withdrawals', 'Simulated cash balance and withdrawal interface.'],
    }[view]
    return <Shell view={view} title={titles[0]} subtitle={titles[1]} onNavigate={ctx.onNavigate}><Money view={view} ctx={ctx} /></Shell>
  }
  if (view === 'transactions') {
    return <Shell view="transactions" title="Transactions" subtitle="Real-time transaction history from backend ledger." onNavigate={ctx.onNavigate}><Transactions ctx={ctx} /></Shell>
  }
  if (view === 'kyc') {
    return <Shell view="kyc" title="Verification" subtitle="Preview an identity verification workflow." onNavigate={ctx.onNavigate}><Kyc ctx={ctx} /></Shell>
  }
  if (view === 'portal-support') {
    return <Shell view="portal-support" title="Support centre" subtitle="Support conversations and ticket handling." onNavigate={ctx.onNavigate}><Support ctx={ctx} /></Shell>
  }
  if (view === 'settings') {
    return <Shell view="settings" title="Settings" subtitle="Preview profile and notification preferences." onNavigate={ctx.onNavigate}><Settings ctx={ctx} /></Shell>
  }
  return null
}
