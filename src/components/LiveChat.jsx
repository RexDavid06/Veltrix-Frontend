import React, { useEffect, useRef, useState } from 'react'

const AUTO_REPLY = 'Thanks for your message. Your support request has been logged. Our simulation response team will update this conversation shortly.'
const TELEGRAM_LINK = import.meta.env.VITE_TELEGRAM_LINK || 'https://t.me/+07074195975'

export default function LiveChat({
  token,
  conversations = [],
  onCreateConversation,
  onSendMessage,
}) {
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

  const submit = async (event) => {
    event.preventDefault()
    const text = value.trim()
    if (!text) return

    setMessages((prev) => [
      ...prev,
      { label: 'YOU', text, user: true },
    ])
    setValue('')

    if (token && onCreateConversation) {
      try {
        const activeConvo = conversations[0]
        if (activeConvo && onSendMessage) {
          await onSendMessage(activeConvo.id, text)
        } else {
          await onCreateConversation('Live Chat Enquiry', text)
        }
      } catch (e) {
        console.error('Failed to post to backend conversations', e)
      }
    }

    // Agent response preview
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { label: 'VELTRIX AGENT', text: AUTO_REPLY, user: false },
      ])
    }, 700)
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
            <span><i className="live-chat-dot" /> Live Chat & Telegram Support</span>
          </div>
          <button type="button" className="live-chat-close" id="liveChatClose" aria-label="Close chat" onClick={() => setOpen(false)}>×</button>
        </div>
        <div className="live-chat-notice">
          {token
            ? 'Connected to your demo account support thread.'
            : 'Need help fast? Use in-app chat below or continue via Telegram.'}
        </div>
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
            <a className="btn btn-quiet" href={TELEGRAM_LINK} target="_blank" rel="noreferrer">Telegram</a>
            <a className="btn btn-outline" href="#support" onClick={() => setOpen(false)}>Support centre</a>
          </div>
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
          <strong>Need help?</strong>
          <small>Chat with support</small>
        </div>
        <span className="live-chat-dot" />
      </button>
    </>
  )
}
