'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'

const SERENITY_APP = 'http://5.223.72.120:8080'

interface WellnessEvent {
  title: string
  date: string
  venue?: string
  price?: string
  url?: string
  source?: string
  categories?: string[]
  urgency?: string
}

interface Track {
  title: string
  artist: string
  src: string
  duration: number
}

// ── Breathing presets ────────────────────────────────────────────
const BREATHE_PRESETS = {
  box:  { label: 'Box (4-4-4-4)',  phases: ['Inhale','Hold','Exhale','Hold'],  times: [4,4,4,4], color: 'cyan' },
  '478':{ label: '4-7-8 Calm',    phases: ['Inhale','Hold','Exhale',''],       times: [4,7,8,0], color: 'purple' },
  deep: { label: 'Deep (5-5)',     phases: ['Inhale','','Exhale',''],           times: [5,0,5,0], color: 'green' },
}
type PresetKey = keyof typeof BREATHE_PRESETS

// ── Serenity Score sliders ───────────────────────────────────────
const SCORE_DIMS = [
  { key: 'stress',  label: 'Stress',  hint: '1=calm · 10=overwhelmed', invert: true },
  { key: 'sleep',   label: 'Sleep',   hint: '1=poor · 10=great',       invert: false },
  { key: 'energy',  label: 'Energy',  hint: '1=drained · 10=vibrant',  invert: false },
  { key: 'anxiety', label: 'Anxiety', hint: '1=none · 10=severe',      invert: true },
  { key: 'mood',    label: 'Mood',    hint: '1=low · 10=great',        invert: false },
]

function calcScore(vals: Record<string, number>): number {
  let total = 0, count = 0
  for (const d of SCORE_DIMS) {
    const v = vals[d.key]
    if (v == null) continue
    total += d.invert ? (11 - v) : v
    count++
  }
  return count ? Math.round((total / count) * 10) : 0
}

function scoreColor(s: number) {
  if (s >= 70) return 'text-green-400'
  if (s >= 50) return 'text-yellow-400'
  return 'text-red-400'
}
function scoreLabel(s: number) {
  if (s >= 80) return 'Thriving 🌟'
  if (s >= 65) return 'Good 🌿'
  if (s >= 50) return 'OK 😐'
  if (s >= 35) return 'Low 😔'
  return 'Struggling 🔴'
}

// ── Urgency chip ─────────────────────────────────────────────────
function UrgencyChip({ urgency }: { urgency?: string }) {
  if (!urgency) return null
  const map: Record<string, string> = {
    soon:      'bg-red-500/20 text-red-400 border-red-500/30',
    this_week: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    upcoming:  'bg-green-500/20 text-green-400 border-green-500/30',
  }
  const label: Record<string, string> = { soon: '🔥 Soon', this_week: 'This week', upcoming: 'Upcoming' }
  const cls = map[urgency] ?? 'bg-white/10 text-slate-400 border-white/10'
  return (
    <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium ${cls}`}>
      {label[urgency] ?? urgency}
    </span>
  )
}

// ── Breathing Timer ──────────────────────────────────────────────
function BreathingWidget() {
  const [preset, setPreset]     = useState<PresetKey>('box')
  const [running, setRunning]   = useState(false)
  const [phase, setPhase]       = useState(0)     // 0-3
  const [tick, setTick]         = useState(0)
  const [rounds, setRounds]     = useState(0)
  const intervalRef             = useRef<ReturnType<typeof setInterval> | null>(null)
  const p = BREATHE_PRESETS[preset]
  const activePhase = p.phases[phase]
  const totalSec = p.times[phase]

  useEffect(() => {
    if (!running) { if (intervalRef.current) clearInterval(intervalRef.current); return }
    setPhase(0); setTick(p.times[0]); setRounds(0)
    let curPhase = 0, curTick = p.times[0]
    intervalRef.current = setInterval(() => {
      curTick--
      if (curTick <= 0) {
        let next = (curPhase + 1) % 4
        // skip phases with time=0
        while (p.times[next] === 0) next = (next + 1) % 4
        if (next < curPhase) setRounds(r => r + 1)
        curPhase = next
        curTick = p.times[next]
      }
      setPhase(curPhase); setTick(curTick)
    }, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, preset])

  const ringPct = totalSec > 0 ? ((totalSec - tick) / totalSec) * 100 : 0
  const colorMap: Record<string, string> = { cyan: '#00D4FF', purple: '#a855f7', green: '#00FF88' }
  const ringColor = colorMap[p.color] ?? '#00D4FF'

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-white mb-3">🫁 Breathing Exercise</h3>

      {/* Preset selector */}
      <div className="flex gap-1.5 mb-4">
        {(Object.keys(BREATHE_PRESETS) as PresetKey[]).map(k => (
          <button key={k} onClick={() => { setPreset(k); setRunning(false); setPhase(0); setTick(BREATHE_PRESETS[k].times[0]) }}
            className={`flex-1 text-[10px] py-1.5 rounded-lg border transition ${
              preset === k
                ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400'
                : 'border-white/10 text-slate-500 hover:text-slate-300'
            }`}>
            {BREATHE_PRESETS[k].label}
          </button>
        ))}
      </div>

      {/* Circle timer */}
      <div className="flex flex-col items-center mb-4">
        <div className="relative w-28 h-28 mb-2">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
            <circle cx="50" cy="50" r="44" fill="none" stroke={ringColor} strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 44}`}
              strokeDashoffset={`${2 * Math.PI * 44 * (1 - ringPct / 100)}`}
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-2xl font-mono font-bold text-white">{running ? tick : '—'}</div>
            <div className="text-[10px] text-slate-500">{running ? activePhase : 'Ready'}</div>
          </div>
        </div>
        {running && <div className="text-[10px] text-slate-600">{rounds} rounds complete</div>}
      </div>

      <button
        onClick={() => setRunning(r => !r)}
        className={`w-full py-2 rounded-lg text-sm font-semibold transition ${
          running
            ? 'bg-white/10 text-white hover:bg-white/20'
            : 'bg-cyan-500 hover:bg-cyan-400 text-black'
        }`}>
        {running ? 'Stop' : 'Start breathing'}
      </button>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────
type Tab = 'events' | 'wellness' | 'radio'

export default function WellnessPage() {
  const [tab, setTab]           = useState<Tab>('events')
  const [events, setEvents]     = useState<WellnessEvent[]>([])
  const [tracks, setTracks]     = useState<Track[]>([])
  const [listeners, setListeners] = useState(0)
  const [loading, setLoading]   = useState(true)
  const [catFilter, setCatFilter] = useState('all')

  // Serenity Score local state
  const [sliders, setSliders]   = useState<Record<string, number>>(
    Object.fromEntries(SCORE_DIMS.map(d => [d.key, 5]))
  )
  const [scored, setScored]     = useState(false)
  const [todayScore, setTodayScore] = useState<number | null>(null)

  useEffect(() => {
    // Load today's score from localStorage
    const stored = localStorage.getItem('sr_today_score')
    const storedDate = localStorage.getItem('sr_score_date')
    const today = new Date().toISOString().slice(0, 10)
    if (stored && storedDate === today) {
      setTodayScore(parseInt(stored)); setScored(true)
    }

    Promise.all([
      fetch('/api/nexus/wellness/events?limit=20').then(r => r.json()).catch(() => ({ events: [] })),
      fetch('/api/nexus/wellness/status').then(r => r.json()).catch(() => ({})),
    ]).then(([evData, stData]) => {
      setEvents(evData.events ?? [])
      setTracks(stData.tracks ?? [])
      setListeners(stData.active_listeners ?? 0)
      setLoading(false)
    })
  }, [])

  function submitScore() {
    const score = calcScore(sliders)
    const today = new Date().toISOString().slice(0, 10)
    localStorage.setItem('sr_today_score', String(score))
    localStorage.setItem('sr_score_date', today)
    setTodayScore(score); setScored(true)
  }

  // Categories present in events
  const allCats = ['all', ...Array.from(new Set(events.flatMap(e => e.categories ?? []).filter(Boolean)))]
  const filteredEvents = catFilter === 'all'
    ? events
    : events.filter(e => (e.categories ?? []).includes(catFilter))

  const eventsThisWeek = events.filter(e => e.urgency === 'this_week' || e.urgency === 'soon').length

  return (
    <div className="min-h-screen bg-[#0A0E1A] text-white">
      <nav className="border-b border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 bg-[#0A0E1A]/95 backdrop-blur z-10">
        <Link href="/" className="text-lg font-bold gradient-text">X68</Link>
        <div className="flex items-center gap-4">
          <a href={SERENITY_APP} target="_blank" rel="noopener noreferrer"
            className="text-xs text-emerald-400 hover:opacity-70 transition">
            Open Serenity Radio ↗
          </a>
          <Link href="/citizen/dashboard" className="text-sm text-gray-400 hover:text-white transition">← Dashboard</Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">

        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl">🌿</span>
            <h1 className="text-2xl font-bold">SerenityOS</h1>
            <span className="text-xs px-2 py-0.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-400">● LIVE</span>
          </div>
          <p className="text-gray-500 text-sm">
            SG events radar · Daily wellness check-in · Ambient radio · Breathing exercises
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold font-mono text-emerald-400">{loading ? '…' : events.length}</div>
            <div className="text-xs text-gray-500 mt-1">Upcoming SG events</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold font-mono text-amber-400">{loading ? '…' : eventsThisWeek}</div>
            <div className="text-xs text-gray-500 mt-1">This week</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            {todayScore != null ? (
              <>
                <div className={`text-2xl font-bold font-mono ${scoreColor(todayScore)}`}>{todayScore}</div>
                <div className="text-xs text-gray-500 mt-1">{scoreLabel(todayScore)}</div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold font-mono text-slate-600">—</div>
                <div className="text-xs text-gray-500 mt-1">Today's Serenity Score</div>
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
          {([
            { key: 'events',  label: `📅 Events (${events.length})` },
            { key: 'wellness',label: '🌿 Wellness Score' },
            { key: 'radio',   label: `🎵 Radio (${tracks.length} tracks)` },
          ] as { key: Tab; label: string }[]).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 text-xs py-2 rounded-lg transition font-medium ${
                tab === t.key ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Events tab ── */}
        {tab === 'events' && (
          <div className="space-y-4">
            {/* Category filter */}
            {allCats.length > 2 && (
              <div className="flex flex-wrap gap-1.5">
                {allCats.map(c => (
                  <button key={c} onClick={() => setCatFilter(c)}
                    className={`text-[10px] px-3 py-1 rounded-full border capitalize transition ${
                      catFilter === c
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                        : 'border-white/10 text-slate-500 hover:text-slate-300'
                    }`}>
                    {c === 'all' ? 'All' : c}
                  </button>
                ))}
              </div>
            )}

            {loading ? (
              <div className="space-y-3">
                {[1,2,3,4].map(i => <div key={i} className="h-20 rounded-xl bg-white/5 animate-pulse" />)}
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="border border-dashed border-white/10 rounded-xl p-8 text-center">
                <p className="text-slate-600 text-sm">No events found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredEvents.map((ev, i) => (
                  <a key={i} href={ev.url ?? '#'} target="_blank" rel="noopener noreferrer"
                    className="block bg-white/5 border border-white/10 hover:border-emerald-500/30 hover:bg-white/8 rounded-xl p-4 transition group">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <UrgencyChip urgency={ev.urgency} />
                          {(ev.categories ?? []).map(c => (
                            <span key={c} className="text-[9px] px-1.5 py-0.5 rounded-full border border-white/10 text-slate-500 capitalize">{c}</span>
                          ))}
                        </div>
                        <div className="text-sm font-medium text-white group-hover:text-emerald-300 transition leading-snug">{ev.title}</div>
                        {ev.venue && <div className="text-[10px] text-slate-500 mt-0.5">📍 {ev.venue}</div>}
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-xs font-mono text-slate-400">{ev.date}</div>
                        {ev.price && <div className="text-[10px] text-emerald-400/70 mt-0.5">{ev.price}</div>}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}

            <p className="text-[10px] text-slate-700 text-center">
              Powered by Serenity Radio events radar · Updates every 30 min
            </p>
          </div>
        )}

        {/* ── Wellness tab ── */}
        {tab === 'wellness' && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Score check-in */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Daily Serenity Score™</h3>
                {todayScore != null && (
                  <span className={`text-lg font-bold font-mono ${scoreColor(todayScore)}`}>{todayScore}</span>
                )}
              </div>

              {scored && todayScore != null ? (
                <div className="text-center py-4">
                  <div className={`text-4xl font-bold font-mono mb-2 ${scoreColor(todayScore)}`}>{todayScore}</div>
                  <div className="text-sm text-slate-400 mb-4">{scoreLabel(todayScore)}</div>
                  {/* Score bar */}
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-3">
                    <div
                      className={`h-full rounded-full transition-all ${todayScore >= 70 ? 'bg-green-500' : todayScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${todayScore}%` }}
                    />
                  </div>
                  <button onClick={() => { setScored(false); setSliders(Object.fromEntries(SCORE_DIMS.map(d => [d.key, 5]))) }}
                    className="text-xs text-slate-600 hover:text-slate-400 transition">
                    ↺ Re-check
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-[11px] text-slate-500">Rate each from 1–10 to calculate your score.</p>
                  <div className="space-y-3">
                    {SCORE_DIMS.map(d => (
                      <div key={d.key}>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs text-slate-400">{d.label}</label>
                          <span className="text-xs font-mono text-white">{sliders[d.key]}</span>
                        </div>
                        <p className="text-[10px] text-slate-600 mb-1">{d.hint}</p>
                        <input type="range" min={1} max={10} value={sliders[d.key]}
                          onChange={e => setSliders(prev => ({ ...prev, [d.key]: parseInt(e.target.value) }))}
                          className="w-full accent-emerald-400"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[11px] text-slate-600">
                      Preview: <span className={`font-mono font-bold ${scoreColor(calcScore(sliders))}`}>{calcScore(sliders)}</span>
                    </span>
                    <button onClick={submitScore}
                      className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs px-4 py-2 rounded-lg transition">
                      Calculate →
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Breathing */}
            <BreathingWidget />

            {/* Wellness tips */}
            <div className="md:col-span-2 bg-white/5 border border-emerald-500/20 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-emerald-400 mb-3">🌿 Wellness Features in Serenity App</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { icon: '⏰', title: 'Break reminders', desc: 'Configurable screen breaks' },
                  { icon: '👁', title: '20-20-20 Rule', desc: 'Eye rest every 20 min' },
                  { icon: '🌙', title: 'Sleep wind-down', desc: 'Bedtime nudge at your time' },
                  { icon: '☯️', title: 'TCM Profile', desc: 'Body constitution survey' },
                ].map(f => (
                  <a key={f.title} href={SERENITY_APP} target="_blank" rel="noopener noreferrer"
                    className="bg-white/5 border border-white/8 rounded-lg p-3 hover:border-emerald-500/30 transition">
                    <div className="text-base mb-1">{f.icon}</div>
                    <div className="text-xs font-medium text-white mb-0.5">{f.title}</div>
                    <div className="text-[10px] text-slate-600">{f.desc}</div>
                  </a>
                ))}
              </div>
              <a href={SERENITY_APP} target="_blank" rel="noopener noreferrer"
                className="inline-block mt-3 text-xs text-emerald-400 hover:opacity-70 transition">
                Open full Serenity app for all wellness features →
              </a>
            </div>
          </div>
        )}

        {/* ── Radio tab ── */}
        {tab === 'radio' && (
          <div className="space-y-4">
            {/* Live banner */}
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <div>
                  <p className="text-sm font-medium text-white">Serenity Radio — Live</p>
                  <p className="text-[10px] text-slate-500">{listeners} active listeners now</p>
                </div>
              </div>
              <a href={SERENITY_APP} target="_blank" rel="noopener noreferrer"
                className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs px-4 py-2 rounded-lg transition">
                Open Player ↗
              </a>
            </div>

            {/* Track list */}
            {loading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />)}
              </div>
            ) : tracks.length === 0 ? (
              <div className="border border-dashed border-white/10 rounded-xl p-8 text-center">
                <p className="text-slate-600 text-sm">No tracks loaded</p>
                <a href={SERENITY_APP} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-emerald-400 mt-2 inline-block">Open app →</a>
              </div>
            ) : (
              <div className="space-y-2">
                {tracks.map((t, i) => (
                  <div key={i} className="flex items-center gap-4 bg-white/5 border border-white/8 rounded-xl px-4 py-3 hover:border-emerald-500/20 transition">
                    <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                      <span className="text-[10px] text-emerald-400">♪</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{t.title}</div>
                      <div className="text-[10px] text-slate-500">{t.artist}</div>
                    </div>
                    <div className="text-[10px] text-slate-600 shrink-0 font-mono">
                      {t.duration ? `${Math.floor(t.duration / 60)}:${String(t.duration % 60).padStart(2, '0')}` : '—'}
                    </div>
                    <a href={`${SERENITY_APP}#play-${encodeURIComponent(t.src)}`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-[10px] text-emerald-400 hover:opacity-70 shrink-0">▶ Play</a>
                  </div>
                ))}
              </div>
            )}

            {/* Channels blurb */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
              {[
                { emoji: '📡', label: 'Scout', desc: 'Social event radar' },
                { emoji: '🏢', label: 'Organizer', desc: 'B2B analytics' },
                { emoji: '🌿', label: 'Concierge', desc: 'Wellness + arts AI' },
                { emoji: '🔔', label: 'Alerts', desc: 'Ticket watch' },
              ].map(c => (
                <a key={c.label} href={SERENITY_APP} target="_blank" rel="noopener noreferrer"
                  className="bg-white/5 border border-white/8 rounded-lg p-3 hover:border-emerald-500/20 transition text-center">
                  <div className="text-lg">{c.emoji}</div>
                  <div className="text-[10px] font-medium text-slate-300 mt-0.5">{c.label}</div>
                  <div className="text-[9px] text-slate-600">{c.desc}</div>
                </a>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
