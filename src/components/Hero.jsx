import React from 'react'

export default function Hero({ onNavigate }) {
  return (
    <section className="hero section-wrap" id="home">
      <div className="hero-copy">
        <div className="eyebrow"><span className="eyebrow-line" /> A clearer way to explore the markets</div>
        <h1>Your next move<br />starts <span>here.</span></h1>
        <p className="hero-lede">Explore global markets with a trading experience designed around clarity, control, and confidence.</p>
        <div className="hero-actions">
          <button className="btn btn-primary btn-large" data-view="register" onClick={() => onNavigate('register')}>
            Open an account <span>↗</span>
          </button>
          <a className="btn btn-outline btn-large" href="#markets">Explore the markets <span>↓</span></a>
        </div>
        <div className="hero-proof">
          <div className="avatar-stack"><i>V</i><i>✦</i><i>↗</i></div>
          <span>A thoughtful experience for your next chapter.</span>
        </div>
      </div>
      <div className="hero-visual">
        <div className="visual-glow" />
        <div className="floating-label label-top"><span className="live-dot" /> LIVE MARKET OVERVIEW <b>REAL-TIME</b></div>
        <div className="chart-card">
          <div className="chart-top">
            <div><span className="muted small">PORTFOLIO VALUE</span><div className="chart-value">$24,680.50</div></div>
            <span className="positive">+4.28% ↗</span>
          </div>
          <div className="chart-period"><span className="selected">1D</span><span>1W</span><span>1M</span><span>3M</span><span>1Y</span></div>
          <svg className="hero-chart" viewBox="0 0 520 190" preserveAspectRatio="none" role="img" aria-label="Illustrative portfolio chart">
            <defs>
              <linearGradient id="fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#7ce5b2" stopOpacity="0.24" />
                <stop offset="100%" stopColor="#7ce5b2" stopOpacity="0" />
              </linearGradient>
            </defs>
            <g className="chart-grid"><path d="M0 30H520M0 70H520M0 110H520M0 150H520" /></g>
            <path d="M0 150 C24 140,30 154,48 130 S82 138,101 110 S135 128,157 95 S194 114,218 85 S248 104,274 67 S309 92,330 61 S365 76,389 52 S418 78,443 42 S482 57,520 19 L520 190 L0 190Z" fill="url(#fill)" />
            <path d="M0 150 C24 140,30 154,48 130 S82 138,101 110 S135 128,157 95 S194 114,218 85 S248 104,274 67 S309 92,330 61 S365 76,389 52 S418 78,443 42 S482 57,520 19" fill="none" stroke="#7ce5b2" strokeWidth="3" vectorEffect="non-scaling-stroke" />
            <circle cx="520" cy="19" r="5" fill="#7ce5b2" stroke="#0c1714" strokeWidth="3" />
          </svg>
          <div className="chart-axis"><span>09:00</span><span>11:00</span><span>13:00</span><span>15:00</span><span>Now</span></div>
          <div className="chart-bottom">
            <div><span className="muted small">AVAILABLE BALANCE</span><strong>$8,240.00</strong></div>
            <div><span className="muted small">OPEN POSITIONS</span><strong>04 <span className="tiny-arrow">↗</span></strong></div>
          </div>
        </div>
        <div className="floating-label label-bottom">
          <span className="mini-icon">✦</span>
          <div><strong>Stay in control</strong><small>Tools that put clarity first</small></div>
        </div>
        <div className="decor decor-one" /><div className="decor decor-two" />
      </div>
    </section>
  )
}
