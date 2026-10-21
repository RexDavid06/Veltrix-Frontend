import React, { useCallback, useEffect, useRef, useState } from 'react'
import AppSidebar from './AppSidebar'
import DataTable from './DataTable'
import ProfileView from './ProfileView'
import { formatCurrency, transactionReferenceLabel, transactionSideLabel, transactionStatusLabel } from '../data'
import {
  extractAdminError,
  fetchAdminAudit,
  fetchAdminInstruments,
  fetchAdminStats,
  fetchAdminTransactions,
  fetchAdminUser,
  fetchAdminUsers,
  updateAdminInstrument,
  updateAdminUser,
} from '../services/adminFeed'

// Must match the backend's AdminPagination page_size so pager math is correct.
const PAGE_SIZE = 20

function AdminShell({ view, title, subtitle, onNavigate, onLogout, ctx, children }) {
  // Total unread client messages across the support inbox, surfaced on the
  // sidebar so a new client message is noticed from any admin view.
  const unreadCount = (ctx?.conversations || []).reduce(
    (sum, c) => sum + Number(c.unread_count || 0),
    0
  )
  return (
    <div className="app-shell admin-shell">
      <AppSidebar active={view} admin onNavigate={onNavigate} onLogout={onLogout} unreadCount={unreadCount} />
      <section className="app-main">
        <div className="app-topline admin-topline">
          <div>
            <span className="admin-eyebrow">VELTRIX ADMINISTRATION</span>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <span className="demo-chip">● LIVE BACKEND</span>
        </div>
        {children}
      </section>
    </div>
  )
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function truncate(text, limit = 90) {
  const value = text === null || text === undefined ? '' : String(text)
  return value.length > limit ? `${value.slice(0, limit - 1)}…` : value
}

function useDebounced(value, delay = 400) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

// Loads one paginated /api/admin/* list. `params` is serialized to a stable
// key so callers can pass fresh objects every render without looping.
function useAdminList(fetcher, params) {
  const key = JSON.stringify(params)
  const [state, setState] = useState({ results: [], count: 0, loading: true, error: '' })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    setState((prev) => ({ ...prev, loading: true, error: '' }))
    fetcher(JSON.parse(key))
      .then((data) => {
        if (!active) return
        setState({ results: data.results, count: data.count, loading: false, error: '' })
      })
      .catch((error) => {
        if (!active) return
        setState((prev) => ({
          results: prev.results,
          count: prev.count,
          loading: false,
          error: extractAdminError(error, 'Could not load records from the backend.'),
        }))
      })
    return () => { active = false }
  }, [fetcher, key, reloadKey])

  const reload = useCallback(() => setReloadKey((value) => value + 1), [])
  return { items: state.results, count: state.count, loading: state.loading, error: state.error, reload }
}

function Pager({ page, count, pageSize = PAGE_SIZE, onPage }) {
  const pages = Math.max(1, Math.ceil(count / pageSize))
  if (count <= pageSize) {
    return count ? (
      <div className="pager"><span>{count} record{count === 1 ? '' : 's'}</span></div>
    ) : null
  }
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, count)
  return (
    <div className="pager">
      <span>{from}–{to} of {count}</span>
      <span style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-outline" style={{ padding: '5px 10px', fontSize: 10 }} disabled={page <= 1} onClick={() => onPage(page - 1)}>
          ← Prev
        </button>
        <button className="btn btn-outline" style={{ padding: '5px 10px', fontSize: 10 }} disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next →
        </button>
      </span>
    </div>
  )
}

function ListPanel({
  toolbar,
  loading,
  error,
  onRetry,
  items,
  headings,
  renderRow,
  emptyTitle = 'No records found.',
  emptyHint = '',
  footer = null,
}) {
  return (
    <div className="app-card">
      {toolbar}
      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: 10 }} onClick={onRetry}>
            Retry ↻
          </button>
        </div>
      )}
      {loading && items.length === 0 ? (
        <div className="muted-copy" style={{ padding: '18px 0' }}>Loading records from the backend…</div>
      ) : items.length > 0 ? (
        <>
          <DataTable headings={headings} rows={items.map(renderRow)} />
          {footer}
        </>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">◈</div>
          <p>{emptyTitle}</p>
          {emptyHint && <p className="muted-copy">{emptyHint}</p>}
        </div>
      )}
      {loading && items.length > 0 && (
        <div className="muted-copy" style={{ marginTop: 8 }}>Refreshing…</div>
      )}
    </div>
  )
}

function AdminOverview({ onNavigate, ctx }) {
  const { conversations = [], tickets = [] } = ctx
  const [stats, setStats] = useState(null)
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchAdminStats()
      setStats(data)
      // The recent-activity strip is a bonus: a failure here must not hide
      // the headline statistics.
      try {
        const audit = await fetchAdminAudit({ page: 1, page_size: 5 })
        setRecent(audit.results.slice(0, 5))
      } catch {
        setRecent([])
      }
    } catch (err) {
      setError(extractAdminError(err, 'Could not load platform statistics from the backend.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const users = stats?.users
  const accounts = stats?.accounts
  const tx = stats?.transactions
  const support = stats?.support
  const openCases = (support?.open_conversations || 0) + (support?.open_tickets || 0)
  const kycPending = Math.max(0, (users?.total || 0) - (users?.verified || 0))

  if (loading && !stats) {
    return (
      <>
        <div className="admin-warn">Authorized personnel only. All figures below are aggregated live from the backend.</div>
        <div className="app-card"><div className="muted-copy">Loading platform statistics from the backend…</div></div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <div className="admin-warn">Authorized personnel only. All figures below are aggregated live from the backend.</div>
        <div className="app-card">
          <div className="empty-state">
            <div className="empty-icon">⚠</div>
            <p>{error}</p>
            <button className="btn btn-outline" style={{ marginTop: 12 }} onClick={load}>Retry ↻</button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="admin-warn">
        Authorized personnel only. Every figure on this dashboard is aggregated live from the backend platform database.
      </div>

      <div className="stat-grid">
        <div className="app-card">
          <span className="stat-label">ACTIVE CLIENTS</span>
          <div className="stat-value">{Number(users?.active ?? 0).toLocaleString('en-US')}</div>
          <span className="muted-copy">
            {Number(users?.total ?? 0).toLocaleString('en-US')} registered · {users?.admins ?? 0} staff
          </span>
        </div>
        <div className="app-card">
          <span className="stat-label">KYC REVIEWS PENDING</span>
          <div className="stat-value">{kycPending.toLocaleString('en-US')}</div>
          <span className="muted-copy">{Number(users?.verified ?? 0).toLocaleString('en-US')} accounts verified</span>
        </div>
        <div className="app-card">
          <span className="stat-label">NEW CLIENTS · 7 DAYS</span>
          <div className="stat-value">{Number(users?.new_last_7_days ?? 0).toLocaleString('en-US')}</div>
          <span className="muted-copy">{Number(users?.new_last_30_days ?? 0).toLocaleString('en-US')} joined in the last 30 days</span>
        </div>
        <div className="app-card">
          <span className="stat-label">PLATFORM CASH BALANCE</span>
          <div className="stat-value">{formatCurrency(Number(accounts?.total_cash_balance ?? 0))}</div>
          <span className="muted-copy">{Number(accounts?.total ?? 0).toLocaleString('en-US')} trading accounts</span>
        </div>
        <div className="app-card">
          <span className="stat-label">TRANSACTION VOLUME</span>
          <div className="stat-value">{formatCurrency(Number(tx?.total_volume ?? 0))}</div>
          <span className="muted-copy">
            {Number(tx?.total ?? 0).toLocaleString('en-US')} recorded · {Number(tx?.last_7_days ?? 0)} this week
          </span>
        </div>
        <div className="app-card">
          <span className="stat-label">OPEN CLIENT CASES</span>
          <div className="stat-value">{String(openCases).padStart(2, '0')}</div>
          <span className="muted-copy">
            {conversations.filter((c) => c.is_active).length} live threads · {tickets.length} own tickets
          </span>
        </div>
      </div>

      <div className="page-grid">
        <div className="app-card">
          <h3>KYC Onboarding Queue</h3>
          <p className="muted-copy">
            {kycPending > 0
              ? `${kycPending} client verification dossier${kycPending === 1 ? '' : 's'} awaiting compliance review.`
              : 'Every client account is currently verified — the queue is clear.'}
          </p>
          <button className="btn btn-outline" data-view="admin-kyc" onClick={() => onNavigate('admin-kyc')}>
            Review KYC Queue ↗
          </button>
        </div>
        <div className="app-card">
          <h3>Client Support Desk</h3>
          <p className="muted-copy">
            {openCases > 0
              ? `${openCases} open backend case${openCases === 1 ? '' : 's'} requiring response.`
              : 'All client inquiries resolved and up to date.'}
          </p>
          <button className="btn btn-primary" data-view="admin-support" onClick={() => onNavigate('admin-support')}>
            Open Support Desk Inbox ({openCases}) ↗
          </button>
        </div>
      </div>

      <div className="app-card" style={{ marginTop: 15 }}>
        <div className="section-row">
          <div>
            <h3>Recent Administrative Activity</h3>
            <div className="muted-copy">Latest entries from the backend audit trail</div>
          </div>
          <button className="btn btn-outline" data-view="admin-audit" onClick={() => onNavigate('admin-audit')}>
            Full audit trail ↗
          </button>
        </div>
        {recent.length ? (
          <DataTable
            headings={['TIMESTAMP', 'OPERATOR', 'ACTION', 'DETAILS']}
            rows={recent.map((entry) => [
              formatDateTime(entry.created_at),
              entry.actor_name || entry.actor_email || 'System',
              <b key={`act-${entry.id}`} style={{ color: 'var(--green)' }}>{entry.action}</b>,
              <span key={`det-${entry.id}`} title={entry.details || ''}>{truncate(entry.details || '—', 70)}</span>,
            ])}
          />
        ) : (
          <div className="empty-state" style={{ padding: '22px 12px' }}>
            <div className="empty-icon">◷</div>
            <p>No administrative activity recorded yet.</p>
          </div>
        )}
      </div>
    </>
  )
}

// Read-only client dossier. Everything here comes from
// GET /api/admin/users/<id>/ in a single request (the backend has no
// separate positions/transactions-per-user admin routes, so they are read
// from the dossier payload rather than invented endpoints).
function AdminUserDetail({ record, loading, error, onRetry, onClose }) {
  if (loading) {
    return (
      <div className="app-card detail-panel">
        <div className="muted-copy" style={{ padding: '16px 0' }}>Loading client dossier from the backend…</div>
      </div>
    )
  }
  if (error) {
    return (
      <div className="app-card detail-panel">
        <div className="error-banner">
          <span>{error}</span>
          <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: 10 }} onClick={onRetry}>
            Retry ↻
          </button>
        </div>
        <button className="btn btn-quiet" type="button" onClick={onClose}>Close</button>
      </div>
    )
  }
  if (!record) return null

  const name = `${record.first_name || ''} ${record.last_name || ''}`.trim() || record.username
  const positions = Array.isArray(record.positions) ? record.positions : []
  const transactions = Array.isArray(record.recent_transactions) ? record.recent_transactions : []

  return (
    <div className="app-card detail-panel" aria-live="polite">
      <div className="section-row">
        <div>
          <h3>
            {name}{' '}
            <span className="muted-copy" style={{ fontFamily: 'monospace' }}>
              VX-{String(record.id).padStart(3, '0')}
            </span>
          </h3>
          <div className="muted-copy">{record.email}</div>
        </div>
        <button className="btn btn-outline" type="button" onClick={onClose} aria-label="Close client details">
          Close ✕
        </button>
      </div>

      <div className="detail-facts">
        <div><span>ROLE</span><b>{record.role}</b></div>
        <div><span>KYC</span><b>{record.is_verified ? 'Verified' : 'Pending'}</b></div>
        <div><span>ACCOUNT</span><b>{record.is_active ? 'Active' : 'Suspended'}</b></div>
        <div><span>CASH BALANCE</span><b>{formatCurrency(Number(record.cash_balance ?? 0))}</b></div>
        <div><span>TRANSACTIONS</span><b>{Number(record.transaction_count ?? 0).toLocaleString('en-US')}</b></div>
        <div><span>JOINED</span><b>{formatDate(record.date_joined)}</b></div>
        <div><span>LAST LOGIN</span><b>{formatDateTime(record.last_login)}</b></div>
        <div><span>STAFF</span><b>{record.is_staff ? 'Yes' : 'No'}</b></div>
      </div>

      <h4 style={{ marginTop: 16 }}>Open positions ({positions.length})</h4>
      {positions.length ? (
        <DataTable
          headings={['SYMBOL', 'INSTRUMENT', 'QUANTITY', 'AVG PRICE', 'MARKET VALUE']}
          rows={positions.map((position, index) => [
            <b key={`ps-${index}`}>{position.symbol}</b>,
            position.name || '—',
            Number(position.quantity ?? 0).toLocaleString('en-US', { maximumFractionDigits: 4 }),
            formatCurrency(Number(position.avg_price ?? 0)),
            formatCurrency(Number(position.market_value ?? 0)),
          ])}
        />
      ) : (
        <div className="muted-copy">No open positions on this account.</div>
      )}

      <h4 style={{ marginTop: 16 }}>Recent transactions ({transactions.length})</h4>
      {transactions.length ? (
        <DataTable
          headings={['SIDE', 'SYMBOL', 'QTY', 'AMOUNT', 'STATUS', 'DATE']}
          rows={transactions.map((tx) => [
            <b
              key={`ts-${tx.id}`}
              style={{ textTransform: 'uppercase', color: tx.side === 'sell' ? 'var(--gold)' : 'var(--mint)' }}
            >
              {transactionSideLabel(tx)}
            </b>,
            transactionReferenceLabel(tx),
            Number(tx.quantity ?? 0).toLocaleString('en-US', { maximumFractionDigits: 4 }),
            formatCurrency(Number(tx.amount ?? 0)),
            <span className={`status${tx.status === 'pending' ? ' pending' : ''}`} key={`tst-${tx.id}`}>
              {transactionStatusLabel(tx)}
            </span>,
            formatDate(tx.created_at),
          ])}
        />
      ) : (
        <div className="muted-copy">No transactions recorded for this account.</div>
      )}

      <p className="form-note">
        Inspection only. Account-state changes are performed from the directory actions and are written to
        the audit trail.
      </p>
    </div>
  )
}

function CustomersView({ showToast }) {
  const [searchInput, setSearchInput] = useState('')
  const search = useDebounced(searchInput)
  const [role, setRole] = useState('')
  const [activeFilter, setActiveFilter] = useState('')
  const [page, setPage] = useState(1)
  const [busyId, setBusyId] = useState(null)
  const [detailId, setDetailId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')

  const { items, count, loading, error, reload } = useAdminList(fetchAdminUsers, {
    search, role, is_active: activeFilter, page, page_size: PAGE_SIZE,
  })

  const openDetail = useCallback(async (userId) => {
    setDetailId(userId)
    setDetail(null)
    setDetailError('')
    setDetailLoading(true)
    try {
      setDetail(await fetchAdminUser(userId))
    } catch (err) {
      setDetailError(extractAdminError(err, 'Could not load this client record from the backend.'))
    } finally {
      setDetailLoading(false)
    }
  }, [])

  const closeDetail = () => {
    setDetailId(null)
    setDetail(null)
    setDetailError('')
  }

  const toggleFlag = async (user, field) => {
    setBusyId(user.id)
    try {
      await updateAdminUser(user.id, { [field]: !user[field] })
      if (field === 'is_verified') {
        showToast(user.is_verified ? `KYC revoked for ${user.email}` : `${user.email} marked as verified`)
      } else {
        showToast(user.is_active ? `${user.email} suspended` : `${user.email} reactivated`)
      }
      reload()
      // Keep an open dossier in step with the flag that was just changed.
      if (detailId === user.id) openDetail(user.id)
    } catch (err) {
      showToast(extractAdminError(err, 'Account update was rejected by the backend.'))
    } finally {
      setBusyId(null)
    }
  }

  const toolbar = (
    <div className="list-toolbar">
      <input
        className="search-input"
        type="search"
        placeholder="Search name, email or username…"
        value={searchInput}
        onChange={(event) => { setSearchInput(event.target.value); setPage(1) }}
      />
      <select value={role} onChange={(event) => { setRole(event.target.value); setPage(1) }}>
        <option value="">All roles</option>
        <option value="client">Clients</option>
        <option value="admin">Admins</option>
      </select>
      <select value={activeFilter} onChange={(event) => { setActiveFilter(event.target.value); setPage(1) }}>
        <option value="">All accounts</option>
        <option value="true">Active only</option>
        <option value="false">Suspended only</option>
      </select>
    </div>
  )

  return (
    <>
      {detailId && (
        <AdminUserDetail
          record={detail}
          loading={detailLoading}
          error={detailError}
          onRetry={() => openDetail(detailId)}
          onClose={closeDetail}
        />
      )}
      <ListPanel
        toolbar={toolbar}
        loading={loading}
        error={error}
        onRetry={reload}
        items={items}
        headings={['CLIENT ID', 'ACCOUNT HOLDER', 'OFFICIAL EMAIL', 'ROLE', 'KYC', 'BALANCE', 'TX', 'ACTIONS']}
        renderRow={(user) => [
          <b key={`id-${user.id}`} style={{ fontFamily: 'monospace', color: 'var(--gold)' }}>
            VX-{String(user.id).padStart(3, '0')}
          </b>,
          <span key={`name-${user.id}`}>
            {user.first_name || user.last_name
              ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
              : user.username}
            {user.is_active ? '' : <span className="status review" style={{ marginLeft: 6 }}>Suspended</span>}
          </span>,
          <span key={`email-${user.id}`}>{user.email}</span>,
          <span className="status" key={`role-${user.id}`}>{user.role}</span>,
          <span className={user.is_verified ? 'status' : 'status pending'} key={`kyc-${user.id}`}>
            {user.is_verified ? 'Verified' : 'Pending'}
          </span>,
          formatCurrency(Number(user.cash_balance ?? 0)),
          Number(user.transaction_count ?? 0).toLocaleString('en-US'),
          <span key={`act-${user.id}`} style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>
            <button
              className="btn btn-outline"
              style={{ padding: '4px 8px', fontSize: 10 }}
              aria-expanded={detailId === user.id}
              onClick={() => (detailId === user.id ? closeDetail() : openDetail(user.id))}
            >
              {detailId === user.id ? 'Hide details' : 'Details'}
            </button>
            <button
              className="btn btn-outline"
              style={{
                padding: '4px 8px', fontSize: 10,
                borderColor: user.is_verified ? 'var(--line)' : 'var(--mint)',
                color: user.is_verified ? '#9eafa4' : 'var(--mint)',
              }}
              disabled={busyId === user.id}
              onClick={() => toggleFlag(user, 'is_verified')}
            >
              {user.is_verified ? 'Revoke KYC' : 'Approve KYC'}
            </button>
            <button
              className="btn btn-outline"
              style={{ padding: '4px 8px', fontSize: 10, borderColor: 'var(--red)', color: 'var(--red)' }}
              disabled={busyId === user.id}
              onClick={() => toggleFlag(user, 'is_active')}
            >
              {user.is_active ? 'Suspend' : 'Reactivate'}
            </button>
          </span>,
        ]}
        emptyTitle={search || role || activeFilter ? 'No client accounts match these filters.' : 'No client accounts registered yet.'}
        emptyHint="New registrations appear here as soon as they are created on the backend."
        footer={<Pager page={page} count={count} onPage={setPage} />}
      />
    </>
  )
}

function KycQueueView({ showToast }) {
  const [searchInput, setSearchInput] = useState('')
  const search = useDebounced(searchInput)
  const [page, setPage] = useState(1)
  const [busyId, setBusyId] = useState(null)

  const { items, count, loading, error, reload } = useAdminList(fetchAdminUsers, {
    search, is_verified: 'false', page, page_size: PAGE_SIZE,
  })

  const approve = async (user) => {
    setBusyId(user.id)
    try {
      await updateAdminUser(user.id, { is_verified: true })
      showToast(`${user.email} approved and marked verified`)
      reload()
    } catch (err) {
      showToast(extractAdminError(err, 'Verification update was rejected by the backend.'))
    } finally {
      setBusyId(null)
    }
  }

  const toolbar = (
    <div className="list-toolbar">
      <input
        className="search-input"
        type="search"
        placeholder="Search pending client…"
        value={searchInput}
        onChange={(event) => { setSearchInput(event.target.value); setPage(1) }}
      />
      <span className="status pending">{count} pending review</span>
    </div>
  )

  return (
    <ListPanel
      toolbar={toolbar}
      loading={loading}
      error={error}
      onRetry={reload}
      items={items}
      headings={['APPLICATION REF', 'CLIENT NAME', 'OFFICIAL EMAIL', 'JOINED', 'STATUS', 'ACTION']}
      renderRow={(user) => [
        <b key={`ref-${user.id}`} style={{ fontFamily: 'monospace', color: 'var(--gold)' }}>
          VX-{String(user.id).padStart(3, '0')}
        </b>,
        <span key={`name-${user.id}`}>
          {user.first_name || user.last_name
            ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
            : user.username}
        </span>,
        <span key={`email-${user.id}`}>{user.email}</span>,
        formatDate(user.date_joined),
        <span className="status pending" key={`st-${user.id}`}>Pending Review</span>,
        <button
          key={`approve-${user.id}`}
          className="btn btn-primary"
          style={{ padding: '4px 10px', fontSize: 10 }}
          disabled={busyId === user.id}
          onClick={() => approve(user)}
        >
          {busyId === user.id ? 'Approving…' : 'Approve KYC'}
        </button>,
      ]}
      emptyTitle={search ? 'No pending applications match that search.' : 'Verification queue is clear.'}
      emptyHint="Every registered client is verified. New applications appear here automatically."
      footer={<Pager page={page} count={count} onPage={setPage} />}
    />
  )
}

function TransactionsView() {
  const [searchInput, setSearchInput] = useState('')
  const search = useDebounced(searchInput)
  const [side, setSide] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [inspectedId, setInspectedId] = useState(null)

  const { items, count, loading, error, reload } = useAdminList(fetchAdminTransactions, {
    search, side, status, page, page_size: PAGE_SIZE,
  })

  const inspected = inspectedId ? items.find((tx) => tx.id === inspectedId) : null

  const toolbar = (
    <div className="list-toolbar">
      <input
        className="search-input"
        type="search"
        placeholder="Search symbol or client email…"
        value={searchInput}
        onChange={(event) => { setSearchInput(event.target.value); setPage(1) }}
      />
      <select value={side} onChange={(event) => { setSide(event.target.value); setPage(1) }}>
        <option value="">All types</option>
        <option value="buy">Buy</option>
        <option value="sell">Sell</option>
        <option value="topup">Demo funding (simulated)</option>
      </select>
      <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }}>
        <option value="">All settlements</option>
        <option value="completed">Completed</option>
        <option value="pending">Pending</option>
        <option value="simulated">Simulated</option>
      </select>
    </div>
  )

  return (
    <>
      {inspected && (
        <div className="app-card detail-panel" aria-live="polite">
          <div className="section-row">
            <div>
              <h3>
                Transaction #{inspected.id}{' '}
                <span className="status" style={{ textTransform: 'uppercase' }}>{inspected.side}</span>
              </h3>
              <div className="muted-copy">
                {inspected.user_name} · {inspected.user_email}
              </div>
            </div>
            <button className="btn btn-outline" type="button" onClick={() => setInspectedId(null)}>
              Close ✕
            </button>
          </div>
          <div className="detail-facts">
            <div><span>INSTRUMENT</span><b>{transactionReferenceLabel(inspected)}</b></div>
            <div><span>QUANTITY</span><b>{Number(inspected.quantity ?? 0).toLocaleString('en-US', { maximumFractionDigits: 4 })}</b></div>
            <div><span>EXECUTION PRICE</span><b>{formatCurrency(Number(inspected.execution_price ?? 0))}</b></div>
            <div><span>AMOUNT</span><b>{formatCurrency(Number(inspected.amount ?? 0))}</b></div>
            <div><span>SETTLEMENT</span><b style={{ textTransform: 'capitalize' }}>{inspected.status}</b></div>
            <div><span>CLIENT ID</span><b style={{ fontFamily: 'monospace' }}>VX-{String(inspected.user_id).padStart(3, '0')}</b></div>
            <div><span>EXECUTED</span><b>{formatDateTime(inspected.created_at)}</b></div>
            <div><span>REFERENCE</span><b style={{ fontFamily: 'monospace' }}>TX-{String(inspected.id).padStart(5, '0')}</b></div>
          </div>
          {inspected.note && (
            <p className="muted-copy" style={{ marginTop: 10, whiteSpace: 'pre-wrap' }}>{inspected.note}</p>
          )}
          <p className="form-note">
            Read-only inspection of the record returned by the monitoring list. Balances are adjusted by the
            trading and funding services — no balance, deposit or withdrawal change can be made from this view.
          </p>
        </div>
      )}
      <ListPanel
        toolbar={toolbar}
        loading={loading}
        error={error}
        onRetry={reload}
        items={items}
        headings={['SIDE', 'CLIENT', 'INSTRUMENT', 'QTY', 'AMOUNT', 'SETTLEMENT', 'DATE', 'ACTION']}
        renderRow={(tx) => [
          <b
            key={`side-${tx.id}`}
            style={{
              textTransform: 'uppercase',
              color: tx.side === 'sell' ? 'var(--gold)' : 'var(--mint)',
            }}
          >
            {transactionSideLabel(tx)}
          </b>,
          <span key={`user-${tx.id}`} style={{ display: 'grid' }}>
            <span>{tx.user_name}</span>
            <small style={{ color: '#74887b', fontSize: 9 }}>{tx.user_email}</small>
          </span>,
          <b key={`sym-${tx.id}`}>{transactionReferenceLabel(tx)}</b>,
          Number(tx.quantity || 0).toLocaleString('en-US', { maximumFractionDigits: 4 }),
          formatCurrency(Number(tx.amount ?? 0)),
          <span
            className={`status${tx.status === 'pending' ? ' pending' : tx.status === 'simulated' ? ' review' : ''}`}
            key={`st-${tx.id}`}
          >
            {transactionStatusLabel(tx)}
          </span>,
          formatDate(tx.created_at),
          <button
            key={`inspect-${tx.id}`}
            className="btn btn-outline"
            style={{ padding: '4px 8px', fontSize: 10 }}
            aria-expanded={inspectedId === tx.id}
            onClick={() => setInspectedId(inspectedId === tx.id ? null : tx.id)}
          >
            {inspectedId === tx.id ? 'Hide' : 'Inspect'}
          </button>,
        ]}
        emptyTitle={search || side || status ? 'No transactions match these filters.' : 'No transactions recorded yet.'}
        emptyHint="Simulated trades and demo funding records written by the backend appear here in real time."
        footer={<Pager page={page} count={count} onPage={setPage} />}
      />
    </>
  )
}

function InstrumentsView({ showToast }) {
  const [searchInput, setSearchInput] = useState('')
  const search = useDebounced(searchInput)
  const [activeFilter, setActiveFilter] = useState('')
  const [page, setPage] = useState(1)
  const [busyId, setBusyId] = useState(null)

  const { items, count, loading, error, reload } = useAdminList(fetchAdminInstruments, {
    search, is_active: activeFilter, page, page_size: PAGE_SIZE,
  })

  const toggleListing = async (instrument) => {
    setBusyId(instrument.id)
    try {
      await updateAdminInstrument(instrument.id, { is_active: !instrument.is_active })
      showToast(instrument.is_active
        ? `${instrument.symbol} hidden from client market lists`
        : `${instrument.symbol} is now visible to clients`)
      reload()
    } catch (err) {
      showToast(extractAdminError(err, 'Instrument update was rejected by the backend.'))
    } finally {
      setBusyId(null)
    }
  }

  const toolbar = (
    <div className="list-toolbar">
      <input
        className="search-input"
        type="search"
        placeholder="Search symbol or instrument name…"
        value={searchInput}
        onChange={(event) => { setSearchInput(event.target.value); setPage(1) }}
      />
      <select value={activeFilter} onChange={(event) => { setActiveFilter(event.target.value); setPage(1) }}>
        <option value="">All listings</option>
        <option value="true">Visible to clients</option>
        <option value="false">Hidden from clients</option>
      </select>
    </div>
  )

  return (
    <ListPanel
      toolbar={toolbar}
      loading={loading}
      error={error}
      onRetry={reload}
      items={items}
      headings={['SYMBOL', 'INSTRUMENT', 'ASSET CLASS', 'PRICE', '24H', 'LISTING', 'ACTION']}
      renderRow={(instrument) => [
        <span className="asset-symbol" key={`sym-${instrument.id}`}>
          <b>{instrument.symbol}</b>
        </span>,
        <span key={`name-${instrument.id}`}>{instrument.name}</span>,
        <span className="status review" key={`class-${instrument.id}`}>{instrument.asset_class}</span>,
        formatCurrency(Number(instrument.price ?? 0)),
        (() => {
          const change = Number(instrument.change_percent ?? 0)
          return (
            <span className={change >= 0 ? 'positive' : 'negative'} key={`chg-${instrument.id}`}>
              {change >= 0 ? '+' : ''}{change.toFixed(2)}%
            </span>
          )
        })(),
        <span className={instrument.is_active ? 'status' : 'status pending'} key={`list-${instrument.id}`}>
          {instrument.is_active ? 'Visible' : 'Hidden'}
        </span>,
        <button
          key={`toggle-${instrument.id}`}
          className="btn btn-outline"
          style={{
            padding: '4px 8px', fontSize: 10,
            borderColor: instrument.is_active ? 'var(--red)' : 'var(--green)',
            color: instrument.is_active ? 'var(--red)' : 'var(--green)',
          }}
          disabled={busyId === instrument.id}
          onClick={() => toggleListing(instrument)}
        >
          {busyId === instrument.id ? 'Saving…' : instrument.is_active ? 'Hide listing' : 'Show listing'}
        </button>,
      ]}
      emptyTitle={search || activeFilter ? 'No instruments match these filters.' : 'No instruments registered yet.'}
      emptyHint="Instruments are seeded on the backend and can be hidden from clients here."
      footer={<Pager page={page} count={count} onPage={setPage} />}
    />
  )
}

function AuditView() {
  const [searchInput, setSearchInput] = useState('')
  const search = useDebounced(searchInput)
  const [includeRequests, setIncludeRequests] = useState(false)
  const [page, setPage] = useState(1)

  const { items, count, loading, error, reload } = useAdminList(fetchAdminAudit, {
    search,
    include_requests: includeRequests ? '1' : '',
    page,
    page_size: PAGE_SIZE,
  })

  const toolbar = (
    <div className="list-toolbar">
      <input
        className="search-input"
        type="search"
        placeholder="Search action or details…"
        value={searchInput}
        onChange={(event) => { setSearchInput(event.target.value); setPage(1) }}
      />
      <label className="check-label" style={{ fontSize: 10, color: '#9eafa4', display: 'flex', gap: 7, alignItems: 'center' }}>
        <input
          type="checkbox"
          checked={includeRequests}
          onChange={(event) => { setIncludeRequests(event.target.checked); setPage(1) }}
        />
        Include routine request logs
      </label>
    </div>
  )

  return (
    <ListPanel
      toolbar={toolbar}
      loading={loading}
      error={error}
      onRetry={reload}
      items={items}
      headings={['TIMESTAMP (UTC)', 'OPERATOR', 'TARGET', 'AUDIT EVENT', 'DETAILS']}
      renderRow={(entry) => [
        formatDateTime(entry.created_at),
        <span key={`actor-${entry.id}`}>
          {entry.actor_name || entry.actor_email || 'System'}
        </span>,
        <span key={`target-${entry.id}`} style={{ color: 'var(--gold)' }}>{entry.target_email || '—'}</span>,
        <b key={`act-${entry.id}`} style={{ color: 'var(--green)' }}>{entry.action}</b>,
        <span key={`det-${entry.id}`} title={entry.details || ''}>{truncate(entry.details || '—', 80)}</span>,
      ]}
      emptyTitle={search ? 'No audit entries match that search.' : 'No administrative activity recorded yet.'}
      emptyHint="Staff actions such as verification changes, suspensions and listing toggles are logged here automatically."
      footer={<Pager page={page} count={count} onPage={setPage} />}
    />
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

function SupportDeskView({ ctx, showToast }) {
  const {
    conversations = [],
    tickets = [],
    profile,
    onSendMessage,
    onMarkRead,
    onResolveConversation,
    onReopenConversation,
  } = ctx

  const [selectedConvoId, setSelectedConvoId] = useState(null)
  // Which conversation's unread count we have already cleared, so we only call
  // mark-read once per thread rather than on every poll.
  const markedReadRef = useRef(null)
  const [adminReply, setAdminReply] = useState('')
  const [replyLoading, setReplyLoading] = useState(false)
  const [replyError, setReplyError] = useState('')
  const replyLoadingRef = useRef(false)

  const activeConversations = conversations.filter((c) => c.is_active)
  const totalOpenCases = activeConversations.length + tickets.length
  const totalUnreadMessages = conversations.reduce(
    (sum, c) => sum + Number(c.unread_count || 0),
    0
  )

  // Opening a thread marks the client's messages read, clearing the unread
  // notification for that conversation. Re-runs only when the selected thread
  // or its unread count changes.
  useEffect(() => {
    if (!onMarkRead || selectedConvoId === null || selectedConvoId === undefined) return
    const convo = conversations.find((c) => c.id === selectedConvoId)
    if (!convo || Number(convo.unread_count || 0) === 0) return
    if (markedReadRef.current === selectedConvoId) return
    markedReadRef.current = selectedConvoId
    onMarkRead(selectedConvoId)
  }, [selectedConvoId, conversations, onMarkRead])

  const activeConvo = conversations.find((c) => c.id === selectedConvoId) || conversations[0]

  const handleSendAdminReply = async (event) => {
    event.preventDefault()
    // Ref guard blocks a duplicate submit from a rapid double-click before the
    // disabled state has re-rendered.
    if (replyLoadingRef.current) return
    const content = adminReply.trim()
    // The reply form is rendered against `activeConvo` (the selected thread, or
    // the first one); target that same conversation so a reply sent without an
    // explicit click still lands on the thread the admin sees.
    const targetConvoId = activeConvo?.id
    if (!content || targetConvoId === undefined || targetConvoId === null || !onSendMessage) return
    replyLoadingRef.current = true
    setReplyLoading(true)
    setReplyError('')
    try {
      // Success is confirmed only after the server persists the reply; the
      // draft is cleared only then, so a failed send is never lost.
      await onSendMessage(targetConvoId, content)
      setAdminReply('')
      showToast('Staff reply dispatched to client.')
    } catch (err) {
      const message = err?.response?.data?.detail
        || err?.response?.data?.content?.[0]
        || 'Failed to send reply. Please try again.'
      setReplyError(message)
      showToast(`Reply not sent: ${message}`)
    } finally {
      replyLoadingRef.current = false
      setReplyLoading(false)
    }
  }

  return (
    <>
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, fontWeight: 700, gap: 8 }}>
                      <span>Case #{c.id}: {c.subject}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {Number(c.unread_count || 0) > 0 && (
                          <span
                            className="status pending"
                            data-unread={c.unread_count}
                            style={{ fontWeight: 800 }}
                          >
                            {c.unread_count} new
                          </span>
                        )}
                        <span className={c.is_active ? 'status' : 'status review'}>
                          {c.is_active ? 'Active Client' : 'Resolved'}
                        </span>
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
                    // Attribution comes from the server: `sender` is a nested
                    // user object and `sender_id` is the flat id. Staff/admin
                    // senders are the support side; the client is the owner of
                    // the conversation. The content prefix is never trusted.
                    const s = msg.sender
                    const senderIsStaff = s && typeof s === 'object'
                      ? (s.role === 'admin' || s.is_staff === true)
                      : (s === 'staff' || s === 'admin')
                    const isStaff = Boolean(senderIsStaff)
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
                    {replyError && (
                      <small style={{ color: '#ed8d8d', fontSize: 9, marginTop: 6, display: 'block' }} role="alert">
                        {replyError}
                      </small>
                    )}
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

      <div className="app-card" style={{ marginTop: 15 }}>
        <div className="section-row">
          <div>
            <h3>Case Load</h3>
            <div className="muted-copy">
              Aggregated live from backend support records
              {totalUnreadMessages > 0 && (
                <b style={{ color: 'var(--gold)', marginLeft: 6 }}>
                  · {totalUnreadMessages} unread message{totalUnreadMessages === 1 ? '' : 's'}
                </b>
              )}
            </div>
          </div>
          <span className={totalUnreadMessages > 0 ? 'status pending' : totalOpenCases > 0 ? 'status pending' : 'status'}>
            {totalUnreadMessages > 0
              ? `${totalUnreadMessages} new`
              : totalOpenCases > 0
                ? `${totalOpenCases} open`
                : 'All clear'}
          </span>
        </div>
      </div>
    </>
  )
}

export default function AdminViews({ view, ctx = {}, onNavigate, showToast = () => {} }) {
  if (view === 'admin') {
    return (
      <AdminShell
        view={view}
        title="Operations Control Centre"
        subtitle="Institutional operations, compliance oversight, and risk management."
        onNavigate={onNavigate}
        onLogout={ctx.onLogout}
        ctx={ctx}
      >
        <AdminOverview onNavigate={onNavigate} ctx={ctx} />
      </AdminShell>
    )
  }

  if (view === 'admin-customers') {
    return (
      <AdminShell
        view={view}
        title="Client Accounts Directory"
        subtitle="Registered retail, professional, and institutional client accounts."
        onNavigate={onNavigate}
        onLogout={ctx.onLogout}
        ctx={ctx}
      >
        <div className="admin-warn">
          Protected client records. Modifications and account actions require compliance supervisor authorization.
        </div>
        <CustomersView showToast={showToast} />
      </AdminShell>
    )
  }

  if (view === 'admin-kyc') {
    return (
      <AdminShell
        view={view}
        title="KYC Verification Queue"
        subtitle="Identity verification, AML screening, and regulatory accreditation."
        onNavigate={onNavigate}
        onLogout={ctx.onLogout}
        ctx={ctx}
      >
        <div className="admin-warn">
          Customer document validation must comply with FATF international anti-money laundering standards.
        </div>
        <KycQueueView showToast={showToast} />
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
        onLogout={ctx.onLogout}
        ctx={ctx}
      >
        <div className="admin-warn">
          Automated transaction monitoring active. Flagged transactions are placed in temporary compliance hold.
        </div>
        <TransactionsView />
      </AdminShell>
    )
  }

  if (view === 'admin-instruments') {
    return (
      <AdminShell
        view={view}
        title="Instrument Listings"
        subtitle="Control which instruments are visible to clients on the public markets."
        onNavigate={onNavigate}
        onLogout={ctx.onLogout}
        ctx={ctx}
      >
        <div className="admin-warn">
          Hiding an instrument removes it from client market lists immediately; price and execution data are managed server-side.
        </div>
        <InstrumentsView showToast={showToast} />
      </AdminShell>
    )
  }

  if (view === 'admin-support') {
    return (
      <AdminShell
        view={view}
        title="Client Services Desk — Staff Inbox"
        subtitle="Incoming customer support requests and real-time live chat conversations."
        onNavigate={onNavigate}
        onLogout={ctx.onLogout}
        ctx={ctx}
      >
        <SupportDeskView ctx={ctx} showToast={showToast} />
      </AdminShell>
    )
  }

  if (view === 'admin-audit') {
    return (
      <AdminShell
        view={view}
        title="Regulatory Audit Trail"
        subtitle="Immutable security logs and administrative action history."
        onNavigate={onNavigate}
        onLogout={ctx.onLogout}
        ctx={ctx}
      >
        <div className="admin-warn">
          Tamper-evident audit trail recording all staff operations and account modifications.
        </div>
        <AuditView />
      </AdminShell>
    )
  }

  if (view === 'admin-profile') {
    return (
      <AdminShell
        view={view}
        title="Administrator Profile"
        subtitle="Your own account record, served by the self-service profile endpoint."
        onNavigate={onNavigate}
        onLogout={ctx.onLogout}
        ctx={ctx}
      >
        <div className="admin-warn">
          This is your own account. Editing it uses the same authenticated /api/profile/ endpoint as
          client accounts; role and permissions are managed server-side.
        </div>
        <ProfileView ctx={ctx} />
      </AdminShell>
    )
  }

  return null
}
