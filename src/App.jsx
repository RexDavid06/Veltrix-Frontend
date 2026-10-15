import React, { useCallback, useEffect, useMemo, useState } from 'react'
import api, { API_ROOT, getWsUrl, setLogoutHandler } from './api'
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
import { DEFAULT_MARKET_ROWS, marketRowsFromApi, formatPrice, badgeFor } from './data'

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
  const [token, setToken] = useState(() => sessionStorage.getItem('veltrix_token') || localStorage.getItem('veltrix_token') || '')
  const [marketRows, setMarketRows] = useState(DEFAULT_MARKET_ROWS)
  const [marketLoading, setMarketLoading] = useState(true)
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
    if (AUTH_VIEWS.includes(next)) setAuthMode(next)
    setView(next)
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

  // Fetch market catalog from backend /api/instruments/ or fallback /api/market/
  useEffect(() => {
    let active = true

    api.get(`${API_ROOT}/instruments/`)
      .then((res) => {
        const instruments = Array.isArray(res.data) ? res.data : (res.data?.data || [])
        if (active && instruments.length) {
          setMarketRows(marketRowsFromApi(instruments))
        } else {
          return api.get(`${API_ROOT}/market/`).then((mRes) => {
            const quotes = mRes.data?.data || []
            if (active && quotes.length) setMarketRows(marketRowsFromApi(quotes))
          })
        }
      })
      .catch(() => {
        return api.get(`${API_ROOT}/market/`)
          .then((res) => {
            const quotes = res.data?.data || []
            if (active && quotes.length) setMarketRows(marketRowsFromApi(quotes))
          })
          .catch(async () => {
            try {
              const cg = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&per_page=10&page=1')
              if (!active) return
              if (cg.ok) {
                const data = await cg.json()
                const fallbackRows = data.map((c) => [
                  `${(c.symbol || '').toUpperCase()}/USD`,
                  c.name || '',
                  formatPrice(c.current_price || 0),
                  (c.price_change_percentage_24h >= 0 ? `+${c.price_change_percentage_24h.toFixed(2)}%` : `${c.price_change_percentage_24h?.toFixed(2)}%`),
                  (c.price_change_percentage_24h >= 0 ? 'positive' : 'negative'),
                  badgeFor(c.symbol || '', c.name || ''),
                ])
                setMarketRows(fallbackRows)
              }
            } catch (e) {
              // fallback remains DEFAULT_MARKET_ROWS
            }
          })
      })
      .finally(() => { if (active) setMarketLoading(false) })

    return () => { active = false }
  }, [])

  // Connect WebSocket to /ws/market/ for real-time live price ticks
  useEffect(() => {
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
        // graceful fallback to REST
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

  const reloadConversations = useCallback(async () => {
    if (!token) return
    try {
      const res = await api.get(`${API_ROOT}/conversations/`, authHeaders)
      setConversations(Array.isArray(res.data) ? res.data : [])
    } catch (e) {
      // conversations optional
    }
  }, [token, authHeaders])

  // Load authenticated data
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
    const email = String(form.get('email') || '').trim()
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
      showToast(authMode === 'register' ? 'Account created with $10,000 USD demo balance.' : 'Signed in to VELTRIX preview.')
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
    showToast('Preview only — no recovery email was sent.')
  }

  // Execute trade order on /api/orders/
  const handleExecuteOrder = async ({ symbol, side, quantity }) => {
    if (!token) {
      navigate('login')
      showToast('Please sign in to place orders.')
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
      showToast('Please sign in to top up demo balance.')
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
    try {
      const res = await api.post(`${API_ROOT}/support/`, { subject, message }, authHeaders)
      setTickets((prev) => [res.data, ...prev])
      showToast('Support ticket created on the backend.')
      return true
    } catch (error) {
      console.error('support create failed', error)
      showToast('Could not create the ticket.')
      return false
    }
  }

  // Support conversation creation on /api/conversations/
  const handleCreateConversation = async (subject, initial_message) => {
    try {
      const res = await api.post(
        `${API_ROOT}/conversations/`,
        { subject, initial_message },
        authHeaders
      )
      setConversations((prev) => [res.data, ...prev])
      showToast('Support conversation started.')
      return res.data
    } catch (error) {
      console.error('conversation create failed', error)
      showToast('Could not start the conversation.')
      return null
    }
  }

  // Send message to conversation /api/conversations/<id>/messages/
  const handleSendMessage = async (conversationId, content) => {
    try {
      const res = await api.post(
        `${API_ROOT}/conversations/${conversationId}/messages/`,
        { content },
        authHeaders
      )
      // Update local state with the new message
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

  const openTradeModal = (sym = 'AAPL') => {
    if (!token) {
      navigate('login')
      showToast('Please sign in to place demo trades.')
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
    onLogout: logout,
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

  const cashBalance = dashboard?.account?.cash_balance || 10000.0

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
      <LiveChat
        token={token}
        conversations={conversations}
        onCreateConversation={handleCreateConversation}
        onSendMessage={handleSendMessage}
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
