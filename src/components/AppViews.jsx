import React, { useState } from 'react'
import AppSidebar from './AppSidebar'
import DataTable from './DataTable'
import { MarketTable, MarketRowsTable } from './MarketTable'
import { DEMO_TRANSACTIONS, formatCurrency } from '../data'

function Shell({ view, title, subtitle, admin, onNavigate, children }) {
  return (
    <div className="app-shell">
      <AppSidebar active={view} admin={admin} onNavigate={onNavigate} />
      <section className="app-main">
        <div className="app-topline">
          <div><h1>{title}</h1><p>{subtitle}</p></div>
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
        <span>Crypto · 42%</span><span>Indices · 26%</span><span>Commodities · 18%</span><span>Other · 14%</span>
      </div>
    </div>
  )
}

function MiniChart() {
  return (
    <svg className="mini-chart" viewBox="0 0 500 190" preserveAspectRatio="none" aria-label="Illustrative portfolio chart">
      <g stroke="#ffffff0e"><path d="M0 30H500M0 70H500M0 110H500M0 150H500" /></g>
      <path d="M0 150 C35 142 45 118 80 132 S120 80 155 102 S195 115 225 70 S275 96 310 56 S350 73 390 42 S450 55 500 18" fill="none" stroke="#8be3b5" strokeWidth="3" />
    </svg>
  )
}

function statusCell(value) {
  if (value === 'pending') return <span className="status pending">Pending</span>
  if (value === 'review') return <span className="status review">Demo</span>
  return value
}

function Overview({ ctx }) {
  const { marketRows, onNavigate, showToast } = ctx
  const topRows = marketRows.slice(0, 4)
  return (
    <>
      <div className="admin-warn">All figures and activity below are simulated examples. No funds are held, and no trades or transactions can be executed.</div>
      <div className="stat-grid">
        <div className="app-card"><span className="stat-label">DEMO PORTFOLIO</span><div className="stat-value">$24,680.50</div><span className="stat-change">↗ +4.28% illustrative</span></div>
        <div className="app-card"><span className="stat-label">AVAILABLE BALANCE</span><div className="stat-value">$8,240.00</div><span className="muted-copy">Simulated value</span></div>
        <div className="app-card"><span className="stat-label">WATCHLIST</span><div className="stat-value">08</div><span className="muted-copy">Sample instruments</span></div>
      </div>
      <div className="dashboard-grid">
        <div className="app-card">
          <div className="section-row">
            <div><h3>Portfolio overview</h3><div className="muted-copy">Illustrative movement over time</div></div>
            <span className="status">DEMO</span>
          </div>
          <MiniChart />
          <div className="chart-axis"><span>SEP 01</span><span>SEP 10</span><span>SEP 20</span><span>OCT 01</span><span>OCT 09</span></div>
        </div>
        <div className="app-card">
          <h3>Allocation preview</h3>
          <div className="muted-copy">Sample portfolio composition</div>
          <Allocation />
        </div>
      </div>
      <div className="app-card" style={{ marginTop: 15 }}>
        <div className="section-row">
          <div><h3>Market watch</h3><div className="muted-copy">Demo prices only</div></div>
          <button className="btn btn-outline" data-view="markets" onClick={() => onNavigate('markets')}>All markets ↗</button>
        </div>
        <MarketRowsTable rows={topRows} onToast={showToast} />
      </div>
    </>
  )
}

function Portfolio({ ctx }) {
  const { dashboard, onNavigate } = ctx
  const positions = dashboard?.positions || []
  const hasPositions = positions.length > 0
  const total = hasPositions
    ? positions.reduce((sum, position) => sum + Number(position.market_value || 0), 0)
    : 24680.5

  return (
    <>
      <div className="admin-warn">This is simulated portfolio information, not a record of real assets.</div>
      <div className="page-grid">
        <div className="app-card">
          <span className="stat-label">DEMO PORTFOLIO VALUE</span>
          <div className="stat-value">{formatCurrency(total)}</div>
          <span className="stat-change">+4.28% illustrative</span>
          <Allocation />
        </div>
        {hasPositions ? (
          <div className="app-card">
            <h3>Demo positions</h3>
            <div className="muted-copy">Populated from the authenticated demo account API.</div>
            <DataTable
              headings={['SYMBOL', 'QUANTITY', 'MARKET VALUE']}
              rows={positions.map((position) => [
                position.symbol,
                Number(position.quantity).toLocaleString('en-US', { maximumFractionDigits: 4 }),
                formatCurrency(position.market_value),
              ])}
            />
          </div>
        ) : (
          <div className="app-card">
            <h3>Portfolio notes</h3>
            <p className="muted-copy">A real portfolio view would be populated from authenticated, permission-checked backend data and a reliable valuation service.</p>
          </div>
        )}
      </div>
    </>
  )
}

function Accounts({ ctx }) {
  const { showToast } = ctx
  return (
    <>
      <div className="page-grid">
        <div className="app-card">
          <span className="stat-label">ACCOUNT 001 · SAMPLE</span>
          <h3 style={{ fontSize: 22, marginTop: 14 }}>Essential</h3>
          <p className="muted-copy">Status: demo account</p>
          <div className="stat-value">$10,000.00</div>
          <span className="status">Demo active</span>
        </div>
        <div className="app-card">
          <span className="stat-label">ACCOUNT 002 · SAMPLE</span>
          <h3 style={{ fontSize: 22, marginTop: 14 }}>Advanced</h3>
          <p className="muted-copy">Status: preview only</p>
          <div className="stat-value">$14,680.50</div>
          <span className="status pending">Preview</span>
        </div>
      </div>
      <div className="app-actions">
        <button className="btn btn-primary" data-toast="Account creation is not connected in this demo" onClick={() => showToast('Account creation is not connected in this demo')}>
          ＋ Add account preview
        </button>
      </div>
    </>
  )
}

function Money({ view, ctx }) {
  const { onNavigate, showToast } = ctx
  const title = { wallet: 'Wallet', deposits: 'Deposits', withdrawals: 'Withdrawals' }[view]
  return (
    <>
      <div className="admin-warn">Do not enter payment details. These are interface previews only; no funds can be received, held, or sent.</div>
      <div className="stat-grid">
        <div className="app-card"><span className="stat-label">DEMO BALANCE</span><div className="stat-value">$8,240.00</div><span className="muted-copy">Simulated only</span></div>
        <div className="app-card"><span className="stat-label">PENDING ITEMS</span><div className="stat-value">02</div><span className="muted-copy">Sample records</span></div>
      </div>
      <div className="app-card">
        <h3>{view === 'withdrawals' ? 'Withdrawal request preview' : view === 'deposits' ? 'Deposit method preview' : 'Wallet activity'}</h3>
        <p className="muted-copy">A production flow requires authenticated server-side authorization, a verified payment provider, ledger controls, reconciliation, and audit logging.</p>
        <div className="app-actions">
          <button className="btn btn-primary" data-toast="Demo only — no transaction was created" onClick={() => showToast('Demo only — no transaction was created')}>Preview action</button>
          <button className="btn btn-outline" data-view="transactions" onClick={() => onNavigate('transactions')}>View activity</button>
        </div>
      </div>
    </>
  )
}

function Transactions({ ctx }) {
  const { dashboard } = ctx
  const rows = dashboard?.transactions?.length
    ? dashboard.transactions.map((tx) => [
        tx.side,
        tx.symbol,
        new Date(tx.created_at).toLocaleDateString('en-US'),
        formatCurrency(tx.amount),
        <span className="status" key="s">{tx.status}</span>,
      ])
    : DEMO_TRANSACTIONS.map((t) => [t[0], t[1], t[2], t[3], statusCell(t[4])])

  return (
    <>
      <div className="admin-warn">These records are fictional demo entries. They are not financial transactions.</div>
      <div className="app-card">
        <DataTable headings={['ACTIVITY', 'DETAIL', 'DATE', 'AMOUNT', 'STATUS']} rows={rows} />
        <div className="mobile-note">Swipe horizontally to view all columns.</div>
      </div>
    </>
  )
}

function Kyc({ ctx }) {
  const { showToast } = ctx
  return (
    <>
      <div className="admin-warn">Do not upload real identity documents. This demo does not transmit or securely store files.</div>
      <div className="app-card">
        <span className="status pending">Not submitted</span>
        <h3 style={{ fontSize: 21, marginTop: 18 }}>Verify your identity</h3>
        <p className="muted-copy">A production service would explain required documents, collect consent, securely transfer files, and provide a review status.</p>
        <form id="kycForm" onSubmit={(event) => { event.preventDefault(); showToast('Demo only — no documents were uploaded or submitted.') }}>
          <div className="form-group">
            <label>Country of residence</label>
            <select required defaultValue="">
              <option value="">Choose a country</option>
              <option>Nigeria</option>
              <option>United Kingdom</option>
              <option>Other</option>
            </select>
          </div>
          <div className="form-group">
            <label>Document type</label>
            <select required defaultValue="">
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
  const { token, tickets, showToast, onCreateTicket } = ctx
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')

  if (!token) {
    return (
      <>
        <div className="admin-warn">This inbox is a UI demo. Messages are not delivered to a human agent. Sign in to your demo account to create real support tickets on the backend.</div>
        <div className="app-card">
          <div className="section-row">
            <div><h3>Conversation preview</h3><div className="muted-copy">Sample ticket #VX-1042 · Demo</div></div>
            <span className="status">Open demo</span>
          </div>
          <div className="support-thread">
            <div className="chat-bubble"><span className="chat-meta">VELTRIX SUPPORT · SAMPLE</span>Hello! Welcome to the demo support centre. How can we help you today?</div>
            <div className="chat-bubble agent"><span className="chat-meta">YOU · EXAMPLE</span>I’d like to understand how account verification works.</div>
            <div className="chat-bubble"><span className="chat-meta">VELTRIX SUPPORT · SAMPLE</span>A real support team would explain the steps and provide status updates here.</div>
          </div>
          <button className="btn btn-primary" data-view="login" onClick={() => ctx.onNavigate('login')}>Sign in to open a demo ticket</button>
        </div>
      </>
    )
  }

  const submit = async (event) => {
    event.preventDefault()
    const created = await onCreateTicket({ subject, message })
    if (created) {
      setSubject('')
      setMessage('')
    }
  }

  return (
    <>
      <div className="admin-warn">Tickets you create are stored on the demo backend for this account. No human agent is connected, and no real support response is delivered automatically.</div>
      <div className="app-card">
        <div className="section-row">
          <div><h3>Your tickets</h3><div className="muted-copy">{tickets.length} ticket{tickets.length === 1 ? '' : 's'} on record</div></div>
          <span className="status">Open</span>
        </div>
        {tickets.length > 0 ? (
          <div className="support-thread">
            {tickets.map((ticket) => (
              <div className="chat-bubble" key={ticket.id}>
                <span className="chat-meta">{ticket.subject} · {ticket.status} · {new Date(ticket.created_at).toLocaleString()}</span>
                {ticket.message}
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state"><div className="empty-icon">✳</div>No tickets yet.</div>
        )}
        <form id="supportForm" onSubmit={submit}>
          <div className="form-group">
            <label htmlFor="supportSubject">Subject</label>
            <input id="supportSubject" required placeholder="Brief summary" value={subject} onChange={(event) => setSubject(event.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="supportMessage">Your message</label>
            <textarea id="supportMessage" rows={3} required placeholder="Write a message…" value={message} onChange={(event) => setMessage(event.target.value)} />
          </div>
          <button className="btn btn-primary" type="submit">Create demo ticket</button>
        </form>
      </div>
    </>
  )
}

function Settings({ ctx }) {
  const { token, profile, showToast } = ctx
  if (token && profile) {
    return (
      <div className="app-card">
        <h3>Profile</h3>
        <div className="form-group"><label>Email</label><div>{profile.email}</div></div>
        <div className="form-group"><label>Name</label><div>{profile.first_name || profile.last_name ? `${profile.first_name} ${profile.last_name}`.trim() : '—'}</div></div>
        <div className="form-group"><label>Role</label><div>{profile.role || 'client'}</div></div>
        <div className="form-group"><label>Email verified</label><div>{profile.is_verified ? 'Verified' : 'Not verified'}</div></div>
        <p className="form-note">Profile editing is not yet available in this demo. Account administration is handled in the Django admin.</p>
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
      <p className="form-note">Sign in to a demo account to view profile details from the backend. These preferences are not saved to an account or server in this prototype.</p>
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
        {ctx.marketLoading
          ? <div className="app-card"><div className="muted-copy">Loading demo markets…</div></div>
          : <MarketTable rows={ctx.marketRows} onToast={ctx.showToast} />}
      </Shell>
    )
  }
  if (view === 'portfolio') {
    return <Shell view="portfolio" title="Portfolio" subtitle="A visual preview of how portfolio information could be presented." onNavigate={ctx.onNavigate}><Portfolio ctx={ctx} /></Shell>
  }
  if (view === 'accounts') {
    return <Shell view="accounts" title="Accounts" subtitle="Manage account profiles in this demo." onNavigate={ctx.onNavigate}><Accounts ctx={ctx} /></Shell>
  }
  if (view === 'wallet' || view === 'deposits' || view === 'withdrawals') {
    const titles = {
      wallet: ['Wallet', 'Demo financial interfaces — no money movement is available.'],
      deposits: ['Deposits', 'Demo financial interfaces — no money movement is available.'],
      withdrawals: ['Withdrawals', 'Demo financial interfaces — no money movement is available.'],
    }[view]
    return <Shell view={view} title={titles[0]} subtitle={titles[1]} onNavigate={ctx.onNavigate}><Money view={view} ctx={ctx} /></Shell>
  }
  if (view === 'transactions') {
    return <Shell view="transactions" title="Transactions" subtitle="Sample transaction history for layout preview." onNavigate={ctx.onNavigate}><Transactions ctx={ctx} /></Shell>
  }
  if (view === 'kyc') {
    return <Shell view="kyc" title="Verification" subtitle="Preview an identity verification workflow." onNavigate={ctx.onNavigate}><Kyc ctx={ctx} /></Shell>
  }
  if (view === 'portal-support') {
    return <Shell view="portal-support" title="Support centre" subtitle="A sample support conversation. No real ticket will be sent." onNavigate={ctx.onNavigate}><Support ctx={ctx} /></Shell>
  }
  if (view === 'settings') {
    return <Shell view="settings" title="Settings" subtitle="Preview profile and notification preferences." onNavigate={ctx.onNavigate}><Settings ctx={ctx} /></Shell>
  }
  return null
}
