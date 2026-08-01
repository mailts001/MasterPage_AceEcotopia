'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WheelHolding {
  id: string; ticker: string; name: string; category: string
  pct: number; managerReturn: number
  liveYtd?: number          // from AceEconomy, null = no live data
  benchmarkReturn: number   // from category benchmark
}

interface RingData extends WheelHolding {
  order: number             // 0 = outermost (largest pct)
  perfColor: string
  perfLabel: 'excellent' | 'good' | 'neutral' | 'watch' | 'poor' | 'no-data'
  ytdAnn: number | null     // annualised from YTD
  bearCase: number; baseCase: number; bullCase: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const PERF_COLOR = {
  excellent: '#22c55e',
  good:      '#86efac',
  neutral:   '#fbbf24',
  watch:     '#fb923c',
  poor:      '#f87171',
  'no-data': '#475569',
}

const PERF_BG = {
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
}

const CATEGORY_LABEL: Record<string, string> = {
  equity: 'Equity', fixed_income: 'Fixed Income', fx: 'FX',
  commodities: 'Commodities', private_equity: 'Private Equity',
  philanthropy: 'Philanthropy', thematic: 'Thematic',
}

function annualise(ytd: number) {
  const m = new Date().getMonth() + 1
  return m > 0 ? (ytd / m) * 12 : ytd
}

function perfLabel(ytd: number | null): RingData['perfLabel'] {
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
      perfColor: PERF_COLOR[perfLabel(h.liveYtd ?? null)],
      perfLabel: perfLabel(h.liveYtd ?? null),
      ytdAnn,
      bearCase: base * 0.5,
      baseCase: base,
      bullCase: base * 1.6,
    }
  })
}

// ── SVG Wheel ─────────────────────────────────────────────────────────────────

const CX = 260, CY = 260   // SVG centre
const INNER_R  = 44        // hub radius
const RING_GAP = 4         // gap between rings

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

// ── Main Component ─────────────────────────────────────────────────────────────

interface Props {
  holdings: WheelHolding[]
  regime: string
  vix: number | null
  commentary: string
}

export default function PortfolioDNAWheel({ holdings, regime, vix, commentary }: Props) {
  const [rings, setRings]       = useState<RingData[]>([])
  const [hovered, setHovered]   = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [showProj, setShowProj] = useState(true)
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    setRings(buildRings(holdings, regime))
  }, [holdings, regime])

  const total = holdings.reduce((s, h) => s + h.pct, 0) || 1

  // Ring geometry — outer ring = first (largest), each subsequent shrinks
  // Max rings that fit: from INNER_R outward, each ring has thickness proportional to allocation
  const MAX_OUTER = 240
  const usable    = MAX_OUTER - INNER_R - RING_GAP * rings.length
  const ringDims  = rings.map(r => ({
    thickness: Math.max(12, (r.pct / total) * usable),
  }))

  // Compute cumulative inner radius for each ring (outermost first)
  const radii: { inner: number; outer: number }[] = []
  let cursor = MAX_OUTER
  for (let i = 0; i < rings.length; i++) {
    const outer = cursor
    const inner = outer - ringDims[i].thickness
    radii.push({ inner, outer })
    cursor = inner - RING_GAP
    if (cursor < INNER_R + 10) break
  }

  // For each ring, sweep angle = full 360° but leave a 2° gap
  // Height extrusion simulated as drop shadow + brightness
  const selectedRing = rings.find(r => r.id === selected)

  return (
    <div className="space-y-4">
      {/* Legend bar */}
      <div className="flex items-center gap-4 flex-wrap text-[10px]">
        {Object.entries(PERF_COLOR).map(([k, c]) => (
          k !== 'no-data' && <span key={k} className="flex items-center gap-1 text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: c }} />
            {k.charAt(0).toUpperCase() + k.slice(1)}
          </span>
        ))}
        <span className="ml-auto text-slate-600">Ring size = allocation · Colour = YTD performance</span>
      </div>

      <div className="flex gap-4 flex-col lg:flex-row">
        {/* SVG Wheel */}
        <div className="relative shrink-0">
          <svg ref={svgRef} width={520} height={520} viewBox="0 0 520 520"
            className="w-full max-w-[520px]"
            style={{ filter: 'drop-shadow(0 0 40px rgba(6,182,212,0.08))' }}>

            {/* Background */}
            <circle cx={CX} cy={CY} r={MAX_OUTER + 10} fill="rgba(10,14,26,0.8)" />

            {/* Grid circles */}
            {[60, 120, 180, 240].map(r => (
              <circle key={r} cx={CX} cy={CY} r={r} fill="none"
                stroke="rgba(255,255,255,0.03)" strokeWidth={1} />
            ))}

            {/* Rings */}
            {rings.map((ring, i) => {
              const dim = radii[i]
              if (!dim) return null
              const startAngle = 0
              const endAngle   = 358   // tiny gap at top
              const path       = describeArc(startAngle, endAngle, dim.inner, dim.outer)
              const isHov      = hovered === ring.id
              const isSel      = selected === ring.id
              const catColor   = CATEGORY_COLOR[ring.category] ?? '#64748b'
              const perfC      = ring.perfColor

              // 3D extrusion: simulate with a slightly offset duplicate + glow
              const glowOpacity = ring.ytdAnn != null && ring.ytdAnn > 5 ? 0.35 : 0.12

              return (
                <g key={ring.id}
                  style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
                  opacity={hovered && !isHov && !isSel ? 0.45 : 1}
                  onMouseEnter={() => setHovered(ring.id)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => setSelected(isSel ? null : ring.id)}>

                  {/* Glow layer (simulates 3D extrusion upward for positive returns) */}
                  {ring.ytdAnn != null && ring.ytdAnn > 0 && (
                    <path d={path} fill={perfC} opacity={glowOpacity}
                      transform={`translate(0, ${-Math.min(6, ring.ytdAnn * 0.3)})`} />
                  )}

                  {/* Main ring — category colour fill, perf colour stroke */}
                  <path d={path}
                    fill={catColor}
                    fillOpacity={isHov || isSel ? 0.55 : 0.30}
                    stroke={isSel ? '#06b6d4' : isHov ? perfC : perfC}
                    strokeWidth={isSel ? 2.5 : isHov ? 2 : 1.5}
                    strokeOpacity={isSel ? 1 : isHov ? 0.9 : 0.7}
                    style={{ transition: 'all 0.25s ease' }}
                  />

                  {/* Projection shell (semi-transparent outer arc) */}
                  {showProj && dim.outer + 6 < MAX_OUTER + 8 && (
                    <path d={describeArc(0, 120, dim.outer + 1, dim.outer + 5)}
                      fill={perfC} fillOpacity={0.25} stroke="none" />
                  )}

                  {/* Ticker label — arc midpoint */}
                  {(() => {
                    const midR = (dim.inner + dim.outer) / 2
                    const midAngle = 179  // halfway through 358°
                    const p = polarToXY(midAngle, midR)
                    const fontSize = dim.outer - dim.inner > 20 ? 9 : 7
                    return (
                      <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
                        fill="white" fontSize={fontSize} fontWeight="bold" fontFamily="monospace"
                        opacity={isHov || isSel ? 1 : 0.7}>
                        {ring.ticker}
                      </text>
                    )
                  })()}
                </g>
              )
            })}

            {/* Hub */}
            <circle cx={CX} cy={CY} r={INNER_R} fill="rgba(10,14,26,0.95)"
              stroke="rgba(6,182,212,0.3)" strokeWidth={1.5} />
            <text x={CX} y={CY - 6} textAnchor="middle" fill="#94a3b8" fontSize={8} fontFamily="monospace">PORTFOLIO</text>
            <text x={CX} y={CY + 6} textAnchor="middle" fill="#06b6d4" fontSize={10} fontWeight="bold">DNA</text>

            {/* Hovered ring tooltip inside SVG */}
            {hovered && (() => {
              const r = rings.find(x => x.id === hovered)
              if (!r) return null
              return (
                <g>
                  <rect x={CX - 65} y={10} width={130} height={56} rx={6}
                    fill="rgba(10,14,26,0.95)" stroke="rgba(6,182,212,0.3)" strokeWidth={1} />
                  <text x={CX} y={28} textAnchor="middle" fill="white" fontSize={10} fontWeight="bold">{r.ticker}</text>
                  <text x={CX} y={42} textAnchor="middle" fill="#94a3b8" fontSize={8}>{r.name.slice(0, 22)}</text>
                  <text x={CX} y={56} textAnchor="middle" fill="#06b6d4" fontSize={10} fontWeight="bold">{r.pct.toFixed(1)}%</text>
                </g>
              )
            })()}

            {/* Regime label */}
            <text x={CX} y={510} textAnchor="middle" fill="#334155" fontSize={8} fontFamily="monospace">
              Regime: {regime} · VIX {vix?.toFixed(0) ?? '—'} · ring size = allocation
            </text>
          </svg>

          {/* Projection toggle */}
          <button onClick={() => setShowProj(p => !p)}
            className="absolute bottom-10 right-2 text-[9px] text-slate-600 hover:text-slate-400 border border-white/8 px-2 py-1 rounded">
            {showProj ? 'Hide' : 'Show'} projections
          </button>
        </div>

        {/* Right panel — ring legend + selected detail */}
        <div className="flex-1 space-y-3 min-w-0">

          {/* Ring index */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Portfolio rings (outer → inner)</div>
            {rings.map((r, i) => {
              const dim = radii[i]
              if (!dim) return null
              return (
                <button key={r.id} onClick={() => setSelected(r.id === selected ? null : r.id)}
                  onMouseEnter={() => setHovered(r.id)}
                  onMouseLeave={() => setHovered(null)}
                  className={`w-full flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition ${
                    selected === r.id ? 'border-cyan-500/50 bg-cyan-500/8' :
                    hovered  === r.id ? 'border-white/20 bg-white/5' : 'border-white/8 bg-white/3'
                  }`}>
                  <span className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: CATEGORY_COLOR[r.category] ?? '#64748b' }} />
                  <span className="text-[10px] font-mono font-bold text-white">{r.ticker}</span>
                  <span className="text-[9px] text-slate-500 flex-1 truncate">{r.name}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full shrink-0 ${PERF_BG[r.perfLabel]}`}>
                    {r.liveYtd != null ? `YTD ${r.liveYtd >= 0 ? '+' : ''}${r.liveYtd.toFixed(1)}%` : 'est.'}
                  </span>
                  <span className="text-[10px] font-bold text-cyan-300 shrink-0">{r.pct.toFixed(1)}%</span>
                </button>
              )
            })}
          </div>

          {/* Projection key */}
          <div className="rounded-lg border border-white/8 bg-white/3 p-3 space-y-2">
            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Portfolio Projections ({regime})</div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: 'Bear', key: 'bearCase', color: 'text-red-400' },
                { label: 'Base', key: 'baseCase', color: 'text-green-400' },
                { label: 'Bull', key: 'bullCase', color: 'text-cyan-300' },
              ].map(({ label, key, color }) => {
                const blended = rings.reduce((s, r) => {
                  const w = r.pct / total
                  return s + w * (r[key as keyof RingData] as number)
                }, 0)
                return (
                  <div key={label} className="rounded-lg border border-white/8 bg-white/3 py-2">
                    <div className="text-[9px] text-slate-600">{label}</div>
                    <div className={`text-sm font-bold font-mono ${color}`}>
                      {blended >= 0 ? '+' : ''}{blended.toFixed(1)}%
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="text-[9px] text-slate-700">Base = live YTD annualised × regime multiplier. Bear = ×0.5, Bull = ×1.6. Estimates only.</p>
          </div>
        </div>
      </div>

      {/* Selected ring — detailed panel */}
      {selectedRing && (
        <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/5 p-5 space-y-4 animate-in fade-in duration-200">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full"
                  style={{ background: CATEGORY_COLOR[selectedRing.category] ?? '#64748b' }} />
                <span className="text-base font-bold font-mono text-white">{selectedRing.ticker}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${PERF_BG[selectedRing.perfLabel]}`}>
                  {selectedRing.perfLabel.replace('-', ' ')}
                </span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5">{selectedRing.name}</div>
              <div className="text-[10px] text-slate-600">{CATEGORY_LABEL[selectedRing.category] ?? selectedRing.category}</div>
            </div>
            <button onClick={() => setSelected(null)} className="text-slate-600 hover:text-white text-lg leading-none">✕</button>
          </div>

          {/* Metrics grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: 'Allocation',    value: `${selectedRing.pct.toFixed(1)}%`, color: 'text-cyan-300' },
              { label: 'YTD',           value: selectedRing.liveYtd != null ? `${selectedRing.liveYtd >= 0 ? '+' : ''}${selectedRing.liveYtd.toFixed(1)}%` : '—', color: selectedRing.liveYtd != null ? (selectedRing.liveYtd >= 0 ? 'text-green-400' : 'text-red-400') : 'text-slate-500' },
              { label: 'Ann. YTD',      value: selectedRing.ytdAnn != null ? `${selectedRing.ytdAnn >= 0 ? '+' : ''}${selectedRing.ytdAnn.toFixed(1)}%` : '—', color: 'text-slate-300' },
              { label: 'Manager Est.',  value: `${selectedRing.managerReturn >= 0 ? '+' : ''}${selectedRing.managerReturn.toFixed(1)}%`, color: 'text-purple-300' },
              { label: 'Bear Case',     value: `${selectedRing.bearCase >= 0 ? '+' : ''}${selectedRing.bearCase.toFixed(1)}%`, color: 'text-red-400' },
              { label: 'Base Case',     value: `${selectedRing.baseCase >= 0 ? '+' : ''}${selectedRing.baseCase.toFixed(1)}%`, color: 'text-green-400' },
              { label: 'Bull Case',     value: `${selectedRing.bullCase >= 0 ? '+' : ''}${selectedRing.bullCase.toFixed(1)}%`, color: 'text-cyan-300' },
              { label: 'Benchmark',     value: `${selectedRing.benchmarkReturn.toFixed(1)}%`, color: 'text-slate-400' },
            ].map(m => (
              <div key={m.label} className="rounded-lg border border-white/8 bg-white/3 px-3 py-2">
                <div className="text-[9px] text-slate-600 mb-0.5">{m.label}</div>
                <div className={`text-sm font-bold font-mono ${m.color}`}>{m.value}</div>
              </div>
            ))}
          </div>

          {/* Data source note */}
          <div className="text-[9px] text-slate-700">
            {selectedRing.liveYtd != null
              ? `Live data from AceEconomy. YTD annualised across ${new Date().getMonth() + 1} months. Regime adjusted ×${(regime.includes('BULL') ? 1.1 : regime.includes('BEAR') ? 0.65 : 0.9).toFixed(2)}.`
              : `No live data for ${selectedRing.ticker} — projections use ${CATEGORY_LABEL[selectedRing.category]} benchmark (${selectedRing.benchmarkReturn}% p.a.).`}
          </div>

          {/* AI-style risk insight */}
          <div className="rounded-lg border border-amber-500/15 bg-amber-500/5 px-3 py-2.5">
            <div className="text-[10px] font-mono text-amber-400 mb-1">Portfolio Intelligence Note</div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              {selectedRing.pct > 40
                ? `⚠ ${selectedRing.ticker} at ${selectedRing.pct.toFixed(0)}% is a dominant position — concentration risk is high. A drawdown in this single asset would materially impact overall portfolio performance.`
                : selectedRing.category === 'thematic'
                ? `🚀 Thematic allocations like ${selectedRing.ticker} carry higher volatility (typically 2–3× broader market). Suitable as satellite positions (5–15%). Regime: ${regime} — ${regime.includes('BULL') ? 'favourable environment for growth themes' : 'consider sizing down in risk-off regimes'}.`
                : selectedRing.category === 'fixed_income' && regime.includes('BEAR')
                ? `🛡 Fixed income allocation (${selectedRing.pct.toFixed(0)}%) provides defensive ballast in the current ${regime} regime. Duration risk applies if rates rise.`
                : selectedRing.liveYtd != null && selectedRing.liveYtd < -5
                ? `◈ ${selectedRing.ticker} is underperforming YTD (${selectedRing.liveYtd.toFixed(1)}%). Review whether this is a tactical or structural position. Current regime (${regime}) may be unfavourable.`
                : `${selectedRing.ticker} appears appropriately sized at ${selectedRing.pct.toFixed(0)}% within the ${CATEGORY_LABEL[selectedRing.category]} allocation. Monitor regime shifts.`
              }
            </p>
          </div>
        </div>
      )}

      {/* Market context bar */}
      {commentary && (
        <div className="rounded-lg border border-white/8 bg-white/3 px-4 py-2.5 text-[10px] text-slate-400">
          <span className="text-slate-600 font-mono uppercase tracking-wider mr-2">AceEconomy:</span>
          {commentary}
        </div>
      )}
    </div>
  )
}
