import React from 'react'

export default function SiteFooter({ onNavigate }) {
  return (
    <footer className="site-footer">
      <div className="section-wrap footer-top">
        <a
          className="brand"
          href="#home"
          onClick={(event) => { event.preventDefault(); onNavigate('home') }}
        >
          <span className="brand-mark">V</span><span>VELTRIX</span>
        </a>
        <p>A considered platform concept for exploring the markets.</p>
        <div className="footer-links">
          <a href="#markets">Markets</a>
          <a href="#experience">Platform</a>
          <a href="#support">Support</a>
          <a href="#" onClick={(event) => { event.preventDefault(); onNavigate('login') }}>Log in</a>
        </div>
      </div>
      <div className="section-wrap footer-bottom">
        <span>© 2026 VELTRIX · Concept website</span>
        <span>Demo only · Not a financial service offer</span>
      </div>
      <div className="section-wrap risk-disclaimer">
        Risk disclosure: Trading and investing involve risk and may not be suitable for everyone. You may lose some or all of your invested capital. This concept website is not a licensed brokerage service, does not provide financial advice, and does not execute trades or process payments.
      </div>
    </footer>
  )
}
