import React from 'react'

export default function TickerStrip({ quotes = [] }) {
  const displayItems = quotes.length > 0
    ? quotes.slice(0, 6).map((q) => ({
        label: q.symbol,
        value: q.priceFormatted,
        change: q.changeText,
        tone: q.tone,
      }))
    : [
        { label: 'EUR/USD', value: '1.1218', change: '+0.22%', tone: 'positive' },
        { label: 'BTC/USD', value: '$81,259.58', change: '+1.45%', tone: 'positive' },
        { label: 'GOLD', value: '$4,165.40', change: '−0.18%', tone: 'negative' },
        { label: 'NASDAQ', value: '26,692.87', change: '+0.62%', tone: 'positive' },
        { label: 'GBP/USD', value: '1.3225', change: '+0.12%', tone: 'positive' },
      ]

  return (
    <section className="ticker-strip">
      <div className="ticker-intro">MARKET SNAPSHOT <span>LIVE</span></div>
      {displayItems.map((t) => (
        <div className="ticker-item" key={t.label}>
          <span>{t.label}</span>
          <b>{t.value}</b>
          <em className={t.tone}>{t.change}</em>
        </div>
      ))}
    </section>
  )
}
