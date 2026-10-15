import React, { useState } from 'react'

export default function TradeModal({ isOpen, onClose, initialSymbol = 'AAPL', onExecuteOrder, cashBalance = 0 }) {
  const [symbol, setSymbol] = useState(initialSymbol)
  const [side, setSide] = useState('buy')
  const [quantity, setQuantity] = useState('1')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  React.useEffect(() => {
    if (initialSymbol) setSymbol(initialSymbol)
  }, [initialSymbol])

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const qty = Number(quantity)
    if (!qty || qty <= 0) {
      setError('Please enter a valid quantity greater than zero.')
      return
    }

    setLoading(true)
    try {
      await onExecuteOrder({
        symbol: symbol.trim(),
        side,
        quantity: String(qty),
      })
      onClose()
    } catch (err) {
      const msg = err?.response?.data?.detail
        || err?.response?.data?.error
        || err?.message
        || 'Failed to execute order.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const popularSymbols = ['AAPL', 'MSFT', 'NVDA', 'BTC-USD', 'ETH-USD', 'EURUSD=X', 'XAUUSD=X']

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
          maxWidth: 460,
          margin: 0,
          background: '#0d1914',
          border: '1px solid var(--line)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div className="eyebrow" style={{ margin: 0 }}>
            <span className="eyebrow-line" /> MARKET EXECUTION
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

        <h2 style={{ fontSize: 24, margin: '0 0 6px' }}>Place Market Order</h2>
        <p style={{ color: '#8ca094', fontSize: 11, margin: '0 0 16px' }}>
          Available Balance: <strong style={{ color: 'var(--green)' }}>${Number(cashBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD</strong>
        </p>

        <form onSubmit={handleSubmit}>
          {/* Side toggle */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            <button
              type="button"
              className="btn"
              style={{
                background: side === 'buy' ? 'var(--green)' : 'transparent',
                color: side === 'buy' ? '#092016' : '#dce8e0',
                border: '1px solid ' + (side === 'buy' ? 'var(--green)' : '#2b4135'),
                fontWeight: 700,
              }}
              onClick={() => setSide('buy')}
            >
              Buy (Long)
            </button>
            <button
              type="button"
              className="btn"
              style={{
                background: side === 'sell' ? 'var(--red)' : 'transparent',
                color: side === 'sell' ? '#fff' : '#dce8e0',
                border: '1px solid ' + (side === 'sell' ? 'var(--red)' : '#2b4135'),
                fontWeight: 700,
              }}
              onClick={() => setSide('sell')}
            >
              Sell (Close)
            </button>
          </div>

          <div className="form-group">
            <label htmlFor="orderSymbol">Instrument Symbol</label>
            <input
              id="orderSymbol"
              required
              placeholder="e.g. AAPL, BTC-USD, EURUSD=X"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            />
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {popularSymbols.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSymbol(s)}
                style={{
                  background: symbol === s ? '#8be3b522' : 'transparent',
                  color: symbol === s ? 'var(--green)' : '#8fa397',
                  border: '1px solid ' + (symbol === s ? 'var(--green)' : '#2b4135'),
                  borderRadius: 3,
                  fontSize: 10,
                  padding: '3px 7px',
                  cursor: 'pointer',
                }}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="form-group">
            <label htmlFor="orderQuantity">Quantity / Units</label>
            <input
              id="orderQuantity"
              type="number"
              step="any"
              min="0.0001"
              required
              placeholder="e.g. 1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
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
              {loading ? 'Routing Order…' : `${side.toUpperCase()} ${quantity || '0'} ${symbol || ''}`} ↗
            </button>
          </div>

          <div className="form-note" style={{ marginTop: 14 }}>
            Direct STP order routing executed with institutional liquidity and instantaneous ledger settlement.
          </div>
        </form>
      </div>
    </div>
  )
}
