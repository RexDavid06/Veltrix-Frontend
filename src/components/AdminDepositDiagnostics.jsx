import React, { useState } from 'react'
import api, { API_ROOT } from '../api'

const DEPOSITS_ENDPOINT = `${API_ROOT}/deposits`
const depositEndpoint = (path = '') => `${DEPOSITS_ENDPOINT}/${path}`

const EXPECTED_NETWORKS = ['tron_trc20', 'eth_erc20', 'bsc_bep20']

function extractNetworks(config = {}) {
  if (Array.isArray(config.networks) && config.networks.length > 0) {
    return { source: 'config.networks', networks: config.networks }
  }
  if (Array.isArray(config.methods)) {
    const crypto = config.methods.find((m) => m && m.type === 'crypto')
    if (crypto && Array.isArray(crypto.networks)) {
      return { source: 'methods[].networks', networks: crypto.networks }
    }
  }
  return { source: 'none', networks: [] }
}

function getNetworkInfo(networks = [], id) {
  const net = networks.find((n) => n && (n.id === id || n.key === id))
  if (!net) return { present: false }
  return {
    present: true,
    enabled: net.enabled === true,
    display_enabled: net.display_enabled === true,
    address_present: Boolean(net.address || net.contract_address),
  }
}

function sanitizeError(err) {
  const status = err?.response?.status
  const detail = err?.response?.data?.detail
  if (typeof detail === 'string' && detail.length > 0) {
    return `HTTP ${status || 'unknown'}: ${detail}`
  }
  if (err?.message === 'Network Error') {
    return 'Network error (cannot reach server)'
  }
  if (status) {
    return `HTTP ${status}`
  }
  return 'Request failed'
}

export default function AdminDepositDiagnostics() {
  const [loading, setLoading] = useState(false)
  const [configResult, setConfigResult] = useState(null)
  const [historyResult, setHistoryResult] = useState(null)

  const run = async () => {
    setLoading(true)
    setConfigResult(null)
    setHistoryResult(null)

    try {
      const res = await api.get(depositEndpoint('config/'))
      const data = res?.data || {}
      const { source, networks } = extractNetworks(data)
      const summary = {
        status: res?.status,
        ok: true,
        crypto_mode: data.crypto_mode,
        deposits_enabled: data.deposits_enabled,
        networks_source: source,
        networks: EXPECTED_NETWORKS.map((id) => ({ id, ...getNetworkInfo(networks, id) })),
      }
      setConfigResult(summary)
    } catch (err) {
      setConfigResult({
        status: err?.response?.status,
        ok: false,
        error: sanitizeError(err),
      })
    }

    try {
      const res = await api.get(depositEndpoint())
      setHistoryResult({
        status: res?.status,
        ok: true,
      })
    } catch (err) {
      setHistoryResult({
        status: err?.response?.status,
        ok: false,
        error: sanitizeError(err),
      })
    }

    setLoading(false)
  }

  return (
    <div className="app-card">
      <div className="section-row">
        <div>
          <h3>Deposit Configuration Diagnostics</h3>
          <div className="muted-copy">Temporary read-only check using authenticated API client</div>
        </div>
        <button className="btn btn-primary" onClick={run} disabled={loading}>
          {loading ? 'Running…' : 'Run Diagnostics'}
        </button>
      </div>

      <div style={{ marginTop: 16 }}>
        <h4 style={{ margin: '0 0 8px' }}>GET /api/deposits/config/</h4>
        {!configResult && <div className="muted-copy">Not run</div>}
        {configResult && configResult.ok && (
          <div>
            <div className="muted-copy">HTTP status: {configResult.status}</div>
            <div className="muted-copy">crypto_mode: {String(configResult.crypto_mode)}</div>
            <div className="muted-copy">deposits_enabled: {String(configResult.deposits_enabled)}</div>
            <div className="muted-copy">networks found in: {configResult.networks_source}</div>
            <table className="data-table" style={{ marginTop: 10 }}>
              <thead>
                <tr>
                  <th>Network ID</th>
                  <th>Present</th>
                  <th>enabled</th>
                  <th>display_enabled</th>
                  <th>address configured</th>
                </tr>
              </thead>
              <tbody>
                {configResult.networks.map((n) => (
                  <tr key={n.id}>
                    <td>{n.id}</td>
                    <td>{n.present ? 'yes' : 'no'}</td>
                    <td>{n.present ? String(n.enabled) : '—'}</td>
                    <td>{n.present ? String(n.display_enabled) : '—'}</td>
                    <td>{n.present ? String(n.address_present) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {configResult && !configResult.ok && (
          <div className="admin-warn">Failed: {configResult.error}</div>
        )}
      </div>

      <div style={{ marginTop: 20 }}>
        <h4 style={{ margin: '0 0 8px' }}>GET /api/deposits/</h4>
        {!historyResult && <div className="muted-copy">Not run</div>}
        {historyResult && historyResult.ok && (
          <div className="muted-copy">HTTP status: {historyResult.status}</div>
        )}
        {historyResult && !historyResult.ok && (
          <div className="admin-warn">Failed: {historyResult.error}</div>
        )}
      </div>

      <div className="muted-copy" style={{ marginTop: 16 }}>
        This is a temporary diagnostic. No secrets, addresses, or raw responses are displayed.
      </div>
    </div>
  )
}
