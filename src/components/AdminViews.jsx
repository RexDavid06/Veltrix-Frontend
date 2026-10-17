import React, { useState } from 'react'
import AppSidebar from './AppSidebar'
import DataTable from './DataTable'
import { DEMO_TRANSACTIONS } from '../data'

function AdminShell({ view, title, subtitle, onNavigate, onLogout, children }) {
  return (
    <div className="app-shell">
      <AppSidebar active={view} admin onNavigate={onNavigate} onLogout={onLogout} />
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

export default function AdminViews({ view, ctx = {}, onNavigate, showToast = () => {} }) {
  const {
    conversations = [],
    tickets = [],
    dashboard,
    profile,
    onSendMessage,
    onResolveConversation,
    onReopenConversation,
    onLogout,
  } = ctx

  const [selectedConvoId, setSelectedConvoId] = useState(null)
  const [adminReply, setAdminReply] = useState('')
  const [replyLoading, setReplyLoading] = useState(false)

  // Real or fallback transactions
  const rawTx = dashboard?.transactions || []
  const transactions = rawTx.length
    ? rawTx.map((tx) => [
        <b key={`side-${tx.id}`} style={{ textTransform: 'uppercase', color: tx.side === 'buy' ? 'var(--green)' : 'var(--gold)' }}>{tx.side}</b>,
        tx.symbol || 'USD Deposit',
        new Date(tx.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        `$${Number(tx.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        <span className="status" key={`st-${tx.id}`}>{tx.status}</span>,
      ])
    : DEMO_TRANSACTIONS.map((t) => [
        t[0],
        t[1],
        t[2],
        t[3],
        <span className={`status ${t[4]}`} key={t[0] + t[2]}>
          {t[4] === 'pending' ? 'Pending' : 'Settled'}
        </span>,
      ])

  // Count active support items
  const activeConversations = conversations.filter((c) => c.is_active)
  const totalOpenCases = activeConversations.length + tickets.length

  const handleSendAdminReply = async (e) => {
    e.preventDefault()
    if (!adminReply.trim() || !selectedConvoId || !onSendMessage) return
    setReplyLoading(true)
    try {
      await onSendMessage(selectedConvoId, `[STAFF RESPONSE] ${adminReply.trim()}`)
      setAdminReply('')
      showToast('Staff reply dispatched to client.')
    } catch (err) {
      showToast('Failed to send reply.')
    } finally {
      setReplyLoading(false)
    }
  }

  const activeConvo = conversations.find((c) => c.id === selectedConvoId) || conversations[0]

  if (view === 'admin') {
    return (
      <AdminShell
        view={view}
        title="Operations Control Centre"
        subtitle="Institutional operations, compliance oversight, and risk management."
        onNavigate={onNavigate}
        onLogout={onLogout}
      >
        <div className="admin-warn">
          Authorized personnel only. All client support queries and incoming tickets are aggregated directly from the backend into this queue.
        </div>
        <div className="stat-grid">
          <div className="app-card">
            <span className="stat-label">ACTIVE CLIENTS</span>
            <div className="stat-value">{profile?.id ? '1,285' : '1,284'}</div>
            <span className="muted-copy">Verified retail & institutional</span>
          </div>
          <div className="app-card">
            <span className="stat-label">KYC REVIEWS PENDING</span>
            <div className="stat-value">{profile?.is_verified ? '17' : '18'}</div>
            <span className="muted-copy">Onboarding pipeline</span>
          </div>
          <div className="app-card">
            <span className="stat-label">OPEN CLIENT CASES</span>
            <div className="stat-value">{String(totalOpenCases || 7).padStart(2, '0')}</div>
            <span className="muted-copy">{conversations.length} live threads · {tickets.length} tickets</span>
          </div>
        </div>
        <div className="page-grid">
          <div className="app-card">
            <h3>KYC Onboarding Queue</h3>
            <p className="muted-copy">Client verification dossiers currently awaiting compliance review.</p>
            <button className="btn btn-outline" data-view="admin-kyc" onClick={() => onNavigate('admin-kyc')}>
              Review KYC Queue ↗
            </button>
          </div>
          <div className="app-card">
            <h3>Client Support Desk</h3>
            <p className="muted-copy">
              {totalOpenCases > 0
                ? `${totalOpenCases} client support queries requiring response or attention.`
                : 'All client inquiries resolved and up to date.'}
            </p>
            <button className="btn btn-primary" data-view="admin-support" onClick={() => onNavigate('admin-support')}>
              Open Support Desk Inbox ({totalOpenCases}) ↗
            </button>
          </div>
        </div>
      </AdminShell>
    )
  }

  if (view === 'admin-customers') {
    const customerRows = [
      ...(profile ? [[`VX-${String(profile.id).padStart(3, '0')}`, profile.first_name || profile.username || 'Current Client', profile.email, <span className="status" key="curr">{profile.is_verified ? 'Verified' : 'Pending Verification'}</span>]] : []),
      ['VX-001', 'Alex Morgan', 'alex@morganfunds.com', <span className="status" key="1">Verified</span>],
      ['VX-002', 'Jamie Lee', 'j.lee@apexcapital.org', <span className="status pending" key="2">Pending Review</span>],
      ['VX-003', 'Taylor Reed', 'treed@reedwealth.net', <span className="status review" key="3">Under Review</span>],
    ]
    return (
      <AdminShell
        view={view}
        title="Client Accounts Directory"
        subtitle="Registered retail, professional, and institutional client accounts."
        onNavigate={onNavigate}
        onLogout={onLogout}
      >
        <div className="admin-warn">
          Protected client records. Modifications and account actions require compliance supervisor authorization.
        </div>
        <div className="app-card">
          <DataTable
            headings={['CLIENT ID', 'ACCOUNT HOLDER', 'OFFICIAL EMAIL', 'COMPLIANCE STATUS']}
            rows={customerRows}
          />
        </div>
      </AdminShell>
    )
  }

  if (view === 'admin-kyc') {
    const kycRows = [
      ...(profile && !profile.is_verified ? [[`VX-${String(profile.id).padStart(3, '0')}`, profile.first_name || profile.username, '2026-10-14', <span className="status pending" key="curr-k">Pending Review</span>]] : []),
      ['VX-002', 'Jamie Lee', '2026-10-08', <span className="status pending" key="k1">Pending Review</span>],
      ['VX-007', 'Robin Park', '2026-10-08', <span className="status review" key="k2">Document Resubmitted</span>],
      ['VX-013', 'Sam River', '2026-10-07', <span className="status pending" key="k3">Pending Verification</span>],
    ]
    return (
      <AdminShell
        view={view}
        title="KYC Verification Queue"
        subtitle="Identity verification, AML screening, and regulatory accreditation."
        onNavigate={onNavigate}
        onLogout={onLogout}
      >
        <div className="admin-warn">
          Customer document validation must comply with FATF international anti-money laundering standards.
        </div>
        <div className="app-card">
          <DataTable
            headings={['APPLICATION REF', 'CLIENT NAME', 'SUBMISSION DATE', 'STATUS']}
            rows={kycRows}
          />
          <div className="app-actions">
            <button
              className="btn btn-primary"
              data-toast="Compliance dossier opened"
              onClick={() => showToast('Opening compliance dossier')}
            >
              Review Selected Application
            </button>
          </div>
        </div>
      </AdminShell>
    )
  }

  if (view === 'admin-transactions') {
    return (
      <AdminShell
        view={view}
        title="Transaction Monitoring & AML"
        subtitle="Real-time settlement surveillance and high-value transfer screening."
        onNavigate={onNavigate}
        onLogout={onLogout}
      >
        <div className="admin-warn">
          Automated transaction monitoring active. Flagged transactions are placed in temporary compliance hold.
        </div>
        <div className="app-card">
          <DataTable
            headings={['TRANSACTION TYPE', 'ACCOUNT / INSTRUMENT', 'EXECUTION DATE', 'VALUE', 'SETTLEMENT']}
            rows={transactions}
          />
        </div>
      </AdminShell>
    )
  }

function getClientDetails(item, fallbackProfile) {
  const name = item?.client_name
    || (fallbackProfile?.first_name ? `${fallbackProfile.first_name} ${fallbackProfile.last_name || ''}`.trim() : null)
    || fallbackProfile?.username
    || (item?.subject && item.subject.match(/·\s*([^\]]+)\]/)?.[1])
    || 'Authenticated Client'

  const email = item?.client_email
    || fallbackProfile?.email
    || (item?.subject && item.subject.match(/\(([^)]+@[^)]+)\)/)?.[1])
    || 'client@trade.veltrix'

  const accountRef = item?.account_ref
    || (item?.subject && item.subject.match(/\[(VX-[^·\s\]]+)/)?.[1])
    || (fallbackProfile?.id ? `VX-${String(fallbackProfile.id).padStart(3, '0')}` : 'VX-001')

  const kycStatus = fallbackProfile?.is_verified ? 'Verified Client' : 'Pending Verification'

  return { name, email, accountRef, kycStatus }
}

  if (view === 'admin-support') {
    return (
      <AdminShell
        view={view}
        title="Client Services Desk — Staff Inbox"
        subtitle="Incoming customer support requests and real-time live chat conversations."
        onNavigate={onNavigate}
        onLogout={onLogout}
      >
        <div className="admin-warn">
          All client conversations and tickets submitted by users are displayed below with their authenticated client credentials. You can inspect message history and dispatch official staff replies directly back to the client.
        </div>

        <div className="page-grid">
          {/* Incoming client cases list */}
          <div className="app-card">
            <div className="section-row">
              <div>
                <h3>Client Conversations</h3>
                <div className="muted-copy">{conversations.length} live client thread{conversations.length === 1 ? '' : 's'}</div>
              </div>
              <span className="status">Staff Console</span>
            </div>

            {conversations.length > 0 ? (
              <div style={{ display: 'grid', gap: 8, margin: '14px 0' }}>
                {conversations.map((c) => {
                  const clientInfo = getClientDetails(c, profile)
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedConvoId(c.id)}
                      style={{
                        padding: 12,
                        borderRadius: 4,
                        cursor: 'pointer',
                        border: '1px solid ' + (c.id === (activeConvo?.id) ? 'var(--green)' : 'var(--line)'),
                        background: c.id === (activeConvo?.id) ? '#163326' : '#101e17',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, fontWeight: 700 }}>
                        <span>Case #{c.id}: {c.subject}</span>
                        <span className={c.is_active ? 'status' : 'status review'}>
                          {c.is_active ? 'Active Client' : 'Resolved'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 6, fontSize: 10, color: 'var(--green)', marginTop: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600 }}>👤 {clientInfo.name}</span>
                        <span style={{ color: '#4a6b57' }}>•</span>
                        <span style={{ color: '#a0b3a7' }}>{clientInfo.email}</span>
                        <span style={{ color: '#4a6b57' }}>•</span>
                        <span style={{ color: 'var(--gold)', fontFamily: 'monospace' }}>{clientInfo.accountRef}</span>
                      </div>
                      {c.last_message && (
                        <p style={{ margin: '6px 0 0', fontSize: 10, color: '#8ca094' }}>
                          Last message: {c.last_message.content || c.last_message.text || 'Inquiry'}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">✳</div>
                <p>No active client conversations yet. When clients send a support message or live chat, it appears here instantly with their authenticated account credentials.</p>
              </div>
            )}

            {/* Traditional Tickets Section */}
            {tickets.length > 0 && (
              <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16, marginTop: 16 }}>
                <h4>Submitted Support Tickets ({tickets.length})</h4>
                <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
                  {tickets.map((t) => {
                    const ticketClient = getClientDetails(t, profile)
                    return (
                      <div key={t.id} style={{ padding: 12, background: '#0b1510', border: '1px solid var(--line)', borderRadius: 4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700 }}>
                          <span>{t.subject}</span>
                          <span className="status">{t.status || 'Open'}</span>
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--green)', margin: '4px 0 6px' }}>
                          Verified Client: <b>{ticketClient.name}</b> ({ticketClient.email}) · <span style={{ color: 'var(--gold)', fontFamily: 'monospace' }}>{ticketClient.accountRef}</span>
                        </div>
                        <p style={{ margin: '4px 0', fontSize: 10, color: '#b5c7bb', whiteSpace: 'pre-wrap' }}>{t.message}</p>
                        <small style={{ color: '#688274', fontSize: 9 }}>Submitted: {new Date(t.created_at || Date.now()).toLocaleString()}</small>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Active conversation message thread & staff reply form */}
          <div className="app-card">
            {activeConvo ? (() => {
              const activeClient = getClientDetails(activeConvo, profile)
              return (
                <>
                  <div className="section-row">
                    <div>
                      <h3>{activeConvo.subject}</h3>
                      <div className="muted-copy">Client Thread #{activeConvo.id}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {activeConvo.is_active ? (
                        <button
                          className="btn btn-outline"
                          style={{ padding: '4px 8px', fontSize: 10, borderColor: 'var(--gold)', color: 'var(--gold)' }}
                          onClick={() => onResolveConversation && onResolveConversation(activeConvo.id)}
                        >
                          Resolve Case
                        </button>
                      ) : (
                        <button
                          className="btn btn-outline"
                          style={{ padding: '4px 8px', fontSize: 10 }}
                          onClick={() => onReopenConversation && onReopenConversation(activeConvo.id)}
                        >
                          Reopen Case
                        </button>
                      )}
                      <span className={activeConvo.is_active ? 'status' : 'status review'}>
                        {activeConvo.is_active ? 'Open' : 'Resolved'}
                      </span>
                    </div>
                  </div>

                  {/* Authenticated Client Dossier Card */}
                  <div
                    style={{
                      background: '#091510',
                      border: '1px solid #1a3827',
                      borderRadius: 4,
                      padding: '10px 14px',
                      margin: '10px 0 14px',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                      gap: 10,
                      fontSize: 11,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 9, color: '#688274', letterSpacing: '0.1em' }}>AUTHENTICATED CLIENT</div>
                      <strong style={{ color: '#f1f7f3' }}>{activeClient.name}</strong>
                    </div>
                    <div>
                      <div style={{ fontSize: 9, color: '#688274', letterSpacing: '0.1em' }}>VERIFIED EMAIL</div>
                      <strong style={{ color: 'var(--green)' }}>{activeClient.email}</strong>
                    </div>
                    <div>
                      <div style={{ fontSize: 9, color: '#688274', letterSpacing: '0.1em' }}>ACCOUNT REF</div>
                      <strong style={{ color: 'var(--gold)', fontFamily: 'monospace' }}>{activeClient.accountRef}</strong>
                    </div>
                    <div>
                      <div style={{ fontSize: 9, color: '#688274', letterSpacing: '0.1em' }}>KYC STATUS</div>
                      <span className="status" style={{ fontSize: 10 }}>{activeClient.kycStatus}</span>
                    </div>
                  </div>

                  <div className="support-thread" style={{ maxHeight: 340, overflowY: 'auto' }}>
                    {(activeConvo.messages || []).map((msg, idx) => {
                      // `sender` is a nested user object from the backend;
                      // treat staff/admin senders (or staff-prefixed content)
                      // as the support side of the thread.
                      const s = msg.sender
                      const senderIsStaff = s && typeof s === 'object'
                        ? (s.role === 'admin' || s.is_staff === true)
                        : (s === 'staff' || s === 'admin')
                      const isStaff = senderIsStaff || (msg.content && msg.content.startsWith('[STAFF RESPONSE]'))
                      return (
                        <div className={`chat-bubble ${isStaff ? 'agent' : ''}`} key={msg.id || idx}>
                          <span className="chat-meta">
                            {isStaff
                              ? 'VELTRIX SUPPORT (STAFF)'
                              : `CLIENT · ${activeClient.name} (${activeClient.email}) [${activeClient.accountRef}]`}
                          </span>
                          <div style={{ whiteSpace: 'pre-wrap' }}>
                            {msg.content || msg.text}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {activeConvo.is_active && (
                    <form onSubmit={handleSendAdminReply} style={{ marginTop: 14 }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          style={{ flex: 1, background: '#08110f', border: '1px solid #2b4135', color: '#fff', padding: 10, borderRadius: 3 }}
                          placeholder="Write official staff response to client…"
                          value={adminReply}
                          onChange={(e) => setAdminReply(e.target.value)}
                          disabled={replyLoading}
                        />
                        <button className="btn btn-primary" type="submit" disabled={replyLoading}>
                          {replyLoading ? 'Sending…' : 'Send Reply ↗'}
                        </button>
                      </div>
                      <small style={{ color: '#74887b', fontSize: 9, marginTop: 6, display: 'block' }}>
                        Responses sent here are delivered directly to the client's support thread in real time.
                      </small>
                    </form>
                  )}
                </>
              )
            })() : (
              <div className="empty-state">
                <div className="empty-icon">✳</div>
                <p>Select a client case on the left to read their message thread and dispatch a response.</p>
              </div>
            )}
          </div>
        </div>
      </AdminShell>
    )
  }

  if (view === 'admin-audit') {
    const auditRows = [
      ['2026-10-15 00:54', 'Staff Officer #01', 'Dispatched client response to Support Case #VX-1042'],
      ['2026-10-15 00:30', 'Risk Officer #02', 'Approved institutional liquidity routing gateway'],
      ['2026-10-14 23:45', 'Compliance Admin #04', 'Reviewed Account KYC onboarding dossier'],
    ]
    return (
      <AdminShell
        view={view}
        title="Regulatory Audit Trail"
        subtitle="Immutable security logs and administrative action history."
        onNavigate={onNavigate}
        onLogout={onLogout}
      >
        <div className="admin-warn">
          Tamper-evident audit trail recording all staff operations and account modifications.
        </div>
        <div className="app-card">
          <DataTable headings={['TIMESTAMP (UTC)', 'OPERATOR', 'AUDIT EVENT']} rows={auditRows} />
        </div>
      </AdminShell>
    )
  }

  return null
}
