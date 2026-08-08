'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

// ── Types ─────────────────────────────────────────────────────────────────────

interface PeerPerf {
  ticker: string
  price?: number
  '1y'?: number
  '6m'?: number
  '3m'?: number
  '5d'?: number
  overnight?: number
  vol_ann?: number
  sharpe_1y?: number
}

interface TickerData extends PeerPerf {
  signal: string
  bull_score?: number
  bull_reasons?: string[]
  vol_ratio?: number
  bear_est?: number
  bull_est?: number
  vs_spy_1y?: number
  peers?: PeerPerf[]
  spy?: PeerPerf
  alert_meta?: Record<string, string>
  error?: string
}

interface WatchlistResponse {
  tickers: TickerData[]
  spy?: PeerPerf
  generated_at?: string
  error?: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const RISK_FREE = 4.3

function pct(v: number | undefined | null, decimals = 1) {
  if (v == null) return '—'
  return `${v >= 0 ? '+' : ''}${v.toFixed(decimals)}%`
}

function retColor(v: number | undefined | null) {
  if (v == null) return 'text-slate-600'
  if (v >= 5) return 'text-green-400'
  if (v >= 0) return 'text-green-300'
  if (v >= -5) return 'text-red-300'
  return 'text-red-400'
}

function sharpeLabel(s: number | undefined | null): { label: string; color: string } {
  if (s == null) return { label: '—', color: 'text-slate-600' }
  if (s >= 1)   return { label: 'Strong', color: 'text-green-400' }
  if (s >= 0.5) return { label: 'OK', color: 'text-yellow-300' }
  if (s >= 0)   return { label: 'Weak', color: 'text-amber-400' }
  return { label: 'Below RFR', color: 'text-red-400' }
}

function SignalBadge({ signal }: { signal: string }) {
  const cfg: Record<string, string> = {
    BUY:     'bg-green-500/15 text-green-300 border-green-500/30',
    WATCH:   'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
    SQUEEZE: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    NEUTRAL: 'bg-white/5 text-slate-500 border-white/10',
    SELL:    'bg-red-500/15 text-red-300 border-red-500/30',
  }
  const cls = cfg[signal] ?? cfg.NEUTRAL
  return (
    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${cls}`}>
      {signal}
    </span>
  )
}

// ── Period performance grid ───────────────────────────────────────────────────

function PerfGrid({ d }: { d: PeerPerf }) {
  const periods: { label: string; key: keyof PeerPerf }[] = [
    { label: 'Overnight', key: 'overnight' },
    { label: '5d',        key: '5d' },
    { label: '3m',        key: '3m' },
    { label: '6m',        key: '6m' },
    { label: '1y',        key: '1y' },
  ]
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {periods.map(({ label, key }) => {
        const val = d[key] as number | undefined
        return (
          <div key={key} className="rounded-lg border border-white/8 bg-white/3 py-2 text-center">
            <div className="text-[9px] text-slate-600 mb-0.5">{label}</div>
            <div className={`text-[13px] font-bold font-mono ${retColor(val)}`}>
              {pct(val)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Peer comparison bars ──────────────────────────────────────────────────────

function PeerBars({ ticker, peers, spy, period = '1y' }: {
  ticker: string
  peers: PeerPerf[]
  spy?: PeerPerf
  period?: keyof PeerPerf
}) {
  const self = { ticker, ...peers.find(p => p.ticker === ticker) } // won't match; we build self separately
  const all: { t: string; v: number | undefined; isSelf?: boolean; isSpy?: boolean }[] = [
    ...peers.map(p => ({ t: p.ticker, v: p[period] as number | undefined })),
  ]
  if (spy && spy.ticker !== ticker) {
    all.push({ t: 'SPY', v: spy[period] as number | undefined, isSpy: true })
  }

  const vals = all.map(a => a.v ?? 0)
  const max = Math.max(Math.abs(Math.max(...vals)), Math.abs(Math.min(...vals)), 1)

  return (
    <div className="space-y-1">
      {all.map(({ t, v, isSpy }) => {
        const pctW = Math.min(Math.abs((v ?? 0) / max) * 100, 100)
        const positive = (v ?? 0) >= 0
        return (
          <div key={t} className="flex items-center gap-2">
            <span className={`text-[10px] font-mono shrink-0 w-12 ${
              isSpy ? 'text-slate-400' : t === ticker ? 'text-cyan-300 font-bold' : 'text-slate-500'
            }`}>
              {t}{isSpy ? '' : ''}
            </span>
            <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${positive ? 'bg-green-500' : 'bg-red-500'} ${isSpy ? 'opacity-40' : ''}`}
                style={{ width: `${pctW}%` }}
              />
            </div>
            <span className={`text-[10px] font-mono shrink-0 w-14 text-right ${
              isSpy ? 'text-slate-500' : retColor(v)
            }`}>
              {pct(v)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Single ticker card ────────────────────────────────────────────────────────

function TickerCard({ d }: { d: TickerData }) {
  const [expanded, setExpanded] = useState(false)
  const sh = d.sharpe_1y
  const { label: shLabel, color: shColor } = sharpeLabel(sh)
  const hasSqueeze = d.signal === 'SQUEEZE'
  const hasBuy     = d.signal === 'BUY'

  // vs SPY badge
  const vsSpy = d.vs_spy_1y
  const vsSpyEl = vsSpy != null ? (
    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
      vsSpy >= 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
    }`}>
      {vsSpy >= 0 ? '▲' : '▼'} {Math.abs(vsSpy).toFixed(1)}% vs SPY
    </span>
  ) : null

  return (
    <div className={`rounded-xl border p-4 space-y-3 transition ${
      hasSqueeze ? 'border-purple-500/40 bg-purple-500/5' :
      hasBuy     ? 'border-green-500/30 bg-green-500/4' :
                   'border-white/10 bg-white/3'
    }`}>
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <SignalBadge signal={d.signal} />
        <span className="text-sm font-bold font-mono text-white">{d.ticker}</span>
        {d.price != null && (
          <span className="text-[11px] text-slate-500 font-mono">${d.price.toFixed(2)}</span>
        )}
        <span className="flex-1" />
        {vsSpyEl}
        {d.vol_ratio != null && (
          <span className="text-[9px] text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded">
            Vol {d.vol_ratio.toFixed(1)}×
          </span>
        )}
        {d.bull_score != null && (
          <span className="text-[9px] text-slate-500">Score {d.bull_score}/4</span>
        )}
      </div>

      {/* Bull reasons */}
      {d.bull_reasons && d.bull_reasons.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {d.bull_reasons.map((r, i) => (
            <span key={i} className="text-[9px] text-slate-500 bg-white/5 border border-white/8 px-1.5 py-0.5 rounded">
              {r}
            </span>
          ))}
        </div>
      )}

      {/* Performance grid */}
      <PerfGrid d={d} />

      {/* Peer bars */}
      {d.peers && d.peers.length > 0 && (
        <div className="space-y-1">
          <div className="text-[9px] font-mono text-slate-600 uppercase tracking-wider">vs peers &amp; SPY (1y)</div>
          <PeerBars ticker={d.ticker} peers={d.peers} spy={d.spy} period="1y" />
        </div>
      )}

      {/* Risk metrics */}
      <div className="grid grid-cols-4 gap-1.5">
        <div className="rounded-lg border border-white/8 bg-white/3 py-2 text-center">
          <div className="text-[8px] text-slate-600 mb-0.5">Volatility σ</div>
          <div className="text-[12px] font-bold font-mono text-amber-300">
            {d.vol_ann != null ? `${d.vol_ann.toFixed(1)}%` : '—'}
          </div>
        </div>
        <div className="rounded-lg border border-white/8 bg-white/3 py-2 text-center">
          <div className="text-[8px] text-slate-600 mb-0.5">Sharpe 1y</div>
          <div className={`text-[12px] font-bold font-mono ${shColor}`}>
            {sh != null ? sh.toFixed(2) : '—'}
          </div>
          <div className={`text-[8px] ${shColor}`}>{shLabel}</div>
        </div>
        <div className="rounded-lg border border-red-500/15 bg-red-500/5 py-2 text-center">
          <div className="text-[8px] text-slate-600 mb-0.5">Bear est.</div>
          <div className={`text-[12px] font-bold font-mono ${d.bear_est != null && d.bear_est >= 0 ? 'text-slate-300' : 'text-red-400'}`}>
            {pct(d.bear_est)}
          </div>
        </div>
        <div className="rounded-lg border border-cyan-500/15 bg-cyan-500/5 py-2 text-center">
          <div className="text-[8px] text-slate-600 mb-0.5">Bull est.</div>
          <div className="text-[12px] font-bold font-mono text-cyan-300">
            {pct(d.bull_est)}
          </div>
        </div>
      </div>

      {/* SPY comparison row */}
      {d.spy && (
        <div className="rounded-lg border border-white/8 bg-white/3 p-2 flex items-center gap-3 text-[10px]">
          <span className="text-slate-600 shrink-0">SPY</span>
          <div className="flex gap-3 flex-wrap">
            {(['overnight','5d','3m','6m','1y'] as (keyof PeerPerf)[]).map(k => (
              <span key={k} className="text-slate-600">
                <span className="text-slate-700">{k} </span>
                <span className={retColor(d.spy![k] as number)}>{pct(d.spy![k] as number)}</span>
              </span>
            ))}
          </div>
          <span className="ml-auto shrink-0">
            {d.spy.sharpe_1y != null && (
              <span className={`text-[9px] ${sharpeLabel(d.spy.sharpe_1y).color}`}>
                Sharpe {d.spy.sharpe_1y.toFixed(2)}
              </span>
            )}
          </span>
        </div>
      )}

      {/* Alert meta */}
      {d.alert_meta && Object.keys(d.alert_meta).length > 0 && (
        <div className="text-[9px] text-slate-600 flex gap-3 flex-wrap">
          {Object.entries(d.alert_meta).map(([k, v]) => (
            <span key={k}><span className="text-slate-700">{k.replace(/_/g, ' ')}:</span> {v}</span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Alert criteria panel ──────────────────────────────────────────────────────

function AlertCriteriaPanel() {
  return (
    <div className="rounded-xl border border-white/8 bg-white/3 p-4 space-y-3">
      <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
        When do you get a Telegram alert?
      </div>
      <div className="grid grid-cols-1 gap-2 text-[11px]">
        {[
          { icon: '🚀', label: 'Momentum BUY signal',     desc: 'Ticker scores ≥2/4 on nightly scan: RSI 50–72, MACD bullish cross, price above EMA20, volume >1.5× average.' },
          { icon: '🔷', label: 'Squeeze confirmation',    desc: 'Tier 1 (pre-market 8:30 PM SGT): Bollinger Band squeeze + unusual volume spike. Tier 2 (ORB 9:40 PM SGT): opening-range breakout confirmation.' },
          { icon: '📅', label: 'Earnings within 5 days',  desc: 'Earnings scanner detects a report date within your alert window. Alert fires once when crossing the threshold.' },
          { icon: '📊', label: 'RSI extreme cross',       desc: 'RSI crosses below 30 (oversold) or above 70 (overbought) on the daily timeframe.' },
          { icon: '⚡', label: 'Volume spike >2×',        desc: 'Intraday or end-of-day volume exceeds 2× the 20-day average — often precedes a breakout or breakdown.' },
          { icon: '🎯', label: 'Price threshold',         desc: 'Set a target price when adding to watchlist. Alert fires when the ticker crosses it (up or down).' },
        ].map(({ icon, label, desc }) => (
          <div key={label} className="flex gap-3 items-start">
            <span className="text-base shrink-0 mt-0.5">{icon}</span>
            <div>
              <div className="text-slate-300 font-medium">{label}</div>
              <div className="text-[10px] text-slate-600 leading-relaxed">{desc}</div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[9px] text-slate-700 border-t border-white/5 pt-2">
        Alerts fire to your Telegram account (configured in watchlist settings). All signals are indicative — not investment advice. Scans run nightly at 9 PM SGT (US market) and 9 AM SGT (HK market).
      </p>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

type Filter = 'all' | 'buy' | 'squeeze' | 'watch'

export default function WatchlistSignalsPage() {
  const [data, setData]       = useState<WatchlistResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState<Filter>('all')
  const [lastAt, setLastAt]   = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/citizen/watchlist/performance')
      const json = await res.json()
      setData(json)
      setLastAt(json.generated_at ?? null)
    } catch {
      setData({ tickers: [], error: 'Failed to load' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const tickers = (data?.tickers ?? []).filter(t => !t.error)
  const errored = (data?.tickers ?? []).filter(t => !!t.error)

  const filtered = tickers.filter(t => {
    if (filter === 'buy')     return t.signal === 'BUY'
    if (filter === 'squeeze') return t.signal === 'SQUEEZE'
    if (filter === 'watch')   return t.signal === 'WATCH'
    return true
  })

  const squeezeCount = tickers.filter(t => t.signal === 'SQUEEZE').length
  const buyCount     = tickers.filter(t => t.signal === 'BUY').length

  return (
    <div className="min-h-screen bg-[#0A0E1A] text-white px-4 py-6 max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link href="/citizen/dashboard/financial" className="text-[10px] text-slate-600 hover:text-slate-400 transition">
            ← Financial District
          </Link>
          <h1 className="text-xl font-bold text-white mt-1">Watchlist Signals</h1>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {tickers.length} ticker{tickers.length !== 1 ? 's' : ''} · live performance + nightly scan signals
            {lastAt && ` · updated ${new Date(lastAt).toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit' })} SGT`}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="text-[11px] border border-white/15 rounded-lg px-3 py-1.5 text-slate-400 hover:text-white hover:border-white/30 transition disabled:opacity-40"
        >
          {loading ? '…' : '↻ Refresh'}
        </button>
      </div>

      {/* Alert summary strip */}
      {(squeezeCount > 0 || buyCount > 0) && !loading && (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-2.5 flex items-center gap-3 text-[11px] text-amber-300 flex-wrap">
          <span>⚡</span>
          {squeezeCount > 0 && <span>{squeezeCount} squeeze signal{squeezeCount > 1 ? 's' : ''}</span>}
          {buyCount     > 0 && <span>{buyCount} BUY signal{buyCount > 1 ? 's' : ''}</span>}
          <span className="text-amber-500/60">— Telegram alert sent if configured</span>
        </div>
      )}

      {/* Filters */}
      {tickers.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {([
            { key: 'all',     label: `All (${tickers.length})` },
            { key: 'buy',     label: `Buy (${buyCount})` },
            { key: 'squeeze', label: `Squeeze (${squeezeCount})` },
            { key: 'watch',   label: `Watch (${tickers.filter(t => t.signal === 'WATCH').length})` },
          ] as { key: Filter; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`text-[11px] px-3 py-1 rounded-full border transition ${
                filter === key
                  ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300'
                  : 'border-white/10 text-slate-500 hover:border-white/25 hover:text-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-xl border border-white/8 bg-white/3 p-4 h-40 animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && tickers.length === 0 && (
        <div className="rounded-xl border border-white/8 bg-white/3 py-16 text-center space-y-3">
          <div className="text-3xl">⭐</div>
          <p className="text-slate-400 text-sm">No tickers in your financial watchlist yet.</p>
          <p className="text-[11px] text-slate-600">
            Add tickers from the{' '}
            <Link href="/citizen/dashboard" className="text-cyan-400 hover:underline">
              Dashboard watchlist panel
            </Link>{' '}
            — choose Financial District and enter a ticker symbol.
          </p>
        </div>
      )}

      {/* VPS error */}
      {data?.error && (
        <div className="rounded-xl border border-red-500/25 bg-red-500/5 px-4 py-3 text-[11px] text-red-400">
          ⚠ {data.error}
          <span className="text-slate-600 ml-2">— the VPS performance endpoint may still be starting up. Try refreshing in 30 seconds.</span>
        </div>
      )}

      {/* Ticker cards */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-4">
          {filtered.map(t => <TickerCard key={t.ticker} d={t} />)}
        </div>
      )}

      {/* Errored tickers */}
      {errored.length > 0 && (
        <div className="text-[10px] text-slate-700 space-y-0.5">
          <div className="text-slate-600 mb-1">Could not load data for:</div>
          {errored.map(t => (
            <div key={t.ticker}>{t.ticker} — {t.error}</div>
          ))}
        </div>
      )}

      {/* Alert criteria */}
      <AlertCriteriaPanel />

      {/* SPY reference */}
      {data?.spy && !loading && (
        <div className="rounded-xl border border-white/8 bg-white/3 p-4 space-y-2">
          <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">S&amp;P 500 reference (SPY)</div>
          <PerfGrid d={data.spy} />
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="text-slate-600">
              Volatility σ: <span className="text-amber-300 font-mono">{data.spy.vol_ann?.toFixed(1) ?? '—'}%</span>
            </div>
            <div className="text-slate-600">
              Sharpe 1y: <span className={`font-mono ${sharpeLabel(data.spy.sharpe_1y).color}`}>
                {data.spy.sharpe_1y?.toFixed(2) ?? '—'}
              </span>
            </div>
          </div>
        </div>
      )}

      <p className="text-[9px] text-slate-700 text-center pb-4">
        Performance data via yfinance · signals from AceEconomy nightly scan · risk-free rate {RISK_FREE}% · not investment advice
      </p>
    </div>
  )
}
