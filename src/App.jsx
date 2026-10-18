import React, { useCallback, useEffect, useMemo, useState } from 'react'
import api, { API_ROOT, getStoredToken, getWsUrl, revokeStoredSession, setLogoutHandler, WS_ENABLED } from './api'
import DemoBanner from './components/DemoBanner'
import SiteHeader from './components/SiteHeader'
import Landing from './components/Landing'
import SiteFooter from './components/SiteFooter'
import LiveChat from './components/LiveChat'
import Toast from './components/Toast'
import AuthView from './components/AuthView'
import AppViews from './components/AppViews'
import AdminViews from './components/AdminViews'
import TradeModal from './components/TradeModal'
import TopUpModal from './components/TopUpModal'
import { badgeFor, formatPrice } from './data'
import {
  DEFAULT_LIVE_MARKETS,
  fetchLiveMarketQuotes,
  quoteToRow,
} from './services/marketFeed'

const AUTH_VIEWS = ['login', 'register', 'forgot', 'reset', 'verify']
const APP_VIEWS = [
  'portal', 'markets', 'portfolio', 'accounts', 'wallet', 'deposits',
  'withdrawals', 'transactions', 'kyc', 'portal-support', 'settings',
]
const ADMIN_VIEWS = [
  'admin', 'admin-customers', 'admin-kyc', 'admin-transactions',
  'admin-instruments', 'admin-support', 'admin-audit',
]

function readResetCreds() {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  const uid = params.get('reset_uid')
  const resetToken = params.get('reset_token')
  return uid && resetToken ? { uid, token: resetToken } : null
}

function readVerifyToken() {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get('verify_token')
}

function clearQueryParams(...names) {
  if (typeof window === 'undefined' || !window.history?.replaceState) return
  const url = new URL(window.location.href)
  names.forEach((name) => url.searchParams.delete(name))
  window.history.replaceState({}, '', url.pathname + (url.searchParams.toString() ? `?${url.searchParams}` : '') + url.hash)
}

function clearResetParams() {
  clearQueryParams('reset_uid', 'reset_token')
}

// Turn a DRF error response into a single human-readable string.
function extractApiError(error, fallback) {
  const data = error?.response?.data
  if (typeof data === 'string' && data.trim()) return data
  if (data && typeof data === 'object') {
    if (typeof data.detail === 'string') return data.detail
    if (typeof data.message === 'string') return data.message
    for (const key of ['email', 'password', 'new_password', 'uid', 'token', 'non_field_errors']) {
      const value = data[key]
      if (Array.isArray(value) && value.length) return String(value[0])
      if (typeof value === 'string' && value) return value
    }
  }
  if (!error?.response && error?.message === 'Network Error') {
    return 'Cannot reach the server. Please check your connection and try again.'
  }
  if (error?.message) return String(error.message)
  return fallback
}

function AccessDenied({ onNavigate, authenticated }) {
  return (
    <div className="section-wrap">
      <div className="form-card" style={{ textAlign: 'center' }}>
        <div className="eyebrow"><span className="eyebrow-line" /> RESTRICTED AREA</div>
        <h2>Access denied</h2>
        <p>This area is limited to authorized operations staff.</p>
        <button
          className="btn btn-primary"
          type="button"
          onClick={() => onNavigate(authenticated ? 'portal' : 'login')}
        >
          {authenticated ? 'Back to workspace' : 'Sign in'} <span>↗</span>
        </button>
      </div>
    </div>
  )
}

export default function App() {
  const initialResetCreds = readResetCreds()
  const initialVerifyToken = readVerifyToken()
  const initialAuthView = initialResetCreds ? 'reset' : initialVerifyToken ? 'verify' : 'home'
  const [view, setView] = useState(initialAuthView)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const [authMode, setAuthMode] = useState(initialAuthView === 'home' ? 'login' : initialAuthView)
  const [authError, setAuthError] = useState('')
  const [resetCreds, setResetCreds] = useState(initialResetCreds)
  const [verifyToken, setVerifyToken] = useState(initialVerifyToken)
  const [token, setToken] = useState(() => sessionStorage.getItem('veltrix_token') || localStorage.getItem('veltrix_token') || '')
  const [liveQuotes, setLiveQuotes] = useState(DEFAULT_LIVE_MARKETS)
  const [marketRows, setMarketRows] = useState(() => DEFAULT_LIVE_MARKETS.map(quoteToRow))
  const [marketLoading, setMarketLoading] = useState(false)
  const [dashboard, setDashboard] = useState(null)
  const [profile, setProfile] = useState(null)
  const [tickets, setTickets] = useState([])
  const [watchlist, setWatchlist] = useState([])
  const [conversations, setConversations] = useState([])

  // Modal states
  const [tradeModalOpen, setTradeModalOpen] = useState(false)
  const [tradeSymbol, setTradeSymbol] = useState('AAPL')
  const [topUpModalOpen, setTopUpModalOpen] = useState(false)

  const showToast = useCallback((message) => setToast({ id: Date.now(), message }), [])

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(timer)
  }, [toast])

  const navigate = useCallback((next) => {
    setMobileNavOpen(false)
    setAuthError('')
    // Reading the stored token (rather than state) keeps both directions
    // working: sign-out clears storage before navigating, and sign-in stores
    // the token before navigating to the dashboard.
    const stored = getStoredToken()
    // The workspace and admin areas are for signed-in users only.
    const isProtected = APP_VIEWS.includes(next) || ADMIN_VIEWS.includes(next)
    // Authenticated users have no business on the login/registration screens;
    // send them to their dashboard instead.
    const target = isProtected && !stored ? 'login' : stored && AUTH_VIEWS.includes(next) ? 'portal' : next
    if (AUTH_VIEWS.includes(target)) setAuthMode(target)
    setView(target)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const authHeaders = useMemo(
    () => ({ headers: { Authorization: token ? `Bearer ${token}` : undefined } }),
    [token]
  )

  const clearStoredTokens = useCallback(() => {
    try {
      sessionStorage.removeItem('veltrix_token')
      sessionStorage.removeItem('veltrix_refresh')
      localStorage.removeItem('veltrix_token')
      localStorage.removeItem('veltrix_refresh')
    } catch (e) {
      // ignore storage issues
    }
  }, [])

  const logout = useCallback((message = 'Signed out.') => {
    revokeStoredSession()
    clearStoredTokens()
    setToken('')
    setDashboard(null)
    setProfile(null)
    setTickets([])
    setWatchlist([])
    setConversations([])
    setAuthError(message)
    navigate('login')
    showToast(message)
  }, [clearStoredTokens, navigate, showToast])

  useEffect(() => {
    setLogoutHandler(logout)
  }, [logout])

  // Confirm an email address when the user lands from a verification link.
  useEffect(() => {
    if (!verifyToken) return undefined
    let active = true
    api.get(`${API_ROOT}/auth/verify/`, { params: { token: verifyToken } })
      .then(() => {
        if (!active) return
        clearQueryParams('verify_token')
        setVerifyToken(null)
        showToast('Email verified. You can sign in now.')
        navigate('login')
      })
      .catch((error) => {
        if (!active) return
        setAuthError(extractApiError(error, 'This verification link is invalid or has expired.'))
      })
    return () => { active = false }
  }, [verifyToken, navigate, showToast])

  // Fetch real-time live prices from free, accurate public feeds (Binance, Open Exchange Rates, Live Charts)
  useEffect(() => {
    let active = true

    const updateLivePrices = async () => {
      try {
        const quotes = await fetchLiveMarketQuotes()
        if (active && quotes && quotes.length) {
          setLiveQuotes(quotes)
          setMarketRows(quotes.map(quoteToRow))
          setMarketLoading(false)
        }
      } catch (err) {
        console.error('Failed to update live market quotes', err)
      }
    }

    updateLivePrices()
    const timer = setInterval(updateLivePrices, 15000)

    return () => {
      active = false
      clearInterval(timer)
    }
  }, [])

  // Connect WebSocket to /ws/market/ only when a WS endpoint is configured.
  // The backend does not ship a Channels routing layer, so we avoid repeated
  // failed sockets by requiring VITE_WS_URL to opt in.
  useEffect(() => {
    if (!WS_ENABLED) return undefined
    let ws = null
    try {
      const wsUrl = getWsUrl('/ws/market/')
      ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        try {
          ws.send(JSON.stringify({ action: 'ping' }))
        } catch (e) {
          // ignore
        }
      }

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data)
          if (payload.symbol && payload.price) {
            setMarketRows((prev) =>
              prev.map((row) => {
                if (row[0].toUpperCase() === payload.symbol.toUpperCase() || row[0].replace('/', '-').toUpperCase() === payload.symbol.toUpperCase()) {
                  const changePct = payload.change_percent || 0
                  return [
                    row[0],
                    row[1],
                    formatPrice(payload.price),
                    Number(changePct) >= 0 ? `+${Number(changePct).toFixed(2)}%` : `${Number(changePct).toFixed(2)}%`,
                    Number(changePct) >= 0 ? 'positive' : 'negative',
                    row[5],
                  ]
                }
                return row
              })
            )
          }
        } catch (e) {
          // non-json message
        }
      }

      ws.onerror = () => {
        // graceful fallback
      }
    } catch (e) {
      // WS unavailable
    }

    return () => {
      if (ws) {
        try { ws.close() } catch (e) { /* ignore */ }
      }
    }
  }, [])

  const reloadDashboard = useCallback(async () => {
    if (!token) return
    try {
      const res = await api.get(`${API_ROOT}/dashboard/`, authHeaders)
      setDashboard(res.data)
    } catch (e) {
      console.error('Failed to reload dashboard', e)
    }
  }, [token, authHeaders])

  const reloadWatchlist = useCallback(async () => {
    if (!token) return
    try {
      const res = await api.get(`${API_ROOT}/watchlist/`, authHeaders)
      setWatchlist(Array.isArray(res.data) ? res.data : [])
    } catch (e) {
      // watchlist optional
    }
  }, [token, authHeaders])

  // Load authenticated user data
  useEffect(() => {
    if (!token) {
      setDashboard(null)
      setProfile(null)
      setTickets([])
      setWatchlist([])
      setConversations([])
      return undefined
    }

    let active = true

    api.get(`${API_ROOT}/dashboard/`, authHeaders)
      .then((res) => { if (active) setDashboard(res.data) })
      .catch((error) => console.error('dashboard load failed', error))

    api.get(`${API_ROOT}/profile/`, authHeaders)
      .then((res) => { if (active) setProfile(res.data) })
      .catch((error) => console.error('profile load failed', error))

    api.get(`${API_ROOT}/support/`, authHeaders)
      .then((res) => { if (active) setTickets(res.data || []) })
      .catch((error) => console.error('support load failed', error))

    api.get(`${API_ROOT}/watchlist/`, authHeaders)
      .then((res) => { if (active) setWatchlist(Array.isArray(res.data) ? res.data : []) })
      .catch(() => {})

    api.get(`${API_ROOT}/conversations/`, authHeaders)
      .then((res) => { if (active) setConversations(Array.isArray(res.data) ? res.data : []) })
      .catch(() => {})

    return () => { active = false }
  }, [token, authHeaders])

  const handleAuth = async (event) => {
    event.preventDefault()
    setAuthError('')
    const form = new FormData(event.target)
    // Backend stores accounts with a lowercased/trimmed email as the username,
    // so normalize here for both registration and login (Django usernames are
    // case-sensitive).
    const email = String(form.get('email') || '').trim().toLowerCase()
    const password = String(form.get('password') || '')
    const fullName = String(form.get('fullName') || '').trim()
    const remember = Boolean(form.get('remember'))

    try {
      if (authMode === 'register') {
        const [first_name, ...rest] = fullName.split(' ')
        await api.post(`${API_ROOT}/auth/register/`, {
          email,
          password,
          first_name: first_name || email.split('@')[0],
          last_name: rest.join(' ') || '',
        })
      }

      // DRF SimpleJWT expects username field
      const loginResponse = await api.post(`${API_ROOT}/auth/token/`, { username: email, password })
      const access = loginResponse.data.access
      const refresh = loginResponse.data.refresh

      if (!access) throw new Error('No access token returned')

      try {
        sessionStorage.setItem('veltrix_token', access)
        if (refresh) sessionStorage.setItem('veltrix_refresh', refresh)

        if (remember) {
          localStorage.setItem('veltrix_token', access)
          if (refresh) localStorage.setItem('veltrix_refresh', refresh)
        } else {
          localStorage.removeItem('veltrix_token')
          localStorage.removeItem('veltrix_refresh')
        }
      } catch (err) {
        console.error('storage error', err)
      }

      setToken(access)
      showToast(authMode === 'register' ? 'Account registered successfully. Welcome to VELTRIX.' : 'Signed in to VELTRIX Brokerage.')
      navigate('portal')
    } catch (error) {
      setAuthError(extractApiError(error, 'Authentication failed. Check your details and try again.'))
    }
  }

  const handleForgot = async (event) => {
    event.preventDefault()
    setAuthError('')
    const form = new FormData(event.target)
    const email = String(form.get('email') || '').trim().toLowerCase()
    try {
      await api.post(`${API_ROOT}/auth/password-reset/`, { email })
      showToast('If that email is registered, a password reset link is on its way.')
      navigate('login')
    } catch (error) {
      setAuthError(extractApiError(error, 'Could not send the reset link. Please try again.'))
    }
  }

  const handleReset = async (event) => {
    event.preventDefault()
    setAuthError('')
    const form = new FormData(event.target)
    const newPassword = String(form.get('new_password') || '')
    const confirmPassword = String(form.get('confirm_password') || '')

    if (!resetCreds?.uid || !resetCreds?.token) {
      setAuthError('This reset link is invalid. Please request a new one.')
      return
    }

    if (newPassword !== confirmPassword) {
      setAuthError('The passwords do not match.')
      return
    }

    try {
      await api.post(`${API_ROOT}/auth/password-reset/confirm/`, {
        uid: resetCreds.uid,
        token: resetCreds.token,
        new_password: newPassword,
      })
      clearResetParams()
      setResetCreds(null)
      showToast('Password updated. Please sign in with your new password.')
      navigate('login')
    } catch (error) {
      setAuthError(extractApiError(error, 'This reset link is invalid or has expired. Please request a new one.'))
    }
  }

  // Execute trade order on /api/orders/
  const handleExecuteOrder = async ({ symbol, side, quantity }) => {
    if (!token) {
      navigate('login')
      showToast('Please sign in to execute orders.')
      return
    }

    const cleanSymbol = symbol.replace('/', '-')
    const res = await api.post(
      `${API_ROOT}/orders/`,
      { symbol: cleanSymbol, side, quantity: String(quantity) },
      authHeaders
    )

    await reloadDashboard()
    showToast(res.data.detail || `Order executed: ${side.toUpperCase()} ${quantity} ${cleanSymbol}`)
    return res.data
  }

  // Top up funds on /api/portfolio/topup/
  const handleTopUp = async (amount) => {
    if (!token) {
      navigate('login')
      showToast('Please sign in to deposit funds.')
      return
    }

    const res = await api.post(
      `${API_ROOT}/portfolio/topup/`,
      { amount: String(amount) },
      authHeaders
    )

    await reloadDashboard()
    showToast(res.data.detail || `Successfully topped up $${amount} USD`)
    return res.data
  }

  // Toggle watchlist item on /api/watchlist/
  const handleToggleWatchlist = async (symbol) => {
    if (!token) {
      navigate('login')
      showToast('Please sign in to save instruments to your watchlist.')
      return
    }

    const cleanSymbol = symbol.replace('/', '-')
    const isWatchlisted = watchlist.some((w) => w.symbol === cleanSymbol || w.symbol === symbol)

    try {
      if (isWatchlisted) {
        await api.delete(`${API_ROOT}/watchlist/${cleanSymbol}/`, authHeaders)
        showToast(`${cleanSymbol} removed from watchlist`)
      } else {
        await api.post(`${API_ROOT}/watchlist/`, { symbol: cleanSymbol }, authHeaders)
        showToast(`${cleanSymbol} added to watchlist ★`)
      }
      await reloadWatchlist()
    } catch (e) {
      console.error('Watchlist toggle failed', e)
    }
  }

  // Traditional ticket creation on /api/support/
  const handleCreateTicket = async ({ subject, message }) => {
    if (!token) {
      navigate('login')
      showToast('Please sign in to submit a support inquiry.')
      return false
    }

    const clientName = profile
      ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.username || 'Client'
      : 'Client'
    const accountRef = profile?.id ? `VX-${String(profile.id).padStart(3, '0')}` : 'VX-001'
    const clientEmail = profile?.email || ''

    const fullSubject = subject.includes(accountRef) ? subject : `[${accountRef} · ${clientName}] ${subject}`
    const detailedMessage = message.includes('CLIENT ACCOUNT DETAILS')
      ? message
      : `[CLIENT ACCOUNT DETAILS]\nAccount: ${accountRef}\nHolder: ${clientName}\nEmail: ${clientEmail}\nKYC: ${profile?.is_verified ? 'Verified' : 'Pending Review'}\n\n[MESSAGE]\n${message}`

    try {
      const res = await api.post(`${API_ROOT}/support/`, { subject: fullSubject, message: detailedMessage }, authHeaders)
      const ticketItem = {
        ...res.data,
        client_name: clientName,
        client_email: clientEmail,
        account_ref: accountRef,
      }
      setTickets((prev) => [ticketItem, ...prev])
      showToast('Support ticket dispatched to admin desk.')
      return true
    } catch (error) {
      console.error('support create failed', error)
      showToast('Could not create ticket.')
      return false
    }
  }

  // Support conversation creation on /api/conversations/
  const handleCreateConversation = async (subject, initial_message) => {
    if (!token) {
      navigate('login')
      showToast('Please sign in to start a support conversation.')
      return null
    }

    const clientName = profile
      ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.username || 'Client'
      : 'Client'
    const accountRef = profile?.id ? `VX-${String(profile.id).padStart(3, '0')}` : 'VX-001'
    const clientEmail = profile?.email || ''

    const fullSubject = subject.includes(accountRef) ? subject : `[${accountRef} · ${clientName}] ${subject}`
    const detailedMessage = initial_message.includes('CLIENT ACCOUNT DETAILS')
      ? initial_message
      : `[CLIENT ACCOUNT DETAILS]\nAccount: ${accountRef}\nHolder: ${clientName}\nEmail: ${clientEmail}\nKYC: ${profile?.is_verified ? 'Verified' : 'Pending Review'}\n\n[INQUIRY]\n${initial_message}`

    try {
      const res = await api.post(
        `${API_ROOT}/conversations/`,
        { subject: fullSubject, initial_message: detailedMessage },
        authHeaders
      )
      const convoItem = {
        ...res.data,
        client_name: clientName,
        client_email: clientEmail,
        account_ref: accountRef,
      }
      setConversations((prev) => [convoItem, ...prev])
      showToast('Support conversation opened with admin desk.')
      return convoItem
    } catch (error) {
      console.error('conversation create failed', error)
      showToast('Could not start conversation.')
      return null
    }
  }

  // Send message to conversation /api/conversations/<id>/messages/
  const handleSendMessage = async (conversationId, content) => {
    if (!token) {
      navigate('login')
      showToast('Please sign in to send messages.')
      return null
    }
    try {
      const res = await api.post(
        `${API_ROOT}/conversations/${conversationId}/messages/`,
        { content },
        authHeaders
      )
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === conversationId) {
            const existingMessages = c.messages || []
            return {
              ...c,
              messages: [...existingMessages, res.data],
              last_message: res.data,
            }
          }
          return c
        })
      )
      return res.data
    } catch (error) {
      console.error('Send message failed', error)
      showToast('Could not send message.')
      return null
    }
  }

  // Resolve conversation on /api/conversations/<id>/resolve/
  const handleResolveConversation = async (conversationId) => {
    try {
      await api.post(`${API_ROOT}/conversations/${conversationId}/resolve/`, {}, authHeaders)
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, is_active: false } : c))
      )
      showToast('Support conversation marked as resolved.')
    } catch (e) {
      console.error('Failed to resolve conversation', e)
    }
  }

  // Reopen conversation on /api/conversations/<id>/reopen/
  const handleReopenConversation = async (conversationId) => {
    try {
      await api.post(`${API_ROOT}/conversations/${conversationId}/reopen/`, {}, authHeaders)
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, is_active: true } : c))
      )
      showToast('Support conversation reopened.')
    } catch (e) {
      console.error('Failed to reopen conversation', e)
    }
  }

  const openTradeModal = (sym = 'AAPL') => {
    if (!token) {
      navigate('login')
      showToast('Please sign in to trade instruments.')
      return
    }
    setTradeSymbol(sym)
    setTradeModalOpen(true)
  }

  const openTopUpModal = () => {
    if (!token) {
      navigate('login')
      showToast('Please sign in to manage funds.')
      return
    }
    setTopUpModalOpen(true)
  }

  const isHome = view === 'home'
  const isAdmin = ADMIN_VIEWS.includes(view)

  const ctx = {
    marketRows,
    liveQuotes,
    marketLoading,
    dashboard,
    profile,
    tickets,
    watchlist,
    conversations,
    token,
    onNavigate: navigate,
    showToast,
    onOpenTrade: openTradeModal,
    onOpenTopUp: openTopUpModal,
    onExecuteOrder: handleExecuteOrder,
    onTopUp: handleTopUp,
    onToggleWatchlist: handleToggleWatchlist,
    onCreateTicket: handleCreateTicket,
    onCreateConversation: handleCreateConversation,
    onSendMessage: handleSendMessage,
    onResolveConversation: handleResolveConversation,
    onReopenConversation: handleReopenConversation,
    onLogout: logout,
  }

  const isAdminUser = Boolean(profile && (profile.is_staff || profile.role === 'admin'))

  let appContent = null
  if (isAdmin) {
    if (token && !profile) {
      appContent = <div className="section-wrap"><div className="form-card"><p>Loading…</p></div></div>
    } else if (isAdminUser) {
      appContent = <AdminViews view={view} ctx={ctx} onNavigate={navigate} showToast={showToast} />
    } else {
      appContent = <AccessDenied onNavigate={navigate} authenticated={Boolean(token)} />
    }
  } else if (APP_VIEWS.includes(view)) {
    appContent = token ? (
      <AppViews view={view} ctx={ctx} />
    ) : (
      // Never render the workspace to an anonymous visitor.
      <div className="section-wrap">
        <AuthView
          mode="login"
          onSubmit={handleAuth}
          error={authError || 'Please sign in to access your dashboard.'}
          onNavigate={navigate}
        />
      </div>
    )
  } else if (token && AUTH_VIEWS.includes(view)) {
    // Never render the login/register forms to an authenticated user.
    appContent = <AppViews view="portal" ctx={ctx} />
  } else {
    appContent = (
      <div className="section-wrap">
        <AuthView
          mode={authMode}
          onSubmit={authMode === 'forgot' ? handleForgot : authMode === 'reset' ? handleReset : handleAuth}
          error={authError}
          onNavigate={navigate}
        />
      </div>
    )
  }

  const cashBalance = dashboard?.account?.cash_balance || 0.0

  return (
    <>
      {/* Banner is removed from the first page (landing / home) */}
      {!isHome && <DemoBanner />}

      <SiteHeader
        mobileOpen={mobileNavOpen}
        onToggleNav={() => setMobileNavOpen((open) => !open)}
        onCloseNav={() => setMobileNavOpen(false)}
        onNavigate={navigate}
        authenticated={Boolean(token)}
      />
      <main id="publicSite" className={isHome ? '' : 'hidden'}>
        <Landing onNavigate={navigate} quotes={liveQuotes} token={token} />
      </main>
      <main id="appView" className={`app-view ${isHome ? 'hidden' : ''}`}>
        {!isHome && appContent}
      </main>
      {isHome && <SiteFooter onNavigate={navigate} />}
      <LiveChat
        token={token}
        profile={profile}
        conversations={conversations}
        onCreateConversation={handleCreateConversation}
        onSendMessage={handleSendMessage}
        onNavigate={navigate}
      />
      <Toast message={toast?.message} />

      <TradeModal
        isOpen={tradeModalOpen}
        onClose={() => setTradeModalOpen(false)}
        initialSymbol={tradeSymbol}
        onExecuteOrder={handleExecuteOrder}
        cashBalance={cashBalance}
      />

      <TopUpModal
        isOpen={topUpModalOpen}
        onClose={() => setTopUpModalOpen(false)}
        onTopUp={handleTopUp}
        currentBalance={cashBalance}
      />
    </>
  )
}
