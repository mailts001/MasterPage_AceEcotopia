'use client'
import { useEffect, useState, useMemo, useRef } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts'

// ── Types ──────────────────────────────────────────────────────────────────────
interface Series {
  dates: string[]; prices: number[]; rebased: number[]; base: number
}
interface PriceHistory {
  series: Record<string, Series>; period: string; error?: string
}

// ── Constants ──────────────────────────────────────────────────────────────────
const PERIODS = ['1W','1M','3M','6M','YTD','1Y'] as const
type Period = typeof PERIODS[number]

const BENCHMARKS = [
  { sym: 'SPY',      label: 'SPY (S&P 500 ETF)',  color: '#94a3b8' },
  { sym: 'QQQ',      label: 'QQQ (NASDAQ ETF)',   color: '#a78bfa' },
  { sym: '^VIX',     label: 'VIX (Volatility)',   color: '#f87171' },
  { sym: 'GLD',      label: 'GLD (Gold ETF)',      color: '#fbbf24' },
  { sym: 'DX-Y.NYB', label: 'DXY (Dollar Index)', color: '#34d399' },
  { sym: 'TLT',      label: 'TLT (20Y Treasury)', color: '#60a5fa' },
]

const LINE_COLORS = [
  '#38bdf8','#4ade80','#fb923c','#a78bfa','#f472b6',
  '#facc15','#2dd4bf','#f87171','#818cf8','#34d399',
]

type Mode = 'rebase' | 'absolute'

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtDate(d: string, period: Period) {
  const dt = new Date(d + 'T12:00:00')
  if (period === '1W') return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' })
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function CustomTooltip({ active, payload, label, mode }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900/95 border border-slate-700 rounded-lg px-3 py-2 text-[11px] shadow-xl">
      <div className="text-slate-400 mb-1.5 font-mono">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-0.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-slate-300 font-medium w-16 truncate">{p.dataKey}</span>
          <span className="font-mono font-semibold ml-auto" style={{ color: p.color }}>
            {mode === 'absolute'
              ? Number(p.value).toLocaleString('en-US', { maximumFractionDigits: 2 })
              : `${p.value >= 0 ? '+' : ''}${Number(p.value).toFixed(2)}%`}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
interface WatchlistChartProps {
  tickers: string[]
  bgLight?: boolean
}

export default function WatchlistChart({ tickers, bgLight }: WatchlistChartProps) {
  const [period,       setPeriod]       = useState<Period>('3M')
  const [mode,         setMode]         = useState<Mode>('rebase')
  const [selected,     setSelected]     = useState<Set<string>>(new Set(tickers.slice(0, 5)))
  const [benchmarks,   setBenchmarks]   = useState<Set<string>>(new Set(['SPY']))
  const [customTickers, setCustomTickers] = useState<Set<string>>(new Set())
  const [customInput,  setCustomInput]  = useState('')
  const [history,      setHistory]      = useState<PriceHistory | null>(null)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync selected when tickers list changes
  useEffect(() => {
    setSelected(prev => {
      const valid = new Set([...prev].filter(s => tickers.includes(s) || customTickers.has(s)))
      if (valid.size === 0) tickers.slice(0, 5).forEach(t => valid.add(t))
      return valid
    })
  }, [tickers.join(',')])

  const allSymbols = useMemo(() =>
    [...new Set([...selected, ...benchmarks])],
    [selected, benchmarks]
  )

  useEffect(() => {
    if (!allSymbols.length) return
    setLoading(true); setError(null)
    fetch(`/api/nexus/watchlist/price-history?symbols=${allSymbols.join(',')}&period=${period}`)
      .then(r => r.json())
      .then(d => { setHistory(d); setLoading(false) })
      .catch(e => { setError(String(e)); setLoading(false) })
  }, [allSymbols.join(','), period])

  const chartData = useMemo(() => {
    if (!history?.series) return []
    const allSeries = Object.entries(history.series)
    if (!allSeries.length) return []
    const dateSet = new Set<string>()
    allSeries.forEach(([, s]) => s.dates.forEach(d => dateSet.add(d)))
    const dates = [...dateSet].sort()
    return dates.map(date => {
      const row: Record<string, string | number> = { date }
      allSeries.forEach(([sym, s]) => {
        const idx = s.dates.indexOf(date)
        if (idx !== -1) {
          row[sym] = mode === 'absolute' ? s.prices[idx] : s.rebased[idx]
        }
      })
      return row
    })
  }, [history, mode])

  const colorMap = useMemo(() => {
    const map: Record<string, string> = {}
    let ci = 0
    // watchlist tickers
    tickers.forEach(sym => { map[sym] = LINE_COLORS[ci++ % LINE_COLORS.length] })
    // custom tickers get more colors
    customTickers.forEach(sym => { if (!map[sym]) map[sym] = LINE_COLORS[ci++ % LINE_COLORS.length] })
    // benchmarks
    BENCHMARKS.forEach(bm => { map[bm.sym] = bm.color })
    return map
  }, [tickers.join(','), customTickers.size, allSymbols.join(',')])

  function addCustomTicker() {
    const sym = customInput.trim().toUpperCase()
    if (!sym) return
    setCustomTickers(prev => new Set([...prev, sym]))
    setSelected(prev => new Set([...prev, sym]))
    setCustomInput('')
    inputRef.current?.focus()
  }

  function removeCustom(sym: string) {
    setCustomTickers(prev => { const n = new Set(prev); n.delete(sym); return n })
    setSelected(prev => { const n = new Set(prev); n.delete(sym); return n })
  }

  function toggleTicker(t: string) {
    setSelected(prev => {
      const n = new Set(prev)
      n.has(t) ? n.delete(t) : n.add(t)
      return n
    })
  }
  function toggleBenchmark(sym: string) {
    setBenchmarks(prev => {
      const n = new Set(prev)
      n.has(sym) ? n.delete(sym) : n.add(sym)
      return n
    })
  }

  const dark = !bgLight
  const cardBg   = dark ? 'bg-slate-900/60 border-white/8' : 'bg-white border-slate-200'
  const pillBase = dark ? 'border-white/10 text-slate-400 hover:border-white/25 hover:text-white' : 'border-slate-300 text-slate-500 hover:border-slate-400 hover:text-slate-800'
  const pillActive = dark ? 'border-cyan-400/60 bg-cyan-500/15 text-cyan-300' : 'border-cyan-500 bg-cyan-50 text-cyan-700'

  const MODES: { id: Mode; label: string; desc: string }[] = [
    { id: 'rebase',   label: '% Change (Rebase)',   desc: 'All assets rebased to 0% at period start — compare alpha, relative performance' },
    { id: 'absolute', label: '% Change (Absolute)', desc: 'Raw price scale — reveals volatility magnitude and beta differences' },
  ]

  return (
    <div className={`rounded-2xl border p-4 space-y-3 ${cardBg}`}>
      {/* ── Title row ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <span className={`text-[11px] font-semibold uppercase tracking-wide ${dark ? 'text-slate-200' : 'text-slate-700'}`}>
            📈 Price Comparison Chart
          </span>
          <span className={`ml-2 text-[10px] ${dark ? 'text-slate-600' : 'text-slate-400'}`}>
            {selected.size} ticker{selected.size !== 1 ? 's' : ''}
            {benchmarks.size ? ` + ${benchmarks.size} benchmark${benchmarks.size !== 1 ? 's' : ''}` : ''}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Mode toggle */}
          <div className={`flex rounded-lg border overflow-hidden text-[10px] font-mono ${dark ? 'border-white/10' : 'border-slate-300'}`}>
            {MODES.map(m => (
              <button key={m.id} onClick={() => setMode(m.id)} title={m.desc}
                className={`px-2.5 py-1 transition ${mode === m.id ? (dark ? 'bg-cyan-500/20 text-cyan-300' : 'bg-cyan-50 text-cyan-700') : (dark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800')}`}>
                {m.label}
              </button>
            ))}
          </div>
          {/* Period pills */}
          {PERIODS.map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-2 py-0.5 rounded-md border text-[10px] font-mono transition ${period === p ? pillActive : pillBase}`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* ── Watchlist ticker selector ── */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <span className={`text-[10px] self-center mr-1 shrink-0 ${dark ? 'text-slate-600' : 'text-slate-400'}`}>Tickers:</span>
        {tickers.map((t, i) => {
          const on = selected.has(t)
          const col = colorMap[t] ?? LINE_COLORS[i % LINE_COLORS.length]
          return (
            <button key={t} onClick={() => toggleTicker(t)}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-mono font-medium transition ${on ? 'text-white' : (dark ? 'border-white/10 text-slate-600' : 'border-slate-300 text-slate-400')}`}
              style={on ? { borderColor: col + '80', background: col + '20', color: col } : {}}>
              <span className="w-2 h-2 rounded-full" style={{ background: on ? col : (dark ? '#334155' : '#cbd5e1') }} />
              {t}
            </button>
          )
        })}
      </div>

      {/* ── Custom ticker row ── */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <span className={`text-[10px] self-center mr-1 shrink-0 ${dark ? 'text-slate-600' : 'text-slate-400'}`}>Add:</span>
        {[...customTickers].map(sym => {
          const on = selected.has(sym)
          const col = colorMap[sym] ?? '#f472b6'
          return (
            <span key={sym}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-mono font-medium"
              style={{ borderColor: col + '80', background: col + '15', color: col }}>
              <button onClick={() => toggleTicker(sym)} className="opacity-80 hover:opacity-100">
                <span className="w-2 h-2 rounded-full inline-block mr-0.5" style={{ background: col }} />
                {sym}
              </button>
              <button onClick={() => removeCustom(sym)} className="text-[9px] opacity-40 hover:opacity-100 ml-0.5">✕</button>
            </span>
          )
        })}
        <div className={`flex items-center gap-1 rounded-md border text-[10px] font-mono overflow-hidden ${dark ? 'border-white/10' : 'border-slate-300'}`}>
          <input
            ref={inputRef}
            value={customInput}
            onChange={e => setCustomInput(e.target.value.toUpperCase())}
            onKeyDown={e => { if (e.key === 'Enter') addCustomTicker() }}
            placeholder="TSLA, BTC-USD…"
            maxLength={12}
            className={`px-2 py-0.5 w-28 bg-transparent outline-none placeholder:text-slate-700 ${dark ? 'text-slate-300' : 'text-slate-700'}`}
          />
          <button onClick={addCustomTicker}
            className={`px-2 py-0.5 text-[9px] transition ${dark ? 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10' : 'bg-slate-100 text-slate-500 hover:text-slate-800'}`}>
            + Add
          </button>
        </div>
      </div>

      {/* ── Benchmark selector ── */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <span className={`text-[10px] self-center mr-1 shrink-0 ${dark ? 'text-slate-600' : 'text-slate-400'}`}>Benchmarks:</span>
        {BENCHMARKS.map(bm => {
          const on = benchmarks.has(bm.sym)
          return (
            <button key={bm.sym} onClick={() => toggleBenchmark(bm.sym)} title={bm.label}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-mono font-medium transition ${on ? 'text-white' : (dark ? 'border-white/10 text-slate-600' : 'border-slate-300 text-slate-400')}`}
              style={on ? { borderColor: bm.color + '80', background: bm.color + '20', color: bm.color } : {}}>
              <span className="w-2 h-2 rounded-full" style={{ background: on ? bm.color : (dark ? '#334155' : '#cbd5e1') }} />
              {bm.sym === 'DX-Y.NYB' ? 'DXY' : bm.sym}
            </button>
          )
        })}
      </div>

      {/* ── Chart ── */}
      <div className="relative" style={{ height: 320 }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm gap-2 z-10">
            <span className="animate-spin">⟳</span> Loading…
          </div>
        )}
        {error && !loading && (
          <div className="absolute inset-0 flex items-center justify-center text-red-400 text-sm">{error}</div>
        )}
        {!loading && !error && chartData.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={dark ? '#1e293b' : '#e2e8f0'} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: dark ? '#64748b' : '#94a3b8' }}
                tickFormatter={d => fmtDate(d, period)}
                interval="preserveStartEnd"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 9, fill: dark ? '#64748b' : '#94a3b8' }}
                tickFormatter={v => mode === 'rebase' ? `${v >= 0 ? '+' : ''}${v.toFixed(1)}%` : v.toLocaleString()}
                axisLine={false}
                tickLine={false}
                width={60}
              />
              {mode === 'rebase' && <ReferenceLine y={0} stroke={dark ? '#334155' : '#cbd5e1'} strokeDasharray="4 4" />}
              <Tooltip content={<CustomTooltip mode={mode} />} />
              <Legend
                wrapperStyle={{ fontSize: 10, paddingTop: 8 }}
                formatter={(val) => <span style={{ color: dark ? '#94a3b8' : '#64748b' }}>{val === 'DX-Y.NYB' ? 'DXY' : val}</span>}
              />
              {allSymbols.map(sym => (
                history?.series[sym] ? (
                  <Line
                    key={sym}
                    type="monotone"
                    dataKey={sym}
                    stroke={colorMap[sym] ?? '#94a3b8'}
                    strokeWidth={benchmarks.has(sym) ? 1.5 : 2}
                    dot={false}
                    strokeDasharray={benchmarks.has(sym) ? '5 3' : undefined}
                    connectNulls
                    animationDuration={400}
                  />
                ) : null
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
        {!loading && !error && chartData.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-sm">
            Select at least one ticker to display chart.
          </div>
        )}
      </div>

      <p className={`text-[9px] ${dark ? 'text-slate-700' : 'text-slate-400'}`}>
        {mode === 'rebase'
          ? `% return rebased to 0 at ${period} period start — compare alpha across assets · benchmarks dashed`
          : 'Absolute price — compare volatility magnitude and beta · different scales across assets'
        } · Data via yfinance · 15-min cache
      </p>
    </div>
  )
}
