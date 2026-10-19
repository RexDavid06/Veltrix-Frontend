import React from 'react'

export default function SiteHeader({
  mobileOpen,
  onToggleNav,
  onCloseNav,
  onNavigate,
  authenticated,
  dashboardView = 'portal',
}) {
  return (
    <header className="site-header">
      <a
        className="brand"
        href="#home"
        aria-label="VELTRIX home"
        onClick={(event) => {
          event.preventDefault()
          onNavigate('home')
        }}
      >
        <span className="brand-mark">V</span>
        <span>VELTRIX</span>
      </a>
      <button
        className="mobile-toggle"
        id="mobileToggle"
        aria-label="Open navigation"
        aria-expanded={mobileOpen}
        onClick={onToggleNav}
      >
        ☰
      </button>
      <nav className={`main-nav ${mobileOpen ? 'open' : ''}`} id="mainNav">
        <a href="#markets" onClick={onCloseNav}>Markets</a>
        <a href="#experience" onClick={onCloseNav}>Platform</a>
        <a href="#accounts" onClick={onCloseNav}>Accounts</a>
        <a href="#learn" onClick={onCloseNav}>Education</a>
        <a href="#support" onClick={onCloseNav}>Support</a>
      </nav>
      <div className="header-actions">
        {authenticated ? (
          <button
            className="btn btn-primary"
            data-view={dashboardView}
            onClick={() => onNavigate(dashboardView)}
          >
            {dashboardView === 'admin' ? 'Admin console' : 'Dashboard'} <span>↗</span>
          </button>
        ) : (
          <>
            <button className="btn btn-quiet" data-view="login" onClick={() => onNavigate('login')}>Log in</button>
            <button className="btn btn-primary" data-view="register" onClick={() => onNavigate('register')}>
              Open an account <span>↗</span>
            </button>
          </>
        )}
      </div>
    </header>
  )
}
