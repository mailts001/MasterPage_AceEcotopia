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

// Historical worst-case drawdown by category (bear scenario, illustrative)
const MAX_DRAWDOWN_EST: Record<string, number> = {
  equity:         -35,
  fixed_income:   -12,
  fx:             -8,
  commodities:    -25,
  private_equity: -40,
  philanthropy:    0,
  thematic:       -60,
  cash:            0,
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
    return {
      ...h,
      order: i,
      perfColor: PERF_COLOR[getPerfLabel(h.liveYtd ?? null)],
      perfLabel: getPerfLabel(h.liveYtd ?? null),
      ytdAnn,
      bearCase: base * 0.5,
      baseCase: base,
      bullCase: base * 1.6,
      maxDrawdown: MAX_DRAWDOWN_EST[h.category] ?? -30,
    }
  })
}

// ── SVG helpers ───────────────────────────────────────────────────────────────

const CX = 260, CY = 260
const INNER_R  = 44
const RING_GAP = 4
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
}

export default function PortfolioDNAWheel({ holdings, clientHoldings, regime, vix, commentary }: Props) {
  const [rings, setRings]       = useState<RingData[]>([])
  const [hovered, setHovered]   = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [source, setSource]     = useState<'manager' | 'client'>('manager')

  const hasClient = !!(clientHoldings && clientHoldings.length > 0)
  const activeHoldings = (source === 'client' && hasClient) ? clientHoldings! : holdings

  useEffect(() => {
    setRings(buildRings(activeHoldings, regime))
    setSelected(null)
    setHovered(null)
  }, [activeHoldings, regime]) // eslint-disable-line react-hooks/exhaustive-deps

  const total = activeHoldings.reduce((s, h) => s + h.pct, 0) || 1

  const usable    = MAX_OUTER - INNER_R - RING_GAP * Math.max(rings.length, 1)
  const ringDims  = rings.map(r => ({ thickness: Math.max(12, (r.pct / total) * usable) }))

  const radii: { inner: number; outer: number }[] = []
  let cursor = MAX_OUTER
  for (let i = 0; i < rings.length; i++) {
    const outer = cursor
    const inner = outer - ringDims[i].thickness
    radii.push({ inner, outer })
    cursor = inner - RING_GAP
    if (cursor < INNER_R + 10) break
  }

  const selectedRing = rings.find(r => r.id === selected)
  const hoveredRing  = rings.find(r => r.id === hovered)
  const detailRing   = selectedRing ?? hoveredRing ?? null

  const regMult = regime.includes('BULL') ? 1.1 : regime.includes('BEAR') ? 0.65 : 0.9
  const blended = (key: 'bearCase' | 'baseCase' | 'bullCase') =>
    rings.reduce((s, r) => s + (r.pct / total) * (r[key] as number), 0)

  return (
    <div className="space-y-3">

      {/* Source toggle */}
      {hasClient && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500">Showing:</span>
          {(['manager', 'client'] as const).map(s => (
            <button key={s} onClick={() => setSource(s)}
              className={`text-[10px] px-3 py-1 rounded-full border transition ${
                source === s
                  ? 'border-cyan-500/50 bg-cyan-500/20 text-cyan-300'
                  : 'border-white/10 text-slate-500 hover:text-white'
              }`}>
              {s === 'manager' ? '📐 Manager' : '👤 Client'}
            </button>
          ))}
          <span className="text-[9px] text-slate-700 ml-2">Click a ring or list item for detail</span>
        </div>
      )}

      {/* Performance legend */}
      <div className="flex items-center gap-3 flex-wrap">
        {Object.entries(PERF_COLOR).filter(([k]) => k !== 'no-data').map(([k, c]) => (
          <span key={k} className="flex items-center gap-1 text-[9px] text-slate-400">
            <span className="w-2 h-2 rounded-full" style={{ background: c }} />
            {k.charAt(0).toUpperCase() + k.slice(1)}
          </span>
        ))}
        <span className="ml-auto text-[9px] text-slate-700">ring size = allocation · colour = YTD performance</span>
      </div>

      {/* Main layout: semicircle (left) + detail panel (right) */}
      <div className="flex gap-4 items-start">

        {/* Semicircle SVG — full circles drawn, top-half visible via viewBox crop */}
        <div className="shrink-0 w-full max-w-[280px]">
          <svg
            viewBox="0 0 520 268"
            className="w-full"
            style={{ filter: 'drop-shadow(0 0 28px rgba(6,182,212,0.07))' }}>

            {/* Background fill for visible area */}
            <rect x={0} y={0} width={520} height={268} fill="rgba(10,14,26,0.5)" rx={8} />

            {/* Grid semicircles */}
            {[80, 140, 200].map(r => (
              <path key={r}
                d={`M ${CX - r} ${CY} A ${r} ${r} 0 0 1 ${CX + r} ${CY}`}
                fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
            ))}

            {/* Rings — full circles, only top half in viewBox */}
            {rings.map((ring, i) => {
              const dim = radii[i]
              if (!dim) return null
              const path   = describeArc(0, 358, dim.inner, dim.outer)
              const isHov  = hovered === ring.id
              const isSel  = selected === ring.id
              const catC   = CATEGORY_COLOR[ring.category] ?? '#64748b'
              return (
                <g key={ring.id}
                  style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
                  opacity={hovered && !isHov && !isSel ? 0.35 : 1}
                  onMouseEnter={() => setHovered(ring.id)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => setSelected(isSel ? null : ring.id)}>
                  <path d={path}
                    fill={catC}
                    fillOpacity={isHov || isSel ? 0.6 : 0.30}
                    stroke={isSel ? '#06b6d4' : ring.perfColor}
                    strokeWidth={isSel ? 2.5 : isHov ? 2 : 1.5}
                    strokeOpacity={isSel ? 1 : 0.75}
                    style={{ transition: 'all 0.2s' }}
                  />
                  {/* Ticker at top of ring (angle 0 = 12-o'clock) */}
                  {(() => {
                    const midR = (dim.inner + dim.outer) / 2
                    const p    = polarToXY(0, midR)
                    const fs   = dim.outer - dim.inner > 18 ? 8 : 6
                    return (
                      <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
                        fill="white" fontSize={fs} fontWeight="bold" fontFamily="monospace"
                        opacity={isHov || isSel ? 1 : 0.7}>
                        {ring.ticker}
                      </text>
                    )
                  })()}
                </g>
              )
            })}

            {/* Hub */}
            <circle cx={CX} cy={CY} r={INNER_R}
              fill="rgba(10,14,26,0.95)" stroke="rgba(6,182,212,0.4)" strokeWidth={1.5} />
            <text x={CX} y={CY - 8} textAnchor="middle" fill="#94a3b8" fontSize={7} fontFamily="monospace">PORT</text>
            <text x={CX} y={CY + 5} textAnchor="middle" fill="#06b6d4" fontSize={9} fontWeight="bold">DNA</text>

            {/* Flat baseline */}
            <line x1={20} y1={260} x2={500} y2={260} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />

            {/* Regime / VIX label on baseline */}
            <text x={CX} y={266} textAnchor="middle" fill="#334155" fontSize={7} fontFamily="monospace">
              {regime} · VIX {vix?.toFixed(0) ?? '—'} · ×{regMult.toFixed(2)} regime adj
            </text>
          </svg>
        </div>

        {/* Right panel */}
        <div className="flex-1 min-w-0 space-y-2.5">

          {/* Portfolio scenario projections */}
          <div className="rounded-lg border border-white/8 bg-white/3 p-3">
            <div className="text-[9px] font-mono text-slate-500 uppercase tracking-wider mb-2">
              Portfolio outlook — {regime}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {([
                { label: 'Bear', key: 'bearCase', color: 'text-red-400',   border: 'border-red-500/15'   },
                { label: 'Base', key: 'baseCase', color: 'text-green-400', border: 'border-green-500/15' },
                { label: 'Bull', key: 'bullCase', color: 'text-cyan-300',  border: 'border-cyan-500/15'  },
              ] as const).map(({ label, key, color, border }) => (
                <div key={label} className={`rounded border ${border} bg-white/3 py-2 text-center`}>
                  <div className="text-[8px] text-slate-600">{label}</div>
                  <div className={`text-sm font-bold font-mono ${color}`}>
                    {blended(key) >= 0 ? '+' : ''}{blended(key).toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[8px] text-slate-700 mt-1.5">
              Base = live YTD annualised × regime ×{regMult.toFixed(2)}. Bear = ×0.5, Bull = ×1.6. Estimates only.
            </p>
          </div>

          {/* Holdings list */}
          <div className="space-y-1 max-h-[200px] overflow-y-auto pr-0.5">
            {rings.map((r, i) => {
              if (!radii[i]) return null
              return (
                <button key={r.id}
                  onClick={() => setSelected(r.id === selected ? null : r.id)}
                  onMouseEnter={() => setHovered(r.id)}
                  onMouseLeave={() => setHovered(null)}
                  className={`w-full flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-left transition ${
                    selected === r.id ? 'border-cyan-500/50 bg-cyan-500/8' :
                    hovered  === r.id ? 'border-white/20 bg-white/5' : 'border-white/8 bg-white/3'
                  }`}>
                  <span className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: CATEGORY_COLOR[r.category] ?? '#64748b' }} />
                  <span className="text-[10px] font-mono font-bold text-white">{r.ticker}</span>
                  <span className="text-[9px] text-slate-500 flex-1 truncate">{r.name}</span>
                  <span className={`text-[8px] px-1 py-0.5 rounded shrink-0 ${PERF_BG[r.perfLabel]}`}>
                    {r.liveYtd != null ? `${r.liveYtd >= 0 ? '+' : ''}${r.liveYtd.toFixed(1)}%` : 'est'}
                  </span>
                  <span className="text-[9px] font-bold font-mono text-cyan-300 shrink-0 w-7 text-right">
                    {r.pct.toFixed(0)}%
                  </span>
                </button>
              )
            })}
          </div>

          {/* Asset detail panel (hover or click) */}
          {detailRing && (
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full"
                    style={{ background: CATEGORY_COLOR[detailRing.category] ?? '#64748b' }} />
                  <span className="text-sm font-bold font-mono text-white">{detailRing.ticker}</span>
                  <span className={`text-[8px] px-1.5 py-0.5 rounded-full ${PERF_BG[detailRing.perfLabel]}`}>
                    {detailRing.perfLabel.replace('-', ' ')}
                  </span>
                </div>
                {selectedRing && (
                  <button onClick={() => setSelected(null)} className="text-slate-600 hover:text-white text-xs">✕</button>
                )}
              </div>
              <div className="text-[9px] text-slate-500 leading-snug">
                {detailRing.name} · {CATEGORY_LABEL[detailRing.category] ?? detailRing.category}
              </div>

              {/* Detail grid */}
              <div className="grid grid-cols-2 gap-1.5">
                <div className="rounded border border-white/8 bg-white/3 px-2 py-1.5">
                  <div className="text-[8px] text-slate-600">Allocation</div>
                  <div className="text-xs font-bold font-mono text-cyan-300">{detailRing.pct.toFixed(1)}%</div>
                </div>
                <div className="rounded border border-white/8 bg-white/3 px-2 py-1.5">
                  <div className="text-[8px] text-slate-600">YTD (AceEconomy)</div>
                  <div className={`text-xs font-bold font-mono ${
                    detailRing.liveYtd != null
                      ? detailRing.liveYtd >= 0 ? 'text-green-400' : 'text-red-400'
                      : 'text-slate-500'
                  }`}>
                    {detailRing.liveYtd != null
                      ? `${detailRing.liveYtd >= 0 ? '+' : ''}${detailRing.liveYtd.toFixed(1)}%`
                      : '— benchmark'}
                  </div>
                </div>
                <div className="rounded border border-red-500/15 bg-red-500/5 px-2 py-1.5">
                  <div className="text-[8px] text-slate-600">Bear case return</div>
                  <div className={`text-xs font-bold font-mono ${detailRing.bearCase >= 0 ? 'text-slate-300' : 'text-red-400'}`}>
                    {detailRing.bearCase >= 0 ? '+' : ''}{detailRing.bearCase.toFixed(1)}%
                  </div>
                </div>
                <div className="rounded border border-cyan-500/15 bg-cyan-500/5 px-2 py-1.5">
                  <div className="text-[8px] text-slate-600">Bull case return</div>
                  <div className="text-xs font-bold font-mono text-cyan-300">
                    +{detailRing.bullCase.toFixed(1)}%
                  </div>
                </div>
                <div className="rounded border border-amber-500/15 bg-amber-500/5 px-2 py-1.5 col-span-2">
                  <div className="text-[8px] text-slate-600 mb-0.5">Worst-case drawdown (bear scenario)</div>
                  <div className="text-xs font-bold font-mono text-amber-300">{detailRing.maxDrawdown.toFixed(0)}%</div>
                  <div className="text-[7px] text-slate-700 mt-0.5">
                    {CATEGORY_LABEL[detailRing.category]} historical bear market estimate · not a guarantee
                  </div>
                </div>
              </div>

              <div className="text-[8px] text-slate-700">
                {detailRing.liveYtd != null
                  ? `Live data from AceEconomy VPS. YTD annualised (${new Date().getMonth() + 1}mo) × regime ×${regMult.toFixed(2)} (${regime}).`
                  : `No live feed for ${detailRing.ticker} — projections use ${CATEGORY_LABEL[detailRing.category]} benchmark ${detailRing.benchmarkReturn}% p.a.`}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Market context */}
      {commentary && (
        <div className="rounded-lg border border-white/8 bg-white/3 px-4 py-2 text-[9px] text-slate-500">
          <span className="font-mono text-slate-600 uppercase tracking-wider mr-2">AceEconomy:</span>
          {commentary}
        </div>
      )}
    </div>
  )
}
