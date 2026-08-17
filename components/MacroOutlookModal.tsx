'use client'
// v5 — finnhub news feed
import { useEffect, useState } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────────
interface CalEvent {
  date: string; end?: string; title: string; country: string
  importance: 'HIGH' | 'MEDIUM'; category: string; note?: string
  day_of_week: string; week: string; is_past: boolean
}
interface PmiRow   { code: string; name: string; flag: string; months: Record<string, number | null> }
interface PmiData  { manufacturing: PmiRow[]; services: PmiRow[]; months: string[]; source: string }
interface AssetRow {
  symbol: string; name: string; region: string; cls: string; cls_name: string
  price: number; chg_1d: number | null; chg_1w: number | null; chg_ytd: number | null
  sparkline: number[]; unit?: string; emoji?: string
}
interface SectorLeaderboard {
  top_1d: AssetRow[]; bottom_1d: AssetRow[]
  top_1w: AssetRow[]; bottom_1w: AssetRow[]
  all: AssetRow[]
}
interface AssetClass { key: string; name: string; assets: AssetRow[] }
interface NewsArticle {
  headline: string; summary: string; source: string; url: string
  image?: string; dt: string; category: string; related?: string
}
interface Snapshot {
  generated_at: string | null; regime: string; summary: string; narrative?: string
  classes: AssetClass[]; top_gainers: AssetRow[]; top_losers: AssetRow[]
  us_top3?: AssetRow[]; us_bottom3?: AssetRow[]
  us_sectors?: SectorLeaderboard
  error?: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const COUNTRY_FLAG: Record<string, string> = { US:'🇺🇸',EU:'🇪🇺',UK:'🇬🇧',JP:'🇯🇵',CN:'🇨🇳' }
const CAT_COLOR: Record<string, string> = {
  'Central Bank':'text-amber-300 border-amber-500/40 bg-amber-500/10',
  'Inflation':'text-red-300 border-red-500/40 bg-red-500/10',
  'Employment':'text-green-300 border-green-500/40 bg-green-500/10',
  'Growth':'text-cyan-300 border-cyan-500/40 bg-cyan-500/10',
  'PMI':'text-purple-300 border-purple-500/40 bg-purple-500/10',
  'Consumer':'text-pink-300 border-pink-500/40 bg-pink-500/10',
  'Treasury':'text-slate-300 border-slate-500/40 bg-slate-500/10',
  'Business Survey':'text-indigo-300 border-indigo-500/40 bg-indigo-500/10',
  'Housing':'text-orange-300 border-orange-500/40 bg-orange-500/10',
}
const CLS_COLOR: Record<string, string> = {
  equity:'text-cyan-400', treasury:'text-amber-400',
  forex:'text-purple-400', commodities:'text-orange-400', crypto:'text-pink-400',
}
const CLS_BG: Record<string, string> = {
  equity:'bg-cyan-500/10 border-cyan-500/30', treasury:'bg-amber-500/10 border-amber-500/30',
  forex:'bg-purple-500/10 border-purple-500/30', commodities:'bg-orange-500/10 border-orange-500/30',
  crypto:'bg-pink-500/10 border-pink-500/30',
}
const REGIME_STYLE: Record<string, string> = {
  'Risk-On':'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  'Risk-Off':'bg-red-500/20 text-red-300 border-red-500/40',
  'Neutral':'bg-slate-500/20 text-slate-300 border-slate-500/40',
}

function pct(v: number | null | undefined, decimals = 2) {
  if (v == null) return '—'
  return `${v >= 0 ? '+' : ''}${v.toFixed(decimals)}%`
}
function pctColor(v: number | null | undefined) {
  if (v == null) return 'text-slate-500'
  return v > 0 ? 'text-emerald-400' : v < 0 ? 'text-red-400' : 'text-slate-400'
}
function fmtPrice(price: number, unit?: string) {
  if (unit === '%') return `${price.toFixed(2)}%`
  if (price > 10000) return price.toLocaleString('en-US', { maximumFractionDigits: 0 })
  if (price > 100)   return price.toLocaleString('en-US', { maximumFractionDigits: 2 })
  return price.toFixed(4)
}
function pmiColor(v: number | null | undefined): string {
  if (v == null) return 'bg-slate-800 text-slate-500'
  if (v >= 55) return 'bg-emerald-500/90 text-white'
  if (v >= 52) return 'bg-emerald-500/55 text-emerald-100'
  if (v >= 50) return 'bg-emerald-500/25 text-emerald-200'
  if (v >= 48) return 'bg-red-500/20 text-red-300'
  if (v >= 45) return 'bg-red-500/45 text-red-200'
  return 'bg-red-700/65 text-white'
}
function monthLabel(ym: string) {
  const [y, m] = ym.split('-')
  return new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleString('en-US', { month: 'short', year: '2-digit' })
}

// ── Sparkline SVG ──────────────────────────────────────────────────────────────
function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
  if (!data || data.length < 2) return <div className="w-16 h-6" />
  const w = 64, h = 24, pad = 2
  const min = Math.min(...data), max = Math.max(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2)
    const y = h - pad - ((v - min) / range) * (h - pad * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  const color = positive ? '#34d399' : '#f87171'
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

// ── Horizontal bar for performance ranking ─────────────────────────────────────
function PerfBar({ value, max }: { value: number | null; max: number }) {
  if (value == null) return <div className="h-4 w-32" />
  const p = Math.min(Math.abs(value) / max * 100, 100)
  const pos = value >= 0
  return (
    <div className="flex items-center gap-1.5 w-full">
      {!pos && <div className="h-3.5 rounded-l" style={{ width: `${p}%`, background:'#f87171', opacity:0.8 }} />}
      <span className={`text-[10px] font-mono font-semibold min-w-[44px] ${pos ? 'text-emerald-400' : 'text-red-400'}`}>
        {pct(value)}
      </span>
      {pos && <div className="h-3.5 rounded-r" style={{ width: `${p}%`, background:'#34d399', opacity:0.8 }} />}
    </div>
  )
}

// ── Main Modal ─────────────────────────────────────────────────────────────────
export default function MacroOutlookModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab]           = useState<'snapshot' | 'calendar' | 'pmi' | 'news'>('snapshot')
  const [pmiType, setPmiType]   = useState<'manufacturing' | 'services'>('manufacturing')
  const [filterCat, setFilterCat] = useState('ALL')

  const [events,   setEvents]   = useState<CalEvent[]>([])
  const [pmi,      setPmi]      = useState<PmiData | null>(null)
  const [snap,     setSnap]     = useState<Snapshot | null>(null)
  const [news,     setNews]     = useState<NewsArticle[]>([])

  const [calLoading,  setCalLoading]  = useState(true)
  const [pmiLoading,  setPmiLoading]  = useState(true)
  const [snapLoading, setSnapLoading] = useState(true)
  const [newsLoading, setNewsLoading] = useState(true)

  useEffect(() => {
    fetch('/api/nexus/macro/calendar').then(r => r.json()).then(d => { setEvents(d.events ?? []); setCalLoading(false) }).catch(() => setCalLoading(false))
    fetch('/api/nexus/macro/pmi').then(r => r.json()).then(d => { setPmi(d); setPmiLoading(false) }).catch(() => setPmiLoading(false))
    fetch('/api/nexus/macro/market-snapshot').then(r => r.json()).then(d => { setSnap(d); setSnapLoading(false) }).catch(() => setSnapLoading(false))
    fetch('/api/nexus/macro/news').then(r => r.json()).then(d => { setNews(d.articles ?? []); setNewsLoading(false) }).catch(() => setNewsLoading(false))
  }, [])

  const categories = ['ALL', ...Array.from(new Set(events.map(e => e.category))).sort()]
  const filtered   = filterCat === 'ALL' ? events : events.filter(e => e.category === filterCat)
  const weekGroups = Array.from(new Set(filtered.map(e => e.week)))

  const TABS = [
    { key: 'snapshot', label: '📊 Market Snapshot' },
    { key: 'calendar', label: '📅 Economic Calendar' },
    { key: 'pmi',      label: '🏭 PMI Heatmap' },
    { key: 'news',     label: '📰 Market News' },
  ] as const

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-6xl max-h-[94vh] overflow-hidden rounded-2xl border border-slate-700/60 bg-[#0F1629] shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header — fixed, never scrolls */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-700/40 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-white">🌐 Macro Outlook</h2>
            <p className="text-[11px] text-slate-400">Live market data · Economic calendar · PMI heatmap</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition text-xl leading-none">✕</button>
        </div>

        {/* Tabs — shrink-0 so they are never pushed off-screen by tall content */}
        <div className="flex gap-0.5 px-5 pt-3 border-b border-slate-700/40 overflow-x-auto shrink-0 bg-[#0F1629] z-10">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-xs font-medium rounded-t-lg border-b-2 whitespace-nowrap transition ${
                tab === t.key ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >{t.label}</button>
          ))}
        </div>

        {/* Body — this is the ONLY thing that scrolls; min-h-0 is critical */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
          {tab === 'snapshot' && <SnapshotView snap={snap} loading={snapLoading} />}
          {tab === 'calendar' && <CalendarView events={filtered} weekGroups={weekGroups} categories={categories} filterCat={filterCat} setFilterCat={setFilterCat} loading={calLoading} />}
          {tab === 'pmi'      && <PmiView pmi={pmi} pmiType={pmiType} setPmiType={setPmiType} loading={pmiLoading} />}
          {tab === 'news'     && <NewsView articles={news} loading={newsLoading} />}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-slate-700/40 flex items-center justify-between shrink-0">
          <p className="text-[10px] text-slate-600">Sources: Yahoo Finance · ISM · S&P Global PMI · BLS · BEA · Fed/ECB/BOE/BOJ official schedules</p>
          <p className="text-[10px] text-slate-600">For information only — not investment advice</p>
        </div>
      </div>
    </div>
  )
}

// ── Snapshot Tab ───────────────────────────────────────────────────────────────
function SnapshotView({ snap, loading }: { snap: Snapshot | null; loading: boolean }) {
  const [activeClass, setActiveClass] = useState<string | null>(null)

  if (loading) return <Spinner />
  if (!snap || snap.error) return <ErrorMsg msg={snap?.summary ?? 'Data unavailable'} />

  const { regime, summary, narrative, classes, top_gainers, top_losers, generated_at,
          us_top3, us_bottom3, us_sectors } = snap
  const regimeCls = REGIME_STYLE[regime] ?? REGIME_STYLE['Neutral']

  const allChanges = classes.flatMap(c => c.assets.map(a => Math.abs(a.chg_1d ?? 0)))
  const maxChange  = Math.max(...allChanges, 1)
  const shown      = activeClass ? classes.filter(c => c.key === activeClass) : classes

  return (
    <div className="space-y-5">
      {/* ── Regime + Summary headline ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border self-start shrink-0 ${regimeCls}`}>
          <span className="text-lg">{regime === 'Risk-On' ? '🟢' : regime === 'Risk-Off' ? '🔴' : '🟡'}</span>
          <div>
            <div className="text-xs font-bold">{regime}</div>
            <div className="text-[10px] opacity-70">Market Regime</div>
          </div>
        </div>
        <div className="flex-1 bg-slate-800/40 border border-slate-700/30 rounded-lg px-4 py-2.5">
          <p className="text-xs text-slate-200 leading-relaxed">{summary}</p>
          {generated_at && (
            <p className="text-[10px] text-slate-600 mt-1">
              Updated {new Date(generated_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })} · 15-min cache
            </p>
          )}
        </div>
      </div>

      {/* ── US Stocks: Top 3 / Bottom 3 ── */}
      {(us_top3?.length || us_bottom3?.length) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <USStockLeader title="🚀 US Leaders (1D)" rows={us_top3 ?? []} />
          <USStockLeader title="🔻 US Laggards (1D)" rows={us_bottom3 ?? []} dim />
        </div>
      )}

      {/* ── AI Narrative ── */}
      {narrative && (
        <div className="bg-slate-800/30 border border-slate-600/40 rounded-xl px-4 py-3.5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm">🤖</span>
            <span className="text-[11px] font-semibold text-slate-200 uppercase tracking-wide">AI Market Intelligence</span>
            <span className="ml-auto flex items-center gap-1 text-[9px] text-slate-600 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Gemini · updated with snapshot
            </span>
          </div>
          <div className="space-y-3">
            {narrative.split('\n\n').filter(Boolean).map((para, i) => {
              const LABELS = ['📊 Equity Performance','💱 Currency & Rates','🌍 Economy Outlook','📅 Catalysts & Risks']
              return (
                <div key={i}>
                  {LABELS[i] && (
                    <div className="text-[9px] font-mono uppercase tracking-widest text-slate-500 mb-1">{LABELS[i]}</div>
                  )}
                  <p className="text-[11px] text-slate-300 leading-relaxed">{para}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Global Top Gainers / Losers ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <LeaderBoard title="🏆 Global Gainers (1D)" rows={top_gainers} maxChange={maxChange} />
        <LeaderBoard title="📉 Global Losers (1D)"  rows={top_losers}  maxChange={maxChange} />
      </div>

      {/* ── US Equity Sectors ── */}
      {us_sectors && <SectorLeaderboardView sectors={us_sectors} />}

      {/* ── Asset class filter pills ── */}
      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => setActiveClass(null)}
          className={`px-2.5 py-1 rounded-full text-[10px] border transition ${!activeClass ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-300' : 'bg-slate-800/60 border-slate-700/40 text-slate-400 hover:border-slate-500'}`}>
          All classes
        </button>
        {classes.map(c => (
          <button key={c.key} onClick={() => setActiveClass(activeClass === c.key ? null : c.key)}
            className={`px-2.5 py-1 rounded-full text-[10px] border transition ${activeClass === c.key ? `${CLS_BG[c.key] ?? ''} ${CLS_COLOR[c.key] ?? ''}` : 'bg-slate-800/60 border-slate-700/40 text-slate-400 hover:border-slate-500'}`}
          >{c.name}</button>
        ))}
      </div>

      {/* ── Per-class tables ── */}
      {shown.map(cls => (
        <AssetClassTable key={cls.key} cls={cls} maxChange={maxChange} />
      ))}
    </div>
  )
}

// ── US Stock Leaderboard (top/bottom 3) ────────────────────────────────────────
function USStockLeader({ title, rows, dim }: { title: string; rows: AssetRow[]; dim?: boolean }) {
  return (
    <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-3">
      <div className="text-xs font-semibold text-slate-300 mb-2">{title}</div>
      <div className="space-y-1.5">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 w-5 text-center shrink-0 font-mono">
              {dim ? ['①','②','③'][i] ?? i+1 : ['①','②','③'][i] ?? i+1}
            </span>
            <span className="text-[11px] text-slate-200 font-medium w-[90px] truncate shrink-0">{r.name}</span>
            <span className="text-[10px] text-slate-600 font-mono shrink-0">{r.symbol}</span>
            <span className={`ml-auto text-[11px] font-mono font-bold shrink-0 ${pctColor(r.chg_1d)}`}>{pct(r.chg_1d)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── US Equity Sectors leaderboard ──────────────────────────────────────────────
function SectorLeaderboardView({ sectors }: { sectors: SectorLeaderboard }) {
  const [period, setPeriod] = useState<'1d' | '1w'>('1d')
  const tops    = period === '1d' ? sectors.top_1d    : sectors.top_1w
  const bottoms = period === '1d' ? sectors.bottom_1d : sectors.bottom_1w
  const maxAbs  = Math.max(...sectors.all.map(r => Math.abs(period === '1d' ? (r.chg_1d ?? 0) : (r.chg_1w ?? 0))), 1)

  return (
    <div className="bg-slate-800/20 border border-slate-700/30 rounded-xl p-3.5">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-xs font-semibold text-slate-300">🗂️ US Equity Sectors</span>
        <div className="flex rounded-lg border border-slate-700/50 overflow-hidden ml-auto">
          {(['1d','1w'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1 text-[10px] font-mono font-medium transition ${period === p ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-slate-200'}`}
            >{p.toUpperCase()}</button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* All sectors ranked */}
        <div>
          <div className="text-[10px] text-slate-500 mb-1.5 uppercase tracking-wider">All Sectors ({period === '1d' ? '1-Day' : '1-Week'})</div>
          <div className="space-y-1">
            {[...sectors.all]
              .sort((a, b) => (period === '1d' ? (b.chg_1d ?? 0) - (a.chg_1d ?? 0) : (b.chg_1w ?? 0) - (a.chg_1w ?? 0)))
              .map((r, i) => {
                const val = period === '1d' ? r.chg_1d : r.chg_1w
                return (
                  <div key={r.symbol} className="flex items-center gap-2">
                    <span className="text-base shrink-0 leading-none">{r.emoji ?? '📈'}</span>
                    <span className="text-[10px] text-slate-300 w-[100px] truncate shrink-0">{r.name}</span>
                    <div className="flex-1">
                      <PerfBar value={val} max={maxAbs} />
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
        {/* Top 3 / Bottom 3 */}
        <div className="space-y-3">
          <div>
            <div className="text-[10px] text-slate-500 mb-1.5 uppercase tracking-wider">Top 3</div>
            <div className="space-y-1.5">
              {tops.map((r, i) => {
                const val = period === '1d' ? r.chg_1d : r.chg_1w
                return (
                  <div key={r.symbol} className="flex items-center gap-2 bg-emerald-500/8 border border-emerald-500/20 rounded-lg px-2.5 py-1.5">
                    <span className="text-base shrink-0">{r.emoji ?? '📈'}</span>
                    <span className="text-[11px] text-slate-200 font-medium flex-1 truncate">{r.name}</span>
                    <span className={`text-[11px] font-mono font-bold ${pctColor(val)}`}>{pct(val)}</span>
                  </div>
                )
              })}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 mb-1.5 uppercase tracking-wider">Bottom 3</div>
            <div className="space-y-1.5">
              {bottoms.map((r, i) => {
                const val = period === '1d' ? r.chg_1d : r.chg_1w
                return (
                  <div key={r.symbol} className="flex items-center gap-2 bg-red-500/8 border border-red-500/20 rounded-lg px-2.5 py-1.5">
                    <span className="text-base shrink-0">{r.emoji ?? '📉'}</span>
                    <span className="text-[11px] text-slate-200 font-medium flex-1 truncate">{r.name}</span>
                    <span className={`text-[11px] font-mono font-bold ${pctColor(val)}`}>{pct(val)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Global Leaderboard ────────────────────────────────────────────────────────
function LeaderBoard({ title, rows, maxChange }: { title: string; rows: AssetRow[]; maxChange: number; invert?: boolean }) {
  return (
    <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-3">
      <div className="text-xs font-semibold text-slate-300 mb-2">{title}</div>
      <div className="space-y-1.5">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className={`text-[10px] ${CLS_COLOR[r.cls] ?? 'text-slate-400'} w-[70px] truncate shrink-0`}>{r.name}</span>
            <div className="flex-1">
              <PerfBar value={r.chg_1d} max={maxChange} />
            </div>
            <span className={`text-[10px] font-mono w-[50px] text-right shrink-0 ${pctColor(r.chg_1d)}`}>{pct(r.chg_1d)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Per-class asset table ──────────────────────────────────────────────────────
function AssetClassTable({ cls, maxChange }: { cls: AssetClass; maxChange: number }) {
  const clsCol = CLS_COLOR[cls.key] ?? 'text-slate-300'
  const clsBg  = CLS_BG[cls.key] ?? 'bg-slate-800/30 border-slate-700/30'
  return (
    <div className={`rounded-xl border ${clsBg} overflow-hidden`}>
      <div className={`px-4 py-2 border-b border-slate-700/30 text-xs font-semibold ${clsCol}`}>{cls.name}</div>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="bg-slate-800/30 text-slate-500 text-[10px]">
              <th className="text-left px-3 py-1.5 font-normal sticky left-0 bg-slate-800/60 min-w-[130px]">Asset</th>
              <th className="text-right px-3 py-1.5 font-normal">Price</th>
              <th className="text-right px-3 py-1.5 font-normal">1D %</th>
              <th className="text-right px-3 py-1.5 font-normal">1W %</th>
              <th className="text-right px-3 py-1.5 font-normal">YTD %</th>
              <th className="px-3 py-1.5 font-normal min-w-[80px]">1D Trend</th>
              <th className="px-3 py-1.5 font-normal min-w-[66px]">10D Chart</th>
            </tr>
          </thead>
          <tbody>
            {cls.assets.map((a, i) => {
              const pos1d = (a.chg_1d ?? 0) >= 0
              return (
                <tr key={a.symbol} className={`border-t border-slate-700/20 ${i % 2 === 0 ? '' : 'bg-slate-800/10'}`}>
                  <td className="px-3 py-2 sticky left-0 bg-[#0F1629] z-10">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base leading-none">{a.region}</span>
                      <div>
                        <div className="text-slate-200 font-medium">{a.name}</div>
                        <div className="text-[9px] text-slate-600 font-mono">{a.symbol}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-slate-200">{fmtPrice(a.price, a.unit)}</td>
                  <td className={`px-3 py-2 text-right font-mono font-semibold ${pctColor(a.chg_1d)}`}>{pct(a.chg_1d)}</td>
                  <td className={`px-3 py-2 text-right font-mono ${pctColor(a.chg_1w)}`}>{pct(a.chg_1w)}</td>
                  <td className={`px-3 py-2 text-right font-mono ${pctColor(a.chg_ytd)}`}>{pct(a.chg_ytd)}</td>
                  <td className="px-2 py-2">
                    {a.chg_1d != null && (
                      <div className="h-3 rounded" style={{
                        width: `${Math.min(Math.abs(a.chg_1d) / maxChange * 56, 56)}px`,
                        background: pos1d ? '#34d399' : '#f87171', opacity: 0.75
                      }} />
                    )}
                  </td>
                  <td className="px-2 py-1">
                    <Sparkline data={a.sparkline} positive={pos1d} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Calendar Tab ───────────────────────────────────────────────────────────────
function CalendarView({ events, weekGroups, categories, filterCat, setFilterCat, loading }: {
  events: CalEvent[]; weekGroups: string[]; categories: string[]; filterCat: string; setFilterCat: (c: string) => void; loading: boolean
}) {
  if (loading) return <Spinner />
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {categories.map(cat => (
          <button key={cat} onClick={() => setFilterCat(cat)}
            className={`px-2.5 py-1 rounded-full text-[10px] font-medium border transition ${filterCat === cat ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-300' : 'bg-slate-800/60 border-slate-700/40 text-slate-400 hover:border-slate-500'}`}
          >{cat}</button>
        ))}
      </div>
      {!events.length && <div className="text-center text-slate-500 py-12 text-sm">No events in this period.</div>}
      {weekGroups.map(week => {
        const wevents = events.filter(e => e.week === week)
        if (!wevents.length) return null
        const isAhead = week.startsWith('In ')
        return (
          <div key={week} className="mb-6">
            <div className={`text-[10px] font-mono uppercase tracking-widest mb-2 flex items-center gap-2 ${isAhead ? 'text-slate-600' : 'text-slate-400'}`}>
              {week}<span className="flex-1 h-px bg-slate-700/40" /><span>{wevents.length} events</span>
            </div>
            <div className="space-y-1.5">
              {wevents.map((ev, i) => {
                const catCls = CAT_COLOR[ev.category] ?? 'text-slate-300 border-slate-600/40 bg-slate-800/40'
                const flag = COUNTRY_FLAG[ev.country] ?? '🌐'
                return (
                  <div key={i} className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border ${ev.is_past ? 'opacity-45 bg-slate-800/20 border-slate-700/20' : isAhead ? 'bg-slate-800/20 border-slate-700/20' : 'bg-slate-800/40 border-slate-700/30'}`}>
                    <div className="w-20 shrink-0 text-right">
                      <div className="text-[11px] font-semibold text-slate-200">{ev.day_of_week.slice(0, 3)}</div>
                      <div className="text-[10px] text-slate-500">{new Date(ev.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                    </div>
                    <div className="w-px self-stretch bg-slate-700/40 shrink-0 mx-1" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] text-white font-medium">{flag} {ev.title}</span>
                        <span className={`inline-block text-[9px] px-1.5 py-0.5 rounded border font-mono uppercase ${catCls}`}>{ev.category}</span>
                        {ev.importance === 'HIGH' && <span className="text-[9px] text-red-400 font-semibold">🔴 HIGH</span>}
                        {ev.is_past && <span className="text-[9px] text-slate-600 italic">Released</span>}
                      </div>
                      {ev.note && <p className="text-[10px] text-slate-500 mt-0.5">{ev.note}</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── PMI Tab ────────────────────────────────────────────────────────────────────
function PmiView({ pmi, pmiType, setPmiType, loading }: {
  pmi: PmiData | null; pmiType: 'manufacturing' | 'services'; setPmiType: (t: 'manufacturing' | 'services') => void; loading: boolean
}) {
  if (loading) return <Spinner />
  if (!pmi?.manufacturing?.length) return <ErrorMsg msg="PMI data unavailable." />

  const { months, source } = pmi
  const rows = pmiType === 'manufacturing' ? pmi.manufacturing : pmi.services

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="flex rounded-lg border border-slate-700/50 overflow-hidden">
          {([
            { key: 'manufacturing', label: '🏭 Manufacturing PMI' },
            { key: 'services',      label: '🏢 Services PMI' },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setPmiType(t.key)}
              className={`px-4 py-1.5 text-xs font-medium transition ${pmiType === t.key ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'}`}
            >{t.label}</button>
          ))}
        </div>
        <span className="text-[10px] text-slate-600 ml-auto">{source}</span>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-3 text-[10px] text-slate-500">
        {[['bg-emerald-500/90','≥55 Strong exp.'],['bg-emerald-500/55','52–55'],['bg-emerald-500/25','50–52'],['bg-red-500/25','48–50'],['bg-red-700/65','<45 Deep con.']].map(([bg,lbl]) => (
          <span key={lbl} className="flex items-center gap-1"><span className={`w-4 h-3 rounded ${bg} inline-block`} />{lbl}</span>
        ))}
        <span className="ml-auto">50 = expansion/contraction threshold</span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-700/30">
        <table className="w-full text-[11px] border-collapse">
          <thead>
            <tr className="bg-slate-800/40">
              <th className="text-left py-2 px-3 text-slate-400 font-medium sticky left-0 bg-slate-800/60 z-10 min-w-[140px]">Country</th>
              {months.map(m => <th key={m} className="text-center py-2 px-1 text-slate-400 font-normal min-w-[46px] whitespace-nowrap">{monthLabel(m)}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((c, idx) => (
              <tr key={c.code} className={`border-t border-slate-700/20 ${idx % 2 === 0 ? '' : 'bg-slate-800/10'}`}>
                <td className="py-2 px-3 text-slate-300 sticky left-0 bg-[#0F1629] z-10 font-medium">{c.flag} {c.name}</td>
                {months.map(m => {
                  const v = c.months[m]
                  return (
                    <td key={m} className="py-1 px-0.5 text-center">
                      <div className={`rounded text-[10px] font-mono py-1 mx-0.5 ${pmiColor(v)}`} title={v != null ? `${c.name} ${m}: ${v}` : 'No data'}>
                        {v != null ? v.toFixed(1) : '—'}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {rows.map(c => {
          const vals = months.map(m => c.months[m]).filter((v): v is number => v != null)
          const latest = vals[vals.length - 1], prev = vals[vals.length - 2]
          const trend = latest != null && prev != null ? latest - prev : null
          const expanding = latest != null && latest >= 50
          return (
            <div key={c.code} className="flex items-center gap-2.5 bg-slate-800/30 rounded-lg px-3 py-2 border border-slate-700/20">
              <span className="text-xl">{c.flag}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-medium text-slate-200 truncate">{c.name}</span>
                  {latest != null && <span className={`text-[11px] font-mono font-bold ${expanding ? 'text-emerald-400' : 'text-red-400'}`}>{latest.toFixed(1)}</span>}
                  {trend != null && <span className={`text-[10px] ${trend > 0 ? 'text-emerald-400' : 'text-red-400'}`}>{trend > 0 ? '▲' : '▼'}{Math.abs(trend).toFixed(1)}</span>}
                </div>
                <p className="text-[10px] text-slate-500">{expanding ? 'Expanding' : 'Contracting'} · {pmiType === 'services' ? 'Services' : 'Manufacturing'}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── News Tab ───────────────────────────────────────────────────────────────────
const CAT_NEWS_COLOR: Record<string, string> = {
  'Market': 'text-cyan-300 bg-cyan-500/10 border-cyan-500/30',
  'Forex':  'text-purple-300 bg-purple-500/10 border-purple-500/30',
  'M&A':    'text-amber-300 bg-amber-500/10 border-amber-500/30',
}

function NewsView({ articles, loading }: { articles: NewsArticle[]; loading: boolean }) {
  const [filter, setFilter] = useState<string>('All')

  if (loading) return <Spinner />
  if (!articles.length) return <ErrorMsg msg="No news available. Finnhub data may be loading." />

  const cats   = ['All', ...Array.from(new Set(articles.map(a => a.category)))]
  const shown  = filter === 'All' ? articles : articles.filter(a => a.category === filter)

  function timeAgo(dt: string) {
    const diff = (Date.now() - new Date(dt).getTime()) / 1000
    if (diff < 3600)  return `${Math.round(diff / 60)}m ago`
    if (diff < 86400) return `${Math.round(diff / 3600)}h ago`
    return `${Math.round(diff / 86400)}d ago`
  }

  return (
    <div>
      {/* Filter pills */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {cats.map(c => (
          <button key={c} onClick={() => setFilter(c)}
            className={`px-2.5 py-1 rounded-full text-[10px] font-medium border transition ${filter === c ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-300' : 'bg-slate-800/60 border-slate-700/40 text-slate-400 hover:border-slate-500'}`}
          >{c}</button>
        ))}
        <span className="ml-auto text-[10px] text-slate-600 self-center">Via Finnhub · 30-min cache</span>
      </div>

      {/* Article list */}
      <div className="space-y-2">
        {shown.map((a, i) => {
          const catCls = CAT_NEWS_COLOR[a.category] ?? 'text-slate-300 bg-slate-800/40 border-slate-700/30'
          return (
            <a key={i} href={a.url} target="_blank" rel="noopener noreferrer"
              className="flex gap-3 p-3 rounded-xl border border-slate-700/30 bg-slate-800/30 hover:bg-slate-800/60 hover:border-slate-600/50 transition group"
            >
              {/* Thumbnail */}
              {a.image ? (
                <div className="w-16 h-14 rounded-lg overflow-hidden shrink-0 bg-slate-700/30">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.image} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition" onError={e => { (e.target as HTMLImageElement).style.display='none' }} />
                </div>
              ) : (
                <div className="w-16 h-14 rounded-lg shrink-0 bg-slate-700/20 flex items-center justify-center text-2xl">
                  {a.category === 'Forex' ? '💱' : a.category === 'M&A' ? '🤝' : '📈'}
                </div>
              )}

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border font-mono uppercase shrink-0 ${catCls}`}>{a.category}</span>
                  <span className="text-[10px] text-slate-500 font-medium shrink-0">{a.source}</span>
                  <span className="text-[10px] text-slate-600 shrink-0">{timeAgo(a.dt)}</span>
                  {a.related && <span className="text-[9px] text-slate-600 font-mono ml-auto truncate max-w-[120px]">{a.related}</span>}
                </div>
                <p className="text-[12px] font-medium text-slate-200 leading-snug group-hover:text-white transition line-clamp-2">{a.headline}</p>
                {a.summary && a.summary !== a.headline && (
                  <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">{a.summary}</p>
                )}
              </div>

              {/* Arrow */}
              <span className="text-slate-600 group-hover:text-slate-400 transition shrink-0 self-center text-xs">↗</span>
            </a>
          )
        })}
      </div>

      <p className="text-[10px] text-slate-700 text-center mt-4">
        News sourced from Reuters, Bloomberg, MarketWatch, CNBC and others via Finnhub · For information only
      </p>
    </div>
  )
}

// ── Shared micro-components ────────────────────────────────────────────────────
function Spinner() {
  return <div className="flex items-center justify-center h-40 text-slate-400 text-sm gap-2"><span className="animate-spin">⟳</span> Loading…</div>
}
function ErrorMsg({ msg }: { msg: string }) {
  return <div className="text-center text-slate-500 py-12 text-sm">{msg}</div>
}
