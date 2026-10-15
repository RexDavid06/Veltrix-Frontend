import React from 'react'

export default function MarketsSection({ onNavigate, quotes = [] }) {
  // Find live quote matches or fallback to default
  const getQuote = (sym, fallbackPrice, fallbackChange, fallbackTone) => {
    const found = quotes.find((q) => q.symbol === sym || q.symbol.replace('/', '-') === sym)
    if (found) {
      return {
        price: found.priceFormatted,
        change: found.changeText,
        tone: found.tone,
        stroke: found.tone === 'positive' ? '#72d9a7' : '#d8b86c',
      }
    }
    return {
      price: fallbackPrice,
      change: fallbackChange,
      tone: fallbackTone,
      stroke: fallbackTone === 'positive' ? '#72d9a7' : '#d8b86c',
    }
  }

  const eur = getQuote('EUR/USD', '1.1218', '+0.22%', 'positive')
  const btc = getQuote('BTC/USD', '$81,259.58', '+1.45%', 'positive')
  const gold = getQuote('XAU/USD', '$4,165.40', '−0.18%', 'negative')
  const nasdaq = getQuote('NAS100', '26,692.87', '+0.62%', 'positive')

  const cards = [
    {
      icon: '€',
      iconClass: '',
      asset: 'CURRENCIES',
      title: 'EUR / USD',
      tag: 'FOREX',
      price: eur.price,
      change: eur.change,
      tone: eur.tone,
      stroke: eur.stroke,
      spark: 'M0 24 L20 20 L37 28 L54 18 L72 22 L91 14 L108 19 L126 10 L144 14 L161 8 L180 12 L200 4',
    },
    {
      icon: '₿',
      iconClass: 'bitcoin',
      asset: 'DIGITAL ASSETS',
      title: 'Bitcoin / USD',
      tag: 'CRYPTO',
      price: btc.price,
      change: btc.change,
      tone: btc.tone,
      stroke: btc.stroke,
      spark: 'M0 34 L20 37 L37 22 L54 28 L72 15 L91 24 L108 7 L126 16 L144 5 L161 13 L180 4 L200 8',
    },
    {
      icon: 'Au',
      iconClass: 'gold',
      asset: 'COMMODITIES',
      title: 'Gold / USD',
      tag: 'METAL',
      price: gold.price,
      change: gold.change,
      tone: gold.tone,
      stroke: gold.stroke,
      spark: 'M0 9 L20 15 L37 11 L54 25 L72 17 L91 29 L108 19 L126 27 L144 23 L161 34 L180 25 L200 38',
    },
    {
      icon: '↗',
      iconClass: 'index',
      asset: 'INDICES',
      title: 'NASDAQ 100',
      tag: 'INDEX',
      price: nasdaq.price,
      change: nasdaq.change,
      tone: nasdaq.tone,
      stroke: nasdaq.stroke,
      spark: 'M0 38 L20 29 L37 34 L54 21 L72 26 L91 11 L108 18 L126 9 L144 16 L161 5 L180 12 L200 2',
    },
  ]

  return (
    <section className="section-wrap section-pad" id="markets">
      <div className="section-heading">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" /> THE WORLD IN VIEW</div>
          <h2>Find your place<br />in the <span>markets.</span></h2>
        </div>
        <div className="heading-side">
          <p>Explore global markets with live, accurate prices across currencies, crypto, commodities, and equities.</p>
          <a className="text-link" href="#" data-view="portal" onClick={(event) => { event.preventDefault(); onNavigate('portal') }}>
            View dashboard <span>↗</span>
          </a>
        </div>
      </div>
      <div className="market-grid">
        {cards.map((card) => (
          <article
            className="market-card"
            key={card.title}
            style={{ cursor: 'pointer' }}
            onClick={() => onNavigate('portal')}
          >
            <div className={`market-icon ${card.iconClass}`}>{card.icon}</div>
            <div className="market-card-head">
              <div><span className="muted small">{card.asset}</span><h3>{card.title}</h3></div>
              <span className="market-tag">{card.tag}</span>
            </div>
            <div className="market-price">{card.price} <span className={card.tone}>{card.change}</span></div>
            <svg className="spark" viewBox="0 0 200 45" preserveAspectRatio="none">
              <path d={card.spark} fill="none" stroke={card.stroke} strokeWidth="2" />
            </svg>
            <div className="market-foot"><span>Live quote</span><span>Trade instrument ↗</span></div>
          </article>
        ))}
      </div>
      <p className="footnote">*Market prices update in real-time. Live feeds sourced from global market data networks and verified public tickers.</p>
    </section>
  )
}
