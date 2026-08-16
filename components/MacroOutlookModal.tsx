'use client'
import { useEffect, useState } from 'react'

interface CalEvent {
  date: string
  end?: string
  title: string
  country: string
  importance: 'HIGH' | 'MEDIUM' | 'LOW'
  category: string
  note?: string
  day_of_week: string
  week: string
  is_past: boolean
}

interface PmiRow {
  code: string
  name: string
  flag: string
  months: Record<string, number | null>
}

interface PmiData {
  manufacturing: PmiRow[]
  services: PmiRow[]
  months: string[]
  source: string
}

const COUNTRY_FLAG: Record<string, string> = {
  US: '🇺🇸', EU: '🇪🇺', UK: '🇬🇧', JP: '🇯🇵', CN: '🇨🇳',
}
const CAT_COLOR: Record<string, string> = {
  'Central Bank':     'text-amber-300 border-amber-500/40 bg-amber-500/10',
  'Inflation':        'text-red-300 border-red-500/40 bg-red-500/10',
  'Employment':       'text-green-300 border-green-500/40 bg-green-500/10',
  'Growth':           'text-cyan-300 border-cyan-500/40 bg-cyan-500/10',
  'PMI':              'text-purple-300 border-purple-500/40 bg-purple-500/10',
  'Consumer':         'text-pink-300 border-pink-500/40 bg-pink-500/10',
  'Treasury':         'text-slate-300 border-slate-500/40 bg-slate-500/10',
  'Business Survey':  'text-indigo-300 border-indigo-500/40 bg-indigo-500/10',
  'Housing':          'text-orange-300 border-orange-500/40 bg-orange-500/10',
}

function pmiColor(v: number | null | undefined): string {
  if (v == null) return 'bg-slate-800 text-slate-500'
  if (v >= 55)  return 'bg-emerald-500/90 text-white'
  if (v >= 52)  return 'bg-emerald-500/55 text-emerald-100'
  if (v >= 50)  return 'bg-emerald-500/25 text-emerald-200'
  if (v >= 48)  return 'bg-red-500/20 text-red-300'
  if (v >= 45)  return 'bg-red-500/45 text-red-200'
  return 'bg-red-700/65 text-white'
}

function monthLabel(ym: string) {
  const [y, m] = ym.split('-')
  return new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleString('en-US', { month: 'short', year: '2-digit' })
}

export default function MacroOutlookModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab]       = useState<'calendar' | 'pmi'>('calendar')
  const [pmiType, setPmiType] = useState<'manufacturing' | 'services'>('manufacturing')
  const [events, setEvents] = useState<CalEvent[]>([])
  const [pmi, setPmi]       = useState<PmiData | null>(null)
  const [loading, setLoading] = useState(true)
  const [filterCat, setFilterCat] = useState<string>('ALL')

  useEffect(() => {
    Promise.all([
      fetch('/api/nexus/macro/calendar').then(r => r.json()),
      fetch('/api/nexus/macro/pmi').then(r => r.json()),
    ]).then(([cal, pmiData]) => {
      setEvents(cal.events ?? [])
      setPmi(pmiData)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const categories = ['ALL', ...Array.from(new Set(events.map(e => e.category))).sort()]
  const filtered   = filterCat === 'ALL' ? events : events.filter(e => e.category === filterCat)
  const weekGroups = Array.from(new Set(filtered.map(e => e.week)))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl border border-slate-700/60 bg-[#0F1629] shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/40">
          <div>
            <h2 className="text-lg font-semibold text-white">🌐 Macro Outlook</h2>
            <p className="text-xs text-slate-400 mt-0.5">Economic Calendar · PMI Heatmap — Manufacturing & Services</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition text-xl leading-none">✕</button>
        </div>

        {/* Top-level tabs */}
        <div className="flex gap-1 px-6 pt-3 border-b border-slate-700/40 pb-0">
          {([
            { key: 'calendar', label: '📅 Economic Calendar' },
            { key: 'pmi',      label: '🏭 PMI Heatmap' },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-xs font-medium rounded-t-lg border-b-2 transition ${
                tab === t.key
                  ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-slate-400 text-sm">Loading macro data…</div>
          ) : tab === 'calendar' ? (
            <CalendarView
              events={filtered}
              weekGroups={weekGroups}
              categories={categories}
              filterCat={filterCat}
              setFilterCat={setFilterCat}
            />
          ) : (
            <PmiView pmi={pmi} pmiType={pmiType} setPmiType={setPmiType} />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-700/40 flex items-center justify-between">
          <p className="text-[10px] text-slate-600">
            Calendar: FOMC/ECB/BOE/BOJ official schedules + BLS/BEA/Census release calendars.
            PMI: S&P Global / ISM (US).
          </p>
          <p className="text-[10px] text-slate-600">For information only — not investment advice.</p>
        </div>
      </div>
    </div>
  )
}

function CalendarView({
  events, weekGroups, categories, filterCat, setFilterCat,
}: {
  events: CalEvent[]
  weekGroups: string[]
  categories: string[]
  filterCat: string
  setFilterCat: (c: string) => void
}) {
  return (
    <div>
      {/* Category filter pills */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCat(cat)}
            className={`px-2.5 py-1 rounded-full text-[10px] font-medium border transition ${
              filterCat === cat
                ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-300'
                : 'bg-slate-800/60 border-slate-700/40 text-slate-400 hover:border-slate-500'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {!events.length && (
        <div className="text-center text-slate-500 py-12 text-sm">No high-importance events in this period.</div>
      )}

      {weekGroups.map(week => {
        const wevents = events.filter(e => e.week === week)
        if (!wevents.length) return null
        const isAhead = week.startsWith('In ')
        return (
          <div key={week} className="mb-6">
            <div className={`text-[10px] font-mono uppercase tracking-widest mb-2 flex items-center gap-2 ${isAhead ? 'text-slate-600' : 'text-slate-400'}`}>
              {week}
              <span className="flex-1 h-px bg-slate-700/40" />
              <span>{wevents.length} events</span>
            </div>
            <div className="space-y-1.5">
              {wevents.map((ev, i) => {
                const catCls = CAT_COLOR[ev.category] ?? 'text-slate-300 border-slate-600/40 bg-slate-800/40'
                const flag = COUNTRY_FLAG[ev.country] ?? '🌐'
                return (
                  <div
                    key={i}
                    className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border ${
                      ev.is_past
                        ? 'opacity-45 bg-slate-800/20 border-slate-700/20'
                        : isAhead
                        ? 'bg-slate-800/20 border-slate-700/20'
                        : 'bg-slate-800/40 border-slate-700/30'
                    }`}
                  >
                    <div className="w-20 shrink-0 text-right">
                      <div className="text-[11px] font-semibold text-slate-200">{ev.day_of_week.slice(0, 3)}</div>
                      <div className="text-[10px] text-slate-500">
                        {new Date(ev.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                    <div className="w-px self-stretch bg-slate-700/40 shrink-0 mx-1" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] text-white font-medium">{flag} {ev.title}</span>
                        <span className={`inline-block text-[9px] px-1.5 py-0.5 rounded border font-mono uppercase ${catCls}`}>
                          {ev.category}
                        </span>
                        {ev.importance === 'HIGH' && (
                          <span className="text-[9px] text-red-400 font-semibold">🔴 HIGH</span>
                        )}
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

function PmiView({
  pmi, pmiType, setPmiType,
}: {
  pmi: PmiData | null
  pmiType: 'manufacturing' | 'services'
  setPmiType: (t: 'manufacturing' | 'services') => void
}) {
  if (!pmi?.manufacturing?.length) return (
    <div className="text-center text-slate-500 py-12 text-sm">PMI data unavailable.</div>
  )

  const { months, source } = pmi
  const rows = pmiType === 'manufacturing' ? pmi.manufacturing : pmi.services

  return (
    <div>
      {/* Sub-tabs: Manufacturing / Services */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex rounded-lg border border-slate-700/50 overflow-hidden">
          {([
            { key: 'manufacturing', label: '🏭 Manufacturing PMI' },
            { key: 'services',      label: '🏢 Services PMI' },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setPmiType(t.key)}
              className={`px-4 py-1.5 text-xs font-medium transition ${
                pmiType === t.key
                  ? 'bg-cyan-500/20 text-cyan-300'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <span className="text-[10px] text-slate-600 ml-auto">{source}</span>
      </div>

      <div className="flex items-center gap-3 mb-3 text-[10px] text-slate-500">
        <span className="flex items-center gap-1"><span className="w-4 h-3 rounded bg-emerald-500/90 inline-block" /> ≥55 Strong exp.</span>
        <span className="flex items-center gap-1"><span className="w-4 h-3 rounded bg-emerald-500/55 inline-block" /> 52–55</span>
        <span className="flex items-center gap-1"><span className="w-4 h-3 rounded bg-emerald-500/25 inline-block" /> 50–52 Mild exp.</span>
        <span className="flex items-center gap-1"><span className="w-4 h-3 rounded bg-red-500/25 inline-block" /> 48–50 Mild con.</span>
        <span className="flex items-center gap-1"><span className="w-4 h-3 rounded bg-red-700/65 inline-block" /> &lt;45 Deep con.</span>
        <span className="ml-auto text-slate-600">50 = expansion/contraction threshold</span>
      </div>

      {/* Heatmap table */}
      <div className="overflow-x-auto rounded-lg border border-slate-700/30">
        <table className="w-full text-[11px] border-collapse">
          <thead>
            <tr className="bg-slate-800/40">
              <th className="text-left py-2 px-3 text-slate-400 font-medium sticky left-0 bg-slate-800/60 z-10 min-w-[140px]">Country</th>
              {months.map(m => (
                <th key={m} className="text-center py-2 px-1 text-slate-400 font-normal min-w-[46px] whitespace-nowrap">
                  {monthLabel(m)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((c, idx) => (
              <tr key={c.code} className={`border-t border-slate-700/20 ${idx % 2 === 0 ? '' : 'bg-slate-800/10'}`}>
                <td className="py-2 px-3 text-slate-300 sticky left-0 bg-[#0F1629] z-10 font-medium">
                  {c.flag} {c.name}
                </td>
                {months.map(m => {
                  const v = c.months[m]
                  return (
                    <td key={m} className="py-1 px-0.5 text-center">
                      <div
                        className={`rounded text-[10px] font-mono py-1 mx-0.5 ${pmiColor(v)}`}
                        title={v != null ? `${c.name} ${m}: ${v}` : 'No data yet'}
                      >
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

      {/* Trend summary cards */}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {rows.map(c => {
          const vals = months.map(m => c.months[m]).filter((v): v is number => v != null)
          const latest = vals[vals.length - 1]
          const prev   = vals[vals.length - 2]
          const trend  = latest != null && prev != null ? latest - prev : null
          const expanding = latest != null && latest >= 50
          return (
            <div key={c.code} className="flex items-center gap-2.5 bg-slate-800/30 rounded-lg px-3 py-2 border border-slate-700/20">
              <span className="text-xl">{c.flag}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-medium text-slate-200 truncate">{c.name}</span>
                  {latest != null && (
                    <span className={`text-[11px] font-mono font-bold ${expanding ? 'text-emerald-400' : 'text-red-400'}`}>
                      {latest.toFixed(1)}
                    </span>
                  )}
                  {trend != null && (
                    <span className={`text-[10px] ${trend > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {trend > 0 ? '▲' : '▼'}{Math.abs(trend).toFixed(1)}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-500">
                  {expanding
                    ? `Expanding · ${pmiType === 'services' ? 'Services' : 'Manufacturing'} activity growing`
                    : `Contracting · below 50 threshold`}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
