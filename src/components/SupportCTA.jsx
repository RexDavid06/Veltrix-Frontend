import React from 'react'

export default function SupportCTA({ onNavigate, token }) {
  return (
    <section className="support-cta section-wrap" id="support">
      <div className="support-orb">✳</div>
      <div>
        <div className="eyebrow"><span className="eyebrow-line" /> HERE TO HELP</div>
        <h2>Real questions deserve<br /><span>real people.</span></h2>
        <p>Dedicated 24/7 institutional trading desk and experienced client support specialists ready to assist you worldwide.</p>
      </div>
      <button
        className="btn btn-primary btn-large"
        data-view="portal-support"
        onClick={() => onNavigate(token ? 'portal-support' : 'login')}
      >
        {token ? 'Contact Support Desk' : 'Sign in to Contact Support'} <span>↗</span>
      </button>
    </section>
  )
}
