import React, { useState } from 'react'

const COPY = {
  login: {
    title: 'Welcome back',
    desc: 'Sign in to access your trading workspace.',
    submit: 'Sign in',
    switchText: 'New to VELTRIX?',
    switchAction: 'Open an account',
    switchTarget: 'register',
  },
  register: {
    title: 'Open your account',
    desc: 'Join VELTRIX to trade global markets with institutional execution.',
    submit: 'Create account',
    switchText: 'Already registered?',
    switchAction: 'Sign in',
    switchTarget: 'login',
  },
}

export default function AuthView({ mode, onSubmit, error, onNavigate }) {
  const [showPassword, setShowPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  if (mode === 'verify') {
    return (
      <>
        <div className="back-link" data-view="login" onClick={() => onNavigate('login')}>← Back to login</div>
        <div className="form-card" id="verifyCard">
          <div className="eyebrow"><span className="eyebrow-line" /> EMAIL VERIFICATION</div>
          <h2>{error ? 'Verification failed' : 'Verifying your email'}</h2>
          <p>{error || 'Hang tight while we confirm your email address.'}</p>
          {error ? (
            <button className="btn btn-primary" type="button" onClick={() => onNavigate('login')}>Back to sign in</button>
          ) : (
            <button className="btn btn-primary" type="button" disabled>Verifying…</button>
          )}
        </div>
      </>
    )
  }

  if (mode === 'forgot') {
    return (
      <>
        <div className="back-link" data-view="login" onClick={() => onNavigate('login')}>← Back to login</div>
        <form className="form-card" id="forgotForm" onSubmit={onSubmit}>
          <div className="eyebrow"><span className="eyebrow-line" /> ACCOUNT RECOVERY</div>
          <h2>Reset your password</h2>
          <p>Enter your registered email address to receive password reset instructions.</p>
          <div className="form-group">
            <label htmlFor="forgotEmail">Email address</label>
            <input id="forgotEmail" name="email" type="email" required placeholder="you@example.com" />
          </div>
          {error && <div className="admin-warn" role="alert">{error}</div>}
          <button className="btn btn-primary" type="submit">Send Reset Link</button>
          <div className="form-note">A secure verification link will be dispatched to your email address to confirm your identity.</div>
        </form>
      </>
    )
  }

  if (mode === 'reset') {
    return (
      <>
        <div className="back-link" data-view="login" onClick={() => onNavigate('login')}>← Back to login</div>
        <form className="form-card" id="resetForm" onSubmit={onSubmit}>
          <div className="eyebrow"><span className="eyebrow-line" /> ACCOUNT RECOVERY</div>
          <h2>Choose a new password</h2>
          <p>Set a new password for your account. For security, this link can only be used once.</p>
          <div className="form-group">
            <label htmlFor="new_password">New password</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                id="new_password"
                name="new_password"
                type={showNewPassword ? 'text' : 'password'}
                required
                minLength={8}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                style={{ paddingRight: 42, width: '100%' }}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((v) => !v)}
                aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                style={{ position: 'absolute', right: 8, background: 'none', border: 0, cursor: 'pointer', color: 'var(--muted)', padding: 4 }}
              >
                {showNewPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="confirm_password">Confirm new password</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                id="confirm_password"
                name="confirm_password"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                minLength={8}
                placeholder="Re-enter your new password"
                autoComplete="new-password"
                style={{ paddingRight: 42, width: '100%' }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                style={{ position: 'absolute', right: 8, background: 'none', border: 0, cursor: 'pointer', color: 'var(--muted)', padding: 4 }}
              >
                {showConfirmPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          {error && <div className="admin-warn" role="alert">{error}</div>}
          <button className="btn btn-primary" type="submit">Update password</button>
          <div className="form-note">If the link has expired, return to login and request a new reset email.</div>
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
        <div className="eyebrow"><span className="eyebrow-line" /> VELTRIX CLIENT ACCESS</div>
        <h2>{copy.title}</h2>
        <p>{copy.desc}</p>
        {register && (
          <div className="form-group">
            <label htmlFor="fullName">Full name</label>
            <input id="fullName" name="fullName" required placeholder="Your legal name" autoComplete="name" />
          </div>
        )}
        <div className="form-group">
          <label htmlFor="email">Email address</label>
          <input id="email" name="email" type="email" required placeholder="you@example.com" autoComplete="email" />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              placeholder="At least 8 characters"
              autoComplete={register ? 'new-password' : 'current-password'}
              style={{ paddingRight: 42, width: '100%' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              style={{ position: 'absolute', right: 8, background: 'none', border: 0, cursor: 'pointer', color: 'var(--muted)', padding: 4 }}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
        </div>
        {!register && (
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input id="remember" name="remember" type="checkbox" />
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>Remember this device</span>
            </label>
          </div>
        )}
        {register ? (
          <label style={{ fontSize: 10, color: '#9aada0', display: 'flex', gap: 9, alignItems: 'flex-start' }}>
            <input type="checkbox" required style={{ marginTop: 3 }} /> I agree to the client agreement, terms of business, and privacy notice.
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
            ? 'Client accounts are protected by 256-bit encryption and regulated financial data safeguards.'
            : 'Secure authenticated session. Multi-factor verification and institutional security protocols active.'}
        </div>
        <div className="auth-switch">
          {copy.switchText}{' '}
          <button type="button" data-view={copy.switchTarget} onClick={() => onNavigate(copy.switchTarget)}>{copy.switchAction}</button>
        </div>
      </form>
    </>
  )
}
