import React from 'react'
import AppSidebar from './AppSidebar'
import DataTable from './DataTable'
import { DEMO_TRANSACTIONS } from '../data'

function Shell({ view, title, subtitle, onNavigate, children }) {
  return (
    <div className="app-shell">
      <AppSidebar active={view} admin onNavigate={onNavigate} />
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

function status(value) {
  if (value === 'Verified') return <span className="status">{value}</span>
  if (value === 'Pending') return <span className="status pending">{value}</span>
  if (value === 'Review') return <span className="status review">{value}</span>
  if (value === 'pending') return <span className="status pending">Pending</span>
  if (value === 'review') return <span className="status review">Demo</span>
  if (value === 'Open') return <span className="status">{value}</span>
  return value
}

export default function AdminViews({ view, onNavigate, showToast }) {
  const toast = (message) => () => showToast(message)

  if (view === 'admin-customers') {
    return (
      <Shell view={view} title="Customers" subtitle="Sample customer records for layout testing." onNavigate={onNavigate}>
        <div className="admin-warn">Fictional records only. Do not use this screen for real customer information.</div>
        <div className="app-card">
          <DataTable
            headings={['REFERENCE', 'CUSTOMER', 'DEMO EMAIL', 'STATUS']}
            rows={[
              ['VX-001', 'Alex Morgan', 'alex@example.test', status('Verified')],
              ['VX-002', 'Jamie Lee', 'jamie@example.test', status('Pending')],
              ['VX-003', 'Taylor Reed', 'taylor@example.test', status('Review')],
            ]}
          />
        </div>
      </Shell>
    )
  }

  if (view === 'admin-kyc') {
    return (
      <Shell view={view} title="Verification review" subtitle="A sample queue for identity-review workflows." onNavigate={onNavigate}>
        <div className="admin-warn">No real documents or identity records are available in this prototype.</div>
        <div className="app-card">
          <DataTable
            headings={['REFERENCE', 'SAMPLE CUSTOMER', 'DATE', 'STATUS']}
            rows={[
              ['VX-002', 'Jamie Lee', '2026-10-08', status('Pending')],
              ['VX-007', 'Robin Park', '2026-10-08', status('Review')],
              ['VX-013', 'Sam River', '2026-10-07', status('Pending')],
            ]}
          />
          <div className="app-actions">
            <button className="btn btn-outline" data-toast="Document review is not connected" onClick={toast('Document review is not connected')}>
              Preview review action
            </button>
          </div>
        </div>
      </Shell>
    )
  }

  if (view === 'admin-transactions') {
    return (
      <Shell view={view} title="Transaction monitoring" subtitle="Sample records and statuses only." onNavigate={onNavigate}>
        <div className="admin-warn">No real payment or transaction provider is connected.</div>
        <div className="app-card">
          <DataTable
            headings={['ACTIVITY', 'REFERENCE', 'DATE', 'VALUE', 'STATUS']}
            rows={DEMO_TRANSACTIONS.map((t) => [t[0], t[1], t[2], t[3], status(t[4])])}
          />
        </div>
      </Shell>
    )
  }

  if (view === 'admin-support') {
    return (
      <Shell view={view} title="Support inbox" subtitle="Preview customer-support operations and ticket handling." onNavigate={onNavigate}>
        <div className="admin-warn">Sample tickets only. Replies will not reach real customers or support agents.</div>
        <div className="app-card">
          <DataTable
            headings={['TICKET', 'SUBJECT', 'PRIORITY', 'STATUS']}
            rows={[
              ['VX-1042', 'Verification question', 'Normal', <span className="status" key="s">Open</span>],
              ['VX-1043', 'Account access', 'High', <span className="status" key="s">Open</span>],
              ['VX-1044', 'General enquiry', 'Low', <span className="status pending" key="s">Pending</span>],
            ]}
          />
          <div className="app-actions">
            <button className="btn btn-primary" data-toast="Sample ticket opened in preview mode" onClick={toast('Sample ticket opened in preview mode')}>
              Open selected demo ticket
            </button>
          </div>
        </div>
      </Shell>
    )
  }

  if (view === 'admin-audit') {
    return (
      <Shell view={view} title="Audit logs" subtitle="Illustrative system activity; not a real audit trail." onNavigate={onNavigate}>
        <div className="admin-warn">These are examples, not security-grade audit records. Production audit logs must be generated and protected server-side.</div>
        <div className="app-card">
          <DataTable
            headings={['TIMESTAMP', 'SAMPLE ACTOR', 'EVENT']}
            rows={[
              ['2026-10-09 09:42', 'Demo admin', 'Viewed dashboard'],
              ['2026-10-09 09:38', 'Sample reviewer', 'Opened review queue'],
              ['2026-10-08 16:14', 'Demo support', 'Viewed ticket'],
            ]}
          />
        </div>
      </Shell>
    )
  }

  return (
    <Shell view="admin" title="Operations overview" subtitle="A sample control centre for internal teams." onNavigate={onNavigate}>
      <div className="admin-warn">Admin data is fictional. Frontend navigation is not access control; real permissions must be enforced on the server.</div>
      <div className="stat-grid">
        <div className="app-card"><span className="stat-label">SAMPLE CUSTOMERS</span><div className="stat-value">1,284</div><span className="muted-copy">Illustrative only</span></div>
        <div className="app-card"><span className="stat-label">REVIEWS QUEUED</span><div className="stat-value">18</div><span className="muted-copy">Sample queue</span></div>
        <div className="app-card"><span className="stat-label">OPEN DEMO TICKETS</span><div className="stat-value">07</div><span className="muted-copy">Sample records</span></div>
      </div>
      <div className="page-grid">
        <div className="app-card">
          <h3>Verification queue</h3>
          <p className="muted-copy">18 sample reviews await attention.</p>
          <button className="btn btn-outline" data-view="admin-kyc" onClick={() => onNavigate('admin-kyc')}>Review demo queue ↗</button>
        </div>
        <div className="app-card">
          <h3>Support inbox</h3>
          <p className="muted-copy">7 sample tickets in the demo queue.</p>
          <button className="btn btn-outline" data-view="admin-support" onClick={() => onNavigate('admin-support')}>Open demo inbox ↗</button>
        </div>
      </div>
    </Shell>
  )
}
