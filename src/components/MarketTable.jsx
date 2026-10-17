import React, { useState } from 'react'
import DataTable from './DataTable'

export function renderMarketRows(rows, onToast, onTrade, onToggleWatchlist, watchlistSymbols = []) {
  return rows.map((row) => {
    const symbol = row[0]
    const isWatchlisted = watchlistSymbols.includes(symbol) || watchlistSymbols.includes(symbol.replace('/', '-'))

    return [
      (
        <span className="asset-symbol" key={`inst-${symbol}`}>
          <span className="asset-badge">{row[5]}</span>
          <span>
            <b>{row[0]}</b>
            <br />
            <span style={{ color: '#718779', fontSize: 9 }}>{row[1]}</span>
          </span>
        </span>
      ),
      row[2],
      <span className={row[4]} key={`chg-${symbol}`}>{row[3]}</span>,
      (
        <div style={{ display: 'flex', gap: 6 }} key={`act-${symbol}`}>
          {onTrade ? (
            <button
              className="btn btn-primary"
              style={{ padding: '6px 11px', fontSize: 10 }}
              onClick={() => onTrade(symbol)}
            >
              Trade ↗
            </button>
          ) : (
            <button
              className="btn btn-outline"
              style={{ padding: '6px 9px' }}
              onClick={() => onToast('Select Trade to execute market order')}
            >
              Trade
            </button>
          )}

          {onToggleWatchlist && (
            <button
              className="btn btn-outline"
              style={{
                padding: '6px 9px',
                color: isWatchlisted ? 'var(--gold)' : '#74877b',
                borderColor: isWatchlisted ? 'var(--gold)' : '#2b4135',
              }}
              title={isWatchlisted ? 'Remove from watchlist' : 'Add to watchlist'}
              onClick={() => onToggleWatchlist(symbol)}
            >
              {isWatchlisted ? '★' : '☆'}
            </button>
          )}
        </div>
      ),
    ]
  })
}

export function MarketTable({
  rows = [],
  onToast = () => {},
  onTrade = null,
  onToggleWatchlist = null,
  watchlist = [],
}) {
  const [query, setQuery] = useState('')
  const [assetFilter, setAssetFilter] = useState('ALL')

  const watchlistSymbols = Array.isArray(watchlist)
    ? watchlist.map((w) => (typeof w === 'string' ? w : w.symbol))
    : []

  const filtered = rows.filter((row) => {
    const textMatch = query ? row.join(' ').toLowerCase().includes(query.toLowerCase()) : true
    if (!textMatch) return false
    if (assetFilter === 'ALL') return true
    if (assetFilter === 'WATCHLIST') return watchlistSymbols.includes(row[0]) || watchlistSymbols.includes(row[0].replace('/', '-'))
    if (assetFilter === 'CRYPTO') return row[0].includes('BTC') || row[0].includes('ETH') || row[1].toLowerCase().includes('bitcoin') || row[1].toLowerCase().includes('ethereum')
    if (assetFilter === 'EQUITY') return !row[0].includes('/') && !row[0].includes('-')
    if (assetFilter === 'FOREX') {
      // Only fiat currency pairs — a bare "/" also matches BTC/USD, ETH/USD, XAU/USD.
      const fiat = '(USD|EUR|GBP|JPY|AUD|CAD|CHF|NZD)'
      return new RegExp(`^${fiat}/${fiat}$`).test(row[0]) || row[0].endsWith('=X')
    }
    return true
  })

  return (
    <div className="app-card">
      <div className="section-row" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h3>Global Markets & Tradable Instruments</h3>
          <div className="muted-copy">Real-time institutional pricing and deep liquidity feeds.</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            id="marketSearch"
            placeholder="Search markets…"
            aria-label="Search markets"
            style={{ maxWidth: 180, background: '#08110f', color: '#fff', border: '1px solid #2b4135', padding: 10, font: '11px var(--font)' }}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, margin: '14px 0', flexWrap: 'wrap' }}>
        {['ALL', 'WATCHLIST', 'EQUITY', 'CRYPTO', 'FOREX'].map((filter) => (
          <button
            key={filter}
            type="button"
            className="btn btn-outline"
            style={{
              padding: '5px 10px',
              fontSize: 10,
              background: assetFilter === filter ? '#8be3b516' : 'transparent',
              borderColor: assetFilter === filter ? 'var(--green)' : 'var(--line)',
              color: assetFilter === filter ? 'var(--green)' : '#9eafa4',
            }}
            onClick={() => setAssetFilter(filter)}
          >
            {filter === 'WATCHLIST' ? `★ Watchlist (${watchlistSymbols.length})` : filter}
          </button>
        ))}
      </div>

      <div id="marketTable">
        <DataTable
          headings={["INSTRUMENT", "PRICE", "CHANGE", "ACTION"]}
          rows={renderMarketRows(filtered, onToast, onTrade, onToggleWatchlist, watchlistSymbols)}
        />
      </div>
      <div className="mobile-note">Swipe horizontally to view all columns.</div>
    </div>
  )
}

export function MarketRowsTable({
  rows = [],
  onToast = () => {},
  onTrade = null,
  onToggleWatchlist = null,
  watchlist = [],
}) {
  const watchlistSymbols = Array.isArray(watchlist)
    ? watchlist.map((w) => (typeof w === 'string' ? w : w.symbol))
    : []

  return (
    <DataTable
      headings={['INSTRUMENT', 'PRICE', 'CHANGE', 'ACTION']}
      rows={renderMarketRows(rows, onToast, onTrade, onToggleWatchlist, watchlistSymbols)}
    />
  )
}
