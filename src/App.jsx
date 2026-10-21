import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { demoTopUpEnabled } from './flags'
import {
  APP_VIEWS,
  AUTH_VIEWS,
  homeFor,
  isAdminView,
  isProtectedView,
  pathFor,
  resolveAdminAccess,
  viewForPath,
} from './routing'
import {
  DEFAULT_LIVE_MARKETS,
  fetchLiveMarketQuotes,
  quoteToRow,
} from './services/marketFeed'

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

// The SPA keeps its views in the URL so a reload (or a shared link) restores
// the same screen — including /admin for administrators.
function readInitialView(resetCreds, verifyToken) {
  if (resetCreds) return 'reset'
  if (verifyToken) return 'verify'
  if (typeof window === 'undefined' || !window.location) return 'home'
  return viewForPath(window.location.pathname)
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
  const initialAuthView = readInitialView(initialResetCreds, initialVerifyToken)
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
  // 'idle' (signed out) | 'loading' | 'ready' | 'error' — the admin area uses
  // this to distinguish "still resolving" from "known non-admin".
  const [profileStatus, setProfileStatus] = useState(() => (token ? 'loading' : 'idle'))
  // Read through a ref inside navigate so navigation stays stable and does not
  // re-create every downstream callback whenever the profile object changes.
  const profileRef = useRef(null)
  const [tickets, setTickets] = useState([])
  const [watchlist, setWatchlist] = useState([])
  const [conversations, setConversations] = useState([])
  // Highest unread total seen so far, so a background poll can raise a toast
  // exactly once per newly-arrived message instead of on every refresh.
  const unreadSeenRef = useRef(0)
  const unreadSeededRef = useRef(false)

  // Modal states
  const [tradeModalOpen, setTradeModalOpen] = useState(false)
  const [tradeSymbol, setTradeSymbol] = useState('AAPL')
  const [topUpModalOpen, setTopUpModalOpen] = useState(false)
  const [liveChatOpen, setLiveChatOpen] = useState(false)

  const showToast = useCallback((message) => setToast({ id: Date.now(), message }), [])

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(timer)
  }, [toast])

  useEffect(() => { profileRef.current = profile }, [profile])

  const navigate = useCallback((next) => {
    setMobileNavOpen(false)
    setAuthError('')
    // Reading the stored token (rather than state) keeps both directions
    // working: sign-out clears storage before navigating, and sign-in stores
    // the token before navigating to the dashboard.
    const stored = getStoredToken()
    // The workspace and admin areas are for signed-in users only.
    const isProtected = isProtectedView(next)
    // Authenticated users have no business on the login/registration screens;
    // send them to the dashboard matching their role instead.
    const target = isProtected && !stored ? 'login' : stored && AUTH_VIEWS.includes(next) ? homeFor(profileRef.current) : next
    if (AUTH_VIEWS.includes(target)) setAuthMode(target)
    // Keep the address bar in sync so reloads and shared links reopen the
    // same screen. Failures here must never block navigation.
    const path = pathFor(target)
    try {
      if (path && typeof window !== 'undefined' && window.history) {
        const current = `${window.location.pathname}${window.location.search}${window.location.hash}`
        if (current !== path) window.history.pushState({ veltrixView: target }, '', path)
      }
    } catch (error) {
      console.error('history update failed', error)
    }
    setView(target)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  // Browser back/forward buttons drive the same view state as in-app links.
  useEffect(() => {
    const handlePopState = () => {
      const next = viewForPath(window.location.pathname)
      setMobileNavOpen(false)
      setAuthError('')
      if (AUTH_VIEWS.includes(next)) setAuthMode(next)
      setView(next)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
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
    setProfileStatus('idle')
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

  // Pull the latest conversations. Used by the initial load, after sending a
  // message, and by the background poll so admin replies reach an idle client
  // (and client messages refresh the admin unread counters) without a reload.
  const reloadConversations = useCallback(async () => {
    if (!token) return []
    try {
      const res = await api.get(`${API_ROOT}/conversations/`, authHeaders)
      const list = Array.isArray(res.data) ? res.data : []
      setConversations(list)
      return list
    } catch (e) {
      // A failed poll must never crash or clear the thread; keep last state.
      return []
    }
  }, [token, authHeaders])

  const loadProfile = useCallback(async () => {
    if (!getStoredToken()) return null
    setProfileStatus('loading')
    try {
      const res = await api.get(`${API_ROOT}/profile/`, authHeaders)
      setProfile(res.data)
      setProfileStatus('ready')
      return res.data
    } catch (error) {
      console.error('profile load failed', error)
      // A 401 here is already handled by the axios interceptor (refresh or
      // sign-out); anything else means we cannot confirm the caller's role.
      setProfileStatus((prev) => (getStoredToken() ? 'error' : 'idle'))
      if (error?.response?.status === 403) logout('This account is inactive.')
      return null
    }
  }, [authHeaders, logout])

  // Load authenticated user data
  useEffect(() => {
    if (!token) {
      setDashboard(null)
      setProfile(null)
      setProfileStatus('idle')
      setTickets([])
      setWatchlist([])
      setConversations([])
      return undefined
    }

    let active = true

    api.get(`${API_ROOT}/dashboard/`, authHeaders)
      .then((res) => { if (active) setDashboard(res.data) })
      .catch((error) => console.error('dashboard load failed', error))

    loadProfile()

    api.get(`${API_ROOT}/support/`, authHeaders)
      .then((res) => { if (active) setTickets(res.data || []) })
      .catch((error) => console.error('support load failed', error))

    api.get(`${API_ROOT}/watchlist/`, authHeaders)
      .then((res) => { if (active) setWatchlist(Array.isArray(res.data) ? res.data : []) })
      .catch(() => {})

    if (active) reloadConversations()

    return () => { active = false }
  }, [token, authHeaders, loadProfile, reloadConversations])

  // Background poll (the backend ships no Channels/WebSocket layer, so this is
  // the existing "suitable polling" mechanism). It keeps the support inbox and
  // client threads in sync and drives the unread notifications below.
  useEffect(() => {
    if (!token) return undefined
    const timer = setInterval(() => { reloadConversations() }, 15000)
    return () => clearInterval(timer)
  }, [token, reloadConversations])

  // Admin-visible (and client-visible) new-message notification. The unread
  // counts come from the backend, which persists them with the message, so a
  // notification can never exist without the underlying message. The first
  // load after sign-in seeds the baseline silently; only counts that grow
  // afterwards raise a toast.
  useEffect(() => {
    if (!token) {
      unreadSeenRef.current = 0
      unreadSeededRef.current = false
      return
    }
    const total = conversations.reduce(
      (sum, convo) => sum + Number(convo.unread_count || 0),
      0
    )
    if (!unreadSeededRef.current) {
      unreadSeededRef.current = true
    } else if (total > unreadSeenRef.current) {
      const isAdminConsole = isAdminView(view)
      showToast(
        isAdminConsole
          ? `New client message${total - unreadSeenRef.current === 1 ? '' : 's'} in the support inbox.`
          : 'New message from VELTRIX Support.'
      )
    }
    unreadSeenRef.current = total
  }, [conversations, token, view, showToast])

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

      // The backend accepts either the account email or username here (login
      // treats the identifier as a case-insensitive username/email), so an
      // administrator whose username is not their email can sign in too.
      const loginResponse = await api.post(`${API_ROOT}/auth/token/`, { username: email, password })
      const access = loginResponse.data.access
      const refresh = loginResponse.data.refresh
      const identity = loginResponse.data.user

      if (!access) throw new Error('No access token returned')

      // Seed the profile from the authenticated identity returned by the
      // login endpoint so the correct role is known immediately, so the very
      // first navigation already lands in the right area (no admin detour
      // through, or flash of, the client portal).
      const seededProfile = identity && typeof identity === 'object' ? identity : null
      if (seededProfile) setProfile(seededProfile)

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
      // Route by role: administrators to /admin, clients to /dashboard. If the
      // login response omitted the identity, the profile fetch fills it in and
      // the admin guard decides then.
      navigate(homeFor(seededProfile))
    } catch (error) {
      const status = error?.response?.status
      const url = String(error?.config?.url || '')
      if (status === 401 && url.includes('/auth/token/') && !url.includes('/auth/token/refresh/')) {
        // Never claim the account is missing: a 401 only means the submitted
        // credentials did not match (wrong password or unknown identifier).
        setAuthError('Incorrect email/username or password. Please check your details and try again.')
      } else {
        setAuthError(extractApiError(error, 'Authentication failed. Check your details and try again.'))
      }
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

  // Demo (simulated) top-up. The backend enforces the restriction with
  // FUNDING_DEMO_TOPUP_ENABLED (403 unless explicitly enabled outside
  // production); this client-side check only avoids presenting a dead entry
  // point. The credit is never described as a real deposit.
  const handleTopUp = async (amount) => {
    if (!demoTopUpEnabled()) {
      showToast('Demo funding is disabled in this build.')
      return
    }

    if (!token) {
      navigate('login')
      showToast('Please sign in to add demo funds.')
      return
    }

    await api.post(
      `${API_ROOT}/portfolio/topup/`,
      { amount: String(amount) },
      authHeaders
    )

    await reloadDashboard()
    showToast(`Demo funding: simulated balance increased by $${amount}. No real money was deposited.`)
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
  //
  // Success is confirmed only after the server returns the persisted message;
  // a failed request throws so callers can show a precise error instead of a
  // false "sent" confirmation. On success the thread is re-synced from the
  // server so the sender sees exactly what was stored.
  const handleSendMessage = async (conversationId, content) => {
    if (!token) {
      navigate('login')
      showToast('Please sign in to send messages.')
      const authError = new Error('Not signed in')
      authError.unauthorized = true
      throw authError
    }
    const res = await api.post(
      `${API_ROOT}/conversations/${conversationId}/messages/`,
      { content },
      authHeaders
    )
    // The server echoes the stored message with its conversation id and sender
    // identity; require those fields so a malformed response is treated as a
    // failure rather than a success.
    if (!res?.data || String(res.data.conversation) !== String(conversationId)) {
      throw new Error('The server did not confirm the message.')
    }
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === conversationId) {
          const existingMessages = c.messages || []
          const withoutDuplicate = existingMessages.filter((m) => m.id !== res.data.id)
          return {
            ...c,
            messages: [...withoutDuplicate, res.data],
            last_message: res.data,
          }
        }
        return c
      })
    )
    // Refresh in the background so unread counts and other conversations stay
    // accurate; the local append above keeps the UI immediate.
    reloadConversations()
    return res.data
  }

  // Mark a conversation's incoming messages read on
  // /api/conversations/<id>/mark-read/, so the unread notification clears once
  // the user (admin or client) has actually opened the thread.
  const handleMarkRead = useCallback(async (conversationId) => {
    if (!token || conversationId === undefined || conversationId === null) return
    try {
      await api.post(`${API_ROOT}/conversations/${conversationId}/mark-read/`, {}, authHeaders)
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, unread_count: 0 } : c))
      )
    } catch (e) {
      // Non-fatal: the unread badge simply stays until the next successful call.
    }
  }, [token, authHeaders])

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
    if (!demoTopUpEnabled()) {
      showToast('Demo funding is disabled in this build.')
      return
    }
    if (!token) {
      navigate('login')
      showToast('Please sign in to manage funds.')
      return
    }
    setTopUpModalOpen(true)
  }

  const isHome = view === 'home'

  const ctx = {
    marketRows,
    liveQuotes,
    marketLoading,
    dashboard,
    profile,
    profileStatus,
    tickets,
    watchlist,
    conversations,
    token,
    onNavigate: navigate,
    onProfileSaved: (data) => {
      setProfile(data)
      setProfileStatus('ready')
    },
    onReloadProfile: loadProfile,
    showToast,
    onOpenTrade: openTradeModal,
    onOpenTopUp: openTopUpModal,
    onExecuteOrder: handleExecuteOrder,
    onTopUp: handleTopUp,
    onToggleWatchlist: handleToggleWatchlist,
    onCreateTicket: handleCreateTicket,
    onCreateConversation: handleCreateConversation,
    onSendMessage: handleSendMessage,
    onMarkRead: handleMarkRead,
    onResolveConversation: handleResolveConversation,
    onReopenConversation: handleReopenConversation,
    onOpenLiveChat: () => setLiveChatOpen(true),
    onLogout: logout,
  }

  // Signed-in users never see the login/register screens: the auth views fall
  // through to the landing page for their role instead.
  const effectiveView = token && AUTH_VIEWS.includes(view) ? homeFor(profile) : view

  // Decide how the admin area renders. A session with an unresolved profile is
  // 'loading' — it must never redirect or deny, otherwise an administrator
  // would be bounced out of /admin while their profile request is in flight.
  const adminAccess = isAdminView(effectiveView)
    ? resolveAdminAccess({ hasToken: Boolean(token), profile, profileStatus })
    : null

  let appContent = null
  if (isAdminView(effectiveView)) {
    if (adminAccess === 'login') {
      appContent = (
        <div className="section-wrap">
          <AuthView
            mode="login"
            onSubmit={handleAuth}
            error={authError || 'Administrator sign-in required.'}
            onNavigate={navigate}
          />
        </div>
      )
    } else if (adminAccess === 'loading') {
      appContent = (
        <div className="section-wrap">
          <div className="form-card">
            <p role="status">Verifying administrator access…</p>
          </div>
        </div>
      )
    } else if (adminAccess === 'error') {
      appContent = (
        <div className="section-wrap">
          <div className="form-card">
            <div className="error-banner" role="alert">
              <span>We could not confirm your administrator access. Check your connection and retry.</span>
              <button className="btn btn-outline" onClick={loadProfile} type="button">
                Retry ↻
              </button>
            </div>
            <button className="btn btn-quiet" type="button" onClick={() => logout()}>
              Sign out
            </button>
          </div>
        </div>
      )
    } else if (adminAccess === 'denied') {
      appContent = <AccessDenied onNavigate={navigate} authenticated={Boolean(token)} />
    } else {
      appContent = <AdminViews view={effectiveView} ctx={ctx} onNavigate={navigate} showToast={showToast} />
    }
  } else if (APP_VIEWS.includes(effectiveView)) {
    appContent = token ? (
      <AppViews view={effectiveView} ctx={ctx} />
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
        dashboardView={token ? homeFor(profile) : 'portal'}
      />
      <main id="publicSite" className={isHome ? '' : 'hidden'}>
        <Landing onNavigate={navigate} quotes={liveQuotes} token={token} />
      </main>
      <main id="appView" className={`app-view ${isHome ? 'hidden' : ''}`}>
        {!isHome && appContent}
      </main>
      {isHome && <SiteFooter onNavigate={navigate} />}
      {/* The customer chat widget is a client-workspace tool; on the admin
          console support conversations are handled in the support desk view. */}
      {!isAdminView(view) && (
        <LiveChat
          token={token}
          profile={profile}
          conversations={conversations}
          onCreateConversation={handleCreateConversation}
          onSendMessage={handleSendMessage}
          onNavigate={navigate}
          open={liveChatOpen}
          onOpenChange={setLiveChatOpen}
        />
      )}
      <Toast message={toast?.message} />

      <TradeModal
        isOpen={tradeModalOpen}
        onClose={() => setTradeModalOpen(false)}
        initialSymbol={tradeSymbol}
        onExecuteOrder={handleExecuteOrder}
        cashBalance={cashBalance}
      />

      {demoTopUpEnabled() && (
        <TopUpModal
          isOpen={topUpModalOpen}
          onClose={() => setTopUpModalOpen(false)}
          onTopUp={handleTopUp}
          currentBalance={cashBalance}
        />
      )}
    </>
  )
}
