import React, { useCallback, useEffect, useState } from 'react'
import DataTable from './DataTable'
import {
  approveAdminBankDeposit,
  approveAdminChainTransfer,
  assignAdminChainTransfer,
  extractAdminError,
  fetchAdminChainTransfers,
  fetchAdminDeposit,
  fetchAdminDeposits,
  fetchAdminReconciliation,
  flagAdminChainTransfer,
  rejectAdminBankDeposit,
  resolveAdminDiscrepancy,
  runAdminReconciliation,
} from '../services/adminFeed'

function money(value, currency = '') {
  if (value === null || value === undefined || value === '') return '—'
  return `${value}${currency ? ` ${currency}` : ''}`
}

function when(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString()
}

function statusClass(status) {
  return ['manual_review', 'confirmed', 'credited', 'rejected', 'open'].includes(status) ? `status ${status}` : 'status'
}

function explorerUrl(txid, isTestnet = false) {
  if (!/^[0-9a-fA-F]{64}$/.test(String(txid || ''))) return ''
  const host = isTestnet ? 'https://shasta.tronscan.org' : 'https://tronscan.org'
  return `${host}/#/transaction/${txid}`
}

function TxLink({ txid, isTestnet = false }) {
  const url = explorerUrl(txid, isTestnet)
  if (!url) return <code>{txid}</code>
  return <a href={url} target="_blank" rel="noreferrer"><code>{txid}</code></a>
}

export default function AdminDeposits({ showToast = () => {} }) {
  const [tab, setTab] = useState('deposits')
  const [rail, setRail] = useState('')
  const [reviewOnly, setReviewOnly] = useState(false)
  const [deposits, setDeposits] = useState([])
  const [transfers, setTransfers] = useState([])
  const [unallocatedOnly, setUnallocatedOnly] = useState(true)
  const [reconciliation, setReconciliation] = useState({ runs: [], discrepancies: [] })
  const [selected, setSelected] = useState(null)
  const [selectedTransfer, setSelectedTransfer] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [assignForm, setAssignForm] = useState({ deposit_id: '', reason: '' })
  const [reviewReason, setReviewReason] = useState('')
  const [allowMismatch, setAllowMismatch] = useState(false)
  const [bankForm, setBankForm] = useState({ amount: '', currency: '', reference: '', verification_source: '', reason: '' })
  const [resolution, setResolution] = useState({ id: '', text: '' })

  const load = useCallback(async () => {
    setError('')
    try {
      const [depositData, transferData, reconciliationData] = await Promise.all([
        fetchAdminDeposits({ rail, review: reviewOnly ? '1' : '' }),
        fetchAdminChainTransfers({ unallocated: unallocatedOnly ? '1' : '' }),
        fetchAdminReconciliation(),
      ])
      setDeposits(depositData.results)
      setTransfers(transferData.results)
      setReconciliation(reconciliationData || { runs: [], discrepancies: [] })
    } catch (err) {
      setError(extractAdminError(err, 'Could not load deposit review data.'))
    }
  }, [rail, reviewOnly, unallocatedOnly])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!selected) return
    setBankForm({
      amount: selected.received_amount || selected.expected_amount || '',
      currency: selected.asset || '',
      reference: selected.bank?.provider_reference || selected.reference || '',
      verification_source: '',
      reason: '',
    })
    setAssignForm({ deposit_id: String(selected.id), reason: '' })
  }, [selected])

  const run = async (action, success) => {
    setBusy(true)
    setError('')
    try {
      await action()
      showToast(success)
      await load()
      if (selected) {
        try { setSelected(await fetchAdminDeposit(selected.id)) } catch { /* list refresh already ran */ }
      }
      if (selectedTransfer) {
        try {
          const data = await fetchAdminChainTransfers({ txid: selectedTransfer.txid, unallocated: '' })
          const updated = data.results.find((item) => item.id === selectedTransfer.id)
          if (updated) setSelectedTransfer(updated)
        } catch { /* list refresh already ran */ }
      }
    } catch (err) {
      setError(extractAdminError(err, 'The deposit action failed.'))
    } finally {
      setBusy(false)
    }
  }

  const approveBank = (event) => {
    event.preventDefault()
    run(
      () => approveAdminBankDeposit(selected.id, bankForm),
      'Bank deposit approved and credited once.',
    )
  }

  const rejectBank = () => {
    const reason = bankForm.reason || 'Rejected after operator review.'
    run(() => rejectAdminBankDeposit(selected.id, reason), 'Bank deposit rejected.')
  }

  const assignTransfer = (event) => {
    event.preventDefault()
    run(
      () => assignAdminChainTransfer(selectedTransfer.id, assignForm.deposit_id, assignForm.reason),
      'Chain transfer linked to the deposit request for review.',
    )
  }

  const approveTransfer = () => {
    if (!reviewReason.trim()) {
      setError('Enter a reason before approving a crypto transfer.')
      return
    }
    run(
      () => approveAdminChainTransfer(selectedTransfer.id, reviewReason, allowMismatch),
      'Chain transfer re-verified and credited if all checks passed.',
    )
  }

  const flagTransfer = () => {
    if (!reviewReason.trim()) {
      setError('Enter a reason before flagging a crypto transfer.')
      return
    }
    run(
      () => flagAdminChainTransfer(selectedTransfer.id, reviewReason),
      'Chain transfer placed in manual review.',
    )
  }

  const resolve = (event) => {
    event.preventDefault()
    run(
      () => resolveAdminDiscrepancy(resolution.id, resolution.text),
      'Reconciliation finding resolved.',
    )
  }

  return (
    <div>
      <div className="admin-warn">
        Crypto transfers are matched against one shared TRON address. A transaction hash is a client claim, not proof.
        Approval re-checks the canonical chain, exact amount and confirmations. Bank approval requires independent evidence.
      </div>
      {error && <div className="admin-warn" role="alert">{error}</div>}

      <div style={{ display: 'flex', gap: 8, margin: '12px 0', flexWrap: 'wrap' }}>
        <button className={`btn ${tab === 'deposits' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('deposits')}>Deposits</button>
        <button className={`btn ${tab === 'transfers' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('transfers')}>Chain transfers</button>
        <button className={`btn ${tab === 'reconciliation' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('reconciliation')}>Reconciliation</button>
        <button className="btn btn-outline" onClick={load} disabled={busy}>Refresh ↻</button>
      </div>

      {tab === 'deposits' && <>
        <div className="app-card">
          <div className="section-row">
            <div><h3>Deposit requests</h3><div className="muted-copy">Crypto and manual bank requests, including the review queue.</div></div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <select value={rail} onChange={(event) => setRail(event.target.value)} aria-label="Filter rail">
                <option value="">All rails</option>
                <option value="crypto">Crypto</option>
                <option value="bank">Bank</option>
              </select>
              <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input type="checkbox" checked={reviewOnly} onChange={(event) => setReviewOnly(event.target.checked)} /> Manual review only
              </label>
            </div>
          </div>
          {deposits.length ? <DataTable
            headings={['REFERENCE', 'CLIENT', 'RAIL', 'REQUESTED', 'RECEIVED', 'STATUS', 'CREATED', '']}
            rows={deposits.map((deposit) => [
              <code key={`ref-${deposit.id}`}>{deposit.reference}</code>,
              deposit.user?.email || '—',
              deposit.rail,
              money(deposit.payable_amount || deposit.expected_amount, deposit.asset),
              money(deposit.received_amount, deposit.asset),
              <span key={`st-${deposit.id}`} className={statusClass(deposit.status)}>{deposit.status}</span>,
              when(deposit.created_at),
              <button key={`open-${deposit.id}`} className="btn btn-outline" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => setSelected(deposit)}>Review</button>,
            ])}
          /> : <div className="empty-state"><p>No deposit requests match this filter.</p></div>}
        </div>

        {selected && <div className="app-card" style={{ marginTop: 15 }}>
          <div className="section-row">
            <div>
              <h3>{selected.rail === 'bank' ? 'Bank transfer review' : 'Crypto deposit review'} · {selected.reference}</h3>
              <div className="muted-copy">{selected.user?.email} · {selected.asset} · status {selected.status} · {selected.is_credited ? `credited (ledger entry ${selected.ledger_entry})` : 'not credited'}</div>
            </div>
            <button className="btn btn-outline" onClick={() => setSelected(null)}>Close</button>
          </div>
          {selected.review_reason && <div className="admin-warn">Review reason: {selected.review_reason}</div>}

          {selected.rail === 'bank' ? <form onSubmit={approveBank} style={{ display: 'grid', gap: 10, maxWidth: 620, marginTop: 12 }}>
            <div><strong>Record the independently verified receipt.</strong> The ledger credits the verified amount, not the requested amount.</div>
            <label>Verified amount<input type="number" step="0.000001" min="0.000001" required value={bankForm.amount} onChange={(event) => setBankForm({ ...bankForm, amount: event.target.value })} /></label>
            <label>Currency<input required value={bankForm.currency} onChange={(event) => setBankForm({ ...bankForm, currency: event.target.value })} /></label>
            <label>Bank reference<input required value={bankForm.reference} onChange={(event) => setBankForm({ ...bankForm, reference: event.target.value })} /></label>
            <label>Independent verification source<input required placeholder="e.g. statement date, row, statement ID" value={bankForm.verification_source} onChange={(event) => setBankForm({ ...bankForm, verification_source: event.target.value })} /></label>
            <label>Decision reason<textarea required value={bankForm.reason} onChange={(event) => setBankForm({ ...bankForm, reason: event.target.value })} /></label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" type="submit" disabled={busy || selected.is_credited}>Approve and credit verified amount</button>
              <button className="btn btn-outline" type="button" disabled={busy || selected.is_credited} onClick={rejectBank}>Reject</button>
            </div>
          </form> : <div style={{ marginTop: 12 }}>
            <div className="muted-copy">Linked txid: {selected.crypto?.txid || '—'} · Submitted claim: {selected.crypto?.submitted_txid || '—'} · Confirmations: {selected.crypto?.confirmations ?? 0}/{selected.crypto?.required_confirmations ?? 0}</div>
            {selected.chain_transfers?.length ? selected.chain_transfers.map((transfer) => <div key={transfer.id} style={{ marginTop: 10, padding: 10, border: '1px solid var(--line)' }}>
              <div><TxLink txid={transfer.txid} isTestnet={transfer.is_testnet} />:{transfer.event_index} · {money(transfer.amount, selected.asset)} · <span className={statusClass(transfer.status)}>{transfer.status}</span></div>
              <div className="muted-copy">From {transfer.sender_address} · block {transfer.block_number} · {transfer.review_reason || transfer.attribution_reason || 'No reason recorded'}</div>
              <button className="btn btn-outline" style={{ marginTop: 8 }} onClick={() => { setSelectedTransfer(transfer); setReviewReason(''); setAllowMismatch(false) }}>Open transfer review</button>
            </div>) : <div className="muted-copy">No chain transfer is linked to this request yet.</div>}
            <p className="muted-copy">To link an unallocated transfer, open it from the Chain transfers tab and enter this deposit id ({selected.id}).</p>
          </div>}
        </div>}
      </>}

      {tab === 'transfers' && <>
        <div className="app-card">
          <div className="section-row">
            <div><h3>On-chain transfers</h3><div className="muted-copy">Transfers to the shared receiving address. Unallocated transfers stay uncredited.</div></div>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input type="checkbox" checked={unallocatedOnly} onChange={(event) => setUnallocatedOnly(event.target.checked)} /> Unallocated only
            </label>
          </div>
          {transfers.length ? <DataTable
            headings={['TXID', 'AMOUNT', 'STATUS', 'DEPOSIT', 'CONFIRMATIONS', 'OBSERVED', '']}
            rows={transfers.map((transfer) => [
              <code key={`tx-${transfer.id}`}>{transfer.txid.slice(0, 18)}…</code>,
              money(transfer.amount, 'USDT'),
              <span key={`st-${transfer.id}`} className={statusClass(transfer.status)}>{transfer.status}</span>,
              transfer.deposit_id || 'Unallocated',
              transfer.confirmations,
              when(transfer.observed_at),
              <button key={`open-${transfer.id}`} className="btn btn-outline" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => { setSelectedTransfer(transfer); setReviewReason(''); setAllowMismatch(false) }}>Review</button>,
            ])}
          /> : <div className="empty-state"><p>No chain transfers match this filter.</p></div>}
        </div>

        {selectedTransfer && <div className="app-card" style={{ marginTop: 15 }}>
          <div className="section-row">
            <div><h3>Chain transfer review</h3><div className="muted-copy"><TxLink txid={selectedTransfer.txid} isTestnet={selectedTransfer.is_testnet} />:{selectedTransfer.event_index} · {money(selectedTransfer.amount, 'USDT')} · {selectedTransfer.status}</div></div>
            <button className="btn btn-outline" onClick={() => setSelectedTransfer(null)}>Close</button>
          </div>
          <div className="muted-copy">Recipient {selectedTransfer.recipient_address} · sender {selectedTransfer.sender_address} · block {selectedTransfer.block_number} · {selectedTransfer.confirmations} confirmations</div>
          <div className="admin-warn">A matching amount is not proof of ownership. Approval re-checks the canonical chain and credits only an exact, fully confirmed transfer. Use the mismatch override only after independently reviewing a verified over/underpayment.</div>
          {!selectedTransfer.deposit_id && <form onSubmit={assignTransfer} style={{ display: 'grid', gap: 10, maxWidth: 520, marginTop: 12 }}>
            <label>Deposit request id<input required inputMode="numeric" value={assignForm.deposit_id} onChange={(event) => setAssignForm({ ...assignForm, deposit_id: event.target.value })} /></label>
            <label>Link reason<input required value={assignForm.reason} onChange={(event) => setAssignForm({ ...assignForm, reason: event.target.value })} /></label>
            <button className="btn btn-outline" type="submit" disabled={busy}>Link transfer</button>
          </form>}
          <div style={{ display: 'grid', gap: 10, maxWidth: 520, marginTop: 12 }}>
            <label>Operator reason<input value={reviewReason} onChange={(event) => setReviewReason(event.target.value)} placeholder="Why are you approving or flagging this transfer?" /></label>
            {selectedTransfer.deposit_id && <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" checked={allowMismatch} onChange={(event) => setAllowMismatch(event.target.checked)} />
              Accept the verified on-chain amount if it differs from the request (admin review required)
            </label>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" disabled={busy || !selectedTransfer.deposit_id} onClick={approveTransfer}>Approve and credit</button>
              <button className="btn btn-outline" disabled={busy} onClick={flagTransfer}>Flag for review</button>
            </div>
          </div>
        </div>}
      </>}

      {tab === 'reconciliation' && <div className="app-card">
        <div className="section-row">
          <div><h3>Deposit reconciliation</h3><div className="muted-copy">Read-only checks. Findings never move money automatically.</div></div>
          <button className="btn btn-primary" disabled={busy} onClick={() => run(runAdminReconciliation, 'Reconciliation run recorded.')}>Run reconciliation</button>
        </div>
        <h4>Recent runs</h4>
        {reconciliation.runs?.length ? <DataTable
          headings={['RAIL', 'STATUS', 'PROVIDER TOTAL', 'LEDGER TOTAL', 'DIFFERENCE', 'FINDINGS', 'RAN AT']}
          rows={reconciliation.runs.map((record) => [
            record.rail,
            <span key={`rs-${record.id}`} className={statusClass(record.status)}>{record.status}</span>,
            money(record.provider_total),
            money(record.ledger_total),
            money(record.difference),
            record.discrepancy_count,
            when(record.ran_at),
          ])}
        /> : <div className="muted-copy">No reconciliation run yet.</div>}
        <h4 style={{ marginTop: 20 }}>Findings</h4>
        {reconciliation.discrepancies?.length ? <DataTable
          headings={['KIND', 'SEVERITY', 'STATUS', 'DETAILS', '']}
          rows={reconciliation.discrepancies.map((item) => [
            item.kind,
            item.severity,
            <span key={`ds-${item.id}`} className={statusClass(item.status)}>{item.status}</span>,
            item.details,
            item.status === 'open'
              ? <button key={`resolve-${item.id}`} className="btn btn-outline" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => setResolution({ id: item.id, text: '' })}>Resolve</button>
              : item.resolution || '—',
          ])}
        /> : <div className="empty-state"><p>No reconciliation findings.</p></div>}
        {resolution.id && <form onSubmit={resolve} style={{ display: 'grid', gap: 8, maxWidth: 620, marginTop: 12 }}>
          <label>Resolution note for finding #{resolution.id}<textarea required value={resolution.text} onChange={(event) => setResolution({ ...resolution, text: event.target.value })} /></label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" type="submit" disabled={busy}>Mark resolved</button>
            <button className="btn btn-outline" type="button" onClick={() => setResolution({ id: '', text: '' })}>Cancel</button>
          </div>
        </form>}
      </div>}
    </div>
  )
}
