import React from 'react'

const COPY = {
  login: {
    title: 'Welcome back',
    desc: 'Sign in to preview your workspace.',
    submit: 'Sign in to demo',
    switchText: 'New to VELTRIX?',
    switchAction: 'Create a demo account',
    switchTarget: 'register',
  },
  register: {
    title: 'Create your account',
    desc: 'Explore the VELTRIX demo experience.',
    submit: 'Create demo account',
    switchText: 'Already exploring?',
    switchAction: 'Log in preview',
    switchTarget: 'login',
  },
}

export default function AuthView({ mode, onSubmit, error, onNavigate }) {
  if (mode === 'forgot') {
    return (
      <>
        <div className="back-link" data-view="login" onClick={() => onNavigate('login')}>← Back to login</div>
        <form className="form-card" id="forgotForm" onSubmit={onSubmit}>
          <div className="eyebrow"><span className="eyebrow-line" /> ACCOUNT HELP</div>
          <h2>Reset your password</h2>
          <p>Enter an email to preview the recovery flow.</p>
          <div className="form-group">
            <label htmlFor="forgotEmail">Email address</label>
            <input id="forgotEmail" name="email" type="email" required placeholder="you@example.com" />
          </div>
          <button className="btn btn-primary" type="submit">Preview recovery</button>
          <div className="form-note">No email will be sent. Real password recovery requires a secure authentication service.</div>
        </form>
      </>
    )
  }

  const register = mode === 'register'
  const copy = COPY[register ? 'register' : 'login']

  return (
    <>
      <div className="back-link" data-view="home" onClick={() => onNavigate('home')}>← Back to VELTRIX</div>
      <form className="form-card" id="authForm" onSubmit={onSubmit}>
        <div className="eyebrow"><span className="eyebrow-line" /> VELTRIX DEMO</div>
        <h2>{copy.title}</h2>
        <p>{copy.desc}</p>
        {register && (
          <div className="form-group">
            <label htmlFor="fullName">Full name</label>
            <input id="fullName" name="fullName" required placeholder="Your name" autoComplete="name" />
          </div>
        )}
        <div className="form-group">
          <label htmlFor="email">Email address</label>
          <input id="email" name="email" type="email" required placeholder="you@example.com" autoComplete="email" />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="At least 8 characters"
            autoComplete={register ? 'new-password' : 'current-password'}
          />
        </div>
        {register ? (
          <label style={{ fontSize: 10, color: '#9aada0', display: 'flex', gap: 9, alignItems: 'flex-start' }}>
            <input type="checkbox" required style={{ marginTop: 3 }} /> I agree to the demo terms and privacy notice.
          </label>
        ) : (
          <div style={{ textAlign: 'right' }}>
            <button type="button" className="text-link" data-view="forgot" style={{ background: 'none', border: 0 }} onClick={() => onNavigate('forgot')}>
              Forgot password?
            </button>
          </div>
        )}
        {error && <div className="admin-warn" role="alert">{error}</div>}
        <button className="btn btn-primary" type="submit">{copy.submit} <span>↗</span></button>
        <div className="form-note">
          {register
            ? 'Demo environment. This creates a simulated account on the VELTRIX demo backend. No real funds, trading, or money movement are involved.'
            : 'Demo environment. Sign in to the simulated VELTRIX demo backend. No real funds or live trading are involved.'}
        </div>
        <div className="auth-switch">
          {copy.switchText}{' '}
          <button type="button" data-view={copy.switchTarget} onClick={() => onNavigate(copy.switchTarget)}>{copy.switchAction}</button>
        </div>
      </form>
    </>
  )
}
