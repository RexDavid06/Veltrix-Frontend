import React from 'react'

const TICKERS = [
  { label: 'EUR/USD', value: '1.0842', change: '+0.18%', tone: 'positive' },
  { label: 'BTC/USD', value: '$67,420', change: '+1.42%', tone: 'positive' },
  { label: 'GOLD', value: '$2,356.80', change: '−0.24%', tone: 'negative' },
  { label: 'NASDAQ', value: '18,214.6', change: '+0.62%', tone: 'positive' },
]

export default function TickerStrip() {
  return (
    <section className="ticker-strip">
      <div className="ticker-intro">MARKET SNAPSHOT <span>DEMO</span></div>
      {TICKERS.map((t) => (
        <div className="ticker-item" key={t.label}>
          <span>{t.label}</span>
          <b>{t.value}</b>
          <em className={t.tone}>{t.change}</em>
        </div>
      ))}
    </section>
  )
}
