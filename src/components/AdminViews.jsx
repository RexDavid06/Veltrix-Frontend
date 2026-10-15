import React from 'react'
import AppSidebar from './AppSidebar'
import DataTable from './DataTable'
import { DEMO_TRANSACTIONS } from '../data'

function AdminShell({ view, title, subtitle, onNavigate, children }) {
  return (
    <div className="app-shell">
      <AppSidebar active={view} admin onNavigate={onNavigate} />
      <section className="app-main">
        <div className="app-topline">
          <div>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <span className="demo-chip">● ADMIN DEMO MODE</span>
        </div>
        {children}
      </section>
    </div>
  )
}

export default function AdminViews({ view, onNavigate, showToast = () => {} }) {
  const transactions = DEMO_TRANSACTIONS.map((t) => [
    t[0],
    t[1],
    t[2],
    t[3],
    <span className={`status ${t[4]}`} key={t[0] + t[2]}>
      {t[4] === 'pending' ? 'Pending' : 'Demo'}
    </span>,
  ])

  if (view === 'admin') {
    return (
      <AdminShell
        view={view}
        title="Operations overview"
        subtitle="A sample control centre for internal teams."
        onNavigate={onNavigate}
      >
        <div className="admin-warn">
          Admin data is fictional. Frontend navigation is not access control; real permissions must be enforced on the server.
        </div>
        <div className="stat-grid">
          <div className="app-card">
            <span className="stat-label">SAMPLE CUSTOMERS</span>
            <div className="stat-value">1,284</div>
            <span className="muted-copy">Illustrative only</span>
          </div>
          <div className="app-card">
            <span className="stat-label">REVIEWS QUEUED</span>
            <div className="stat-value">18</div>
            <span className="muted-copy">Sample queue</span>
          </div>
          <div className="app-card">
            <span className="stat-label">OPEN DEMO TICKETS</span>
            <div className="stat-value">07</div>
            <span className="muted-copy">Sample records</span>
          </div>
        </div>
        <div className="page-grid">
          <div className="app-card">
            <h3>Verification queue</h3>
            <p className="muted-copy">18 sample reviews await attention.</p>
            <button className="btn btn-outline" data-view="admin-kyc" onClick={() => onNavigate('admin-kyc')}>
              Review demo queue ↗
            </button>
          </div>
          <div className="app-card">
            <h3>Support inbox</h3>
            <p className="muted-copy">7 sample tickets in the demo queue.</p>
            <button className="btn btn-outline" data-view="admin-support" onClick={() => onNavigate('admin-support')}>
              Open demo inbox ↗
            </button>
          </div>
        </div>
      </AdminShell>
    )
  }

  if (view === 'admin-customers') {
    const customerRows = [
      ['VX-001', 'Alex Morgan', 'alex@example.test', <span className="status" key="1">Verified</span>],
      ['VX-002', 'Jamie Lee', 'jamie@example.test', <span className="status pending" key="2">Pending</span>],
      ['VX-003', 'Taylor Reed', 'taylor@example.test', <span className="status review" key="3">Review</span>],
    ]
    return (
      <AdminShell
        view={view}
        title="Customers"
        subtitle="Sample customer records for layout testing."
        onNavigate={onNavigate}
      >
        <div className="admin-warn">
          Fictional records only. Do not use this screen for real customer information.
        </div>
        <div className="app-card">
          <DataTable
            headings={['REFERENCE', 'CUSTOMER', 'DEMO EMAIL', 'STATUS']}
            rows={customerRows}
          />
        </div>
      </AdminShell>
    )
  }

  if (view === 'admin-kyc') {
    const kycRows = [
      ['VX-002', 'Jamie Lee', '2026-10-08', <span className="status pending" key="k1">Pending</span>],
      ['VX-007', 'Robin Park', '2026-10-08', <span className="status review" key="k2">Review</span>],
      ['VX-013', 'Sam River', '2026-10-07', <span className="status pending" key="k3">Pending</span>],
    ]
    return (
      <AdminShell
        view={view}
        title="Verification review"
        subtitle="A sample queue for identity-review workflows."
        onNavigate={onNavigate}
      >
        <div className="admin-warn">
          No real documents or identity records are available in this prototype.
        </div>
        <div className="app-card">
          <DataTable
            headings={['REFERENCE', 'SAMPLE CUSTOMER', 'DATE', 'STATUS']}
            rows={kycRows}
          />
          <div className="app-actions">
            <button
              className="btn btn-outline"
              data-toast="Document review is not connected"
              onClick={() => showToast('Document review is not connected')}
            >
              Preview review action
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
        title="Transaction monitoring"
        subtitle="Sample records and statuses only."
        onNavigate={onNavigate}
      >
        <div className="admin-warn">No real payment or transaction provider is connected.</div>
        <div className="app-card">
          <DataTable
            headings={['ACTIVITY', 'REFERENCE', 'DATE', 'VALUE', 'STATUS']}
            rows={transactions}
          />
        </div>
      </AdminShell>
    )
  }

  if (view === 'admin-support') {
    const supportRows = [
      ['VX-1042', 'Verification question', 'Normal', <span className="status" key="s1">Open</span>],
      ['VX-1043', 'Account access', 'High', <span className="status" key="s2">Open</span>],
      ['VX-1044', 'General enquiry', 'Low', <span className="status pending" key="s3">Pending</span>],
    ]
    return (
      <AdminShell
        view={view}
        title="Support inbox"
        subtitle="Preview customer-support operations and ticket handling."
        onNavigate={onNavigate}
      >
        <div className="admin-warn">
          Sample tickets only. Replies will not reach real customers or support agents.
        </div>
        <div className="app-card">
          <DataTable
            headings={['TICKET', 'SUBJECT', 'PRIORITY', 'STATUS']}
            rows={supportRows}
          />
          <div className="app-actions">
            <button
              className="btn btn-primary"
              data-toast="Sample ticket opened in preview mode"
              onClick={() => showToast('Sample ticket opened in preview mode')}
            >
              Open selected demo ticket
            </button>
          </div>
        </div>
      </AdminShell>
    )
  }

  if (view === 'admin-audit') {
    const auditRows = [
      ['2026-10-09 09:42', 'Demo admin', 'Viewed dashboard'],
      ['2026-10-09 09:38', 'Sample reviewer', 'Opened review queue'],
      ['2026-10-08 16:14', 'Demo support', 'Viewed ticket'],
    ]
    return (
      <AdminShell
        view={view}
        title="Audit logs"
        subtitle="Illustrative system activity; not a real audit trail."
        onNavigate={onNavigate}
      >
        <div className="admin-warn">
          These are examples, not security-grade audit records. Production audit logs must be generated and protected server-side.
        </div>
        <div className="app-card">
          <DataTable headings={['TIMESTAMP', 'SAMPLE ACTOR', 'EVENT']} rows={auditRows} />
        </div>
      </AdminShell>
    )
  }

  return null
}
