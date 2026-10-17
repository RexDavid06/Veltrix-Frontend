// High-accuracy live market data service using free, real-time public feeds:
// 1. Live Charts API (/api/live-chart/*) for NASDAQ, Equities, Forex, and Futures
// 2. Binance Public 24hr Ticker (native CORS enabled) for Bitcoin, Ethereum, and Gold (PAXG)
// 3. Open Exchange Rates API (native CORS enabled) for real-time EUR/USD, GBP/USD, and currencies

import { badgeFor, formatPrice } from '../data'

export const DEFAULT_LIVE_MARKETS = [
  {
    symbol: 'EUR/USD',
    name: 'Euro / US Dollar',
    price: 1.1218,
    priceFormatted: '1.1218',
    change: 0.22,
    changeText: '+0.22%',
    tone: 'positive',
    badge: '€',
    category: 'FOREX',
    spark: 'M0 24 L20 20 L37 28 L54 18 L72 22 L91 14 L108 19 L126 10 L144 14 L161 8 L180 12 L200 4',
  },
  {
    symbol: 'BTC/USD',
    name: 'Bitcoin / US Dollar',
    price: 81259.58,
    priceFormatted: '$81,259.58',
    change: 1.45,
    changeText: '+1.45%',
    tone: 'positive',
    badge: '₿',
    category: 'CRYPTO',
    spark: 'M0 34 L20 37 L37 22 L54 28 L72 15 L91 24 L108 7 L126 16 L144 5 L161 13 L180 4 L200 8',
  },
  {
    symbol: 'XAU/USD',
    name: 'Gold / US Dollar',
    price: 4165.40,
    priceFormatted: '$4,165.40',
    change: -0.18,
    changeText: '−0.18%',
    tone: 'negative',
    badge: 'Au',
    category: 'COMMODITIES',
    spark: 'M0 9 L20 15 L37 11 L54 25 L72 17 L91 29 L108 19 L126 27 L144 23 L161 34 L180 25 L200 38',
  },
  {
    symbol: 'NAS100',
    name: 'NASDAQ 100',
    price: 26692.87,
    priceFormatted: '26,692.87',
    change: 0.62,
    changeText: '+0.62%',
    tone: 'positive',
    badge: '↗',
    category: 'INDICES',
    spark: 'M0 38 L20 29 L37 34 L54 21 L72 26 L91 11 L108 18 L126 9 L144 16 L161 5 L180 12 L200 2',
  },
  {
    symbol: 'GBP/USD',
    name: 'British Pound / US Dollar',
    price: 1.3225,
    priceFormatted: '1.3225',
    change: 0.12,
    changeText: '+0.12%',
    tone: 'positive',
    badge: '£',
    category: 'FOREX',
    spark: 'M0 20 L20 25 L37 18 L54 22 L72 15 L91 19 L108 12 L126 16 L144 9 L161 14 L180 7 L200 11',
  },
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    price: 224.23,
    priceFormatted: '$224.23',
    change: 0.84,
    changeText: '+0.84%',
    tone: 'positive',
    badge: '↗',
    category: 'EQUITY',
    spark: 'M0 28 L20 22 L37 25 L54 17 L72 19 L91 12 L108 15 L126 8 L144 11 L161 4 L180 9 L200 3',
  },
  {
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    price: 134.80,
    priceFormatted: '$134.80',
    change: 2.15,
    changeText: '+2.15%',
    tone: 'positive',
    badge: '↗',
    category: 'EQUITY',
    spark: 'M0 35 L20 30 L37 32 L54 20 L72 24 L91 14 L108 16 L126 7 L144 12 L161 3 L180 8 L200 1',
  },
  {
    symbol: 'ETH/USD',
    name: 'Ethereum / US Dollar',
    price: 3480.50,
    priceFormatted: '$3,480.50',
    change: 1.10,
    changeText: '+1.10%',
    tone: 'positive',
    badge: 'Ξ',
    category: 'CRYPTO',
    spark: 'M0 30 L20 32 L37 20 L54 24 L72 14 L91 18 L108 8 L126 12 L144 6 L161 10 L180 4 L200 7',
  },
]

// Convert internal quote format to table row format:
// [symbol, name, priceFormatted, changeText, tone, badge]
export function quoteToRow(quote) {
  return [
    quote.symbol,
    quote.name,
    quote.priceFormatted,
    quote.changeText,
    quote.tone,
    quote.badge,
  ]
}

// Fetch live crypto and gold prices from Binance public ticker (CORS-friendly, no API key)
async function fetchBinanceQuotes() {
  try {
    const symbols = encodeURIComponent(JSON.stringify(['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'PAXGUSDT']))
    const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=${symbols}`)
    if (!res.ok) return {}
    const items = await res.json()
    const map = {}
    items.forEach((item) => {
      const price = parseFloat(item.lastPrice)
      const changePct = parseFloat(item.priceChangePercent)
      map[item.symbol] = {
        price,
        change: changePct,
        tone: changePct >= 0 ? 'positive' : 'negative',
        changeText: changePct >= 0 ? `+${changePct.toFixed(2)}%` : `${changePct.toFixed(2)}%`,
      }
    })
    return map
  } catch (err) {
    return {}
  }
}

// Fetch live forex rates from Open Exchange Rates (CORS-friendly, free, updated continuously)
async function fetchForexRates() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD')
    if (!res.ok) return {}
    const data = await res.json()
    const rates = data.rates || {}
    const map = {}

    // The rates feed exposes spot prices only, not a previous close, so the
    // daily change is genuinely unknown. Report it as such instead of showing
    // an invented percentage next to a live price.
    const unavailable = { change: null, changeText: '—', tone: 'neutral' }

    if (rates.EUR && rates.EUR > 0) {
      const eurUsd = 1 / rates.EUR
      map['EURUSD'] = { price: eurUsd, priceFormatted: eurUsd.toFixed(4), ...unavailable }
    }
    if (rates.GBP && rates.GBP > 0) {
      const gbpUsd = 1 / rates.GBP
      map['GBPUSD'] = { price: gbpUsd, priceFormatted: gbpUsd.toFixed(4), ...unavailable }
    }
    if (rates.JPY && rates.JPY > 0) {
      map['USDJPY'] = { price: rates.JPY, priceFormatted: rates.JPY.toFixed(2), ...unavailable }
    }

    return map
  } catch (err) {
    return {}
  }
}

// Fetch live stock/index chart quote from Yahoo Finance proxy
async function fetchYahooQuote(symbol) {
  try {
    const res = await fetch(`/api/live-chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`)
    if (!res.ok) return null
    const json = await res.json()
    const meta = json?.chart?.result?.[0]?.meta
    if (!meta || !meta.regularMarketPrice) return null

    const price = meta.regularMarketPrice
    const prevClose = meta.chartPreviousClose || meta.previousClose || price
    const change = prevClose ? ((price - prevClose) / prevClose) * 100 : 0

    return {
      price,
      change,
      tone: change >= 0 ? 'positive' : 'negative',
      changeText: change >= 0 ? `+${change.toFixed(2)}%` : `${change.toFixed(2)}%`,
      priceFormatted: formatPrice(price),
    }
  } catch (err) {
    return null
  }
}

// Master function to fetch the latest accurate live market data
export async function fetchLiveMarketQuotes() {
  const [binanceData, forexData] = await Promise.all([
    fetchBinanceQuotes(),
    fetchForexRates(),
  ])

  // Try Yahoo proxy in parallel for indices & equities
  const [nasdaqQuote, aaplQuote, nvdaQuote] = await Promise.all([
    fetchYahooQuote('^IXIC'),
    fetchYahooQuote('AAPL'),
    fetchYahooQuote('NVDA'),
  ])

  return DEFAULT_LIVE_MARKETS.map((item) => {
    // 1. Bitcoin
    if (item.symbol === 'BTC/USD' && binanceData['BTCUSDT']) {
      const btc = binanceData['BTCUSDT']
      return {
        ...item,
        price: btc.price,
        priceFormatted: `$${btc.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        change: btc.change,
        changeText: btc.changeText,
        tone: btc.tone,
      }
    }

    // 2. Ethereum
    if (item.symbol === 'ETH/USD' && binanceData['ETHUSDT']) {
      const eth = binanceData['ETHUSDT']
      return {
        ...item,
        price: eth.price,
        priceFormatted: `$${eth.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        change: eth.change,
        changeText: eth.changeText,
        tone: eth.tone,
      }
    }

    // 3. Gold / USD (PAXGUSDT is backed 1:1 by fine troy ounce physical gold)
    if (item.symbol === 'XAU/USD') {
      if (binanceData['PAXGUSDT']) {
        const gold = binanceData['PAXGUSDT']
        return {
          ...item,
          price: gold.price,
          priceFormatted: `$${gold.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          change: gold.change,
          changeText: gold.changeText,
          tone: gold.tone,
        }
      }
    }

    // 4. EUR/USD
    if (item.symbol === 'EUR/USD' && forexData['EURUSD']) {
      const fx = forexData['EURUSD']
      return {
        ...item,
        price: fx.price,
        priceFormatted: fx.priceFormatted,
        change: fx.change,
        changeText: fx.changeText,
        tone: fx.tone,
      }
    }

    // 5. GBP/USD
    if (item.symbol === 'GBP/USD' && forexData['GBPUSD']) {
      const fx = forexData['GBPUSD']
      return {
        ...item,
        price: fx.price,
        priceFormatted: fx.priceFormatted,
        change: fx.change,
        changeText: fx.changeText,
        tone: fx.tone,
      }
    }

    // 6. NASDAQ 100
    if (item.symbol === 'NAS100' && nasdaqQuote) {
      return {
        ...item,
        price: nasdaqQuote.price,
        priceFormatted: nasdaqQuote.price.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 }),
        change: nasdaqQuote.change,
        changeText: nasdaqQuote.changeText,
        tone: nasdaqQuote.tone,
      }
    }

    // 7. AAPL
    if (item.symbol === 'AAPL' && aaplQuote) {
      return {
        ...item,
        price: aaplQuote.price,
        priceFormatted: `$${aaplQuote.price.toFixed(2)}`,
        change: aaplQuote.change,
        changeText: aaplQuote.changeText,
        tone: aaplQuote.tone,
      }
    }

    // 8. NVDA
    if (item.symbol === 'NVDA' && nvdaQuote) {
      return {
        ...item,
        price: nvdaQuote.price,
        priceFormatted: `$${nvdaQuote.price.toFixed(2)}`,
        change: nvdaQuote.change,
        changeText: nvdaQuote.changeText,
        tone: nvdaQuote.tone,
      }
    }

    return item
  })
}
