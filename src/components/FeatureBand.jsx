import React from 'react'

const ROWS = [
  { number: '01', title: 'One considered view', copy: 'Bring your watchlist, account overview, and market context into a single clear workspace.', symbol: '↗' },
  { number: '02', title: 'Information, not noise', copy: 'Thoughtful visual hierarchy helps make complex information easier to navigate.', symbol: '⌁' },
  { number: '03', title: 'Support with a human touch', copy: 'Clear support pathways designed to connect customers with the right help.', symbol: '✳' },
  { number: '04', title: 'Security by design', copy: 'Security and privacy are foundational requirements, not decorative promises.', symbol: '◇' },
]

export default function FeatureBand({ onNavigate }) {
  return (
    <section className="feature-band" id="experience">
      <div className="section-wrap feature-layout">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" /> BUILT AROUND YOU</div>
          <h2>More clarity.<br />Less <span>noise.</span></h2>
          <p className="feature-copy">A considered trading experience gives you room to focus on what matters: understanding the market, managing your activity, and making informed decisions.</p>
          <button className="btn btn-primary" data-view="portal" onClick={() => onNavigate('portal')}>
            Explore the platform <span>↗</span>
          </button>
        </div>
        <div className="feature-list">
          {ROWS.map((row) => (
            <div className="feature-row" key={row.number}>
              <span className="feature-number">{row.number}</span>
              <div><h3>{row.title}</h3><p>{row.copy}</p></div>
              <span className="feature-symbol">{row.symbol}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
