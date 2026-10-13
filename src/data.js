export const DEFAULT_MARKET_ROWS = [
  ['EUR/USD', 'Euro / US Dollar', '1.0842', '+0.18%', 'positive', '€'],
  ['BTC/USD', 'Bitcoin / US Dollar', '$67,420', '+1.42%', 'positive', '₿'],
  ['XAU/USD', 'Gold / US Dollar', '$2,356.80', '−0.24%', 'negative', 'Au'],
  ['NAS100', 'Nasdaq 100', '18,214.6', '+0.62%', 'positive', '↗'],
  ['GBP/USD', 'British Pound / US Dollar', '1.2716', '+0.08%', 'positive', '£'],
]

export const DEMO_TRANSACTIONS = [
  ['Sample deposit', 'Demo account', '2026-10-07', '$1,000.00', 'pending'],
  ['Demo purchase', 'BTC/USD', '2026-10-05', '$250.00', 'review'],
  ['Sample withdrawal', 'Demo account', '2026-10-02', '$120.00', 'pending'],
  ['Demo adjustment', 'Portfolio', '2026-09-29', '$75.00', 'review'],
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
    const change = Number(quote.change_percent || 0)
    const tone = change >= 0 ? 'positive' : 'negative'
    const sign = change >= 0 ? '+' : '−'
    return [
      quote.symbol,
      quote.name || quote.symbol,
      formatPrice(quote.price),
      `${sign}${Math.abs(change).toFixed(2)}%`,
      tone,
      badgeFor(quote.symbol, quote.name),
    ]
  })
}
