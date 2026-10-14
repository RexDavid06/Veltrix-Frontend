import React, { useState } from 'react'
import DataTable from './DataTable'

export function renderMarketRows(rows, onToast) {
  return rows.map((row) => [
    (
      <span className="asset-symbol" key="instrument">
        <span className="asset-badge">{row[5]}</span>
        <span><b>{row[0]}</b><br /><span style={{ color: '#718779', fontSize: 9 }}>{row[1]}</span></span>
      </span>
    ),
    row[2],
    <span className={row[4]} key="change">{row[3]}</span>,
    (
      <button
        className="btn btn-outline"
        style={{ padding: '6px 9px' }}
        data-toast="Market action preview only"
        key="action"
        onClick={() => onToast('Market action preview only')}
      >
        View
      </button>
    ),
  ])
}

export function MarketTable({ rows = [], onToast = () => {} }) {
  const [query, setQuery] = useState('')
  const filtered = query
    ? rows.filter((row) => row.join(' ').toLowerCase().includes(query.toLowerCase()))
    : rows

  return (
    <div className="app-card">
      <div className="section-row">
        <div>
          <h3>Market watch</h3>
          <div className="muted-copy">Illustrative values, not executable quotes.</div>
        </div>
        <input
          id="marketSearch"
          placeholder="Search markets…"
          aria-label="Search markets"
          style={{ maxWidth: 180, background: '#08110f', color: '#fff', border: '1px solid #2b4135', padding: 10, font: '11px var(--font)' }}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <div id="marketTable">
        <DataTable headings={["INSTRUMENT", "PRICE", "CHANGE", "ACTION"]} rows={renderMarketRows(filtered, onToast)} />
      </div>
      <div className="mobile-note">Swipe horizontally to view all columns.</div>
    </div>
  )
}

export function MarketRowsTable({ rows = [], onToast = () => {} }) {
  return <DataTable headings={['INSTRUMENT', 'PRICE', 'CHANGE', 'ACTION']} rows={renderMarketRows(rows, onToast)} />
}
