'use client'

import { useState, useCallback } from 'react'

interface DistrictStat {
  id: string; name: string; health_score: number
  alerts_today: number; active_monitors: number; revenue_tier: string
}
interface CityState { districts: Record<string, DistrictStat>; total_citizens: number }
interface Citizen {
  id: string; email: string; full_name: string | null
  nexus_credits: number; created_at: string; tier: string
}
interface AlertEvent { id: string; district: string; message: string; sent_at: string }
interface Subscription {
  id: string; citizen_id: string; status: string
  plan_name: string; current_period_end: string
}

const PROVIDERS = [
  { id: 'gemini',        label: 'Gemini 1.5 Flash',  tier: 'Free',  cost: '$0'       },
  { id: 'groq',          label: 'Llama 3.1 8B',       tier: 'Free',  cost: '$0'       },
  { id: 'claude-haiku',  label: 'Claude Haiku 4.5',   tier: 'Paid',  cost: '~$1/1M'  },
  { id: 'claude-sonnet', label: 'Claude Sonnet 4.6',  tier: 'Paid',  cost: '~$3/1M'  },
  { id: 'claude-opus',   label: 'Claude Opus 4.8',    tier: 'Paid',  cost: '~$5/1M'  },
]

type Tab = 'overview' | 'districts' | 'citizens' | 'alerts' | 'ai'

export default function AdminPage() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState(false)
  const [authKey, setAuthKey] = useState('')
  const [tab, setTab] = useState<Tab>('overview')
  const [city, setCity] = useState<CityState | null>(null)
  const [citizens, setCitizens] = useState<Citizen[]>([])
  const [alerts, setAlerts] = useState<AlertEvent[]>([])
  const [subs, setSubs] = useState<Subscription[]>([])
  const [aiProvider, setAiProvider] = useState('gemini')
  const [promoMode, setPromoMode] = useState(false)
  const [promoSaving, setPromoSaving] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [search, setSearch] = useState('')
  const [tierUpdating, setTierUpdating] = useState<string | null>(null)

  const loadData = useCallback(async (key: string) => {
    const [cityRes, citizensRes, alertsRes, subsRes, settingsRes] = await Promise.allSettled([
      fetch('/api/nexus/citystate'),
      fetch('/api/admin/citizens', { headers: { 'x-admin-key': key } }),
      fetch('/api/admin/alerts', { headers: { 'x-admin-key': key } }),
      fetch('/api/admin/subscriptions', { headers: { 'x-admin-key': key } }),
      fetch('/api/admin/settings', { headers: { 'x-admin-key': key } }),
    ])
    if (cityRes.status === 'fulfilled' && cityRes.value.ok) setCity(await cityRes.value.json())
    if (citizensRes.status === 'fulfilled' && citizensRes.value.ok) setCitizens(await citizensRes.value.json())
    if (alertsRes.status === 'fulfilled' && alertsRes.value.ok) setAlerts(await alertsRes.value.json())
    if (subsRes.status === 'fulfilled' && subsRes.value.ok) setSubs(await subsRes.value.json())
    if (settingsRes.status === 'fulfilled' && settingsRes.value.ok) {
      const s = await settingsRes.value.json()
      setPromoMode(s.promo_mode === 'true')
    }
  }, [])

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/admin/ai-config', { headers: { 'x-admin-key': password } })
    if (res.ok) {
      const data = await res.json()
      setAiProvider(data.provider)
      setAuthKey(password)
      setAuthed(true)
      loadData(password)
    } else {
      setAuthError(true)
    }
  }

  async function togglePromoMode(val: boolean) {
    setPromoSaving(true)
    await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': authKey },
      body: JSON.stringify({ promo_mode: String(val) }),
    })
    setPromoMode(val)
    setPromoSaving(false)
  }

  async function saveProvider(provider: string) {
    setSaving(true)
    await fetch('/api/admin/ai-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': authKey },
      body: JSON.stringify({ provider }),
    })
    setAiProvider(provider)
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function updateTier(id: string, tier: string) {
    setTierUpdating(id)
    const res = await fetch('/api/admin/citizen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': authKey },
      body: JSON.stringify({ id, tier }),
    })
    if (res.ok) setCitizens(prev => prev.map(c => c.id === id ? { ...c, tier } : c))
    setTierUpdating(null)
  }

  const activeSubs = subs.filter(s => s.status === 'active')
  const mrr = activeSubs.length * 19
  const filteredCitizens = citizens.filter(c =>
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.full_name?.toLowerCase().includes(search.toLowerCase()))

  /* ── Login screen ── */
  if (!authed) {
    return (
      <div className="min-h-screen bg-[#0A0E1A] flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <span className="text-2xl font-bold gradient-text">X68</span>
            <p className="text-gray-400 mt-2 text-sm">Command Centre</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
            <form onSubmit={handleAuth} className="space-y-4">
              <input type="password" required placeholder="Admin password"
                value={password}
                onChange={e => { setPassword(e.target.value); setAuthError(false) }}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500/50 transition text-sm" />
              {authError && <p className="text-red-400 text-xs">Invalid password</p>}
              <button type="submit"
                className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-semibold py-3 rounded-lg transition text-sm">
                Enter
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'overview',  label: 'Overview',  icon: '📊' },
    { id: 'districts', label: 'Districts', icon: '🏙️' },
    { id: 'citizens',  label: 'Citizens',  icon: '👤' },
    { id: 'alerts',    label: 'Alerts',    icon: '🔔' },
    { id: 'ai',        label: 'AI Model',  icon: '🤖' },
  ]

  const tierColor = (t: string) =>
    t === 'elite' ? 'bg-yellow-500/20 text-yellow-400' :
    t === 'thriving' ? 'bg-cyan-500/20 text-cyan-400' :
    t === 'growing' ? 'bg-green-500/20 text-green-400' :
    'bg-white/10 text-gray-500'

  return (
    <div className="min-h-screen bg-[#0A0E1A] text-white">
      {/* Sticky nav */}
      <nav className="border-b border-white/10 px-6 py-3 flex items-center justify-between sticky top-0 bg-[#0A0E1A]/95 backdrop-blur z-10">
        <span className="font-bold gradient-text text-sm">X68 Command Centre</span>
        <div className="flex items-center gap-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                tab === t.id ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'
              }`}>
              {t.icon} {t.label}
            </button>
          ))}
          <button onClick={() => setAuthed(false)}
            className="ml-4 text-xs text-gray-600 hover:text-white transition px-2">Lock</button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* ─── OVERVIEW ─── */}
        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Citizens',   value: city?.total_citizens ?? '—',  color: 'text-cyan-400',   sub: 'registered' },
                { label: 'Paid Subs',        value: activeSubs.length,            color: 'text-green-400',  sub: 'active plans' },
                { label: 'Est. MRR',         value: `$${mrr}`,                   color: 'text-yellow-400', sub: '/month' },
                { label: 'Alerts Today',     value: Object.values(city?.districts ?? {}).reduce((a,d) => a + d.alerts_today, 0),
                  color: 'text-purple-400', sub: 'across districts' },
              ].map(s => (
                <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-5">
                  <div className={`text-3xl font-bold font-mono ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-gray-400 mt-1">{s.label}</div>
                  <div className="text-xs text-gray-600">{s.sub}</div>
                </div>
              ))}
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-gray-300 mb-4">District Health</h2>
              <div className="space-y-3">
                {Object.values(city?.districts ?? {}).map(d => (
                  <div key={d.id} className="flex items-center gap-4">
                    <div className="w-28 text-xs text-gray-400">{d.name}</div>
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                        style={{ width: `${d.health_score * 100}%` }} />
                    </div>
                    <div className="text-xs font-mono text-gray-400 w-10 text-right">{Math.round(d.health_score*100)}%</div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${tierColor(d.revenue_tier)}`}>{d.revenue_tier}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-gray-300 mb-4">Recent Alerts</h2>
              {alerts.slice(0,5).length === 0
                ? <p className="text-xs text-gray-600">No alerts yet</p>
                : <div className="space-y-2">
                    {alerts.slice(0,5).map(a => (
                      <div key={a.id} className="flex gap-3 text-xs">
                        <span className="text-gray-600 font-mono shrink-0">{new Date(a.sent_at).toLocaleString()}</span>
                        <span className="text-cyan-400 w-24 shrink-0 capitalize">{a.district}</span>
                        <span className="text-gray-400 truncate">{a.message}</span>
                      </div>
                    ))}
                  </div>
              }
            </div>
          </div>
        )}

        {/* ─── DISTRICTS ─── */}
        {tab === 'districts' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {Object.values(city?.districts ?? {}).map(d => (
              <div key={d.id} className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{d.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${tierColor(d.revenue_tier)}`}>{d.revenue_tier}</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Health',       value: `${Math.round(d.health_score*100)}%`, color: 'text-cyan-400' },
                    { label: 'Alerts Today', value: d.alerts_today,                        color: 'text-yellow-400' },
                    { label: 'Monitors',     value: d.active_monitors,                     color: 'text-purple-400' },
                  ].map(s => (
                    <div key={s.label} className="bg-black/20 rounded-lg p-3">
                      <div className={`text-xl font-mono font-bold ${s.color}`}>{s.value}</div>
                      <div className="text-xs text-gray-600 mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500" style={{ width: `${d.health_score*100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── CITIZENS ─── */}
        {tab === 'citizens' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input type="text" placeholder="Search email or name…"
                value={search} onChange={e => setSearch(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500/50" />
              <span className="text-xs text-gray-500">{filteredCitizens.length} results</span>
            </div>

            {/* Tier legend */}
            <div className="flex gap-3 text-[11px]">
              {[
                { t: 'explorer', label: 'Explorer', color: 'bg-white/10 text-gray-400' },
                { t: 'citizen',  label: 'Citizen',  color: 'bg-cyan-500/20 text-cyan-400' },
                { t: 'pro',      label: 'Pro',       color: 'bg-purple-500/20 text-purple-400' },
              ].map(({ t, label, color }) => (
                <span key={t} className={`px-2 py-0.5 rounded-full ${color}`}>{label}</span>
              ))}
              <span className="text-gray-600 ml-1">— click tier buttons to change access</span>
            </div>

            <div className="space-y-2">
              {filteredCitizens.slice(0, 50).map(c => {
                const tier = c.tier ?? 'explorer'
                const isUpdating = tierUpdating === c.id
                return (
                  <div key={c.id} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-200 font-mono truncate">{c.email}</div>
                      <div className="text-[11px] text-gray-600 mt-0.5">
                        {c.full_name ?? 'No name'} · joined {new Date(c.created_at).toLocaleDateString()} · {c.nexus_credits ?? 0} credits
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {(['explorer', 'citizen', 'pro'] as const).map(t => {
                        const colors: Record<string, string> = {
                          explorer: tier === 'explorer' ? 'bg-white/20 text-white' : 'text-gray-600 hover:text-gray-300',
                          citizen:  tier === 'citizen'  ? 'bg-cyan-500/30 text-cyan-300' : 'text-gray-600 hover:text-cyan-400',
                          pro:      tier === 'pro'      ? 'bg-purple-500/30 text-purple-300' : 'text-gray-600 hover:text-purple-400',
                        }
                        return (
                          <button key={t} disabled={isUpdating || tier === t}
                            onClick={() => updateTier(c.id, t)}
                            className={`text-[10px] px-2.5 py-1 rounded-lg border border-white/10 transition capitalize ${colors[t]} disabled:opacity-40`}>
                            {isUpdating && tier !== t ? '…' : t}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
              {filteredCitizens.length === 0 && (
                <div className="py-12 text-center text-gray-600 text-sm">No citizens yet</div>
              )}
            </div>
          </div>
        )}

        {/* ─── ALERTS ─── */}
        {tab === 'alerts' && (
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead className="border-b border-white/10">
                <tr>{['Time','District','Message'].map(h =>
                  <th key={h} className="px-4 py-3 text-left text-gray-500 font-medium">{h}</th>
                )}</tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {alerts.map(a => (
                  <tr key={a.id} className="hover:bg-white/5 transition">
                    <td className="px-4 py-3 text-gray-600 font-mono whitespace-nowrap">{new Date(a.sent_at).toLocaleString()}</td>
                    <td className="px-4 py-3 text-cyan-400 capitalize">{a.district}</td>
                    <td className="px-4 py-3 text-gray-300">{a.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {alerts.length === 0 && <div className="py-12 text-center text-gray-600 text-sm">No alerts logged yet</div>}
          </div>
        )}

        {/* ─── AI MODEL ─── */}
        {tab === 'ai' && (
          <div className="max-w-xl space-y-6">
            {/* Promo Mode Toggle */}
            <div className={`rounded-xl border p-5 ${promoMode ? 'border-purple-500/40 bg-purple-500/8' : 'border-white/10 bg-white/3'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-white">Promotional Mode</div>
                  <div className="text-xs text-gray-400 mt-1">All Financial District signals unlocked for every visitor — no tier required.</div>
                  {promoMode && <div className="text-xs text-purple-300 mt-1">🎁 Currently active — all citizens see Pro-tier signals</div>}
                </div>
                <button
                  onClick={() => togglePromoMode(!promoMode)}
                  disabled={promoSaving}
                  className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                    promoMode
                      ? 'bg-purple-500 hover:bg-purple-400 text-white'
                      : 'bg-white/10 hover:bg-white/20 text-gray-300 border border-white/20'
                  }`}
                >
                  {promoSaving ? '…' : promoMode ? '🟢 ON — Click to turn OFF' : '⚫ OFF — Click to turn ON'}
                </button>
              </div>
            </div>
            <p className="text-gray-400 text-sm">Switch AI model powering all district analysis. Start free, scale as revenue grows.</p>
            {PROVIDERS.map(p => (
              <button key={p.id} onClick={() => saveProvider(p.id)} disabled={saving}
                className={`w-full text-left p-4 rounded-xl border transition ${
                  aiProvider === p.id ? 'bg-cyan-500/10 border-cyan-500/40' : 'bg-white/5 border-white/10 hover:border-white/20'
                }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full border-2 ${aiProvider === p.id ? 'bg-cyan-400 border-cyan-400' : 'border-gray-600'}`} />
                    <span className="text-sm font-medium">{p.label}</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${p.tier === 'Free' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{p.tier}</span>
                    <div className="text-xs text-gray-600 mt-1">{p.cost}</div>
                  </div>
                </div>
              </button>
            ))}
            {saved && <p className="text-center text-sm text-green-400">✓ Saved</p>}
          </div>
        )}
      </div>
    </div>
  )
}
