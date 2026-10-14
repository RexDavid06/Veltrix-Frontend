  ['GBP/USD', 'British Pound / US Dollar', '1.2716', '+0.08%', 'positive', '£'],
]

export const DEMO_TRANSACTIONS = [
  ['Sample deposit', 'Sample account', '2026-10-07', '$1,000.00', 'pending'],
  ['Sample purchase', 'BTC/USD', '2026-10-05', '$250.00', 'review'],
  ['Sample withdrawal', 'Sample account', '2026-10-02', '$120.00', 'pending'],
  ['Sample adjustment', 'Portfolio', '2026-09-29', '$75.00', 'review'],
]

export const NAV_ITEMS = [
  ['Overview', 'portal', '⌂', 'WORKSPACE'],
  ['Markets', 'markets', '◫', 'WORKSPACE'],
  ['Portfolio', 'portfolio', '◈', 'WORKSPACE'],
  ['Accounts', 'accounts', '▣', 'WORKSPACE'],
  ['Wallet', 'wallet', '◇', 'MONEY TOOLS'],
  ['Deposits', 'deposits', '↓', 'MONEY TOOLS'],
  ['Withdrawals', 'withdrawals', '↑', 'MONEY TOOLS'],
  ['Transactions', 'transactions', '≡', 'MONEY TOOLS'],
  ['Verification', 'kyc', '✓', 'ACCOUNT'],
  ['Support', 'portal-support', '✳', 'ACCOUNT'],
  ['Settings', 'settings', '⚙', 'ACCOUNT'],
]

export const ADMIN_ITEMS = [
  ['Overview', 'admin', '⌂', 'OPERATIONS'],
  ['Customers', 'admin-customers', '♙', 'OPERATIONS'],
  ['Verification', 'admin-kyc', '✓', 'OPERATIONS'],
  ['Transactions', 'admin-transactions', '≡', 'OPERATIONS'],
  ['Support inbox', 'admin-support', '✳', 'OPERATIONS'],
  ['Audit logs', 'admin-audit', '◷', 'SYSTEM'],
]

export function badgeFor(symbol = '', name = '') {
  const value = `${symbol} ${name}`.toUpperCase()
  if (value.includes('BTC') || value.includes('BITCOIN')) return '₿'
  if (value.includes('ETH') || value.includes('ETHEREUM')) return 'Ξ'
  if (value.includes('XAU') || value.includes('GOLD')) return 'Au'
  if (value.includes('EUR')) return '€'
  if (value.includes('GBP')) return '£'
  if (value.includes('JPY')) return '¥'
  return '↗'
}

export function formatPrice(value = 0) {
  const number = Number(value)
  if (Number.isNaN(number)) return '—'
  if (Math.abs(number) < 10) return number.toFixed(4)
  return `$${number.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatCurrency(value = 0) {
  const number = Number(value)
  if (Number.isNaN(number)) return '—'
  return `$${number.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// Maps the DRF /api/market/ payload into the original demo table row shape:
// [symbol, name, price, change, tone, badge]
export function marketRowsFromApi(quotes = []) {
  return quotes.map((quote) => {
    const symbol = quote.symbol || quote.pair || quote.ticker || ''
    const name = quote.name || quote.description || ''
    const price = quote.price || quote.last || quote.current_price || 0
    const change = quote.change_percent || quote.pct_change || quote.price_change_percentage_24h || 0
    const tone = Number(change) >= 0 ? 'positive' : 'negative'
    const changeText = (Number(change) >= 0 ? `+${Number(change).toFixed(2)}%` : `${Number(change).toFixed(2)}%`)
    return [String(symbol).toUpperCase(), name, formatPrice(price), changeText, tone, badgeFor(symbol, name)]
  })
}
