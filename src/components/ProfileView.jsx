import React, { useCallback, useEffect, useState } from 'react'
import { extractProfileError, fetchProfile, updateProfile } from '../services/profileFeed'

function fieldError(errors, field) {
  return errors.fieldErrors[field] || ''
}

/**
 * Self-service profile page, shared by the client workspace and the admin
 * console. Reads and edits only GET/PATCH /api/profile/ — the backend derives
 * the user from the token, so nothing account-specific is ever sent.
 *
 * Administrators can change their own email as well as their name. Role,
 * verification and staff status are displayed exactly as returned by the
 * backend and are never editable here.
 */
export default function ProfileView({ ctx }) {
  const { profile, onProfileSaved, showToast, onLogout } = ctx
  const [record, setRecord] = useState(profile || null)
  const [status, setStatus] = useState(profile ? 'ready' : 'loading')
  const [form, setForm] = useState({
    email: profile?.role === 'admin' ? profile?.email || '' : '',
    first_name: profile?.first_name || '',
    last_name: profile?.last_name || '',
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({ summary: '', fieldErrors: {} })

  const applyRecord = useCallback((data) => {
    setRecord(data)
    setForm({
      email: data.role === 'admin' ? data.email || '' : '',
      first_name: data.first_name || '',
      last_name: data.last_name || '',
    })
    setStatus('ready')
    if (typeof onProfileSaved === 'function') onProfileSaved(data)
  }, [onProfileSaved])

  const load = useCallback(async () => {
    setStatus((prev) => (prev === 'ready' ? prev : 'loading'))
    setErrors({ summary: '', fieldErrors: {} })
    try {
      const data = await fetchProfile()
      applyRecord(data)
    } catch (error) {
      // Fall back to the profile already held by the app (seeded at login)
      // rather than blanking the page when a refresh fails.
      const parsed = extractProfileError(error, 'Could not load your profile from the backend.')
      if (profile) {
        setStatus('ready')
        setErrors({ summary: parsed.summary, fieldErrors: {} })
      } else {
        setStatus('error')
        setErrors(parsed)
      }
    }
  }, [applyRecord, profile])

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const isAdmin = record?.role === 'admin'

  const dirty =
    (form.first_name || '') !== (record?.first_name || '') ||
    (form.last_name || '') !== (record?.last_name || '') ||
    (isAdmin && (form.email || '') !== (record?.email || ''))

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setErrors({ summary: '', fieldErrors: {} })
    try {
      const payload = {
        first_name: form.first_name ?? '',
        last_name: form.last_name ?? '',
      }
      if (isAdmin) payload.email = (form.email || '').trim()
      const data = await updateProfile(payload)
      applyRecord(data)
      showToast('Profile updated.')
    } catch (error) {
      setErrors(extractProfileError(error, 'Could not save your profile.'))
    } finally {
      setSaving(false)
    }
  }

  if (status === 'loading' && !record) {
    return (
      <div className="app-card">
        <div className="muted-copy" style={{ padding: '18px 0' }}>Loading your profile from the backend…</div>
      </div>
    )
  }

  if (status === 'error' && !record) {
    return (
      <div className="app-card">
        <div className="error-banner">
          <span>{errors.summary || 'Could not load your profile from the backend.'}</span>
          <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: 10 }} onClick={load}>
            Retry ↻
          </button>
        </div>
        {onLogout && (
          <button className="btn btn-quiet" type="button" onClick={() => onLogout('Signed out.')}>
            Sign out
          </button>
        )}
      </div>
    )
  }

  const displayName =
    `${record?.first_name || ''} ${record?.last_name || ''}`.trim() || record?.username || 'Account holder'

  return (
    <div className="page-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
      <div className="app-card">
        <div className="section-row">
          <div>
            <h3>Edit profile</h3>
            <div className="muted-copy">Changes are saved through GET/PATCH /api/profile/ on the backend.</div>
          </div>
          <span className="status">Self-service</span>
        </div>

        {errors.summary && (
          <div className="error-banner" style={{ marginTop: 14 }} role="alert">
            <span>{errors.summary}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate style={{ marginTop: 12 }}>
          {isAdmin && (
            <div className="form-group">
              <label htmlFor="profileEmailEdit">Email address</label>
              <input
                id="profileEmailEdit"
                name="email"
                type="email"
                value={form.email}
                maxLength={254}
                autoComplete="email"
                aria-invalid={Boolean(fieldError(errors, 'email'))}
                aria-describedby={fieldError(errors, 'email') ? 'profileEmailEditError' : undefined}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              />
              {fieldError(errors, 'email') && (
                <small id="profileEmailEditError" className="field-error">{fieldError(errors, 'email')}</small>
              )}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="profileFirstName">First name</label>
            <input
              id="profileFirstName"
              name="first_name"
              value={form.first_name}
              maxLength={150}
              aria-invalid={Boolean(fieldError(errors, 'first_name'))}
              aria-describedby={fieldError(errors, 'first_name') ? 'profileFirstNameError' : undefined}
              onChange={(event) => setForm((prev) => ({ ...prev, first_name: event.target.value }))}
            />
            {fieldError(errors, 'first_name') && (
              <small id="profileFirstNameError" className="field-error">{fieldError(errors, 'first_name')}</small>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="profileLastName">Last name</label>
            <input
              id="profileLastName"
              name="last_name"
              value={form.last_name}
              maxLength={150}
              aria-invalid={Boolean(fieldError(errors, 'last_name'))}
              aria-describedby={fieldError(errors, 'last_name') ? 'profileLastNameError' : undefined}
              onChange={(event) => setForm((prev) => ({ ...prev, last_name: event.target.value }))}
            />
            {fieldError(errors, 'last_name') && (
              <small id="profileLastNameError" className="field-error">{fieldError(errors, 'last_name')}</small>
            )}
          </div>

          <div className="app-actions">
            <button className="btn btn-primary" type="submit" disabled={saving || !dirty}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button
              className="btn btn-outline"
              type="button"
              disabled={saving || !dirty}
              onClick={() => {
                setForm({
                  email: isAdmin ? record?.email || '' : '',
                  first_name: record?.first_name || '',
                  last_name: record?.last_name || '',
                })
                setErrors({ summary: '', fieldErrors: {} })
              }}
            >
              Discard
            </button>
          </div>
          <p className="form-note">
            {isAdmin
              ? 'Your name and email are editable here. Changing your email also changes the username used to sign in. Role, verification status and account balances remain server-side.'
              : 'Only your name is editable here. Email, role, verification status and account balances are managed server-side and cannot be changed from this form.'}
          </p>
        </form>
      </div>

      <div className="app-card">
        <div className="section-row">
          <div>
            <h3>Account record</h3>
            <div className="muted-copy">Read-only fields served by the backend profile endpoint.</div>
          </div>
          <span className={`status${record?.is_verified ? '' : ' pending'}`}>
            {record?.is_verified ? 'Verified' : 'Pending verification'}
          </span>
        </div>

        <div className="profile-fields">
          <div className="form-group">
            <label>Display name</label>
            <div><b>{displayName}</b></div>
          </div>
          <div className="form-group">
            <label htmlFor="profileEmail">Registered email</label>
            <input id="profileEmail" value={record?.email || ''} readOnly aria-readonly="true" />
          </div>
          <div className="form-group">
            <label>Login identifier</label>
            <div className="muted-copy" style={{ fontFamily: 'monospace' }}>{record?.username || '—'}</div>
          </div>
          <div className="form-group">
            <label>Account ID</label>
            <div className="muted-copy" style={{ fontFamily: 'monospace' }}>
              {record?.id ? `VX-${String(record.id).padStart(3, '0')}` : '—'}
            </div>
          </div>
          <div className="form-group">
            <label>Role</label>
            <div>
              <span className="status">{record?.role === 'admin' ? 'Administrator' : 'Client'}</span>
              {record?.is_staff && <span className="status review" style={{ marginLeft: 6 }}>Staff</span>}
            </div>
          </div>
          <div className="form-group">
            <label>Verification status</label>
            <div>{record?.is_verified ? 'Fully verified' : 'Standard (KYC pending)'}</div>
          </div>
          <p className="form-note">
            Role and verification are sourced from the authenticated backend record and are never
            editable from this page.
          </p>
        </div>
      </div>
    </div>
  )
}
