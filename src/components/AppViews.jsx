import React, { useState } from 'react'
import AppSidebar from './AppSidebar'
import DataTable from './DataTable'
import { MarketTable, MarketRowsTable } from './MarketTable'
import { formatCurrency, formatPrice } from '../data'

function Shell({ view, title, subtitle, admin, onNavigate, onLogout, children }) {
  return (
    <div className="app-shell">
      <AppSidebar active={view} admin={admin} onNavigate={onNavigate} onLogout={onLogout} />
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
    <svg className="mini-chart" viewBox="0 0 500 190" preserveAspectRatio="none" aria-label="Portfolio valuation chart">
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
    : 0.0

  const positions = dashboard?.positions || []
  const positionsValue = positions.reduce((sum, p) => sum + Number(p.market_value || 0), 0)
  const totalValue = dashboard ? cash + positionsValue : 0.0

  return (
    <>
      <div className="admin-warn">
        Real-time multi-asset portfolio. Orders are routed and executed with institutional liquidity and low latency.
      </div>

      <div className="stat-grid">
        <div className="app-card">
          <span className="stat-label">TOTAL PORTFOLIO VALUE</span>
          <div className="stat-value">{formatCurrency(totalValue)}</div>
          <span className="stat-change">
            {positions.length > 0 ? `${positions.length} active positions` : 'No open positions'}
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
              + Deposit Funds ↗
            </button>
          </div>
        </div>

        <div className="app-card">
          <span className="stat-label">WATCHLIST</span>
          <div className="stat-value">{String(watchlist.length).padStart(2, '0')}</div>
          <span className="muted-copy">Monitored instruments</span>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="app-card">
          <div className="section-row">
            <div>
              <h3>Portfolio Performance</h3>
              <div className="muted-copy">Real-time valuation across all open positions</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ padding: '5px 10px', fontSize: 10 }}
                onClick={() => onOpenTrade('AAPL')}
              >
                + New Order ↗
              </button>
              <span className="status">MARKET OPEN</span>
            </div>
          </div>
          <MiniChart />
          <div className="chart-axis">
            <span>09:30</span>
            <span>11:30</span>
            <span>13:30</span>
            <span>15:00</span>
            <span>Current</span>
          </div>
        </div>

        <div className="app-card">
          <h3>Asset Allocation</h3>
          <div className="muted-copy">Portfolio diversification by asset class</div>
          <Allocation />
        </div>
      </div>

      <div className="app-card" style={{ marginTop: 15 }}>
        <div className="section-row">
          <div>
            <h3>Market Watch</h3>
            <div className="muted-copy">Global instruments — select Trade to execute market orders</div>
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
    : 0.0
  const positions = dashboard?.positions || []
  const hasPositions = positions.length > 0
  const positionsTotal = positions.reduce((sum, p) => sum + Number(p.market_value || 0), 0)
  const total = dashboard ? cash + positionsTotal : 0.0

  return (
    <>
      <div className="admin-warn">
        Real-time positions and mark-to-market valuations across global instruments.
      </div>

      <div className="page-grid">
        <div className="app-card">
          <span className="stat-label">TOTAL PORTFOLIO VALUE</span>
          <div className="stat-value">{formatCurrency(total)}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#93a79b', fontSize: 11, marginTop: 8 }}>
            <span>Settled Cash: <b style={{ color: 'var(--green)' }}>{formatCurrency(cash)}</b></span>
            <span>Positions Value: <b>{formatCurrency(positionsTotal)}</b></span>
          </div>
          <div style={{ marginTop: 14 }}>
            <button className="btn btn-primary" style={{ marginRight: 8, padding: '7px 14px' }} onClick={() => onOpenTrade('AAPL')}>
              Execute Trade ↗
            </button>
            <button className="btn btn-outline" style={{ padding: '7px 14px' }} onClick={onOpenTopUp}>
              + Deposit Funds
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
              <p>You have no open positions in your trading portfolio yet.</p>
              <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => onNavigate('markets')}>
                Browse markets & execute trades ↗
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
    : 0.0

  return (
    <>
      <div className="page-grid">
        <div className="app-card">
          <span className="stat-label">TRADING ACCOUNT · {profile?.email || 'PRIMARY'}</span>
          <h3 style={{ fontSize: 22, marginTop: 14 }}>VELTRIX Trading Account</h3>
          <p className="muted-copy">Account ID: VX-8492-{profile?.id || '001'} · Currency: USD</p>
          <div className="stat-value">{formatCurrency(cash)}</div>
          <span className="status">Active Account</span>
          <div style={{ marginTop: 16 }}>
            <button className="btn btn-primary" onClick={onOpenTopUp}>
              + Deposit Funds ↗
            </button>
          </div>
        </div>

        <div className="app-card">
          <span className="stat-label">ACCOUNT PROFILE & TIER</span>
          <h3 style={{ fontSize: 22, marginTop: 14 }}>Institutional Standard Tier</h3>
          <p className="muted-copy">Client: {profile?.first_name || profile?.username || 'Trader'} · Status: {profile?.is_verified ? 'Verified' : 'Pending Verification'}</p>
          <ul style={{ padding: '12px 0 0', listStyle: 'none', margin: '14px 0 0', borderTop: '1px solid var(--line)' }}>
            <li style={{ fontSize: 11, margin: '6px 0', color: '#c2d1c7' }}>✓ Instant multi-asset market execution</li>
            <li style={{ fontSize: 11, margin: '6px 0', color: '#c2d1c7' }}>✓ Deep institutional liquidity & real-time quotes</li>
            <li style={{ fontSize: 11, margin: '6px 0', color: '#c2d1c7' }}>✓ Automated transaction auditing & ledger statements</li>
          </ul>
        </div>
      </div>
    </>
  )
}

function Money({ view, ctx }) {
  const { dashboard, onNavigate, onOpenTopUp } = ctx
  const titles = { wallet: 'Wallet & Settlement', deposits: 'Deposit Funds', withdrawals: 'Withdrawal Portal' }
  const cash = dashboard?.account?.cash_balance !== undefined
    ? Number(dashboard.account.cash_balance)
    : 0.0

  return (
    <>
      <div className="admin-warn">
        Multi-currency wallet and cash settlement accounts. Client funds are kept in segregated tier-1 accounts.
      </div>
      <div className="stat-grid">
        <div className="app-card">
          <span className="stat-label">AVAILABLE CASH BALANCE</span>
          <div className="stat-value">{formatCurrency(cash)}</div>
          <span className="muted-copy">Settled funds available for trading</span>
        </div>
        <div className="app-card">
          <span className="stat-label">TRANSACTIONS RECORDED</span>
          <div className="stat-value">{dashboard?.transactions?.length ?? 0}</div>
          <span className="muted-copy">Audited ledger entries</span>
        </div>
      </div>
      <div className="app-card">
        <h3>{view === 'withdrawals' ? 'Withdrawal Portal' : view === 'deposits' ? 'Deposit Trading Funds' : 'Wallet Balances'}</h3>
        <p className="muted-copy">
          {view === 'deposits'
            ? 'Fund your account via wire transfer, SEPA, card, or instant settlement.'
            : 'Manage multi-currency balances, client deposits, and settlement accounts.'}
        </p>
        <div className="app-actions">
          <button className="btn btn-primary" onClick={onOpenTopUp}>
            + Deposit Funds ↗
          </button>
          <button className="btn btn-outline" data-view="transactions" onClick={() => onNavigate('transactions')}>
            View Settlement Ledger
          </button>
        </div>
      </div>
    </>
  )
}

function Transactions({ ctx }) {
  const { dashboard } = ctx
  const rawTx = dashboard?.transactions || []
  const rows = rawTx.map((tx) => [
    <b key={`side-${tx.id}`} style={{ textTransform: 'uppercase', color: tx.side === 'buy' ? 'var(--green)' : 'var(--gold)' }}>{tx.side}</b>,
    tx.symbol || 'USD Deposit',
    new Date(tx.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    formatCurrency(tx.amount),
    <span className="status" key={`st-${tx.id}`}>{tx.status}</span>,
  ])

  return (
    <>
      <div className="admin-warn">
        Official trade confirmations and ledger records. Each transaction is settled atomically and immutably recorded.
      </div>
      <div className="app-card">
        {rows.length ? (
          <DataTable headings={['TRANSACTION', 'INSTRUMENT / REFERENCE', 'DATE', 'AMOUNT', 'STATUS']} rows={rows} />
        ) : (
          <div className="empty-state">
            <div className="empty-icon">◈</div>
            <p>No transactions yet. Your ledger will populate once you deposit funds or execute a trade.</p>
          </div>
        )}
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
        Regulatory compliance and tier-1 KYC verification for client accounts.
      </div>
      <div className="app-card">
        <span className={profile?.is_verified ? 'status' : 'status pending'}>
          {profile?.is_verified ? 'Verified' : 'Pending Verification'}
        </span>
        <h3 style={{ fontSize: 21, marginTop: 18 }}>Verify your identity</h3>
        <p className="muted-copy">
          In compliance with international financial regulations, please provide your jurisdiction details and identification documents.
        </p>
        <form
          id="kycForm"
          onSubmit={(event) => {
            event.preventDefault()
            showToast('Verification documents submitted for review.')
          }}
        >
          <div className="form-group">
            <label>Country of residence</label>
            <select required defaultValue="">
              <option value="">Choose a country</option>
              <option>Austria</option>
              <option>Belgium</option>
              <option>Czech Republic</option>
              <option>Denmark</option>
              <option>Finland</option>
              <option>France</option>
              <option>Germany</option>
              <option>Greece</option>
              <option>Ireland</option>
              <option>Italy</option>
              <option>Netherlands</option>
              <option>Norway</option>
              <option>Poland</option>
              <option>Portugal</option>
              <option>Spain</option>
              <option>Sweden</option>
              <option>Switzerland</option>
              <option>United Kingdom</option>
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
            <label>Upload Document File</label>
            <input type="file" accept=".pdf,.png,.jpg,.jpeg" />
          </div>
          <button className="btn btn-primary" type="submit">Submit Verification Details</button>
        </form>
      </div>
    </>
  )
}

function Support({ ctx }) {
  const {
    token,
    profile,
    tickets,
    conversations = [],
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
      <div className="app-card" style={{ maxWidth: 620, margin: '20px auto', textAlign: 'center', padding: '36px 24px' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
        <h3 style={{ fontSize: 24, marginBottom: 10 }}>Client Authentication Required</h3>
        <p className="muted-copy" style={{ maxWidth: 480, margin: '0 auto 20px', lineHeight: 1.6 }}>
          Unauthenticated users cannot send messages or open support cases. In order for inquiries to reach the admin operations desk with your verified credentials (Name, Email, Account ID, and KYC status), please sign in to your trading account.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button className="btn btn-primary" onClick={() => ctx.onNavigate('login')}>
            Sign In to Contact Support ↗
          </button>
          <button className="btn btn-outline" onClick={() => ctx.onNavigate('register')}>
            Open a Trading Account
          </button>
        </div>
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

  const clientName = profile?.first_name
    ? `${profile.first_name} ${profile.last_name || ''}`.trim()
    : profile?.username || 'Client'
  const accountRef = profile?.id ? `VX-${String(profile.id).padStart(3, '0')}` : 'VX-001'

  return (
    <>
      <div
        style={{
          background: '#0d1d16',
          border: '1px solid #234735',
          borderRadius: 4,
          padding: '12px 16px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="status">Verified Session</span>
          <span style={{ fontSize: 12, color: '#f1f7f3' }}>
            Client: <b>{clientName}</b> ({profile?.email || 'Authenticated User'})
          </span>
          <span style={{ fontSize: 11, color: 'var(--green)', fontFamily: 'monospace' }}>
            [{accountRef}]
          </span>
        </div>
        <small style={{ fontSize: 10, color: '#8ca094' }}>
          ✓ Inquiries routed directly to Admin Control Desk with verified account credentials
        </small>
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
          Active Conversations ({conversations.length})
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
          Support Tickets ({tickets.length})
        </button>
      </div>

      {activeTab === 'conversations' ? (
        <div className="page-grid">
          {/* Conversation List / Creation */}
          <div className="app-card">
            <h3>Support Threads</h3>
            <div className="muted-copy">Active client desk conversations</div>

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
                      <span className="status">{c.is_active ? 'Active' : 'Resolved'}</span>
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
              <h4>Start New Support Thread</h4>
              <div className="form-group">
                <label>Subject</label>
                <input required placeholder="e.g. Account Funding or Trade Inquiry" value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Message</label>
                <textarea rows={2} required placeholder="How can we assist you?" value={message} onChange={(e) => setMessage(e.target.value)} />
              </div>
              <button className="btn btn-primary" type="submit">Submit Inquiry ↗</button>
            </form>
          </div>

          {/* Active Conversation Detail */}
          <div className="app-card">
            {activeConvo ? (
              <>
                <div className="section-row">
                  <div>
                    <h3>{activeConvo.subject}</h3>
                    <div className="muted-copy">Case #{activeConvo.id}</div>
                  </div>
                  <span className="status">{activeConvo.is_active ? 'Desk Connected' : 'Closed'}</span>
                </div>

                <div className="support-thread" style={{ maxHeight: 320, overflowY: 'auto' }}>
                  {(activeConvo.messages || []).map((msg, idx) => {
                    // Backend serializes `sender` as a nested user object; fall
                    // back to the legacy string form for safety.
                    const senderId = msg.sender && typeof msg.sender === 'object' ? msg.sender.id : undefined
                    const senderName = msg.sender && typeof msg.sender === 'object' ? msg.sender.username : msg.sender
                    const isUser = senderId !== undefined
                      ? senderId === profile?.id
                      : (senderName === 'user' || msg.is_user)
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
                <p>Select or create a conversation to message the client support desk.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="app-card">
          <div className="section-row">
            <div>
              <h3>Support Tickets</h3>
              <div className="muted-copy">{tickets.length} ticket{tickets.length === 1 ? '' : 's'} on record</div>
            </div>
            <span className="status">Active Desk</span>
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
              No tickets on record.
            </div>
          )}

          <form id="supportForm" onSubmit={handleTicketSubmit}>
            <div className="form-group">
              <label htmlFor="supportSubject">Subject</label>
              <input id="supportSubject" required placeholder="Brief summary" value={subject} onChange={(event) => setSubject(event.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="supportMessage">Your message</label>
              <textarea id="supportMessage" rows={3} required placeholder="Detailed message…" value={message} onChange={(event) => setMessage(event.target.value)} />
            </div>
            <button className="btn btn-primary" type="submit">Submit Support Ticket ↗</button>
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
        <h3>Client Profile & Security</h3>
        <div className="form-group"><label>Registered Email</label><div><b>{profile.email}</b></div></div>
        <div className="form-group"><label>Account Holder</label><div><b>{profile.first_name || profile.last_name ? `${profile.first_name} ${profile.last_name}`.trim() : profile.username}</b></div></div>
        <div className="form-group"><label>Account Role</label><div><span className="status">{profile.role || 'client'}</span></div></div>
        <div className="form-group"><label>Verification Status</label><div>{profile.is_verified ? 'Fully Verified' : 'Standard (KYC Pending)'}</div></div>
        <p className="form-note">Account records secured with 256-bit SSL encryption and strict privacy protocols.</p>
      </div>
    )
  }
  return (
    <div className="app-card">
      <h3>Profile Preferences</h3>
      <form id="settingsForm" onSubmit={(event) => { event.preventDefault(); showToast('Preferences updated.') }}>
        <div className="form-group"><label>Display Name</label><input placeholder="Trader" /></div>
        <div className="form-group">
          <label>Notification Preference</label>
          <select defaultValue="Important updates">
            <option>Important trade alerts & fills</option>
            <option>All market & account notifications</option>
            <option>Essential security updates only</option>
          </select>
        </div>
        <button className="btn btn-primary" type="submit">Save Preferences</button>
      </form>
      <p className="form-note">Sign in to your client account to view full profile details and security settings.</p>
    </div>
  )
}

export default function AppViews({ view, ctx }) {
  if (view === 'portal') {
    return (
      <Shell
        view="portal"
        title="Trading Workspace"
        subtitle="Overview of your portfolio, active positions, and market movements."
        onNavigate={ctx.onNavigate}
        onLogout={ctx.onLogout}
      >
        <Overview ctx={ctx} />
      </Shell>
    )
  }
  if (view === 'markets') {
    return (
      <Shell
        view="markets"
        title="Global Markets"
        subtitle="Explore tradable equities, digital assets, commodities, and currencies."
        onNavigate={ctx.onNavigate}
        onLogout={ctx.onLogout}
      >
        {ctx.marketLoading ? (
          <div className="app-card"><div className="muted-copy">Loading global market feeds…</div></div>
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
    return (
      <Shell
        view="portfolio"
        title="Portfolio Management"
        subtitle="Real-time holdings, asset allocation, and performance analytics."
        onNavigate={ctx.onNavigate}
        onLogout={ctx.onLogout}
      >
        <Portfolio ctx={ctx} />
      </Shell>
    )
  }
  if (view === 'accounts') {
    return (
      <Shell
        view="accounts"
        title="Trading Accounts"
        subtitle="Manage your brokerage accounts and trading profiles."
        onNavigate={ctx.onNavigate}
        onLogout={ctx.onLogout}
      >
        <Accounts ctx={ctx} />
      </Shell>
    )
  }
  if (view === 'wallet' || view === 'deposits' || view === 'withdrawals') {
    const titles = {
      wallet: ['Wallet & Settlement', 'Multi-currency cash balances and funding tools.'],
      deposits: ['Deposit Funds', 'Deposit capital for active market trading.'],
      withdrawals: ['Withdrawals Portal', 'Request capital withdrawals to verified settlement accounts.'],
    }[view]
    return <Shell view={view} title={titles[0]} subtitle={titles[1]} onNavigate={ctx.onNavigate} onLogout={ctx.onLogout}><Money view={view} ctx={ctx} /></Shell>
  }
  if (view === 'transactions') {
    return (
      <Shell
        view="transactions"
        title="Ledger & Statements"
        subtitle="Audited transaction history and trade execution statements."
        onNavigate={ctx.onNavigate}
        onLogout={ctx.onLogout}
      >
        <Transactions ctx={ctx} />
      </Shell>
    )
  }
  if (view === 'kyc') {
    return (
      <Shell
        view="kyc"
        title="Identity Verification"
        subtitle="Regulatory compliance and account verification status."
        onNavigate={ctx.onNavigate}
        onLogout={ctx.onLogout}
      >
        <Kyc ctx={ctx} />
      </Shell>
    )
  }
  if (view === 'portal-support') {
    return (
      <Shell
        view="portal-support"
        title="Client Support Desk"
        subtitle="Direct communication with institutional support specialists."
        onNavigate={ctx.onNavigate}
        onLogout={ctx.onLogout}
      >
        <Support ctx={ctx} />
      </Shell>
    )
  }
  if (view === 'settings') {
    return (
      <Shell
        view="settings"
        title="Account Settings"
        subtitle="Security, notifications, and client profile preferences."
        onNavigate={ctx.onNavigate}
        onLogout={ctx.onLogout}
      >
        <Settings ctx={ctx} />
      </Shell>
    )
  }
  return null
}
