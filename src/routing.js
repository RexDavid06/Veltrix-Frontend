// Path <-> view mapping and role-aware access decisions for the SPA.
//
// The app has no router dependency: views are plain strings, and this module
// is the single source of truth for the URL each view lives at, which view a
// URL resolves to, and what should happen when a protected area is requested.
// Every function here is pure so the behaviour can be unit-tested without
// rendering the whole application.

// Client workspace views (existing dashboard areas).
export const APP_VIEWS = [
  'portal', 'markets', 'portfolio', 'accounts', 'wallet', 'deposits',
  'withdrawals', 'transactions', 'kyc', 'portal-support', 'settings', 'profile',
]

// Platform admin views (served by AdminViews, gated on the admin role).
export const ADMIN_VIEWS = [
  'admin', 'admin-customers', 'admin-kyc', 'admin-transactions', 'admin-deposits',
  'admin-deposits-diagnostics', 'admin-instruments', 'admin-support', 'admin-audit', 'admin-profile',
]

// Auth screens (login/register/password flows).
export const AUTH_VIEWS = ['login', 'register', 'forgot', 'reset', 'verify']

export const VIEW_PATHS = {
  home: '/',
  login: '/login',
  register: '/register',
  forgot: '/forgot',
  reset: '/reset',
  verify: '/verify',
  portal: '/dashboard',
  markets: '/markets',
  portfolio: '/portfolio',
  accounts: '/accounts',
  wallet: '/wallet',
  deposits: '/deposits',
  withdrawals: '/withdrawals',
  transactions: '/transactions',
  kyc: '/verification',
  'portal-support': '/support',
  settings: '/settings',
  profile: '/profile',
  admin: '/admin',
  'admin-customers': '/admin/users',
  'admin-kyc': '/admin/verification',
  'admin-transactions': '/admin/transactions',
  'admin-deposits': '/admin/deposits',
  'admin-deposits-diagnostics': '/admin/deposits/diagnostics',
  'admin-instruments': '/admin/instruments',
  'admin-support': '/admin/support',
  'admin-audit': '/admin/audit',
  'admin-profile': '/admin/profile',
}

// Reverse map: first registered view wins for a given path.
export const PATH_VIEWS = Object.entries(VIEW_PATHS).reduce((acc, [view, path]) => {
  if (!(path in acc)) acc[path] = view
  return acc
}, {})

/** URL for a view, or null when the view has no path. */
export function pathFor(view) {
  return Object.prototype.hasOwnProperty.call(VIEW_PATHS, view) ? VIEW_PATHS[view] : null
}

/**
 * View for a pathname. Unknown paths fall back to the landing page, except
 * unknown /admin/* paths which stay inside the admin area (the shell renders
 * its own empty state instead of leaking a signed-in admin back outside).
 */
export function viewForPath(pathname) {
  const raw = String(pathname || '/')
  const path = raw.length > 1 && raw.endsWith('/') ? raw.slice(0, -1) : raw
  if (PATH_VIEWS[path]) return PATH_VIEWS[path]
  if (path === '' || path === '/') return 'home'
  if (path === '/admin' || path.startsWith('/admin/')) return 'admin'
  return 'home'
}

export function isAuthView(view) {
  return AUTH_VIEWS.includes(view)
}

export function isAppView(view) {
  return APP_VIEWS.includes(view)
}

export function isAdminView(view) {
  return ADMIN_VIEWS.includes(view)
}

export function isProtectedView(view) {
  return isAppView(view) || isAdminView(view)
}

/**
 * Role check derived exclusively from backend-sourced profile data
 * (the login response or GET /api/profile/). Never inferred locally.
 */
export function isAdminIdentity(profile) {
  if (!profile || typeof profile !== 'object') return false
  return profile.role === 'admin' || profile.is_staff === true
}

/** Post-login landing view for an authenticated identity. */
export function homeFor(profile) {
  return isAdminIdentity(profile) ? 'admin' : 'portal'
}

/**
 * Decide how to render a request for the admin area.
 *
 * Returns one of:
 *   'login'   — no session: send to the sign-in screen
 *   'loading' — session exists but the profile has not resolved yet;
 *               never redirect or deny on this state (an admin whose
 *               profile is still loading must stay in the admin area)
 *   'error'   — the profile request failed: show a retryable error state
 *   'denied'  — authenticated non-admin: show the unauthorized screen
 *   'allowed' — authenticated administrator
 */
export function resolveAdminAccess({ hasToken, profile, profileStatus } = {}) {
  if (!hasToken) return 'login'
  if (profile && typeof profile === 'object') {
    return isAdminIdentity(profile) ? 'allowed' : 'denied'
  }
  if (profileStatus === 'error') return 'error'
  return 'loading'
}

/** Real deposit actions are available only to an authenticated client. */
export function resolveDepositAccess({ hasToken, profile, profileStatus } = {}) {
  if (!hasToken) return 'login'
  if (profile && typeof profile === 'object') {
    return profile.role === 'client' && !isAdminIdentity(profile) ? 'allowed' : 'denied'
  }
  if (profileStatus === 'error') return 'error'
  return 'loading'
}
