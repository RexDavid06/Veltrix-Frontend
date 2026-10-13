import React from 'react'

export default function SupportCTA({ onNavigate }) {
  return (
    <section className="support-cta section-wrap" id="support">
      <div className="support-orb">✳</div>
      <div>
        <div className="eyebrow"><span className="eyebrow-line" /> HERE TO HELP</div>
        <h2>Real questions deserve<br /><span>real people.</span></h2>
        <p>Explore the demo support centre and see how a customer conversation could work.</p>
      </div>
      <button className="btn btn-primary btn-large" data-view="portal-support" onClick={() => onNavigate('portal-support')}>
        Visit support centre <span>↗</span>
      </button>
    </section>
  )
}
