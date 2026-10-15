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
        <p>Premier multi-asset brokerage and institutional market execution platform.</p>
        <div className="footer-links">
          <a href="#markets">Markets</a>
          <a href="#experience">Platform</a>
          <a href="#support">Support</a>
          <a href="#" onClick={(event) => { event.preventDefault(); onNavigate('login') }}>Log in</a>
        </div>
      </div>
      <div className="section-wrap footer-bottom">
        <span>© 2026 VELTRIX Global Brokerage Ltd. All rights reserved.</span>
        <span>Authorized Global Brokerage · Regulated Financial Intermediary</span>
      </div>
      <div className="section-wrap risk-disclaimer">
        Risk Disclosure: Trading foreign exchange, digital assets, commodities, and equities involves significant risk of loss and is not suitable for all investors. High leverage can work against you as well as for you. Please carefully consider your investment objectives, level of experience, and risk appetite before entering into transactions with VELTRIX.
      </div>
    </footer>
  )
}
