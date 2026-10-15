import React, { useState } from 'react'

export default function TopUpModal({ isOpen, onClose, onTopUp, currentBalance = 0 }) {
  const [amount, setAmount] = useState('2500.00')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const quickAmounts = ['500.00', '1000.00', '2500.00', '5000.00', '10000.00']

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const num = Number(amount)
    if (!num || num <= 0) {
      setError('Please enter a valid positive dollar amount.')
      return
    }

    setLoading(true)
    try {
      await onTopUp(amount)
      onClose()
    } catch (err) {
      const msg = err?.response?.data?.detail
        || err?.response?.data?.error
        || err?.message
        || 'Failed to process deposit transaction.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 110,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        className="form-card"
        style={{
          width: '100%',
          maxWidth: 440,
          margin: 0,
          background: '#0d1914',
          border: '1px solid var(--line)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div className="eyebrow" style={{ margin: 0 }}>
            <span className="eyebrow-line" /> ACCOUNT FUNDING
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 0,
              color: '#93a79b',
              fontSize: 22,
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <h2 style={{ fontSize: 24, margin: '0 0 6px' }}>Deposit Trading Funds</h2>
        <p style={{ color: '#8ca094', fontSize: 11, margin: '0 0 16px' }}>
          Current balance: <strong style={{ color: 'var(--green)' }}>${Number(currentBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD</strong>
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="topupAmount">Deposit Amount (USD)</label>
            <input
              id="topupAmount"
              type="number"
              step="any"
              min="1"
              required
              placeholder="e.g. 2500.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
            {quickAmounts.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setAmount(q)}
                style={{
                  background: amount === q ? '#8be3b522' : 'transparent',
                  color: amount === q ? 'var(--green)' : '#8fa397',
                  border: '1px solid ' + (amount === q ? 'var(--green)' : '#2b4135'),
                  borderRadius: 3,
                  fontSize: 10,
                  padding: '4px 8px',
                  cursor: 'pointer',
                }}
              >
                +${Number(q).toLocaleString()}
              </button>
            ))}
          </div>

          {error && <div className="admin-warn" style={{ marginBottom: 14 }}>{error}</div>}

          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button
              type="button"
              className="btn btn-outline"
              style={{ flex: 1 }}
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: 2 }}
              disabled={loading}
            >
              {loading ? 'Processing Deposit…' : `Deposit $${amount || '0'} USD`} ↗
            </button>
          </div>

          <div className="form-note" style={{ marginTop: 14 }}>
            Credits funds directly to your verified brokerage account and records a completed deposit transaction on the ledger.
          </div>
        </form>
      </div>
    </div>
  )
}
