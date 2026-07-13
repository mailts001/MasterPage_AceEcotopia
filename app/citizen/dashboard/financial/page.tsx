'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface BullishTicker {
  symbol: string
  price: number
  chg_1d: number
  chg_5d: number
  rsi: number
  macd_hist: number
  vol_surge: number
  pct_b: number
  bull_score: number
  bear_score: number
  direction: string
  bull_reasons: string[]
  bear_reasons: string[]
  squeeze: boolean
  spike_signal: boolean
  options_note?: string
  options?: { ivr_approx?: number; put_call_ratio?: number }
}

interface ScannerPick {
  symbol: string
  price?: number
  signals?: string[]
  rsi?: number
  score?: number
}

interface SqueezeAlert {
  symbol: string
  type?: string
  price?: number
  signals?: string[]
}

interface Picks {
  timestamp: string | null
  bullish: BullishTicker[]
  bearish: BullishTicker[]
  scanner_picks: ScannerPick[]
  squeeze_alerts: SqueezeAlert[]
  spike_alerts: SqueezeAlert[]
  error?: string
}

interface GaSignal {
  symbol: string
  action: string
  price: number
  confidence: number
  stop: number
  target: number
  scores: { trend: number; momentum: number; volume: number; volatility: number }
  ts: string
}

interface CongressTrade {
  symbol: string
  score: number
  type: string
  detail: string
  date: string
}

interface Intel {
  generated_at: string | null
  market_regime: string
  regime_bias: string
  regime_notes: string[]
  ic_suitable: boolean
  best_strategy: { name: string; win_rate: number; sharpe: number | null; avg_pnl: number; count: number } | null
  strategy_label: string
  rationale: string
  ga_signals: GaSignal[]
  hot_sectors: string[]
  bearish_symbols: string[]
  defensive: string[]
  congress_trades: CongressTrade[]
  error?: string
}

function ScoreBar({ score, max = 10 }: { score: number; max?: number }) {
  const pct = Math.min(100, (score / max) * 100)
  const color = pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-slate-500 font-mono">{score}/{max}</span>
    </div>
  )
}

function TickerCard({ t, watchlisted }: { t: BullishTicker; watchlisted: boolean }) {
  const [open, setOpen] = useState(false)
  const bullPct = Math.min(100, (t.bull_score / 10) * 100)
  const signalColor = bullPct >= 70 ? 'border-green-500/30 bg-green-500/5'
    : bullPct >= 40 ? 'border-yellow-500/30 bg-yellow-500/5'
    : 'border-white/10 bg-white/3'
  const scoreColor = bullPct >= 70 ? 'text-green-400' : bullPct >= 40 ? 'text-yellow-400' : 'text-slate-400'

  return (
    <div className={`rounded-xl border ${signalColor} p-4 transition`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white text-sm font-mono">{t.symbol}</span>
          {watchlisted && <span className="text-[10px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded-full border border-cyan-500/30">⭐ watchlist</span>}
          {t.squeeze && <span className="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded-full border border-purple-500/30">⚡ squeeze</span>}
          {t.spike_signal && <span className="text-[10px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded-full border border-orange-500/30">🚀 spike</span>}
        </div>
        <div className="text-right">
          <div className="text-sm font-mono text-white">${t.price?.toFixed(2)}</div>
          <div className={`text-[10px] font-mono ${t.chg_1d >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {t.chg_1d >= 0 ? '+' : ''}{t.chg_1d?.toFixed(2)}% today
          </div>
        </div>
      </div>

      {/* Key metrics row */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center">
          <div className={`text-xs font-mono font-bold ${t.rsi > 70 ? 'text-red-400' : t.rsi < 40 ? 'text-green-400' : 'text-cyan-400'}`}>{t.rsi?.toFixed(0)}</div>
          <div className="text-[9px] text-slate-600">RSI</div>
        </div>
        <div className="text-center">
          <div className={`text-xs font-mono font-bold ${t.macd_hist > 0 ? 'text-green-400' : 'text-red-400'}`}>{t.macd_hist > 0 ? '+' : ''}{t.macd_hist?.toFixed(2)}</div>
          <div className="text-[9px] text-slate-600">MACD hist</div>
        </div>
        <div className="text-center">
          <div className={`text-xs font-mono font-bold ${t.vol_surge > 0.5 ? 'text-yellow-400' : 'text-slate-400'}`}>{t.vol_surge > 0 ? '+' : ''}{(t.vol_surge * 100).toFixed(0)}%</div>
          <div className="text-[9px] text-slate-600">vol surge</div>
        </div>
      </div>

      {/* Bull score bar */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-slate-500">Signal strength</span>
          <span className={`text-[10px] font-bold ${scoreColor}`}>{bullPct >= 70 ? 'STRONG' : bullPct >= 40 ? 'MODERATE' : 'WEAK'}</span>
        </div>
        <ScoreBar score={t.bull_score} />
      </div>

      {/* Expand reasons */}
      <button onClick={() => setOpen(!open)} className="text-[10px] text-slate-600 hover:text-slate-400 transition">
        {open ? '▲ hide reasons' : `▼ ${t.bull_reasons?.length ?? 0} bull signals`}
      </button>
      {open && (
        <ul className="mt-2 space-y-0.5">
          {t.bull_reasons?.map((r, i) => (
            <li key={i} className="text-[10px] text-green-400 flex gap-1"><span>✓</span>{r}</li>
          ))}
          {t.bear_reasons?.map((r, i) => (
            <li key={i} className="text-[10px] text-red-400 flex gap-1"><span>✗</span>{r}</li>
          ))}
          {t.options_note && (
            <li className="text-[10px] text-purple-400 flex gap-1 mt-1"><span>⚙</span>{t.options_note.trim()}</li>
          )}
        </ul>
      )}
    </div>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="border border-dashed border-white/10 rounded-xl p-8 text-center col-span-2">
      <p className="text-slate-600 text-sm mb-1">No {label} signals yet</p>
      <p className="text-slate-700 text-xs">Scanner runs nightly at 9 PM SGT — check back after market close</p>
    </div>
  )
}

export default function FinancialDashboard() {
  const [picks, setPicks]           = useState<Picks | null>(null)
  const [intel, setIntel]           = useState<Intel | null>(null)
  const [watchlist, setWatchlist]   = useState<string[]>([])
  const [loading, setLoading]       = useState(true)
  const [intelLoading, setIntelLoading] = useState(true)
  const [tab, setTab]               = useState<'momentum'|'squeeze'|'intel'>('momentum')

  useEffect(() => {
    Promise.all([
      fetch('/api/nexus/financial/picks').then(r => r.json()),
      fetch('/api/citizen/watchlist').then(r => r.json()).catch(() => []),
    ]).then(([p, wl]) => {
      setPicks(p)
      const tickers = (Array.isArray(wl) ? wl : [])
        .filter((a: { district: string }) => a.district === 'aceeconomy')
        .map((a: { asset_id: string }) => a.asset_id)
      setWatchlist(tickers)
      setLoading(false)
    })
    fetch('/api/nexus/financial/intel').then(r => r.json()).then(d => {
      setIntel(d)
      setIntelLoading(false)
    }).catch(() => setIntelLoading(false))
  }, [])

  const bullish       = picks?.bullish ?? []
  const squeezes      = [...(picks?.squeeze_alerts ?? []), ...(picks?.spike_alerts ?? [])]
  const scannerPicks  = picks?.scanner_picks ?? []
  const allMomentum   = bullish.length > 0 ? bullish : scannerPicks.map(s => ({
    symbol: s.symbol, price: s.price ?? 0, chg_1d: 0, chg_5d: 0,
    rsi: s.rsi ?? 0, macd_hist: 0, vol_surge: 0, pct_b: 0,
    bull_score: s.score ?? 0, bear_score: 0, direction: 'BULLISH',
    bull_reasons: s.signals ?? [], bear_reasons: [],
    squeeze: false, spike_signal: false,
  } as BullishTicker))

  const lastScan = picks?.timestamp
    ? new Date(picks.timestamp).toLocaleString('en-SG', { dateStyle: 'medium', timeStyle: 'short' })
    : null

  return (
    <div className="min-h-screen bg-[#0A0E1A] text-white">
      <nav className="border-b border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 bg-[#0A0E1A]/95 backdrop-blur z-10">
        <Link href="/" className="text-lg font-bold gradient-text">X68</Link>
        <Link href="/citizen/dashboard" className="text-sm text-gray-400 hover:text-white transition">← Dashboard</Link>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">

        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl">💹</span>
            <h1 className="text-2xl font-bold">Financial District</h1>
            <span className="text-xs px-2 py-0.5 rounded-full border border-green-500/40 bg-green-500/10 text-green-400">● LIVE</span>
          </div>
          <p className="text-gray-500 text-sm">
            AI-powered signals — US & HK markets. Intelligence only. Execution is yours.
          </p>
          {lastScan && (
            <p className="text-[11px] text-slate-600 mt-1">Last scan: {lastScan}</p>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Momentum picks', value: loading ? '…' : allMomentum.length, color: 'text-green-400' },
            { label: 'Squeeze/Spike alerts', value: loading ? '…' : squeezes.length, color: 'text-purple-400' },
            { label: 'Your watchlist tickers', value: loading ? '…' : watchlist.length, color: 'text-cyan-400' },
          ].map(s => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <div className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
          {([
            { key: 'momentum', label: `📈 Momentum (${allMomentum.length})` },
            { key: 'squeeze',  label: `⚡ Squeeze (${squeezes.length})` },
            { key: 'intel',    label: '📡 GA Intel' },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 text-xs py-2 rounded-lg transition font-medium ${
                tab === t.key
                  ? 'bg-white/10 text-white'
                  : 'text-slate-500 hover:text-slate-300'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Signal cards */}
        {tab === 'momentum' ? (
          loading ? (
            <div className="grid md:grid-cols-2 gap-4">
              {[1,2,3,4].map(i => <div key={i} className="h-40 rounded-xl bg-white/5 animate-pulse" />)}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {allMomentum.length === 0
                ? <EmptyState label="momentum" />
                : allMomentum.map(t => (
                    <TickerCard key={t.symbol} t={t} watchlisted={watchlist.includes(t.symbol)} />
                  ))
              }
            </div>
          )
        ) : tab === 'squeeze' ? (
          loading ? (
            <div className="grid md:grid-cols-2 gap-4">
              {[1,2].map(i => <div key={i} className="h-32 rounded-xl bg-white/5 animate-pulse" />)}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {squeezes.length === 0
                ? <EmptyState label="squeeze" />
                : squeezes.map((s, i) => (
                    <div key={i} className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white font-mono text-sm">{s.symbol}</span>
                          {watchlist.includes(s.symbol) && (
                            <span className="text-[10px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded-full border border-cyan-500/30">⭐ watchlist</span>
                          )}
                        </div>
                        <span className="text-[10px] text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full">
                          {s.type ?? 'Squeeze'}
                        </span>
                      </div>
                      {s.price && <div className="text-sm font-mono text-slate-300 mb-2">${s.price?.toFixed(2)}</div>}
                      {s.signals && s.signals.length > 0 && (
                        <ul className="space-y-0.5">
                          {s.signals.map((sig, j) => (
                            <li key={j} className="text-[10px] text-purple-300 flex gap-1"><span>⚡</span>{sig}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))
              }
            </div>
          )
        ) : (
          /* ── GA Intel Tab ── */
          intelLoading ? (
            <div className="space-y-4">
              {[1,2,3].map(i => <div key={i} className="h-28 rounded-xl bg-white/5 animate-pulse" />)}
            </div>
          ) : !intel ? (
            <EmptyState label="intel" />
          ) : (
            <div className="space-y-6">

              {/* Market Regime + GA Recommendation */}
              <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest">Market Regime</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${
                        intel.regime_bias === 'bullish' ? 'border-green-500/40 bg-green-500/10 text-green-400' :
                        intel.regime_bias === 'bearish' ? 'border-red-500/40 bg-red-500/10 text-red-400' :
                        'border-slate-500/40 bg-slate-500/10 text-slate-400'
                      }`}>{intel.regime_bias}</span>
                    </div>
                    <div className="text-xl font-bold text-white">{intel.market_regime}</div>
                  </div>
                  {intel.best_strategy && (
                    <div className="text-right">
                      <div className="text-xs text-slate-500 mb-0.5">GA Best Strategy</div>
                      <div className="text-sm font-bold text-green-400">{intel.strategy_label}</div>
                      {intel.best_strategy.sharpe && (
                        <div className="text-[10px] text-slate-500">Sharpe {intel.best_strategy.sharpe} · {intel.best_strategy.win_rate.toFixed(0)}% win</div>
                      )}
                    </div>
                  )}
                </div>
                <p className="text-sm text-slate-300 leading-relaxed mb-3">{intel.rationale}</p>
                {intel.regime_notes.length > 0 && (
                  <ul className="space-y-0.5">
                    {intel.regime_notes.map((n, i) => (
                      <li key={i} className="text-[11px] text-slate-500">{n}</li>
                    ))}
                  </ul>
                )}
              </div>

              {/* GA Shadow Signals */}
              {intel.ga_signals.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-mono text-indigo-400 uppercase tracking-widest">GA Evolution Picks</span>
                    <span className="text-[10px] text-slate-600 border border-slate-700 rounded px-1.5 py-0.5">paper-traded · not live</span>
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    {intel.ga_signals.map((s, i) => {
                      const confPct = Math.round(s.confidence * 100)
                      const upside = s.target && s.price ? ((s.target - s.price) / s.price * 100).toFixed(1) : null
                      const downside = s.stop && s.price ? ((s.price - s.stop) / s.price * 100).toFixed(1) : null
                      return (
                        <div key={i} className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white font-mono text-sm">{s.symbol}</span>
                              <span className="text-[10px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded-full">{s.action}</span>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-mono text-white">${s.price.toFixed(2)}</div>
                              <div className={`text-[10px] font-mono ${confPct >= 65 ? 'text-green-400' : confPct >= 50 ? 'text-yellow-400' : 'text-slate-500'}`}>
                                {confPct}% conf
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 mb-2">
                            <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${confPct >= 65 ? 'bg-green-500' : confPct >= 50 ? 'bg-yellow-500' : 'bg-slate-500'}`}
                                style={{ width: `${confPct}%` }} />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[10px]">
                            {upside && <div><span className="text-slate-600">Target </span><span className="text-green-400 font-mono">+{upside}%</span></div>}
                            {downside && <div><span className="text-slate-600">Stop </span><span className="text-red-400 font-mono">-{downside}%</span></div>}
                          </div>
                          <div className="grid grid-cols-4 gap-1 mt-2">
                            {Object.entries(s.scores).map(([k, v]) => (
                              <div key={k} className="text-center">
                                <div className="text-[9px] text-slate-600 capitalize">{k}</div>
                                <div className={`text-[10px] font-mono ${Number(v) >= 0.7 ? 'text-green-400' : Number(v) >= 0.4 ? 'text-yellow-400' : 'text-slate-500'}`}>
                                  {(Number(v) * 100).toFixed(0)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Sector Rotation */}
              <div className="grid md:grid-cols-3 gap-3">
                {intel.hot_sectors.length > 0 && (
                  <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
                    <div className="text-[10px] text-green-400 font-mono uppercase tracking-widest mb-2">Hot Sectors</div>
                    <div className="flex flex-wrap gap-1">
                      {intel.hot_sectors.map(s => (
                        <span key={s} className="text-xs bg-green-500/10 text-green-300 border border-green-500/20 px-2 py-0.5 rounded-full font-mono">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                {intel.bearish_symbols.length > 0 && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                    <div className="text-[10px] text-red-400 font-mono uppercase tracking-widest mb-2">Avoid / Underperform</div>
                    <div className="flex flex-wrap gap-1">
                      {intel.bearish_symbols.map(s => (
                        <span key={s} className="text-xs bg-red-500/10 text-red-300 border border-red-500/20 px-2 py-0.5 rounded-full font-mono">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                {intel.defensive.length > 0 && (
                  <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4">
                    <div className="text-[10px] text-yellow-400 font-mono uppercase tracking-widest mb-2">Defensive Hedge</div>
                    <div className="flex flex-wrap gap-1">
                      {intel.defensive.map(s => (
                        <span key={s} className="text-xs bg-yellow-500/10 text-yellow-300 border border-yellow-500/20 px-2 py-0.5 rounded-full font-mono">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Congress / Insider Trades */}
              {intel.congress_trades.length > 0 && (
                <div>
                  <div className="text-xs font-mono text-amber-400 uppercase tracking-widest mb-3">Congress &amp; Insider Trades</div>
                  <div className="space-y-2">
                    {intel.congress_trades.slice(0, 8).map((c, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg border border-amber-500/15 bg-amber-500/5 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-white font-mono text-sm w-14">{c.symbol}</span>
                          <div>
                            <div className="text-xs text-slate-300">{c.detail}</div>
                            <div className="text-[10px] text-slate-600">{c.date}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono border ${
                            c.type === 'CONGRESS_BUY' ? 'text-green-400 border-green-500/30 bg-green-500/10' :
                            'text-red-400 border-red-500/30 bg-red-500/10'
                          }`}>{c.type === 'CONGRESS_BUY' ? 'BUY' : 'SELL'}</span>
                          <span className="text-[10px] text-amber-400 font-mono">score {c.score}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-700 mt-2">Source: public congressional disclosure filings. Not investment advice.</p>
                </div>
              )}

              {intel.generated_at && (
                <p className="text-[10px] text-slate-700">GA Intel generated: {new Date(intel.generated_at).toLocaleString('en-SG', { dateStyle: 'medium', timeStyle: 'short' })}</p>
              )}
            </div>
          )
        )}

        {/* Watchlist CTA */}
        {watchlist.length === 0 && !loading && (
          <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-white font-medium">Add tickers to your watchlist</p>
              <p className="text-xs text-slate-500 mt-0.5">Get Telegram alerts only for stocks you care about</p>
            </div>
            <Link href="/citizen/dashboard#watchlist"
              className="text-xs bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-4 py-2 rounded-lg transition shrink-0">
              + Add tickers
            </Link>
          </div>
        )}

        {/* How it works */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white/5 border border-green-500/20 rounded-xl p-5">
            <h3 className="font-semibold text-green-400 mb-2 text-sm">📈 Momentum Scanner</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Scans US & HK equities for RSI 50–72, MACD bullish crossover, and volume &gt;1.5× average.
              Scores each ticker 0–10. Runs nightly 9 PM SGT.
            </p>
          </div>
          <div className="bg-white/5 border border-purple-500/20 rounded-xl p-5">
            <h3 className="font-semibold text-purple-400 mb-2 text-sm">⚡ Bollinger Squeeze</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Detects Bollinger Band compression setups. Tier 1 pre-market 8:30 PM SGT,
              Tier 2 ORB confirmation 9:40 PM SGT. High-probability breakout entries.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
