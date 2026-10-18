import React from 'react'

const ACCOUNTS = [
  {
    label: '01 / RETAIL',
    name: 'Essential',
    copy: 'Engineered for self-directed traders seeking ultra-low spreads and fast STP execution.',
    items: ['Real-time market execution', 'Standard multi-asset watchlist', 'Full analytical tooling'],
    featured: false,
  },
  {
    label: '02 / PROFESSIONAL',
    name: 'Advanced',
    copy: 'Expanded liquidity depth, reduced commissions, and comprehensive order types.',
    items: ['Everything in Essential', 'Institutional chart layouts', 'Priority order execution'],
    featured: true,
  },
  {
    label: '03 / INSTITUTIONAL',
    name: 'Prime',
    copy: 'Tailored solutions for fund managers, high-volume desks, and corporate entities.',
    items: ['Dedicated account director', 'Direct market access (DMA)', 'Custom API integrations'],
    featured: false,
  },
]

export default function AccountsSection({ onNavigate, token }) {
  return (
    <section className="section-wrap section-pad" id="accounts">
      <div className="center-heading">
        <div className="eyebrow"><span className="eyebrow-line" /> YOUR TRADING TIERS</div>
        <h2>Accounts engineered for <span>performance.</span></h2>
        <p>Choose the account tier tailored to your trading style, from active retail execution to multi-currency institutional prime accounts.</p>
      </div>
      <div className="account-grid">
        {ACCOUNTS.map((account) => (
          <article className={`account-card ${account.featured ? 'account-featured' : ''}`} key={account.name}>
            <span className="account-label">{account.label}</span>
            {account.featured && <div className="popular-pill">MOST POPULAR</div>}
            <h3>{account.name}</h3>
            <p>{account.copy}</p>
            <ul>
              {account.items.map((item) => <li key={item}>{item}</li>)}
            </ul>
            <button
              className={`btn ${account.featured ? 'btn-primary' : 'btn-outline'} full`}
              data-view={token ? 'portal' : 'register'}
              onClick={() => onNavigate(token ? 'portal' : 'register')}
            >
              {token ? 'View Dashboard' : 'Open Account'} <span>↗</span>
            </button>
          </article>
        ))}
      </div>
    </section>
  )
}
