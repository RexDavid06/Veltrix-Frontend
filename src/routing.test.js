import { describe, expect, it } from 'vitest'
import {
  ADMIN_VIEWS,
  APP_VIEWS,
  AUTH_VIEWS,
  PATH_VIEWS,
  VIEW_PATHS,
  homeFor,
  isAdminIdentity,
  isAdminView,
  isAppView,
  isAuthView,
  isProtectedView,
  pathFor,
  resolveAdminAccess,
  resolveDepositAccess,
  viewForPath,
} from './routing.js'

const ADMIN_PROFILE = { id: 1, role: 'admin', is_staff: true, is_verified: true }
const STAFF_PROFILE = { id: 2, role: 'client', is_staff: true }
const CLIENT_PROFILE = { id: 3, role: 'client', is_staff: false, is_verified: false }

describe('path <-> view mapping', () => {
  it('gives every view a unique path', () => {
    const paths = Object.values(VIEW_PATHS)
    expect(new Set(paths).size).toBe(paths.length)
    expect(Object.keys(PATH_VIEWS).length).toBe(paths.length)
  })

  it('round-trips views through paths', () => {
    ;[...APP_VIEWS, ...ADMIN_VIEWS, ...AUTH_VIEWS, 'home'].forEach((view) => {
      expect(viewForPath(pathFor(view))).toBe(view)
    })
  })

  it('resolves the admin console from its own URLs', () => {
    expect(viewForPath('/admin')).toBe('admin')
    expect(viewForPath('/admin/users')).toBe('admin-customers')
    expect(viewForPath('/admin/transactions')).toBe('admin-transactions')
    expect(viewForPath('/admin/profile')).toBe('admin-profile')
    expect(viewForPath('/profile')).toBe('profile')
  })

  it('tolerates trailing slashes', () => {
    expect(viewForPath('/admin/users/')).toBe('admin-customers')
    expect(viewForPath('/profile/')).toBe('profile')
    expect(viewForPath('/dashboard/')).toBe('portal')
  })

  it('keeps unknown /admin paths inside the admin area', () => {
    // A typo or an old bookmark must not dump a signed-in admin on the
    // public landing page.
    expect(viewForPath('/admin/does-not-exist')).toBe('admin')
    expect(viewForPath('/admin/nested/deep')).toBe('admin')
  })

  it('falls back to the landing view for unknown public paths', () => {
    expect(viewForPath('/')).toBe('home')
    expect(viewForPath('')).toBe('home')
    expect(viewForPath('/nope')).toBe('home')
    expect(viewForPath(undefined)).toBe('home')
  })

  it('classifies views', () => {
    expect(isAuthView('login')).toBe(true)
    expect(isAuthView('admin')).toBe(false)
    expect(isAppView('profile')).toBe(true)
    expect(isAdminView('admin-profile')).toBe(true)
    expect(isProtectedView('admin')).toBe(true)
    expect(isProtectedView('profile')).toBe(true)
    expect(isProtectedView('home')).toBe(false)
    expect(isProtectedView('login')).toBe(false)
  })
})

describe('admin identity', () => {
  it('accepts role=admin or is_staff from backend data', () => {
    expect(isAdminIdentity(ADMIN_PROFILE)).toBe(true)
    expect(isAdminIdentity(STAFF_PROFILE)).toBe(true)
    expect(isAdminIdentity(CLIENT_PROFILE)).toBe(false)
    expect(isAdminIdentity(null)).toBe(false)
    expect(isAdminIdentity(undefined)).toBe(false)
    expect(isAdminIdentity({})).toBe(false)
    expect(isAdminIdentity({ role: 'ADMIN' })).toBe(false) // exact backend value only
  })

  it('routes administrators to /admin and clients to /dashboard', () => {
    expect(homeFor(ADMIN_PROFILE)).toBe('admin')
    expect(homeFor(CLIENT_PROFILE)).toBe('portal')
    expect(homeFor(null)).toBe('portal')
  })
})

describe('resolveAdminAccess', () => {
  it('sends anonymous visitors to login', () => {
    expect(resolveAdminAccess({ hasToken: false, profile: null, profileStatus: 'idle' })).toBe('login')
  })

  it('never denies or redirects while the profile is still resolving', () => {
    expect(resolveAdminAccess({ hasToken: true, profile: null, profileStatus: 'loading' })).toBe('loading')
    expect(resolveAdminAccess({ hasToken: true, profile: null, profileStatus: 'idle' })).toBe('loading')
    // The seeded login identity wins immediately, before the refetch lands.
    expect(resolveAdminAccess({ hasToken: true, profile: ADMIN_PROFILE, profileStatus: 'loading' })).toBe('allowed')
  })

  it('returns a retryable error when the profile request failed', () => {
    expect(resolveAdminAccess({ hasToken: true, profile: null, profileStatus: 'error' })).toBe('error')
    expect(resolveAdminAccess({ hasToken: true, profile: ADMIN_PROFILE, profileStatus: 'error' })).toBe('allowed')
  })

  it('denies authenticated non-admins', () => {
    expect(resolveAdminAccess({ hasToken: true, profile: CLIENT_PROFILE, profileStatus: 'ready' })).toBe('denied')
    expect(resolveAdminAccess({ hasToken: true, profile: { role: 'client' }, profileStatus: 'ready' })).toBe('denied')
  })

  it('allows administrators', () => {
    expect(resolveAdminAccess({ hasToken: true, profile: ADMIN_PROFILE, profileStatus: 'ready' })).toBe('allowed')
    expect(resolveAdminAccess({ hasToken: true, profile: STAFF_PROFILE, profileStatus: 'ready' })).toBe('allowed')
  })
})

describe('resolveDepositAccess', () => {
  it('requires a signed-in client and a confirmed non-admin profile', () => {
    expect(resolveDepositAccess({ hasToken: false, profile: null, profileStatus: 'idle' })).toBe('login')
    expect(resolveDepositAccess({ hasToken: true, profile: null, profileStatus: 'loading' })).toBe('loading')
    expect(resolveDepositAccess({ hasToken: true, profile: null, profileStatus: 'error' })).toBe('error')
    expect(resolveDepositAccess({ hasToken: true, profile: CLIENT_PROFILE, profileStatus: 'ready' })).toBe('allowed')
  })

  it('denies staff identities, including staff with a client role', () => {
    expect(resolveDepositAccess({ hasToken: true, profile: ADMIN_PROFILE, profileStatus: 'ready' })).toBe('denied')
    expect(resolveDepositAccess({ hasToken: true, profile: STAFF_PROFILE, profileStatus: 'ready' })).toBe('denied')
    expect(resolveDepositAccess({ hasToken: true, profile: { role: 'operator' }, profileStatus: 'ready' })).toBe('denied')
  })
})
