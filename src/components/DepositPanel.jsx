import React, { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import api, { API_ROOT } from '../api'

const FALLBACK_TRON = 'TRON (TRC20)'
const DEPOSITS_ENDPOINT = `${API_ROOT}/deposits`
const depositEndpoint = (path = '') => `${DEPOSITS_ENDPOINT}/${path}`

function isValidNetworkAddress(network, address) {
  if (typeof address !== 'string' || address !== address.trim()) return false
  if (network === 'USDT_ERC20' || network === 'USDT_BEP20') {
    return /^0x[a-fA-F0-9]{40}$/.test(address)
  }
  if (network === 'USDT_TRC20') {
    return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address)
  }
  return false
}

export default function DepositPanel({ onNavigate }) {
  const [config, setConfig] = useState({})
  const [method, setMethod] = useState('crypto')
  const [amount, setAmount] = useState('')
  const [deposits, setDeposits] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [configState, setConfigState] = useState('loading')
  const [selectedNetwork, setSelectedNetwork] = useState('')
  const [networkAddress, setNetworkAddress] = useState('')
  const [addressQr, setAddressQr] = useState('')
  const [addressState, setAddressState] = useState('idle')
  const [addressError, setAddressError] = useState('')
  const [copyState, setCopyState] = useState('idle')
  const networks = [
    { key: 'USDT_ERC20', label: 'USDT Ethereum (ERC-20)' },
    { key: 'USDT_TRC20', label: 'USDT TRON (TRC-20)' },
    { key: 'USDT_BEP20', label: 'USDT BNB Smart Chain (BEP-20)' },
  ]
  const methods = Array.isArray(config.methods) ? config.methods : []
  const methodConfig = (type) => methods.find((item) => item && item.type === type) || {}
  const bankMethod = methodConfig('bank_transfer')
  const directMode = (config.crypto_mode || import.meta.env.VITE_CRYPTO_DEPOSIT_MODE || 'direct_tron') === 'direct_tron'
  const bank = config.bank && typeof config.bank === 'object' && !Array.isArray(config.bank) ? config.bank : {}
  const configReady = configState === 'ready'
  const depositsEnabled = Boolean(config.deposits_enabled)
  const bankCurrency = String(bank.currency || bankMethod.currency || '').trim()
  const bankEnabled = bank.enabled !== undefined ? Boolean(bank.enabled) : Boolean(bankMethod.enabled)
  const bankAvailable = Boolean(configReady && depositsEnabled && bankEnabled && bankCurrency)
  const bankInstructions = String(
    bank.instructions || bankMethod.instructions ||
    'Contact Veltrix admin/support to receive verified bank account details. Never send funds to details from an unverified source.'
  ).trim()

  const load = async () => {
    try {
      const result = await api.get(depositEndpoint())
      setDeposits(Array.isArray(result.data) ? result.data : [])
      setError('')
    } catch (err) {
      setError(err?.response?.data?.detail || 'Deposit service is currently unavailable.')
    }
    try {
      const result = await api.get(depositEndpoint('config/'))
      const data = result?.data
      if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).length === 0) {
        setConfig({})
        setConfigState('error')
        return
      }
      setConfig(data)
      setConfigState('ready')
    } catch {
      setConfigState((current) => current === 'ready' ? 'ready' : 'error')
    }
  }
  useEffect(() => {
    load()
    const timer = window.setInterval(load, 20000)
    return () => window.clearInterval(timer)
  }, [])

  const createDeposit = async (event) => {
    event.preventDefault()
    if (method !== 'bank' || !bankAvailable) {
      return
    }
    setLoading(true)
    setError('')
    try {
      const key = globalThis.crypto?.randomUUID?.() || `deposit-${Date.now()}-${Math.random().toString(36).slice(2)}`
      const result = await api.post(depositEndpoint('bank/'), { amount, idempotency_key: key }, { headers: { 'Idempotency-Key': key } })
      setDeposits((items) => [result.data, ...items.filter((item) => item.id !== result.data.id)])
      setAmount('')
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not create deposit instructions. Please retry or contact support.')
    } finally {
      setLoading(false)
    }
  }

  const confirmQuote = async (deposit) => {
    setLoading(true)
    setError('')
    try {
      const result = await api.post(depositEndpoint(`${deposit.id}/confirm/`))
      setDeposits((items) => items.map((item) => item.id === deposit.id ? result.data : item))
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not confirm this quote. Request a new quote.')
      await load()
    } finally {
      setLoading(false)
    }
  }

  const statusLabel = (value) => ({ pending: 'Awaiting payment', detected: 'Confirming', verifying: 'Confirming',
    verified: 'Confirmed', credited: 'Credited', available: 'Completed', manual_review: 'Manual review',
    expired: 'Expired', rejected: 'Failed', reversed: 'Reversed' }[value] || value)
  const selectNetwork = async (network) => {
    setSelectedNetwork(network)
    setNetworkAddress('')
    setAddressQr('')
    setAddressError('')
    setCopyState('idle')
    setAddressState('loading')
    try {
      const result = await api.get(depositEndpoint(`networks/${network}/address/`))
      const address = result?.data?.address
      if (typeof address !== 'string' || !address) {
        setAddressState('unavailable')
        return
      }
      if (!isValidNetworkAddress(network, address)) {
        setAddressError('The configured address is invalid for this network. No address is displayed.')
        setAddressState('error')
        return
      }
      const exactAddress = address
      const qr = await QRCode.toDataURL(exactAddress, { margin: 1, width: 192 })
      setNetworkAddress(exactAddress)
      setAddressQr(qr)
      setAddressState('ready')
    } catch (err) {
      if (err?.response?.status === 503 || err?.response?.status === 404) {
        setAddressState('unavailable')
      } else {
        setAddressError(err?.response?.data?.detail || 'Could not load this network address. Please try again.')
        setAddressState('error')
      }
    }
  }

  const copyAddress = async () => {
    setCopyState('copying')
    try {
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(networkAddress)
          setCopyState('copied')
          return
        } catch {
          // Try the document copy command when the Clipboard API is denied.
        }
      }

      const field = document.createElement('textarea')
      field.value = networkAddress
      field.setAttribute('readonly', '')
      field.style.position = 'fixed'
      field.style.opacity = '0'
      document.body.appendChild(field)
      let copied = false
      try {
        field.select()
        field.setSelectionRange(0, field.value.length)
        copied = document.execCommand?.('copy') === true
      } finally {
        field.remove()
      }
      if (!copied) throw new Error('Copy command did not succeed')
      setCopyState('copied')
    } catch {
      setCopyState('error')
    }
  }

  return (
    <div className="app-card">
      <div className="eyebrow"><span className="eyebrow-line" /> FUNDING</div>
      <h3>Deposit funds</h3>
      <p className="muted-copy">
        {!configReady
          ? 'Checking available deposit options…'
          : 'Crypto addresses are for network selection only; deposit processing is not enabled. Bank transfers are arranged manually with Veltrix support.'}
      </p>

      <div role="tablist" aria-label="Deposit method" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8, margin: '16px 0' }}>
        {[
          {
            id: 'crypto',
            title: 'Deposit via Crypto',
            detail: 'Choose a USDT network to view its receiving address',
            badge: 'Address only',
          },
          {
            id: 'bank',
            title: 'Bank Transfer',
            detail: 'Manual · verified details via support',
            badge: 'Contact support',
          },
          {
            id: 'card',
            title: 'Card Payment',
            detail: 'Debit or credit card',
            badge: 'Coming soon',
          },
        ].map((option) => (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={method === option.id}
            className={`btn ${method === option.id ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setMethod(option.id)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', textAlign: 'left', gap: 4, minHeight: 66, padding: '12px 14px', whiteSpace: 'normal' }}
          >
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <strong style={{ fontSize: 12 }}>{option.title}</strong>
              <span style={{ fontSize: 8, letterSpacing: '.06em', textTransform: 'uppercase', border: '1px solid currentColor', borderRadius: 3, padding: '2px 5px', opacity: .82, whiteSpace: 'nowrap' }}>{option.badge}</span>
            </span>
            <span style={{ fontSize: 10, lineHeight: 1.4, opacity: .78 }}>{option.detail}</span>
          </button>
        ))}
      </div>

      {configState === 'loading' && (
        <div role="status" aria-busy="true" style={{ margin: '16px 0' }}>
          <div style={{ padding: 14, border: '1px solid var(--line)', borderRadius: 5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ height: 12, width: 180, background: 'rgba(255,255,255,0.08)', borderRadius: 3 }} />
              <div style={{ height: 18, width: 120, background: 'rgba(255,255,255,0.06)', borderRadius: 3 }} />
            </div>
            <div style={{ marginTop: 10, height: 10, width: '90%', background: 'rgba(255,255,255,0.05)', borderRadius: 3 }} />
            <div style={{ marginTop: 6, height: 10, width: '70%', background: 'rgba(255,255,255,0.05)', borderRadius: 3 }} />
          </div>
          <p className="muted-copy" style={{ margin: '10px 0' }}>Checking available deposit methods…</p>
        </div>
      )}
      {configState === 'error' && (
        <div className="admin-warn" role="alert">
          Deposit configuration could not be loaded. For safety, payment requests are disabled until it is available.
          <button type="button" className="btn btn-outline" style={{ marginLeft: 10, padding: '5px 9px', fontSize: 10 }} onClick={load}>Retry</button>
        </div>
      )}

      {method === 'crypto' && <section role="tabpanel" aria-label="Crypto USDT deposit" style={{ marginTop: 16 }}>
        <p className="muted-copy">Select a network to request its configured public address. Address display does not start a deposit or verify a payment.</p>
        <div aria-label="USDT network" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 8 }}>
          {networks.map((network) => <button key={network.key} type="button" className={`btn ${selectedNetwork === network.key ? 'btn-primary' : 'btn-outline'}`} aria-pressed={selectedNetwork === network.key} onClick={() => selectNetwork(network.key)}>{network.label}</button>)}
        </div>
        {addressState === 'loading' && <p role="status" aria-busy="true" className="muted-copy" style={{ marginTop: 14 }}>Loading receiving address…</p>}
        {addressState === 'unavailable' && <div role="status" className="admin-warn" style={{ marginTop: 14 }}>This network address is currently unavailable. No address is configured.</div>}
        {addressState === 'error' && <div role="alert" className="admin-warn" style={{ marginTop: 14 }}>{addressError}<button type="button" className="btn btn-outline" style={{ marginLeft: 10 }} onClick={() => selectNetwork(selectedNetwork)}>Retry</button></div>}
        {addressState === 'ready' && <div style={{ margin: '16px 0', padding: 14, border: '1px solid var(--line)', borderRadius: 5, overflowWrap: 'anywhere' }}>
          <div className="stat-label">{networks.find((network) => network.key === selectedNetwork)?.label} RECEIVING ADDRESS</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
            <code data-testid="deposit-address" style={{ fontSize: 14 }}>{networkAddress}</code>
            <button type="button" className="btn btn-outline" onClick={copyAddress} disabled={copyState === 'copying'}>{copyState === 'copied' ? 'Address copied' : copyState === 'copying' ? 'Copying…' : 'Copy address'}</button>
          </div>
          {addressQr && <img data-testid="deposit-address-qr" src={addressQr} alt={`QR code for ${networks.find((network) => network.key === selectedNetwork)?.label} address`} width="192" height="192" style={{ display: 'block', marginTop: 12, background: '#fff', padding: 8 }} />}
          {copyState === 'error' && <p role="alert" className="muted-copy">Could not copy the address. Select and copy it manually.</p>}
          <p className="muted-copy" style={{ marginBottom: 0 }}>Receiving address only. Deposit processing and balance crediting are not enabled. Verify the network carefully before sending funds.</p>
        </div>}
      </section>}

      {method === 'bank' && <section role="tabpanel" aria-label="Bank transfer deposit" style={{ marginTop: 16 }}>
        <div style={{ padding: 14, border: '1px solid var(--line)', borderRadius: 5 }}>
          <h4 style={{ margin: '0 0 6px' }}>Bank Transfer</h4>
          <p className="muted-copy" style={{ marginBottom: 10 }}>{bankInstructions}</p>
          <div className="admin-warn" role="note">
            No bank account details are issued automatically. Veltrix never displays bank account details in the app. Contact admin/support for verified account details and always confirm them through the official support channel. Never send funds to details from an unverified source.
          </div>
          <button type="button" className="btn btn-outline" onClick={() => onNavigate?.('portal-support')}>Contact support for verified details</button>
        </div>
        {configReady && !bankAvailable && (
          <p className="muted-copy" style={{ marginTop: 12 }}>
            Automated bank-transfer requests are not open on this deployment. Contact support to arrange a manual transfer.
          </p>
        )}
        {method === 'bank' && bankAvailable && (
          <form onSubmit={createDeposit} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 10, maxWidth: 520, alignItems: 'end', margin: '20px 0' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="depositAmount">Amount ({bankCurrency})</label>
              <input id="depositAmount" type="number" min="0.01" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 50.00" />
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} type="submit" disabled={loading}>{loading ? 'Preparing instructions…' : 'Request bank-transfer instructions'}</button>
          </form>
        )}
      </section>}

      {method === 'card' && <section role="tabpanel" aria-label="Card payment" style={{ marginTop: 16, padding: 14, border: '1px solid var(--line)', borderRadius: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <h4 style={{ margin: 0 }}>Card Payment</h4>
          <span className="status">Coming soon</span>
        </div>
        <p className="muted-copy" style={{ margin: '8px 0 14px' }}>
          Card payments are not available yet. No card details are collected and no payment can be started from this screen.
        </p>
        <button type="button" className="btn btn-outline" disabled style={{ opacity: .55, cursor: 'not-allowed' }}>Card payment coming soon</button>
      </section>}

      {error && <div className="admin-warn" role="alert">{error}</div>}

      <h3 style={{ marginTop: 28 }}>Deposit history</h3>
      {deposits.length === 0 ? <p className="muted-copy">No deposits yet.</p> : <div style={{ display: 'grid', gap: 12 }}>
        {deposits.map((deposit) => {
          const isBank = deposit.rail === 'bank'
          const payable = deposit.payable_amount || deposit.expected_amount
          const requested = deposit.requested_amount || deposit.expected_amount
          return <article key={deposit.id} style={{ padding: 14, border: '1px solid var(--line)', borderRadius: 5, overflowWrap: 'anywhere' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <strong>{isBank ? `Bank transfer · ${deposit.asset}` : deposit.provider_creation_uncertain ? 'USDT payable not confirmed' : `${payable} USDT payable`}</strong>
              <span className="status">{statusLabel(deposit.status)}</span>
            </div>
            <div className="muted-copy" style={{ marginTop: 6 }}>{deposit.network || deposit.instructions?.network || FALLBACK_TRON} · Reference {deposit.reference}</div>

            {isBank && <div style={{ marginTop: 10 }}>
              <div>Requested: <strong>{deposit.expected_amount} {deposit.asset}</strong></div>
              {deposit.verified_amount && <div>Verified received: <strong>{deposit.verified_amount} {deposit.asset}</strong></div>}
              <p className="muted-copy">{deposit.instructions?.message || bank.instructions}</p>
              {deposit.instructions?.account_details_provided === false && <button type="button" className="btn btn-outline" style={{ marginTop: 8 }} onClick={() => onNavigate?.('portal-support')}>Contact support for verified details</button>}
            </div>}

            {!isBank && deposit.price_amount && <div style={{ marginTop: 10 }}>
              <div>USD entered: <strong>${deposit.price_amount} USD</strong></div>
              <div>Quoted USDT payable: <strong>{deposit.provider_creation_uncertain ? 'Not confirmed' : `${deposit.quoted_amount} USDT`}</strong></div>
              <div>Provider/network fees: {deposit.provider_fee_amount ? `${deposit.provider_fee_amount} ${deposit.provider_fee_currency}` : 'Not itemized by NOWPayments; your wallet may charge a network fee.'}</div>
              <div>Veltrix fee: <strong>{deposit.veltrix_fee_amount || '0'} {deposit.veltrix_fee_currency || 'USD'}</strong></div>
              {deposit.quote_expires_at && <div className="muted-copy">Quote expires {new Date(deposit.quote_expires_at).toLocaleString()}</div>}
            </div>}
            {!isBank && deposit.price_amount && !deposit.quote_confirmed && deposit.status === 'pending' && <button type="button" className="btn btn-primary" style={{ marginTop: 10 }} disabled={loading} onClick={() => confirmQuote(deposit)}>Confirm quote</button>}

            {!isBank && directMode && requested !== payable && <div className="admin-warn" style={{ marginTop: 8 }}>Requested {requested} USDT; send exactly <strong>{payable} USDT</strong> so the payment can be matched to your request. The extra amount is part of your deposit.</div>}
            {deposit.minimum_deposit && <div className="muted-copy">Minimum deposit: {deposit.minimum_deposit} USDT</div>}
            {!isBank && deposit.instructions?.address && <div style={{ marginTop: 12 }}>
              <div className="stat-label">SEND {deposit.instructions.amount} USDT TO</div>
              <code>{deposit.instructions.address}</code>
              <p className="muted-copy">{deposit.instructions.note}</p>
              {deposit.qr_code && <img src={deposit.qr_code} alt="QR code for the USDT deposit address" width="160" height="160" style={{ display: 'block', margin: '12px 0', background: '#fff', padding: 8 }} />}
              <button type="button" className="btn btn-outline" onClick={() => navigator.clipboard?.writeText(deposit.instructions.address)}>Copy address</button>
              <span className="muted-copy" style={{ marginLeft: 10 }}>TRC20 only. Sending another token or network can lose funds.</span>
            </div>}
            {!isBank && deposit.expires_at && <div className="muted-copy">Pay before {new Date(deposit.expires_at).toLocaleString()}</div>}
            {!isBank && directMode && deposit.required_confirmations > 0 && !['credited', 'available', 'reserved'].includes(deposit.status) && <div className="muted-copy">Blockchain confirmations: {deposit.confirmations || 0} / {deposit.required_confirmations}</div>}
            {deposit.transaction_hash && <div className="muted-copy">Linked transaction: <code>{deposit.transaction_hash}</code></div>}
            {!isBank && deposit.submitted_txid && !deposit.transaction_hash && <div className="muted-copy">Submitted for verification: <code>{deposit.submitted_txid}</code>. This is a claim, not proof of payment.</div>}

            {deposit.provider_creation_uncertain && <div className="admin-warn" style={{ marginTop: 8 }}>Payment creation could not be confirmed. Do not request another deposit; contact support and include this reference.</div>}
            {deposit.status === 'manual_review' && !deposit.provider_creation_uncertain && <div className="admin-warn" style={{ marginTop: 8 }}>This deposit needs a manual check. Contact support and include this reference. Do not send again.</div>}
          </article>
        })}
      </div>}
    </div>
  )
}
