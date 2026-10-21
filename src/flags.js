// Explicit production configuration for demo-only features.
//
// The Django backend ships FUNDING_DEMO_TOPUP_ENABLED (default disabled, forced
// off in any production deployment) as the enforcement point for simulated
// funding. This module is the matching presentation switch:
//
//   - Opt-in only: VITE_DEMO_TOPUP_ENABLED must be explicitly exported as "1"
//     or "true" (same opt-in style as the existing VITE_WS_URL switch).
//   - Never in a production build: import.meta.env.PROD is statically true when
//     `vite build` runs, so demo top-up surfaces are compiled out of production
//     bundles even if the variable was present during the build.
//
// This is a UI safeguard, not a security control. The backend remains the only
// authority: it answers 403 for /api/portfolio/topup/ unless demo funding is
// explicitly enabled and the deployment is not production.
export function demoTopUpEnabled(env = import.meta.env) {
  const raw = env?.VITE_DEMO_TOPUP_ENABLED
  const optedIn = raw === '1' || String(raw ?? '').toLowerCase() === 'true'
  return optedIn && env?.DEV === true && env?.PROD !== true
}
