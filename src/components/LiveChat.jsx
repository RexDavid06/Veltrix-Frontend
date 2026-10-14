import React, { useEffect, useRef, useState } from 'react'

const AUTO_REPLY = 'Thanks for your message. This chat preview is not connected to a live human agent yet. Please do not share sensitive account or payment information.'
const TELEGRAM_LINK = import.meta.env.VITE_TELEGRAM_LINK || 'https://t.me/+07074195975'

export default function LiveChat() {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const [messages, setMessages] = useState([
    { label: 'VELTRIX SUPPORT', text: 'Hi there! Welcome to VELTRIX. How can we help you today?', user: false },
  ])
  const inputRef = useRef(null)
  const messagesRef = useRef(null)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight
  }, [messages])

  const submit = (event) => {
    event.preventDefault()
    const message = value.trim()
    if (!message) return
    setMessages((prev) => [
      ...prev,
      { label: 'YOU', text: message, user: true },
      { label: 'DEMO AUTO-REPLY', text: AUTO_REPLY, user: false },
    ])
    setValue('')
  }

  return (
    <>
      <section
        className={`live-chat-panel ${open ? '' : 'hidden'}`}
        id="liveChatPanel"
        aria-label="VELTRIX human support chat"
        aria-hidden={!open}
      >
        <div className="live-chat-header">
          <div className="live-agent-avatar">V</div>
          <div className="live-agent-copy">
            <strong>VELTRIX Support</strong>
            <span><i className="live-chat-dot" /> In-app chat and Telegram support</span>
          </div>
          <button type="button" className="live-chat-close" id="liveChatClose" aria-label="Close chat" onClick={() => setOpen(false)}>×</button>
        </div>
        <div className="live-chat-notice">Need help fast? Use the in-app chat below or continue with Telegram support.</div>
        <div className="live-chat-messages" id="liveChatMessages" aria-live="polite" ref={messagesRef}>
          {messages.map((message, index) => (
            <div className={`live-chat-message ${message.user ? 'user-message' : 'agent-message'}`} key={index}>
              <span>{message.label}</span>{message.text}
            </div>
          ))}
        </div>
        <form className="live-chat-form" id="liveChatForm" onSubmit={submit}>
          <label className="sr-only" htmlFor="liveChatInput">Your message</label>
          <input
            id="liveChatInput"
            name="message"
            maxLength={500}
            placeholder="Type your message…"
            autoComplete="off"
            required
            ref={inputRef}
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
          <button type="submit" aria-label="Send message">➤</button>
        </form>
        <div className="live-chat-footnote">
          <div style={{ marginBottom: '8px' }}>Need another way to reach us?</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button type="button" onClick={() => setOpen(true)} style={{ padding: '6px 10px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.04)', color: '#fff', cursor: 'pointer' }}>
              In-app chat
            </button>
            <a
              href={TELEGRAM_LINK}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px 10px',
                borderRadius: '999px',
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(255,255,255,0.04)',
                color: '#fff',
                textDecoration: 'none',
              }}
            >
              Telegram
            </a>
          </div>
        </div>
      </section>
      <button
        className="live-chat-launcher"
        id="liveChatLauncher"
        type="button"
        aria-controls="liveChatPanel"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="launcher-icon">▤</span>
        <span><strong>Support</strong><small>Chat or Telegram</small></span>
        <i className="live-chat-dot" />
      </button>
    </>
  )
}
