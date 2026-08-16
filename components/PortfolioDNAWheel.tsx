'use client'

import { useState, useEffect } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WheelHolding {
  id: string; ticker: string; name: string; category: string
  pct: number; managerReturn: number
  liveYtd?: number
  benchmarkReturn: number
}

interface RingData extends WheelHolding {
  order: number
  perfColor: string
  perfLabel: 'excellent' | 'good' | 'neutral' | 'watch' | 'poor' | 'no-data'
  ytdAnn: number | null
  bearCase: number; baseCase: number; bullCase: number
  maxDrawdown: number
}

// ── Company descriptions (short, for click detail panel) ─────────────────────
const TICKER_INFO: Record<string, { sector: string; desc: string }> = {
  SPY:  { sector: 'US Broad Market', desc: 'S&P 500 ETF — 500 largest US companies, cap-weighted. Primary US equity benchmark.' },
  QQQ:  { sector: 'US Tech / Growth', desc: 'Nasdaq-100 ETF — top 100 non-financial Nasdaq companies. ~60% technology concentration.' },
  IWM:  { sector: 'US Small-Cap', desc: 'Russell 2000 ETF — 2,000 small-cap US stocks. Higher volatility and domestic-cycle sensitivity than large-caps.' },
  EEM:  { sector: 'Emerging Markets', desc: 'MSCI Emerging Markets ETF — diversified EM exposure including China, India, Taiwan, Korea.' },
  VEA:  { sector: 'International Developed', desc: 'FTSE Developed ex-US/Canada ETF — Europe, Japan, Australia. Currency-sensitive.' },
  TLT:  { sector: 'Long-Duration Treasuries', desc: 'iShares 20+ Year Treasury Bond ETF. Inverse rate sensitivity — rallies when rates fall, drops sharply when rates rise.' },
  LQD:  { sector: 'Investment-Grade Bonds', desc: 'iShares IG Corporate Bond ETF. Blend of credit and rate risk; yields premium over Treasuries.' },
  HYG:  { sector: 'High-Yield Bonds', desc: 'iShares High Yield Corporate Bond ETF. Higher credit risk; more correlated with equities than investment-grade bonds.' },
  GLD:  { sector: 'Precious Metals', desc: 'SPDR Gold Shares — physical gold proxy. Safe-haven asset; performs well in inflation and risk-off regimes.' },
  VNQ:  { sector: 'US REITs', desc: 'Vanguard Real Estate ETF — US real estate investment trusts. Income-oriented; sensitive to interest rate direction.' },
  XLK:  { sector: 'US Technology Sector', desc: 'Technology Select Sector SPDR — US tech sector concentrated in Apple, Microsoft, Nvidia, Broadcom.' },
  XLV:  { sector: 'US Healthcare Sector', desc: 'Health Care Select Sector SPDR — defensive sector; lower cyclicality than broad market.' },
  XLF:  { sector: 'US Financials Sector', desc: 'Financials Select Sector SPDR — banks, insurance, diversified financials. Benefits from rising rates.' },
  ARKK: { sector: 'Disruptive Innovation', desc: 'ARK Innovation ETF — highly concentrated in early-stage disruptive tech. Very high volatility (β≈1.5+).' },
  BOTZ: { sector: 'AI & Robotics', desc: 'Global X Robotics & AI ETF — automation, industrial robots, AI software. Secular growth theme.' },
  SOXX: { sector: 'Semiconductors', desc: 'iShares Semiconductor ETF — chip designers and manufacturers. High cyclicality, supply-chain sensitive.' },
  ICLN: { sector: 'Clean Energy', desc: 'iShares Global Clean Energy ETF — solar, wind, hydrogen. Policy-sensitive; high rate sensitivity.' },
  USO:  { sector: 'Crude Oil', desc: 'United States Oil Fund — WTI crude oil futures proxy. High vol; macro and geopolitical sensitive.' },
  SLV:  { sector: 'Silver', desc: 'iShares Silver Trust — physical silver. Dual industrial/precious metal demand; higher vol than gold.' },
  UUP:  { sector: 'US Dollar', desc: 'Invesco DB US Dollar Index Bullish Fund — DXY proxy. Inversely correlated with risk assets and EM.' },
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PERF_COLOR = {
  excellent: '#22c55e',
  good:      '#86efac',
  neutral:   '#fbbf24',
  watch:     '#fb923c',
  poor:      '#f87171',
  'no-data': '#475569',
}

const PERF_BG: Record<string, string> = {
  excellent: 'bg-green-500/20 text-green-300',
  good:      'bg-green-500/10 text-green-400',
  neutral:   'bg-amber-500/20 text-amber-300',
  watch:     'bg-orange-500/20 text-orange-300',
  poor:      'bg-red-500/20 text-red-400',
  'no-data': 'bg-slate-500/20 text-slate-400',
}

const CATEGORY_COLOR: Record<string, string> = {
  equity:         '#3b82f6',
  fixed_income:   '#10b981',
  fx:             '#f59e0b',
  commodities:    '#f97316',
  private_equity: '#a855f7',
  philanthropy:   '#ec4899',
  thematic:       '#06b6d4',
  cash:           '#64748b',
}

const CATEGORY_LABEL: Record<string, string> = {
  equity: 'Equity', fixed_income: 'Fixed Income', fx: 'FX',
  commodities: 'Commodities', private_equity: 'Private Equity',
  philanthropy: 'Philanthropy', thematic: 'Thematic', cash: 'Cash',
}

// Historical bear-market drawdowns per asset class, with real-world crisis context
const DRAWDOWN_HISTORY: Record<string, { pct: number; event: string; duration: string }[]> = {
  equity: [
    { pct: -56, event: '2008 Global Financial Crisis',   duration: '17 months (Oct 07 – Mar 09)' },
    { pct: -49, event: '2000–02 Dot-com bust',           duration: '2.5 years (Mar 00 – Oct 02)'  },
    { pct: -34, event: '2020 COVID crash',               duration: '33 days (Feb – Mar 20)'        },
  ],
  fixed_income: [
    { pct: -40, event: '2022 Rate-hike cycle (TLT)',     duration: '18 months (Jan 22 – Oct 23)'  },
    { pct: -13, event: '2022 Rate-hike cycle (US Agg)',  duration: '12 months'                    },
    { pct: -8,  event: '1994 Fed rate shock',            duration: '6 months'                     },
  ],
  thematic: [
    { pct: -75, event: '2021–22 ARKK Innovation',        duration: '12 months (Feb 21 – Jan 22)'  },
    { pct: -78, event: '2000 Nasdaq Dot-com',            duration: '2.5 years'                    },
    { pct: -65, event: '2022 Semiconductor rout (SOXX)', duration: '12 months'                    },
  ],
  commodities: [
    { pct: -77, event: '2008 GFC (crude oil WTI)',       duration: '7 months (Jul – Dec 08)'      },
    { pct: -25, event: '2020 COVID (broad commodity)',   duration: '1 month (Feb – Mar 20)'       },
    { pct: -40, event: '2022 gold/silver correction',    duration: '12 months'                    },
  ],
  private_equity: [
    { pct: -40, event: '2008–09 GFC (realised with lag)', duration: '18–24 months; illiquid'     },
    { pct: -30, event: '2000–02 Dot-com (VC/growth PE)', duration: '2+ years'                    },
  ],
  fx: [
    { pct: -30, event: '1997 Asian currency crisis (THB, IDR)', duration: '12 months'            },
    { pct: -15, event: 'Typical EM currency bear cycle',         duration: '6–18 months'         },
  ],
  cash: [
    { pct: -9,  event: '2021–23 real purchasing-power loss (US CPI)', duration: '2 years'        },
    { pct: 0,   event: 'No nominal drawdown — inflation is the risk', duration: 'Ongoing'        },
  ],
  philanthropy: [
    { pct: 0,   event: 'No market price drawdown',               duration: 'N/A (impact return)' },
  ],
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function annualise(ytd: number) {
  const m = new Date().getMonth() + 1
  return m > 0 ? (ytd / m) * 12 : ytd
}

function getPerfLabel(ytd: number | null): RingData['perfLabel'] {
  if (ytd == null) return 'no-data'
  const a = annualise(ytd)
  if (a >= 15)  return 'excellent'
  if (a >= 5)   return 'good'
  if (a >= -2)  return 'neutral'
  if (a >= -10) return 'watch'
  return 'poor'
}

function buildRings(holdings: WheelHolding[], regime: string): RingData[] {
  const sorted = [...holdings].sort((a, b) => b.pct - a.pct)
  const mult = regime.includes('BULL') ? 1.1 : regime.includes('BEAR') ? 0.65 : 0.9
  return sorted.map((h, i) => {
    const ytdAnn = h.liveYtd != null ? annualise(h.liveYtd) : null
    const base   = ytdAnn != null ? ytdAnn * mult : h.benchmarkReturn * mult
    const worstDD = Math.min(...(DRAWDOWN_HISTORY[h.category] ?? [{ pct: -30 }]).map(d => d.pct))
    return {
      ...h, order: i,
      perfColor: PERF_COLOR[getPerfLabel(h.liveYtd ?? null)],
      perfLabel: getPerfLabel(h.liveYtd ?? null),
      ytdAnn,
      bearCase:    base * 0.5,
      baseCase:    base,
      bullCase:    base * 1.6,
      maxDrawdown: worstDD,
    }
  })
}

// ── SVG helpers ───────────────────────────────────────────────────────────────

const CX = 260, CY = 260
const INNER_R   = 50
const RING_GAP  = 5
const MAX_OUTER = 240

function polarToXY(angle: number, r: number) {
  const rad = (angle - 90) * (Math.PI / 180)
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) }
}

function describeArc(startAngle: number, endAngle: number, innerR: number, outerR: number) {
  const s1 = polarToXY(startAngle, outerR)
  const e1 = polarToXY(endAngle,   outerR)
  const s2 = polarToXY(endAngle,   innerR)
  const e2 = polarToXY(startAngle, innerR)
  const large = endAngle - startAngle > 180 ? 1 : 0
  return [
    `M ${s1.x} ${s1.y}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${e1.x} ${e1.y}`,
    `L ${s2.x} ${s2.y}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${e2.x} ${e2.y}`,
    'Z',
  ].join(' ')
}

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  holdings: WheelHolding[]
  clientHoldings?: WheelHolding[]
  regime: string
  vix: number | null
  commentary: string
  portfolioVol?: number
  sharpeAce?: number
  clientPortfolioVol?: number
  clientSharpeAce?: number
  dnaPerf?: Record<string, number>
  dnaTimeframe?: string
}

export default function PortfolioDNAWheel({ holdings, clientHoldings, regime, vix, commentary, portfolioVol, sharpeAce, clientPortfolioVol, clientSharpeAce, dnaPerf = {}, dnaTimeframe = 'ytd' }: Props) {
  const [rings, setRings]       = useState<RingData[]>([])
  const [hovered, setHovered]   = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [source, setSource]     = useState<'manager' | 'client'>('manager')
  const [zoom, setZoom]         = useState(1.0)   // 1 = full semicircle, 2 = 2× zoom

  const hasClient      = !!(clientHoldings && clientHoldings.length > 0)
  const activeHoldings = (source === 'client' && hasClient) ? clientHoldings! : holdings

  useEffect(() => {
    setRings(buildRings(activeHoldings, regime))
    setSelected(null); setHovered(null)
  }, [activeHoldings, regime]) // eslint-disable-line react-hooks/exhaustive-deps

  const total = activeHoldings.reduce((s, h) => s + h.pct, 0) || 1

  const usable   = MAX_OUTER - INNER_R - RING_GAP * Math.max(rings.length, 1)
  const ringDims = rings.map(r => ({ thickness: Math.max(14, (r.pct / total) * usable) }))

  const radii: { inner: number; outer: number }[] = []
  let cursor = MAX_OUTER
  for (let i = 0; i < rings.length; i++) {
    const outer = cursor
    const inner = outer - ringDims[i].thickness
    radii.push({ inner, outer })
    cursor = inner - RING_GAP
    if (cursor < INNER_R + 12) break
  }

  const selectedRing = rings.find(r => r.id === selected)
  const hoveredRing  = rings.find(r => r.id === hovered)
  const detailRing   = selectedRing ?? hoveredRing ?? null

  const regMult = regime.includes('BULL') ? 1.1 : regime.includes('BEAR') ? 0.65 : 0.9
  const blended = (key: 'bearCase' | 'baseCase' | 'bullCase') =>
    rings.reduce((s, r) => s + (r.pct / total) * (r[key] as number), 0)

  // Zoomed viewBox: centre of semicircle is (CX, CY), show smaller window when zoomed
  const vW = 520 / zoom
  const vH = 268 / zoom
  const vX = (520 - vW) / 2
  const vY = Math.max(0, (260 - vH + 8))  // bias toward top of arc


  return (
    <div className="space-y-3">

      {/* Source + Zoom row */}
      <div className="flex items-center gap-2 flex-wrap">
        {hasClient && (['manager', 'client'] as const).map(s => (
          <button key={s} onClick={() => setSource(s)}
            className={`text-xs px-3 py-1 rounded-full border transition ${
              source === s
                ? 'border-cyan-500/50 bg-cyan-500/20 text-cyan-300'
                : 'border-white/10 text-slate-500 hover:text-white'
            }`}>
            {s === 'manager' ? '📐 Manager' : '👤 Client'}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-[10px] text-slate-600">Zoom</span>
          <button onClick={() => setZoom(z => Math.max(1, +(z - 0.25).toFixed(2)))}
            className="w-6 h-6 rounded border border-white/15 text-slate-400 hover:text-white text-sm flex items-center justify-center">−</button>
          <span className="text-[10px] text-slate-400 w-7 text-center">{zoom.toFixed(1)}×</span>
          <button onClick={() => setZoom(z => Math.min(3, +(z + 0.25).toFixed(2)))}
            className="w-6 h-6 rounded border border-white/15 text-slate-400 hover:text-white text-sm flex items-center justify-center">+</button>
          {zoom !== 1 && (
            <button onClick={() => setZoom(1)}
              className="text-[9px] text-slate-600 hover:text-white px-1.5 border border-white/10 rounded">reset</button>
          )}
        </div>
      </div>

      {/* Performance legend */}
      <div className="flex items-center gap-3 flex-wrap">
        {Object.entries(PERF_COLOR).filter(([k]) => k !== 'no-data').map(([k, c]) => (
          <span key={k} className="flex items-center gap-1 text-[10px] text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
            {k.charAt(0).toUpperCase() + k.slice(1)}
          </span>
        ))}
      </div>

      {/* Main layout: semicircle SVG + detail panel */}
      <div className="flex gap-4 items-start">

        {/* Left column: semicircle + below-arc summary */}
        <div className="shrink-0 w-full max-w-[300px] space-y-2">

          {/* Semicircle SVG — viewBox crops to top half; zoom shrinks viewBox */}
          <svg
            viewBox={`${vX} ${vY} ${vW} ${vH}`}
            className="w-full"
            style={{ filter: 'drop-shadow(0 0 24px rgba(6,182,212,0.09))' }}>

            {/* Semicircular background — only the arc area, no rectangle */}
            <path
              d={`M ${CX - MAX_OUTER - 12} ${CY} A ${MAX_OUTER + 12} ${MAX_OUTER + 12} 0 0 0 ${CX + MAX_OUTER + 12} ${CY} Z`}
              fill="rgba(10,14,26,0.55)" />

            {/* Grid arcs */}
            {[80, 140, 200].map(r => (
              <path key={r}
                d={`M ${CX - r} ${CY} A ${r} ${r} 0 0 0 ${CX + r} ${CY}`}
                fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
            ))}

            {/* Rings — full circles, top half visible via viewBox */}
            {rings.map((ring, i) => {
              const dim = radii[i]
              if (!dim) return null
              const path  = describeArc(0, 358, dim.inner, dim.outer)
              const isHov = hovered === ring.id
              const isSel = selected === ring.id
              const catC  = CATEGORY_COLOR[ring.category] ?? '#64748b'
              const midR  = (dim.inner + dim.outer) / 2
              // Font size scales with ring thickness, but large enough to read
              const fs = Math.max(13, Math.min(20, (dim.outer - dim.inner) * 0.55))
              return (
                <g key={ring.id}
                  style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
                  opacity={hovered && !isHov && !isSel ? 0.35 : 1}
                  onMouseEnter={() => setHovered(ring.id)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => setSelected(isSel ? null : ring.id)}>
                  <path d={path}
                    fill={catC}
                    fillOpacity={isHov || isSel ? 0.65 : 0.32}
                    stroke={isSel ? '#06b6d4' : ring.perfColor}
                    strokeWidth={isSel ? 3 : isHov ? 2.5 : 2}
                    strokeOpacity={isSel ? 1 : 0.85}
                    style={{ transition: 'all 0.2s' }}
                  />
                  {/* Ticker at 12-o'clock (top of ring) */}
                  {(() => {
                    const p = polarToXY(0, midR)
                    return (
                      <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
                        fill="white" fontSize={fs} fontWeight="bold" fontFamily="monospace"
                        opacity={isHov || isSel ? 1 : 0.8}>
                        {ring.ticker}
                      </text>
                    )
                  })()}
                  {/* Allocation % at 30° position */}
                  {dim.outer - dim.inner > 22 && (() => {
                    const p = polarToXY(30, midR)
                    return (
                      <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
                        fill={ring.perfColor} fontSize={Math.max(11, fs * 0.75)} fontFamily="monospace"
                        opacity={isHov || isSel ? 1 : 0.6}>
                        {ring.pct.toFixed(0)}%
                      </text>
                    )
                  })()}
                </g>
              )
            })}

            {/* Hub */}
            <circle cx={CX} cy={CY} r={INNER_R}
              fill="rgba(10,14,26,0.95)" stroke="rgba(6,182,212,0.4)" strokeWidth={2} />
            <text x={CX} y={CY - 10} textAnchor="middle" fill="#94a3b8" fontSize={11} fontFamily="monospace">PORT</text>
            <text x={CX} y={CY + 8}  textAnchor="middle" fill="#06b6d4" fontSize={14} fontWeight="bold">DNA</text>

            {/* Baseline + regime label */}
            <line x1={CX - MAX_OUTER - 5} y1={CY} x2={CX + MAX_OUTER + 5} y2={CY}
              stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
            <text x={CX} y={CY + 20} textAnchor="middle" fill="#334155" fontSize={11} fontFamily="monospace">
              {regime} · VIX {vix?.toFixed(0) ?? '—'} · regime ×{regMult.toFixed(2)}
            </text>
          </svg>

          {/* Below-arc: clicked ring detail (empty hint when nothing selected) */}
          {!detailRing ? (
            <div className="rounded-lg border border-dashed border-white/10 py-4 text-center text-[10px] text-slate-700">
              Click a ring above for return projections &amp; drawdown history
            </div>
          ) : (
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 space-y-2 animate-in fade-in duration-150">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ background: CATEGORY_COLOR[detailRing.category] ?? '#64748b' }} />
                  <span className="text-sm font-bold font-mono text-white">{detailRing.ticker}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${PERF_BG[detailRing.perfLabel]}`}>
                    {detailRing.perfLabel.replace('-', ' ')}
                  </span>
                </div>
                {selectedRing && (
                  <button onClick={() => setSelected(null)} className="text-slate-600 hover:text-white text-xs">✕</button>
                )}
              </div>
              <div className="text-[9px] text-slate-500">{detailRing.name} · {CATEGORY_LABEL[detailRing.category]}</div>

              {/* Company / sector description */}
              {TICKER_INFO[detailRing.ticker] && (
                <div className="rounded border border-white/8 bg-white/3 px-2.5 py-2 space-y-1">
                  <div className="text-[8px] text-cyan-400 font-mono uppercase tracking-wider">{TICKER_INFO[detailRing.ticker].sector}</div>
                  <p className="text-[9px] text-slate-400 leading-relaxed">{TICKER_INFO[detailRing.ticker].desc}</p>
                </div>
              )}

              {/* Key numbers */}
              <div className="grid grid-cols-2 gap-1.5">
                <div className="rounded border border-white/8 bg-white/3 px-2 py-1.5">
                  <div className="text-[8px] text-slate-600">Allocation</div>
                  <div className="text-xs font-bold font-mono text-cyan-300">{detailRing.pct.toFixed(1)}%</div>
                </div>
                <div className="rounded border border-white/8 bg-white/3 px-2 py-1.5">
                  <div className="text-[8px] text-slate-600">YTD live</div>
                  <div className={`text-xs font-bold font-mono ${detailRing.liveYtd != null ? (detailRing.liveYtd >= 0 ? 'text-green-400' : 'text-red-400') : 'text-slate-500'}`}>
                    {detailRing.liveYtd != null ? `${detailRing.liveYtd >= 0 ? '+' : ''}${detailRing.liveYtd.toFixed(1)}%` : '— benchmark'}
                  </div>
                </div>
                {/* Selected period performance */}
                {dnaPerf[detailRing.ticker] != null && (
                  <div className="rounded border border-white/8 bg-white/3 px-2 py-1.5 col-span-2">
                    <div className="text-[8px] text-slate-600">
                      {({ overnight: '1D', '5d': '1W', '3m': '3M', '6m': '6M', '1y': '1Y', ytd: 'YTD' } as Record<string,string>)[dnaTimeframe] ?? dnaTimeframe} performance
                    </div>
                    <div className={`text-sm font-bold font-mono ${dnaPerf[detailRing.ticker] >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {dnaPerf[detailRing.ticker] >= 0 ? '+' : ''}{dnaPerf[detailRing.ticker].toFixed(1)}%
                    </div>
                  </div>
                )}
                <div className="rounded border border-red-500/15 bg-red-500/5 px-2 py-1.5">
                  <div className="text-[8px] text-slate-600">Bear case est.</div>
                  <div className={`text-xs font-bold font-mono ${detailRing.bearCase >= 0 ? 'text-slate-300' : 'text-red-400'}`}>
                    {detailRing.bearCase >= 0 ? '+' : ''}{detailRing.bearCase.toFixed(1)}%
                  </div>
                </div>
                <div className="rounded border border-cyan-500/15 bg-cyan-500/5 px-2 py-1.5">
                  <div className="text-[8px] text-slate-600">Bull case est.</div>
                  <div className="text-xs font-bold font-mono text-cyan-300">+{detailRing.bullCase.toFixed(1)}%</div>
                </div>
              </div>

              {/* Historical drawdowns */}
              <div className="rounded border border-amber-500/15 bg-amber-500/5 px-2.5 py-2 space-y-1">
                <div className="text-[9px] font-mono text-amber-400 uppercase tracking-wider mb-1">
                  Historical drawdowns — {CATEGORY_LABEL[detailRing.category]}
                </div>
                {(DRAWDOWN_HISTORY[detailRing.category] ?? []).map((dd, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className={`text-[10px] font-bold font-mono shrink-0 w-9 ${dd.pct < 0 ? 'text-red-400' : 'text-slate-500'}`}>
                      {dd.pct}%
                    </span>
                    <div>
                      <div className="text-[10px] text-slate-300 leading-tight">{dd.event}</div>
                      <div className="text-[9px] text-slate-600">{dd.duration}</div>
                    </div>
                  </div>
                ))}
                <p className="text-[8px] text-slate-700 mt-0.5">Peak-to-trough. Past crises do not predict future severity.</p>
              </div>

              <div className="text-[8px] text-slate-700">
                {detailRing.liveYtd != null
                  ? `AceEconomy live · YTD annualised (${new Date().getMonth() + 1}mo) × regime ×${regMult.toFixed(2)} (${regime})`
                  : `No live feed — using ${CATEGORY_LABEL[detailRing.category]} benchmark ${detailRing.benchmarkReturn}% p.a.`}
              </div>
            </div>
          )}
        </div>

        {/* Right panel: portfolio outlook + holdings list only */}
        <div className="flex-1 min-w-0 space-y-2.5">

          {/* AceEconomy calculation explanation */}
          <div className="rounded-lg border border-white/8 bg-white/3 p-3 space-y-2">
            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Portfolio outlook — {regime}</div>
            <div className="grid grid-cols-3 gap-1.5">
              {([
                { label: 'Bear', key: 'bearCase', color: 'text-red-400',   border: 'border-red-500/15'   },
                { label: 'Base', key: 'baseCase', color: 'text-green-400', border: 'border-green-500/15' },
                { label: 'Bull', key: 'bullCase', color: 'text-cyan-300',  border: 'border-cyan-500/15'  },
              ] as const).map(({ label, key, color, border }) => (
                <div key={label} className={`rounded border ${border} bg-white/3 py-2 text-center`}>
                  <div className="text-[9px] text-slate-600">{label}</div>
                  <div className={`text-sm font-bold font-mono ${color}`}>
                    {blended(key) >= 0 ? '+' : ''}{blended(key).toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>

            {/* Vol + Sharpe */}
            {(portfolioVol != null || sharpeAce != null) && (() => {
              const vol   = source === 'client' ? (clientPortfolioVol ?? portfolioVol) : portfolioVol
              const sharp = source === 'client' ? (clientSharpeAce ?? sharpeAce) : sharpeAce
              const sharpeColor = (v: number) => v >= 1 ? 'text-green-400' : v >= 0.5 ? 'text-yellow-300' : v >= 0 ? 'text-amber-400' : 'text-red-400'
              return (
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="rounded border border-amber-500/15 bg-amber-500/5 px-2.5 py-2 text-center">
                    <div className="text-[8px] text-slate-600 mb-0.5">Volatility (σ)</div>
                    <div className="text-sm font-bold font-mono text-amber-300">{vol?.toFixed(1) ?? '—'}%</div>
                    <div className="text-[8px] text-slate-700">ann. est.</div>
                  </div>
                  <div className="rounded border border-white/10 bg-white/3 px-2.5 py-2 text-center">
                    <div className="text-[8px] text-slate-600 mb-0.5">Sharpe (AceEconomy)</div>
                    <div className={`text-sm font-bold font-mono ${sharp != null ? sharpeColor(sharp) : 'text-slate-500'}`}>{sharp?.toFixed(2) ?? '—'}</div>
                    <div className="text-[8px] text-slate-700">&gt;1 strong · 0.5–1 ok</div>
                  </div>
                </div>
              )
            })()}

            <details className="group">
              <summary className="text-[9px] text-slate-600 cursor-pointer hover:text-slate-400 list-none flex items-center gap-1">
                <span className="group-open:rotate-90 inline-block transition-transform">▶</span> How are these calculated?
              </summary>
              <div className="text-[9px] text-slate-500 mt-1.5 leading-relaxed space-y-1">
                <p><strong className="text-slate-400">Base (AceEconomy):</strong> For each holding, if AceEconomy VPS has live YTD data, it annualises it (YTD ÷ {new Date().getMonth() + 1} months × 12) then applies the regime multiplier (×{regMult.toFixed(2)} for {regime}). Holdings without live data fall back to long-run category benchmarks. The blended result is weighted by your portfolio allocations.</p>
                <p><strong className="text-slate-400">Bear:</strong> Base × 0.5 — return compression. <strong className="text-slate-400">Bull:</strong> Base × 1.6 — outperformance.</p>
                <p><strong className="text-slate-400">Volatility (σ):</strong> Weighted-avg annualised standard deviation by asset class — an upper bound (actual portfolio vol is lower due to diversification across uncorrelated assets).</p>
                <p><strong className="text-slate-400">Sharpe ratio:</strong> (AceEconomy return − 4.3% risk-free rate) ÷ σ. Above 1 = strong risk-adjusted return per unit of volatility.</p>
                <p className="text-slate-700">Click a ring for historical crisis drawdowns per holding.</p>
              </div>
            </details>
          </div>

          {/* Holdings list — click to see detail below the wheel */}
          <div className="text-[9px] text-slate-600 px-0.5">Click any holding to see projections &amp; drawdown ↙</div>
          <div className="space-y-1 max-h-[240px] overflow-y-auto pr-0.5">
            {rings.map((r, i) => {
              if (!radii[i]) return null
              return (
                <button key={r.id}
                  onClick={() => setSelected(r.id === selected ? null : r.id)}
                  onMouseEnter={() => setHovered(r.id)}
                  onMouseLeave={() => setHovered(null)}
                  className={`w-full flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-left transition ${
                    selected === r.id ? 'border-cyan-500/50 bg-cyan-500/8' :
                    hovered  === r.id ? 'border-white/20 bg-white/5' : 'border-white/8 bg-white/3'
                  }`}>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: CATEGORY_COLOR[r.category] ?? '#64748b' }} />
                  <span className="text-[11px] font-mono font-bold text-white">{r.ticker}</span>
                  <span className="text-[10px] text-slate-500 flex-1 truncate">{r.name}</span>
                  <span className={`text-[9px] px-1 py-0.5 rounded shrink-0 ${PERF_BG[r.perfLabel]}`}>
                    {r.liveYtd != null ? `${r.liveYtd >= 0 ? '+' : ''}${r.liveYtd.toFixed(1)}%` : 'est'}
                  </span>
                  <span className="text-[10px] font-bold font-mono text-cyan-300 shrink-0 w-7 text-right">
                    {r.pct.toFixed(0)}%
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* AceEconomy context */}
      {commentary && (
        <div className="rounded-lg border border-white/8 bg-white/3 px-4 py-2 text-[10px] text-slate-500">
          <span className="font-mono text-slate-600 uppercase tracking-wider mr-2">AceEconomy:</span>
          {commentary}
        </div>
      )}
    </div>
  )
}
