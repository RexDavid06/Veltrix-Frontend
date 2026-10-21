import { describe, expect, it, vi, afterEach } from 'vitest'
import { demoTopUpEnabled } from './flags'

const DEV = { DEV: true, PROD: false }
const PROD_BUILD = { DEV: false, PROD: true }

describe('demoTopUpEnabled', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('is disabled by default when the variable is not set', () => {
    expect(demoTopUpEnabled({ ...DEV })).toBe(false)
    expect(demoTopUpEnabled({ ...DEV, VITE_DEMO_TOPUP_ENABLED: '' })).toBe(false)
    expect(demoTopUpEnabled({ ...DEV, VITE_DEMO_TOPUP_ENABLED: '0' })).toBe(false)
    expect(demoTopUpEnabled({ ...DEV, VITE_DEMO_TOPUP_ENABLED: 'false' })).toBe(false)
  })

  it('can be enabled explicitly in development', () => {
    expect(demoTopUpEnabled({ ...DEV, VITE_DEMO_TOPUP_ENABLED: '1' })).toBe(true)
    expect(demoTopUpEnabled({ ...DEV, VITE_DEMO_TOPUP_ENABLED: 'true' })).toBe(true)
    expect(demoTopUpEnabled({ ...DEV, VITE_DEMO_TOPUP_ENABLED: 'TRUE' })).toBe(true)
  })

  it('is never enabled in a production build, even if explicitly set', () => {
    expect(demoTopUpEnabled({ ...PROD_BUILD, VITE_DEMO_TOPUP_ENABLED: '1' })).toBe(false)
    expect(demoTopUpEnabled({ ...PROD_BUILD, VITE_DEMO_TOPUP_ENABLED: 'true' })).toBe(false)
  })

  it('is disabled outside a development environment', () => {
    expect(demoTopUpEnabled({ DEV: false, PROD: false, VITE_DEMO_TOPUP_ENABLED: '1' })).toBe(false)
  })

  it('reads the live import.meta.env so tests and dev servers can opt in', () => {
    expect(demoTopUpEnabled()).toBe(false)
    vi.stubEnv('VITE_DEMO_TOPUP_ENABLED', '1')
    expect(demoTopUpEnabled()).toBe(true)
  })
})
