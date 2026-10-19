import React from 'react'
import { ADMIN_ITEMS, NAV_ITEMS } from '../data'

export default function AppSidebar({ active, admin = false, onNavigate, onLogout }) {
  const items = admin ? ADMIN_ITEMS : NAV_ITEMS
  let lastGroup = ''

  return (
    <aside className="app-sidebar">
      <a className="brand" href="#" data-view="home" onClick={(event) => { event.preventDefault(); onNavigate('home') }}>
        <span className="brand-mark">V</span><span>VELTRIX</span>
      </a>
      {items.map(([label, view, icon, group]) => {
        const groupLabel = group !== lastGroup ? <div className="sidebar-title" key={`${group}-title`}>{group}</div> : null
        lastGroup = group
        return (
          <React.Fragment key={view}>
            {groupLabel}
            <button
              className={`side-link ${active === view ? 'active' : ''}`}
              data-view={view}
              onClick={() => onNavigate(view)}
            >
              <span className="nav-icon">{icon}</span>{label}
            </button>
          </React.Fragment>
        )
      })}
      <div className="sidebar-title">{admin ? 'ADMINISTRATOR' : 'CLIENT ACCOUNT'}</div>
      <button
        className="side-link"
        data-view="login"
        onClick={() => (onLogout ? onLogout() : onNavigate('login'))}
      >
        <span className="nav-icon">↪</span>Sign out
      </button>
    </aside>
  )
}
