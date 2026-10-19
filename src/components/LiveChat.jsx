import React, { useEffect, useRef, useState } from 'react'
import { TELEGRAM_DESK_LINK } from '../supportChannels'

const AUTO_ACK = 'Message received and added to your support conversation for our client desk to review. This is an automated confirmation — an account specialist will reply in this thread.'

export default function LiveChat({
  token,
  profile,
  conversations = [],
  onCreateConversation,
  onSendMessage,
  onNavigate,
  open: controlledOpen,
  onOpenChange,
}) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = typeof controlledOpen === 'boolean' ? controlledOpen : internalOpen
  const setOpen = (next) => {
    const value = typeof next === 'function' ? next(open) : next
    if (onOpenChange) onOpenChange(value)
    if (typeof controlledOpen !== 'boolean') setInternalOpen(value)
  }
  const [value, setValue] = useState('')
  const [messages, setMessages] = useState([
    { label: 'VELTRIX SUPPORT', text: 'Welcome to VELTRIX Client Services. How may we assist your trading today?', user: false },
  ])
  const inputRef = useRef(null)
  const messagesRef = useRef(null)

  useEffect(() => {
    if (open && token) inputRef.current?.focus()
  }, [open, token])

  useEffect(() => {
    if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight
  }, [messages])

  const clientName = profile?.first_name
    ? `${profile.first_name} ${profile.last_name || ''}`.trim()
    : profile?.username || (profile?.email ? profile.email.split('@')[0] : 'Client')

  const accountRef = profile?.id ? `VX-${String(profile.id).padStart(3, '0')}` : 'VX-001'

  const submit = async (event) => {
    event.preventDefault()
    if (!token) return

    const text = value.trim()
    if (!text) return

    const clientLabel = profile?.first_name
      ? `${profile.first_name.toUpperCase()} (${accountRef})`
      : `YOU (${accountRef})`

    setMessages((prev) => [
      ...prev,
      { label: clientLabel, text, user: true },
    ])
    setValue('')

    let delivered = true
    if (onCreateConversation) {
      try {
        const activeConvo = conversations[0]
        if (activeConvo && onSendMessage) {
          await onSendMessage(activeConvo.id, text)
        } else {
          const clientIdentifier = profile?.email || 'Client'
          await onCreateConversation(`Live Chat: ${clientName} (${clientIdentifier})`, text)
        }
      } catch (e) {
        console.error('Failed to post to backend conversations', e)
        delivered = false
      }
    }

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          label: 'VELTRIX (AUTOMATED)',
          text: delivered
            ? AUTO_ACK
            : 'This message could not be delivered. Please try again, or use the Support Portal below.',
          user: false,
        },
      ])
    }, 700)
  }

  return (
    <>
      <section
        className={`live-chat-panel ${open ? '' : 'hidden'}`}
        id="liveChatPanel"
        aria-label="VELTRIX institutional support chat"
        aria-hidden={!open}
      >
        <div className="live-chat-header">
          <div className="live-agent-avatar">V</div>
          <div className="live-agent-copy">
            <strong>VELTRIX Client Desk</strong>
            {token && profile ? (
              <span style={{ color: 'var(--green)' }}>
                <i className="live-chat-dot" /> {clientName} ({accountRef})
              </span>
            ) : (
              <span><i className="live-chat-dot" /> 24/7 Institutional Support</span>
            )}
          </div>
          <button type="button" className="live-chat-close" id="liveChatClose" aria-label="Close chat" onClick={() => setOpen(false)}>×</button>
        </div>

        <div className="live-chat-notice">
          {token ? (
            <span>
              Verified Client Session · Connected as <b>{profile?.email || 'Authenticated User'}</b> ({accountRef}). All inquiries are linked directly to your trading account for the admin operations desk.
            </span>
          ) : (
            <span>
              Authentication required. Unauthenticated users cannot send messages. Sign in so your inquiry is delivered with verified account credentials to the admin desk.
            </span>
          )}
        </div>

        <div className="live-chat-messages" id="liveChatMessages" aria-live="polite" ref={messagesRef}>
          {messages.map((message, index) => (
            <div className={`live-chat-message ${message.user ? 'user-message' : 'agent-message'}`} key={index}>
              <span>{message.label}</span>{message.text}
            </div>
          ))}

          {!token && (
            <div
              style={{
                margin: '12px 0 6px',
                padding: '14px',
                background: '#101d17',
                border: '1px solid #284434',
                borderRadius: '6px',
                textAlign: 'center',
                fontSize: 11,
                color: '#c2d5ca',
              }}
            >
              <div style={{ fontWeight: 700, color: 'var(--gold)', marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <span>🔒</span> Message Sending Restricted
              </div>
              <p style={{ margin: '0 0 12px', fontSize: 10, color: '#93a79b', lineHeight: 1.5 }}>
                Unauthenticated visitors cannot send messages. Sign in to your verified account so the admin team receives your credentials and inquiry details.
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ padding: '7px 14px', fontSize: 10 }}
                  onClick={() => {
                    setOpen(false)
                    if (onNavigate) onNavigate('login')
                  }}
                >
                  Sign In to Send Messages ↗
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ padding: '7px 14px', fontSize: 10 }}
                  onClick={() => {
                    setOpen(false)
                    if (onNavigate) onNavigate('register')
                  }}
                >
                  Open Account
                </button>
              </div>
            </div>
          )}
        </div>

        {token ? (
          <form className="live-chat-form" id="liveChatForm" onSubmit={submit}>
            <label className="sr-only" htmlFor="liveChatInput">Your message</label>
            <input
              id="liveChatInput"
              name="message"
              maxLength={500}
              placeholder="Type your message to support specialists…"
              autoComplete="off"
              required
              ref={inputRef}
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
            <button type="submit" aria-label="Send message">➤</button>
          </form>
        ) : (
          <div style={{ padding: '14px 16px', background: '#0e1a16', borderTop: '1px solid var(--line)', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#c2d1c7', marginBottom: 6, fontWeight: 700 }}>
              Client Authentication Required
            </div>
            <p style={{ fontSize: 10, color: '#8ca094', margin: '0 0 12px', lineHeight: 1.5 }}>
              To ensure data protection and proper account tracking, please sign in. Your message will be delivered with your verified client credentials to the admin desk.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ padding: '7px 14px', fontSize: 10 }}
                onClick={() => {
                  setOpen(false)
                  if (onNavigate) onNavigate('login')
                }}
              >
                Sign In to Chat ↗
              </button>
              <button
                type="button"
                className="btn btn-outline"
                style={{ padding: '7px 14px', fontSize: 10 }}
                onClick={() => {
                  setOpen(false)
                  if (onNavigate) onNavigate('register')
                }}
              >
                Open Account
              </button>
            </div>
          </div>
        )}

        <div className="live-chat-footnote">
          <div className="chat-option-heading">
            {TELEGRAM_DESK_LINK ? 'Two ways to reach the client desk' : 'Reach the client desk'}
          </div>
          <div className="chat-option-list">
            <div className="chat-option chat-option-current">
              <span className="chat-option-name">1 · In-app chat</span>
              <span className="chat-option-desc">
                You are here. Every message in this thread is stored on your account and appears instantly in the admin support inbox.
              </span>
              <span className="chat-option-state">Active now</span>
            </div>
            {TELEGRAM_DESK_LINK && (
              <a
                className="chat-option"
                href={TELEGRAM_DESK_LINK}
                target="_blank"
                rel="noreferrer"
              >
                <span className="chat-option-name">2 · Telegram</span>
                <span className="chat-option-desc">
                  Continue on Telegram. Opens a direct conversation with our support desk — no number to copy.
                </span>
                <span className="chat-option-state">Open Telegram ↗</span>
              </a>
            )}
          </div>
          <button
            type="button"
            className="btn btn-outline chat-option-portal"
            onClick={() => {
              setOpen(false)
              if (onNavigate) onNavigate(token ? 'portal-support' : 'login')
            }}
          >
            Open Support Portal
          </button>
        </div>
      </section>

      <button
        type="button"
        className="live-chat-launcher"
        aria-expanded={open}
        aria-controls="liveChatPanel"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="launcher-icon">💬</div>
        <div>
          <strong>Client Desk</strong>
          <small>{token ? `${clientName} · Online` : 'Sign in to message'}</small>
        </div>
        <span className="live-chat-dot" />
      </button>
    </>
  )
}
