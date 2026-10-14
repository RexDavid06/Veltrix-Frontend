    tone: 'positive',
    stroke: '#72d9a7',
    spark: 'M0 34 L20 37 L37 22 L54 28 L72 15 L91 24 L108 7 L126 16 L144 5 L161 13 L180 4 L200 8',
  },
  {
    icon: 'Au',
    iconClass: 'gold',
    asset: 'COMMODITIES',
    title: 'Gold / USD',
    tag: 'METAL',
    price: '$2,356.80',
    change: '−0.24%',
    tone: 'negative',
    stroke: '#d8b86c',
    spark: 'M0 9 L20 15 L37 11 L54 25 L72 17 L91 29 L108 19 L126 27 L144 23 L161 34 L180 25 L200 38',
  },
  {
    icon: '↗',
    iconClass: 'index',
    asset: 'INDICES',
    title: 'NASDAQ 100',
    tag: 'INDEX',
    price: '18,214.6',
    change: '+0.62%',
    tone: 'positive',
    stroke: '#72d9a7',
    spark: 'M0 38 L20 29 L37 34 L54 21 L72 26 L91 11 L108 18 L126 9 L144 16 L161 5 L180 12 L200 2',
  },
]

export default function MarketsSection({ onNavigate }) {
  return (
    <section className="section-wrap section-pad" id="markets">
      <div className="section-heading">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" /> THE WORLD IN VIEW</div>
          <h2>Find your place<br />in the <span>markets.</span></h2>
        </div>
        <div className="heading-side">
          <p>Explore a range of markets from one considered interface. All prices shown here are illustrative data.</p>
          <a className="text-link" href="#" data-view="portal" onClick={(event) => { event.preventDefault(); onNavigate('portal') }}>
            View dashboard <span>↗</span>
          </a>
        </div>
      </div>
      <div className="market-grid">
        {CARDS.map((card) => (
          <article className="market-card" key={card.title}>
            <div className={`market-icon ${card.iconClass}`}>{card.icon}</div>
            <div className="market-card-head">
              <div><span className="muted small">{card.asset}</span><h3>{card.title}</h3></div>
              <span className="market-tag">{card.tag}</span>
            </div>
            <div className="market-price">{card.price} <span className={card.tone}>{card.change}</span></div>
            <svg className="spark" viewBox="0 0 200 45" preserveAspectRatio="none">
              <path d={card.spark} fill="none" stroke={card.stroke} strokeWidth="2" />
            </svg>
            <div className="market-foot"><span>Illustrative price</span><span>View market ↗</span></div>
          </article>
        ))}
      </div>
      <p className="footnote">*Market hours vary by instrument and venue. Market names and values are for illustrative purposes and are not executable quotes or investment advice.</p>
    </section>
  )
}
