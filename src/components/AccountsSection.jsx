import React from 'react'

const ACCOUNTS = [
  {
    label: '01 / EXPLORE',
    name: 'Essential',
    copy: 'For customers who value a clear, straightforward starting point.',
    items: ['Account overview', 'Market watchlist', 'Learning resources'],
    featured: false,
  },
  {
    label: '02 / FLEXIBLE',
    name: 'Advanced',
    copy: 'More workspace tools for a more detailed market view.',
    items: ['Everything in Essential', 'Expanded chart layouts', 'Custom watchlists'],
    featured: true,
  },
  {
    label: '03 / PERSONAL',
    name: 'Dedicated',
    copy: 'A concept for customers who need a more guided service.',
    items: ['Account overview', 'Support ticket history', 'Configurable preferences'],
    featured: false,
  },
]

export default function AccountsSection({ onNavigate }) {
  return (
    <section className="section-wrap section-pad" id="accounts">
      <div className="center-heading">
        <div className="eyebrow"><span className="eyebrow-line" /> YOUR STARTING POINT</div>
        <h2>An account for your <span>journey.</span></h2>
        <p>Explore a sample account layout. Terms, fees, eligibility, and availability must be confirmed for the actual business before launch.</p>
      </div>
      <div className="account-grid">
        {ACCOUNTS.map((account) => (
          <article className={`account-card ${account.featured ? 'account-featured' : ''}`} key={account.name}>
            <span className="account-label">{account.label}</span>
            {account.featured && <div className="popular-pill">SAMPLE OPTION</div>}
            <h3>{account.name}</h3>
            <p>{account.copy}</p>
            <ul>
              {account.items.map((item) => <li key={item}>{item}</li>)}
            </ul>
            <button
              className={`btn ${account.featured ? 'btn-primary' : 'btn-outline'} full`}
              data-view="register"
              onClick={() => onNavigate('register')}
            >
              Explore account <span>↗</span>
            </button>
          </article>
        ))}
      </div>
    </section>
  )
}
