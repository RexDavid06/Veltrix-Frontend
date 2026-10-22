import React, { useEffect, useState } from 'react'
import api from '../api'

export default function DepositPanel() {
  const [amount, setAmount] = useState('')
  const [deposits, setDeposits] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const load = async () => {
    try {
      const result = await api.get('/deposits/')
      setDeposits(Array.isArray(result.data) ? result.data : [])
      setError('')
    } catch (err) {
      setError(err?.response?.data?.detail || 'Deposit service is currently unavailable.')
    }
  }
  useEffect(() => {
    load()
    const timer = window.setInterval(load, 20000)
    return () => window.clearInterval(timer)
  }, [])
  const createDeposit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const key = globalThis.crypto?.randomUUID?.() || `deposit-${Date.now()}-${Math.random().toString(36).slice(2)}`
      const result = await api.post('/deposits/', { amount, idempotency_key: key }, { headers: { 'Idempotency-Key': key } })
      setDeposits((items) => [result.data, ...items.filter((item) => item.id !== result.data.id)])
      setAmount('')
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not create a deposit request. Please retry.')
    } finally {
      setLoading(false)
    }
  }
  const statusLabel = (value) => ({ pending: 'Awaiting payment', detected: 'Confirming', verifying: 'Confirming',
    verified: 'Verified', credited: 'Credited', available: 'Completed', manual_review: 'Manual review',
    expired: 'Expired', rejected: 'Failed', reversed: 'Reversed' }[value] || value)
  return (
    <div className="app-card">
      <div className="eyebrow"><span className="eyebrow-line" /> USDT DEPOSITS</div>
      <h3>Deposit USDT on TRON</h3>
      <p className="muted-copy">Only USDT using the TRON TRC20 network is supported. Confirm the network in your wallet before sending. Deposits are credited after provider verification.</p>
      <form onSubmit={createDeposit} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 10, maxWidth: 520, alignItems: 'end', margin: '20px 0' }}>
        <div className="form-group" style={{ margin: 0 }}><label htmlFor="depositAmount">Amount (USDT)</label><input id="depositAmount" type="number" min="0.000001" step="0.000001" required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 25" /></div>
        <button className="btn btn-primary" style={{ width: '100%' }} type="submit" disabled={loading}>{loading ? 'Creating…' : 'Get payment address'}</button>
      </form>
      {error && <div className="admin-warn" role="alert">{error}</div>}
      <h3 style={{ marginTop: 28 }}>Deposit history</h3>
      {deposits.length === 0 ? <p className="muted-copy">No USDT deposits yet.</p> : <div style={{ display: 'grid', gap: 12 }}>
        {deposits.map((deposit) => <article key={deposit.id} style={{ padding: 14, border: '1px solid var(--line)', borderRadius: 5, overflowWrap: 'anywhere' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}><strong>{deposit.expected_amount} USDT</strong><span className="status">{statusLabel(deposit.status)}</span></div>
          <div className="muted-copy" style={{ marginTop: 6 }}>TRON (TRC20) · Reference {deposit.reference}</div>
          {deposit.instructions?.address && <div style={{ marginTop: 12 }}><div className="stat-label">SEND EXACTLY {deposit.instructions.amount} USDT TO</div><code>{deposit.instructions.address}</code><p className="muted-copy">{deposit.instructions.note}</p><button type="button" className="btn btn-outline" onClick={() => navigator.clipboard?.writeText(deposit.instructions.address)}>Copy address</button></div>}
          {deposit.transaction_hash && <div className="muted-copy">Transaction reference: <code>{deposit.transaction_hash}</code></div>}
          {deposit.status === 'manual_review' && <div className="admin-warn" style={{ marginTop: 8 }}>We received a payment that needs a manual check. Contact support and include this reference.</div>}
        </article>)}
      </div>}
    </div>
  )
}
