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

interface IronCondor {
  symbol: string
  short_put: number; long_put: number; short_call: number; long_call: number
  expiry: string; dte: number
  net_credit: number; credit_per_contract: number; max_loss_per_contract: number
  lower_breakeven: number; upper_breakeven: number
  prob_profit_pct: number; annual_yield_pct: number
  iv_rank: number; current_price: number
}

interface OptionsRec {
  strategy: string; short: string; rationale: string
  suitable_for: string; avoid: string; emoji: string
}

interface Intel {
  // regime
  regime: string
  regime_score: number
  regime_signals: string[]
  regime_updated: string | null
  commentary: string
  entry_allowed: boolean
  size_multiplier: number
  halt_strategies: string[]
  // internals
  vix: number | null; vix_5d_chg: number | null; spy_5d: number | null
  breadth_pct: number | null
  defensive_outperforming: boolean
  rotation_signals: string[]
  options_stress: boolean; options_signals: string[]
  // news
  news_sentiment: number | null; news_summary: string; news_headline_count: number
  news_bearish: { title: string; score: number; theme: string }[]
  news_bullish: { title: string; score: number; theme: string }[]
  shock_event: boolean
  // options
  options_recommendation: OptionsRec
  iron_condors: IronCondor[]
  options_summary: { total_opportunities: number; iron_condors: number; avg_yield_pct: number }
  options_scanned_at: string | null
  // ga
  ga_signals: GaSignal[]; hot_sectors: string[]; bearish_symbols: string[]; defensive: string[]
  best_strategy: { name: string; win_rate: number; sharpe: number | null; avg_pnl: number; count: number } | null
  strategy_label: string
  // congress
  congress_trades: CongressTrade[]
  error?: string
}

type Market = 'US' | 'HK' | 'JP' | 'SG' | 'ETF'

interface SectorRotation { sector: string; etf: string; d5: number; d22: number }
interface EtfPick extends BullishTicker {
  etf_type?: string
  top_holdings?: { symbol: string; chg_1d: number }[]
  chg_1m?: number
}
interface EtfData {
  timestamp: string | null
  bullish: EtfPick[]
  bearish: EtfPick[]
  neutral: EtfPick[]
  sector_rotation: SectorRotation[]
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
  const [etfData, setEtfData]       = useState<EtfData | null>(null)
  const [watchlist, setWatchlist]   = useState<string[]>([])
  const [loading, setLoading]       = useState(true)
  const [intelLoading, setIntelLoading] = useState(true)
  const [tab, setTab]               = useState<'momentum'|'squeeze'|'intel'>('momentum')
  const [market, setMarket]         = useState<Market>('US')
  const [marketLoading, setMarketLoading] = useState(false)

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

  async function switchMarket(m: Market) {
    if (m === market) return
    setMarket(m)
    if (m === 'US') return // already loaded
    setMarketLoading(true)
    try {
      const res = await fetch(`/api/nexus/financial/picks?market=${m}`)
      const data = await res.json()
      if (m === 'ETF') setEtfData(data)
      else setPicks(data)
    } finally {
      setMarketLoading(false)
    }
  }

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

        {/* Market selector */}
        <div className="flex gap-2">
          {([
            { key: 'US',  label: '🇺🇸 US' },
            { key: 'HK',  label: '🇭🇰 HK' },
            { key: 'JP',  label: '🇯🇵 Japan' },
            { key: 'SG',  label: '🇸🇬 Singapore' },
            { key: 'ETF', label: '🌏 ETFs' },
          ] as const).map(m => (
            <button key={m.key} onClick={() => switchMarket(m.key)}
              className={`text-xs px-4 py-2 rounded-lg border transition font-medium ${
                market === m.key
                  ? 'bg-white/10 border-white/20 text-white'
                  : 'border-white/8 text-slate-500 hover:text-slate-300 hover:border-white/15'
              }`}>
              {m.label}
            </button>
          ))}
        </div>

        {/* Tabs — US only */}
        {market === 'US' && (
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
        )}

        {/* ── ASIA / REGIONAL MARKET CONTENT (HK | JP | SG) ── */}
        {(market === 'HK' || market === 'JP' || market === 'SG') && (() => {
          const META: Record<string, { label: string; currency: string; scanTime: string; note: string }> = {
            HK:  { label: 'HK Momentum Picks',    currency: 'HK$', scanTime: '9 AM SGT weekdays',    note: 'Covers Hang Seng blue chips + tech. 9988 excluded (position conflict).' },
            JP:  { label: 'Japan Momentum Picks',  currency: '¥',   scanTime: '12:15 AM SGT weekdays', note: 'Covers Nikkei 225 blue chips: Sony, Toyota, SoftBank, Nintendo, MUFG and more.' },
            SG:  { label: 'Singapore Momentum Picks', currency: 'S$', scanTime: '9:15 AM SGT weekdays', note: 'Covers STI components + major REITs: DBS, OCBC, CapitaLand, Ascendas.' },
          }
          const m = META[market]
          return (
            marketLoading ? (
              <div className="space-y-4">
                {[1,2,3].map(i => <div key={i} className="h-24 rounded-xl bg-white/5 animate-pulse" />)}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Scanner picks */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest">{m.label}</span>
                    {picks?.timestamp && <span className="text-[10px] text-slate-600">Last scan: {new Date(picks.timestamp).toLocaleString('en-SG', { dateStyle: 'short', timeStyle: 'short' })}</span>}
                  </div>
                  {(picks?.scanner_picks?.length ?? 0) === 0 ? (
                    <div className="border border-dashed border-white/10 rounded-xl p-8 text-center">
                      <p className="text-slate-600 text-sm mb-1">No {market} picks right now</p>
                      <p className="text-slate-700 text-xs">Scanner runs at {m.scanTime}</p>
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-3">
                      {picks!.scanner_picks.map((p, i) => (
                        <div key={i} className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white font-mono text-sm">{p.symbol}</span>
                              {watchlist.includes(p.symbol) && (
                                <span className="text-[10px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded-full border border-cyan-500/30">⭐ watchlist</span>
                              )}
                            </div>
                            {p.price && <span className="text-sm font-mono text-slate-300">{m.currency}{p.price.toFixed(2)}</span>}
                          </div>
                          {p.rsi && <div className="text-[10px] text-slate-500 mb-1">RSI {p.rsi.toFixed(0)} · Score {p.score ?? '—'}/10</div>}
                          {(p.signals?.length ?? 0) > 0 && (
                            <ul className="space-y-0.5">
                              {p.signals!.map((s, j) => (
                                <li key={j} className="text-[10px] text-cyan-300 flex gap-1"><span>✓</span>{s}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* Squeeze alerts */}
                {(picks?.squeeze_alerts?.length ?? 0) > 0 && (
                  <div>
                    <div className="text-xs font-mono text-purple-400 uppercase tracking-widest mb-3">{market} Squeeze Alerts</div>
                    <div className="grid md:grid-cols-2 gap-3">
                      {picks!.squeeze_alerts.map((s, i) => (
                        <div key={i} className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-white font-mono text-sm">{s.symbol}</span>
                            <span className="text-[10px] text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full">{s.type ?? 'Squeeze'}</span>
                          </div>
                          {s.price && <div className="text-sm font-mono text-slate-300 mb-2">{m.currency}{s.price.toFixed(2)}</div>}
                          {(s.signals?.length ?? 0) > 0 && (
                            <ul className="space-y-0.5">
                              {s.signals!.map((sig, j) => <li key={j} className="text-[10px] text-purple-300 flex gap-1"><span>⚡</span>{sig}</li>)}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-[10px] text-slate-700">{m.note}</p>
              </div>
            )
          )
        })()}

        {/* ── ETF CONTENT ── */}
        {market === 'ETF' && (
          marketLoading ? (
            <div className="space-y-4">
              {[1,2,3].map(i => <div key={i} className="h-24 rounded-xl bg-white/5 animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Sector Rotation Heatmap */}
              {(etfData?.sector_rotation?.length ?? 0) > 0 && (
                <div>
                  <div className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-3">Sector Rotation (5d / 22d)</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {etfData!.sector_rotation.map((r, i) => {
                      const d5Color = r.d5 > 1 ? 'text-green-400' : r.d5 < -1 ? 'text-red-400' : 'text-slate-400'
                      const d22Color = r.d22 > 3 ? 'text-green-400' : r.d22 < -3 ? 'text-red-400' : 'text-slate-400'
                      const bg = r.d5 > 1 ? 'border-green-500/20 bg-green-500/5' : r.d5 < -1 ? 'border-red-500/20 bg-red-500/5' : 'border-white/8 bg-white/3'
                      return (
                        <div key={i} className={`rounded-lg border ${bg} p-3`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-white font-medium">{r.sector}</span>
                            <span className="text-[9px] text-slate-600 font-mono">{r.etf}</span>
                          </div>
                          <div className="flex gap-2">
                            <div><span className="text-[9px] text-slate-600">5d </span><span className={`text-[10px] font-mono font-bold ${d5Color}`}>{r.d5 > 0 ? '+' : ''}{r.d5.toFixed(1)}%</span></div>
                            <div><span className="text-[9px] text-slate-600">22d </span><span className={`text-[10px] font-mono font-bold ${d22Color}`}>{r.d22 > 0 ? '+' : ''}{r.d22.toFixed(1)}%</span></div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              {/* Bullish ETFs */}
              {(etfData?.bullish?.length ?? 0) > 0 && (
                <div>
                  <div className="text-xs font-mono text-green-400 uppercase tracking-widest mb-3">Bullish Sector ETFs</div>
                  <div className="grid md:grid-cols-2 gap-4">
                    {etfData!.bullish.map((e, i) => (
                      <div key={i} className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <span className="font-bold text-white font-mono text-sm">{e.symbol}</span>
                            {e.squeeze && <span className="ml-2 text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded-full border border-purple-500/30">⚡ squeeze</span>}
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-mono text-white">${e.price?.toFixed(2)}</div>
                            <div className={`text-[10px] font-mono ${e.chg_1d >= 0 ? 'text-green-400' : 'text-red-400'}`}>{e.chg_1d >= 0 ? '+' : ''}{e.chg_1d?.toFixed(2)}% today</div>
                          </div>
                        </div>
                        <ScoreBar score={e.bull_score} />
                        <div className="mt-2 space-y-0.5">
                          {e.bull_reasons?.slice(0, 3).map((r, j) => (
                            <div key={j} className="text-[10px] text-green-300 flex gap-1"><span>✓</span>{r}</div>
                          ))}
                        </div>
                        {(e as EtfPick).top_holdings && (e as EtfPick).top_holdings!.length > 0 && (
                          <div className="mt-3 pt-2 border-t border-white/5">
                            <div className="text-[9px] text-slate-600 mb-1 uppercase">Top holdings</div>
                            <div className="flex flex-wrap gap-1">
                              {(e as EtfPick).top_holdings!.slice(0, 5).map((h, j) => (
                                <span key={j} className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${h.chg_1d >= 0 ? 'border-green-500/20 bg-green-500/8 text-green-300' : 'border-red-500/20 bg-red-500/8 text-red-300'}`}>
                                  {h.symbol} {h.chg_1d >= 0 ? '+' : ''}{h.chg_1d.toFixed(1)}%
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Bearish ETFs */}
              {(etfData?.bearish?.length ?? 0) > 0 && (
                <div>
                  <div className="text-xs font-mono text-red-400 uppercase tracking-widest mb-3">Bearish / Avoid</div>
                  <div className="grid md:grid-cols-2 gap-3">
                    {etfData!.bearish.map((e, i) => (
                      <div key={i} className="rounded-xl border border-red-500/15 bg-red-500/5 p-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-white font-mono text-sm">{e.symbol}</span>
                          <div className={`text-[10px] font-mono ${e.chg_1d < 0 ? 'text-red-400' : 'text-slate-400'}`}>{e.chg_1d >= 0 ? '+' : ''}{e.chg_1d?.toFixed(2)}%</div>
                        </div>
                        <div className="mt-1 space-y-0.5">
                          {e.bear_reasons?.slice(0, 2).map((r, j) => (
                            <div key={j} className="text-[10px] text-red-300 flex gap-1"><span>✗</span>{r}</div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {(etfData?.bullish?.length ?? 0) === 0 && (etfData?.bearish?.length ?? 0) === 0 && (
                <div className="border border-dashed border-white/10 rounded-xl p-8 text-center">
                  <p className="text-slate-600 text-sm">ETF screener data unavailable</p>
                  <p className="text-slate-700 text-xs mt-1">ETF scan runs nightly at 9 PM SGT</p>
                </div>
              )}
              <p className="text-[10px] text-slate-700">US sector ETFs only (XLK, XLV, XLF, XBI, etc.). AI-generated signals. Not financial advice.</p>
            </div>
          )
        )}

        {/* ── US SIGNAL CARDS ── */}
        {market === 'US' && (tab === 'momentum' ? (
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
              {[1,2,3,4].map(i => <div key={i} className="h-28 rounded-xl bg-white/5 animate-pulse" />)}
            </div>
          ) : !intel ? (
            <EmptyState label="intel" />
          ) : (() => {
            const regimeColor = {
              BULL: { border: 'border-green-500/30', bg: 'bg-green-500/8', text: 'text-green-400', badge: 'border-green-500/40 bg-green-500/10 text-green-400' },
              CAUTION: { border: 'border-yellow-500/30', bg: 'bg-yellow-500/8', text: 'text-yellow-400', badge: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400' },
              WARNING: { border: 'border-orange-500/40', bg: 'bg-orange-500/8', text: 'text-orange-400', badge: 'border-orange-500/40 bg-orange-500/10 text-orange-400' },
              DANGER:  { border: 'border-red-500/40',    bg: 'bg-red-500/8',    text: 'text-red-400',    badge: 'border-red-500/40 bg-red-500/10 text-red-400' },
            }[intel.regime] ?? { border: 'border-slate-500/30', bg: 'bg-slate-500/8', text: 'text-slate-400', badge: 'border-slate-500/40 bg-slate-500/10 text-slate-400' }

            return (
            <div className="space-y-5">

              {/* ── REGIME BANNER ── */}
              <div className={`rounded-xl border ${regimeColor.border} ${regimeColor.bg} p-5`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{intel.options_recommendation?.emoji ?? '⚪'}</span>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-lg font-bold ${regimeColor.text}`}>{intel.regime}</span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${regimeColor.badge}`}>
                          {intel.regime_score}/10 signals
                        </span>
                        {!intel.entry_allowed && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-red-500/40 bg-red-500/10 text-red-400">ENTRIES HALTED</span>
                        )}
                        {intel.entry_allowed && intel.size_multiplier < 1 && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-orange-500/40 bg-orange-500/10 text-orange-400">
                            {Math.round(intel.size_multiplier * 100)}% size
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-300">{intel.commentary}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <div className="text-[10px] text-slate-600 mb-1">VIX</div>
                    <div className={`text-lg font-bold font-mono ${intel.vix_5d_chg && intel.vix_5d_chg > 15 ? 'text-orange-400' : 'text-slate-300'}`}>
                      {intel.vix?.toFixed(1)}
                    </div>
                    {intel.vix_5d_chg && (
                      <div className="text-[10px] font-mono text-orange-400">+{intel.vix_5d_chg.toFixed(1)}% 5d</div>
                    )}
                  </div>
                </div>

                {/* Regime signals */}
                {(intel.regime_signals?.length ?? 0) > 0 && (
                  <ul className="space-y-1 mb-3">
                    {intel.regime_signals.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-[11px] text-slate-400">
                        <span className="text-orange-500 mt-0.5 shrink-0">▲</span>{s}
                      </li>
                    ))}
                  </ul>
                )}

                {/* Halted strategies */}
                {(intel.halt_strategies?.length ?? 0) > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] text-slate-600">Halted:</span>
                    {intel.halt_strategies.map(s => (
                      <span key={s} className="text-[10px] font-mono px-2 py-0.5 rounded border border-red-500/20 bg-red-500/8 text-red-400">{s}</span>
                    ))}
                    <span className="text-[10px] text-slate-600 ml-1">· Only MeanReversion + Squeeze active</span>
                  </div>
                )}
              </div>

              {/* ── MARKET INTERNALS ROW ── */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'SPY 5d', value: intel.spy_5d != null ? `${intel.spy_5d > 0 ? '+' : ''}${intel.spy_5d.toFixed(2)}%` : '—', color: intel.spy_5d != null && intel.spy_5d < 0 ? 'text-red-400' : 'text-green-400' },
                  { label: 'Breadth', value: intel.breadth_pct != null ? `${intel.breadth_pct.toFixed(0)}%` : '—', color: intel.breadth_pct != null && intel.breadth_pct < 50 ? 'text-red-400' : 'text-green-400' },
                  { label: 'SKEW', value: (intel.options_signals?.length ?? 0) > 0 ? `${intel.options_signals[0].match(/\d+/)?.[0] ?? '—'}` : '—', color: intel.options_stress ? 'text-orange-400' : 'text-slate-400' },
                  { label: 'Defensive', value: intel.defensive_outperforming ? 'Outperforming' : 'Normal', color: intel.defensive_outperforming ? 'text-orange-400' : 'text-slate-400' },
                ].map(m => (
                  <div key={m.label} className="rounded-lg border border-white/8 bg-white/3 p-3 text-center">
                    <div className={`text-sm font-bold font-mono ${m.color}`}>{m.value}</div>
                    <div className="text-[10px] text-slate-600 mt-0.5">{m.label}</div>
                  </div>
                ))}
              </div>

              {/* ── NEWS SENTIMENT ── */}
              <div className="rounded-xl border border-slate-700/50 bg-white/3 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">News Sentiment</span>
                  <div className="flex items-center gap-2">
                    {intel.shock_event && (
                      <span className="text-[10px] text-red-400 border border-red-500/30 bg-red-500/10 px-2 py-0.5 rounded-full font-mono">⚡ SHOCK EVENT</span>
                    )}
                    <span className={`text-sm font-bold font-mono ${intel.news_sentiment != null && intel.news_sentiment < -0.1 ? 'text-red-400' : intel.news_sentiment != null && intel.news_sentiment > 0.1 ? 'text-green-400' : 'text-slate-400'}`}>
                      {intel.news_sentiment != null ? intel.news_sentiment.toFixed(2) : '—'}
                    </span>
                    <span className="text-[10px] text-slate-600">/ {intel.news_headline_count} headlines</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mb-3">{intel.news_summary}</p>
                {(intel.news_bearish?.length ?? 0) > 0 && (
                  <div className="space-y-1.5">
                    {intel.news_bearish.map((n, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-[9px] text-red-500 mt-1 shrink-0 font-mono">{n.score.toFixed(1)}</span>
                        <div>
                          <div className="text-[10px] text-red-300 leading-snug">{n.title}</div>
                          <div className="text-[9px] text-slate-600">{n.theme}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {(intel.news_bullish?.length ?? 0) > 0 && (
                  <div className="space-y-1.5 mt-3 border-t border-white/5 pt-3">
                    {intel.news_bullish.map((n, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-[9px] text-green-500 mt-1 shrink-0 font-mono">+{n.score.toFixed(1)}</span>
                        <div className="text-[10px] text-green-300 leading-snug">{n.title}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── OPTIONS STRATEGY RECOMMENDATION ── */}
              {intel.options_recommendation && (
                <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/5 p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="text-[10px] text-cyan-400 font-mono uppercase tracking-widest mb-1">Recommended Options Strategy</div>
                      <div className="text-base font-bold text-white">{intel.options_recommendation.short}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{intel.options_recommendation.strategy}</div>
                    </div>
                    <span className="text-2xl">{intel.options_recommendation.emoji}</span>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed mb-3">{intel.options_recommendation.rationale}</p>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="rounded-lg bg-green-500/5 border border-green-500/15 p-3">
                      <div className="text-[9px] text-green-500 font-mono uppercase tracking-widest mb-1">Suitable for</div>
                      <p className="text-[11px] text-slate-300 leading-snug">{intel.options_recommendation.suitable_for}</p>
                    </div>
                    <div className="rounded-lg bg-red-500/5 border border-red-500/15 p-3">
                      <div className="text-[9px] text-red-500 font-mono uppercase tracking-widest mb-1">Avoid</div>
                      <p className="text-[11px] text-slate-300 leading-snug">{intel.options_recommendation.avoid}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ── IRON CONDOR SETUPS ── */}
              {(intel.iron_condors?.length ?? 0) > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-mono text-purple-400 uppercase tracking-widest">Live Iron Condor Setups</span>
                    <span className="text-[10px] text-slate-600 border border-slate-700 rounded px-1.5 py-0.5">
                      {intel.iron_condors.length} opportunities · avg {intel.options_summary?.avg_yield_pct?.toFixed(0)}% ann. yield
                    </span>
                  </div>
                  <div className="grid md:grid-cols-3 gap-3">
                    {intel.iron_condors.map((ic, i) => (
                      <div key={i} className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-white font-mono text-sm">{ic.symbol}</span>
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                            ic.prob_profit_pct >= 80 ? 'text-green-400 border-green-500/30 bg-green-500/10' :
                            'text-yellow-400 border-yellow-500/30 bg-yellow-500/10'
                          }`}>{ic.prob_profit_pct}% PoP</span>
                        </div>
                        {/* Strikes */}
                        <div className="text-[10px] text-slate-500 font-mono mb-2">
                          <span className="text-red-400">{ic.long_put}</span>
                          <span className="text-slate-700"> / </span>
                          <span className="text-green-400">{ic.short_put}</span>
                          <span className="text-slate-600"> ··· </span>
                          <span className="text-green-400">{ic.short_call}</span>
                          <span className="text-slate-700"> / </span>
                          <span className="text-red-400">{ic.long_call}</span>
                        </div>
                        <div className="text-[9px] text-slate-600 font-mono mb-3">
                          Current ${ic.current_price?.toFixed(2)} · {ic.dte}d to {ic.expiry}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <div className="text-[9px] text-slate-600 uppercase">Credit</div>
                            <div className="text-xs font-bold text-green-400 font-mono">${ic.credit_per_contract}/contract</div>
                          </div>
                          <div>
                            <div className="text-[9px] text-slate-600 uppercase">Max loss</div>
                            <div className="text-xs font-bold text-red-400 font-mono">${ic.max_loss_per_contract}</div>
                          </div>
                          <div>
                            <div className="text-[9px] text-slate-600 uppercase">Breakevens</div>
                            <div className="text-[10px] text-slate-400 font-mono">{ic.lower_breakeven} – {ic.upper_breakeven}</div>
                          </div>
                          <div>
                            <div className="text-[9px] text-slate-600 uppercase">IV Rank</div>
                            <div className={`text-xs font-mono font-bold ${ic.iv_rank > 50 ? 'text-orange-400' : 'text-slate-400'}`}>{ic.iv_rank?.toFixed(1)}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-700 mt-2">Iron Condor strikes are AI-generated. Verify fills and margin requirements before trading. Not financial advice.</p>
                </div>
              )}

              {/* ── GA EVOLUTION PICKS ── */}
              {(intel.ga_signals?.length ?? 0) > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-mono text-indigo-400 uppercase tracking-widest">GA Evolution Equity Picks</span>
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
                              <div className={`text-[10px] font-mono ${confPct >= 65 ? 'text-green-400' : confPct >= 50 ? 'text-yellow-400' : 'text-slate-500'}`}>{confPct}% conf</div>
                            </div>
                          </div>
                          <div className="h-1 bg-white/10 rounded-full overflow-hidden mb-2">
                            <div className={`h-full rounded-full ${confPct >= 65 ? 'bg-green-500' : confPct >= 50 ? 'bg-yellow-500' : 'bg-slate-500'}`} style={{ width: `${confPct}%` }} />
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[10px] mb-2">
                            {upside && <div><span className="text-slate-600">Target </span><span className="text-green-400 font-mono">+{upside}%</span></div>}
                            {downside && <div><span className="text-slate-600">Stop </span><span className="text-red-400 font-mono">-{downside}%</span></div>}
                          </div>
                          <div className="grid grid-cols-4 gap-1">
                            {Object.entries(s.scores).map(([k, v]) => (
                              <div key={k} className="text-center">
                                <div className="text-[9px] text-slate-600 capitalize">{k}</div>
                                <div className={`text-[10px] font-mono ${Number(v) >= 0.7 ? 'text-green-400' : Number(v) >= 0.4 ? 'text-yellow-400' : 'text-slate-500'}`}>{(Number(v) * 100).toFixed(0)}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* ── SECTOR ROTATION ── */}
              <div className="grid md:grid-cols-3 gap-3">
                {(intel.hot_sectors?.length ?? 0) > 0 && (
                  <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
                    <div className="text-[10px] text-green-400 font-mono uppercase tracking-widest mb-2">Hot Sectors</div>
                    <div className="flex flex-wrap gap-1">
                      {intel.hot_sectors.map(s => <span key={s} className="text-xs bg-green-500/10 text-green-300 border border-green-500/20 px-2 py-0.5 rounded-full font-mono">{s}</span>)}
                    </div>
                  </div>
                )}
                {(intel.bearish_symbols?.length ?? 0) > 0 && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                    <div className="text-[10px] text-red-400 font-mono uppercase tracking-widest mb-2">Avoid</div>
                    <div className="flex flex-wrap gap-1">
                      {intel.bearish_symbols.map(s => <span key={s} className="text-xs bg-red-500/10 text-red-300 border border-red-500/20 px-2 py-0.5 rounded-full font-mono">{s}</span>)}
                    </div>
                  </div>
                )}
                {(intel.defensive?.length ?? 0) > 0 && (
                  <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4">
                    <div className="text-[10px] text-yellow-400 font-mono uppercase tracking-widest mb-2">Defensive Hedge</div>
                    <div className="flex flex-wrap gap-1">
                      {intel.defensive.map(s => <span key={s} className="text-xs bg-yellow-500/10 text-yellow-300 border border-yellow-500/20 px-2 py-0.5 rounded-full font-mono">{s}</span>)}
                    </div>
                  </div>
                )}
              </div>

              {/* ── CONGRESS TRADES ── */}
              {(intel.congress_trades?.length ?? 0) > 0 && (
                <div>
                  <div className="text-xs font-mono text-amber-400 uppercase tracking-widest mb-3">Congress &amp; Insider Trades</div>
                  <div className="space-y-2">
                    {intel.congress_trades.slice(0, 6).map((c, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg border border-amber-500/15 bg-amber-500/5 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-white font-mono text-sm w-14">{c.symbol}</span>
                          <div>
                            <div className="text-xs text-slate-300">{c.detail}</div>
                            <div className="text-[10px] text-slate-600">{c.date}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono border ${c.type === 'CONGRESS_BUY' ? 'text-green-400 border-green-500/30 bg-green-500/10' : 'text-red-400 border-red-500/30 bg-red-500/10'}`}>
                            {c.type === 'CONGRESS_BUY' ? 'BUY' : 'SELL'}
                          </span>
                          <span className="text-[10px] text-amber-400 font-mono">score {c.score}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-700 mt-2">Source: public congressional disclosure filings. Not investment advice.</p>
                </div>
              )}

              {intel.regime_updated && (
                <p className="text-[10px] text-slate-700">Regime updated: {new Date(intel.regime_updated).toLocaleString('en-SG', { dateStyle: 'medium', timeStyle: 'short' })}</p>
              )}
            </div>
            )
          })()
        ))}

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
