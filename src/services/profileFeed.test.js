import { beforeEach, describe, expect, it, vi } from 'vitest'

// The api client and this service are imported fresh in each test (after the
// env stub) so the injected adapter and the module under test share one axios
// instance — the same pattern used by src/api.test.js.
let api
let profileFeed
let calls

const ok = (data) => ({ data, status: 200, statusText: 'OK', headers: {}, config: {} })

function respond(handler) {
  api.defaults.adapter = async (config) => {
    calls.push(config)
    return handler(config)
  }
}

beforeEach(async () => {
  vi.resetModules()
  sessionStorage.clear()
  localStorage.clear()
  vi.stubEnv('VITE_API_URL', 'http://127.0.0.1:8799')
  api = (await import('../api.js')).default
  profileFeed = await import('./profileFeed.js')
  calls = []
})

describe('fetchProfile', () => {
  it('reads the self-service endpoint without sending any user id', async () => {
    respond(() => ok({ id: 7, email: 'a@b.test', role: 'client' }))
    const profile = await profileFeed.fetchProfile()

    expect(calls).toHaveLength(1)
    expect(calls[0].method).toBe('get')
    expect(new URL(calls[0].url, 'http://localhost').pathname).toBe('/api/profile/')
    expect(profile).toEqual({ id: 7, email: 'a@b.test', role: 'client' })
  })
})

describe('updateProfile', () => {
  it('sends only the writable name fields', async () => {
    respond(() => ok({ id: 7, first_name: 'Ann', last_name: 'Lee' }))
    await profileFeed.updateProfile({
      first_name: 'Ann',
      last_name: 'Lee',
      role: 'admin',
      is_staff: true,
      is_verified: true,
      cash_balance: '9999.00',
      email: 'hijack@example.test',
    })

    expect(calls).toHaveLength(1)
    expect(calls[0].method).toBe('patch')
    expect(JSON.parse(calls[0].data)).toEqual({ first_name: 'Ann', last_name: 'Lee' })
  })

  it('omits untouched fields so a partial save stays partial', async () => {
    respond(() => ok({ id: 7 }))
    await profileFeed.updateProfile({ first_name: 'Only' })
    expect(JSON.parse(calls[0].data)).toEqual({ first_name: 'Only' })
  })
})

describe('extractProfileError', () => {
  it('passes through a DRF detail message', () => {
    const result = profileFeed.extractProfileError({ response: { data: { detail: 'This account is inactive.' } } })
    expect(result.summary).toBe('This account is inactive.')
    expect(result.fieldErrors).toEqual({})
  })

  it('maps field-level validation errors', () => {
    const result = profileFeed.extractProfileError({
      response: { status: 400, data: { first_name: ['This field may not be blank.'], email: ['Enter a valid email address.'] } },
    })
    expect(result.fieldErrors.first_name).toBe('This field may not be blank.')
    expect(result.fieldErrors.email).toBe('Enter a valid email address.')
    expect(result.summary).toBe('')
  })

  it('explains network failures and expired sessions', () => {
    expect(profileFeed.extractProfileError({ message: 'Network Error' }).summary).toMatch(/Cannot reach the server/)
    expect(profileFeed.extractProfileError({ response: { status: 401 } }).summary).toMatch(/session has expired/)
  })

  it('never leaks raw error objects to the user', () => {
    expect(profileFeed.extractProfileError(new Error('boom'), 'Fallback').summary).toBe('boom')
    expect(profileFeed.extractProfileError({}, 'Fallback').summary).toBe('Fallback')
  })
})
