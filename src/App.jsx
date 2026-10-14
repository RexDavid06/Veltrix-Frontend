import React, { useCallback, useEffect, useMemo, useState, useContext } from 'react'
import api from './api'
import DemoBanner from './components/DemoBanner'
import SiteHeader from './components/SiteHeader'
import Landing from './components/Landing'
import SiteFooter from './components/SiteFooter'
import LiveChat from './components/LiveChat'
import Toast from './components/Toast'
import AuthView from './components/AuthView'
import AppViews from './components/AppViews'
import AdminViews from './components/AdminViews'
import { DEFAULT_MARKET_ROWS, marketRowsFromApi } from './data'
import { AuthContext } from './contexts/AuthContext'

const AUTH_VIEWS = ['login', 'register', 'forgot']
const APP_VIEWS = [
  'portal', 'markets', 'portfolio', 'accounts', 'wallet', 'deposits',
  'withdrawals', 'transactions', 'kyc', 'portal-support', 'settings',
]
const ADMIN_VIEWS = ['admin', 'admin-customers', 'admin-kyc', 'admin-transactions', 'admin-support', 'admin-audit']

export default function App() {
  const [view, setView] = useState('home')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const [authMode, setAuthMode] = useState('login')
  const [authError, setAuthError] = useState('')
  const [marketRows, setMarketRows] = useState(DEFAULT_MARKET_ROWS)
  const [marketLoading, setMarketLoading] = useState(true)
  const [dashboard, setDashboard] = useState(null)
  const [tickets, setTickets] = useState([])

  const { token, login, register, logout, profile } = useContext(AuthContext)

  const showToast = useCallback((message) => setToast({ id: Date.now(), message }), [])

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(timer)
  }, [toast])

  const navigate = useCallback((next) => {
    setMobileNavOpen(false)
    setAuthError('')
    if (AUTH_VIEWS.includes(next)) setAuthMode(next)
    setView(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  useEffect(() => {
    let active = true
    api.get('/market/')
      .then((res) => {
        const quotes = res.data?.data || []
        if (active && quotes.length) setMarketRows(marketRowsFromApi(quotes))
      })
      .catch((error) => {
        console.error('market load failed', error)
      })
      .finally(() => { if (active) setMarketLoading(false) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!token) {
      setDashboard(null)
      setTickets([])
      return undefined
    }
    let active = true
    api.get('/dashboard/')
      .then((res) => { if (active) setDashboard(res.data) })
      .catch((error) => console.error('dashboard load failed', error))
    api.get('/support/')
      .then((res) => { if (active) setTickets(res.data || []) })
      .catch((error) => console.error('support load failed', error))
    return () => { active = false }
  }, [token])

  const handleAuth = async (event) => {
    event.preventDefault()
    setAuthError('')
    const form = new FormData(event.target)
    const email = String(form.get('email') || '').trim()
    const password = String(form.get('password') || '')
    const fullName = String(form.get('fullName') || '').trim()
    const remember = Boolean(form.get('remember'))

    try {
      if (authMode === 'register') {
        const [first_name, ...rest] = fullName.split(' ')
        await register({ email, password, first_name, last_name: rest.join(' '), remember })
      } else {
        await login({ email, password, remember })
      }
      showToast(authMode === 'register' ? 'Demo account created. Welcome to VELTRIX.' : 'Signed in to the VELTRIX demo.')
      navigate('portal')
    } catch (error) {
      const data = error?.response?.data
      setAuthError(
        data?.detail
        || data?.message
        || (Array.isArray(data?.email) ? data.email[0] : null)
        || (error?.message ? String(error.message) : 'Authentication failed. Check your details and try again.')
      )
    }
  }

  const handleForgot = (event) => {
    event.preventDefault()
    showToast('Demo only — no recovery email was sent.')
  }

  const handleCreateTicket = async ({ subject, message }) => {
    try {
      const res = await api.post('/support/', { subject, message })
      setTickets((prev) => [res.data, ...prev])
      showToast('Demo ticket created on the backend.')
      return true
    } catch (error) {
      console.error('support create failed', error)
      showToast('Could not create the demo ticket.')
      return false
    }
  }

  const isHome = view === 'home'
  const isAdmin = ADMIN_VIEWS.includes(view)

  const ctx = {
    marketRows,
    marketLoading,
    dashboard,
    profile,
    tickets,
    token,
    onNavigate: navigate,
    showToast,
    onCreateTicket: handleCreateTicket,
    logout,
  }

  let appContent = null
  if (isAdmin) {
    appContent = <AdminViews view={view} onNavigate={navigate} showToast={showToast} />
  } else if (APP_VIEWS.includes(view)) {
    appContent = <AppViews view={view} ctx={ctx} />
  } else {
    appContent = (
      <div className="section-wrap">
        <AuthView
          mode={authMode}
          onSubmit={authMode === 'forgot' ? handleForgot : handleAuth}
          error={authError}
          onNavigate={navigate}
        />
      </div>
    )
  }

  return (
    <>
      <DemoBanner />
      <SiteHeader
        mobileOpen={mobileNavOpen}
        onToggleNav={() => setMobileNavOpen((open) => !open)}
        onCloseNav={() => setMobileNavOpen(false)}
        onNavigate={navigate}
      />
      <main id="publicSite" className={isHome ? '' : 'hidden'}>
        <Landing onNavigate={navigate} />
      </main>
      <main id="appView" className={`app-view ${isHome ? 'hidden' : ''}`}>
        {!isHome && appContent}
      </main>
      {isHome && <SiteFooter onNavigate={navigate} />}
      <LiveChat />
      <Toast message={toast?.message} />
    </>
  )
}
