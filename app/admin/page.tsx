'use client'

import { useState, useCallback, useEffect } from 'react'

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
interface InviteCode {
  code: string; tier: string; uses_left: number; note: string | null
  expires_at: string | null; created_at: string; used_by: string[]
}
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

type Tab = 'overview' | 'districts' | 'citizens' | 'alerts' | 'ai' | 'invites' | 'ecotopia'

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
  const [citizenPreview, setCitizenPreview] = useState(false)
  const [previewSaving, setPreviewSaving] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [search, setSearch] = useState('')
  const [tierUpdating, setTierUpdating] = useState<string | null>(null)
  // invite codes
  const [invites, setInvites] = useState<InviteCode[]>([])
  const [inviteTier, setInviteTier] = useState<'citizen' | 'pro'>('citizen')
  const [inviteUses, setInviteUses] = useState(1)
  const [inviteDays, setInviteDays] = useState<number | ''>('')
  const [inviteNote, setInviteNote] = useState('')
  const [inviteGenerating, setInviteGenerating] = useState(false)
  const [inviteNewCode, setInviteNewCode] = useState<string | null>(null)
  const [howToOpen, setHowToOpen] = useState(false)
  const [deletingCode, setDeletingCode] = useState<string | null>(null)

  const loadInvites = useCallback(async (key: string) => {
    const res = await fetch('/api/admin/invite-codes', { headers: { 'x-admin-key': key } })
    if (res.ok) setInvites(await res.json())
  }, [])

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
      setCitizenPreview(s.citizen_preview === 'true')
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
      loadInvites(password)
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

  async function toggleCitizenPreview(val: boolean) {
    setPreviewSaving(true)
    await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': authKey },
      body: JSON.stringify({ citizen_preview: String(val) }),
    })
    setCitizenPreview(val)
    setPreviewSaving(false)
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

  async function generateInvite() {
    setInviteGenerating(true)
    setInviteNewCode(null)
    const res = await fetch('/api/admin/invite-codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': authKey },
      body: JSON.stringify({ tier: inviteTier, uses: inviteUses, note: inviteNote, expires_days: inviteDays || undefined }),
    })
    if (res.ok) {
      const row = await res.json()
      setInviteNewCode(row.code)
      setInvites(prev => [row, ...prev])
      setInviteNote('')
    }
    setInviteGenerating(false)
  }

  async function deleteInvite(code: string) {
    setDeletingCode(code)
    await fetch('/api/admin/invite-codes', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': authKey },
      body: JSON.stringify({ code }),
    })
    setInvites(prev => prev.filter(i => i.code !== code))
    setDeletingCode(null)
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
    { id: 'invites',   label: 'Invites',   icon: '🎟️' },
    { id: 'ecotopia',  label: 'Ecotopia',  icon: '🌍' },
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
            {/* Single Promo Toggle */}
            <div className={`rounded-xl border p-5 ${promoMode ? 'border-purple-500/40 bg-purple-500/8' : 'border-white/10 bg-white/3'}`}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-white">Free Promotional Access</div>
                  <div className="text-xs text-gray-400 mt-1 leading-relaxed">
                    <span className="text-purple-300 font-medium">ON</span> — All Financial District signals (strategy health, seasonality, asset classes, sectors, risk heat) unlocked for every visitor, no login required.<br/>
                    <span className="text-slate-400 font-medium">OFF</span> — Paid gating active. Free users see blurred/hidden signals. Only Citizens (paid) get the full suite.
                  </div>
                  {promoMode && <div className="text-xs text-purple-300 mt-2">🎁 Promotion is LIVE — all visitors see the full signal suite</div>}
                </div>
                <button
                  onClick={() => togglePromoMode(!promoMode)}
                  disabled={promoSaving}
                  className={`shrink-0 px-5 py-3 rounded-lg text-sm font-bold transition-all ${
                    promoMode
                      ? 'bg-purple-500 hover:bg-purple-400 text-white'
                      : 'bg-white/10 hover:bg-white/20 text-gray-300 border border-white/20'
                  }`}
                >
                  {promoSaving ? 'Saving…' : promoMode ? '🎁 END PROMOTION' : '🚀 LAUNCH PROMOTION'}
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

        {/* ─── INVITES ─── */}
        {tab === 'invites' && (
          <div className="max-w-2xl space-y-6">

            {/* ── How-to guide (expandable) ── */}
            <div className="rounded-xl border border-white/10 bg-white/3 overflow-hidden">
              <button
                onClick={() => setHowToOpen(o => !o)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/5 transition"
              >
                <div className="flex items-center gap-2">
                  <span>📖</span>
                  <span className="text-sm font-semibold text-white">How invite codes work</span>
                </div>
                <span className="text-gray-500 text-lg">{howToOpen ? '▲' : '▼'}</span>
              </button>
              {howToOpen && (
                <div className="px-5 pb-5 space-y-3 text-[12px] text-slate-400 border-t border-white/8 pt-4">
                  <p className="text-slate-300 font-medium">Step-by-step: granting a VIP free Citizen upgrade</p>
                  <ol className="space-y-2 list-decimal list-inside">
                    <li>Fill in the form below — pick <strong className="text-white">Citizen</strong> tier, set <strong className="text-white">uses = 1</strong> for a single person, or higher if you're sharing with a small group.</li>
                    <li>Add a note (e.g. <em>"John referral batch Jul 2026"</em>) so you remember why you issued it.</li>
                    <li>Set an expiry (optional) — e.g. <strong className="text-white">30 days</strong> gives them a month to redeem before it locks.</li>
                    <li>Click <strong className="text-white">Generate Code</strong>. Copy the code that appears (e.g. <code className="bg-white/10 px-1 rounded">VIP-X7K2R4</code>).</li>
                    <li>Send the code to the VIP via Telegram, WhatsApp, or email.</li>
                    <li>They log into X68, open <strong className="text-white">Financial District → Redeem Code</strong>, type in the code, and click Redeem — their account instantly upgrades to Citizen.</li>
                    <li>To encourage referrals: tell them <em>"Share X68 with a friend — if they sign up and mention you, I'll issue them a code too."</em></li>
                    <li>You can revoke a code anytime by clicking the 🗑 delete button in the list below.</li>
                  </ol>
                  <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-4 py-3 mt-2">
                    <p className="text-cyan-300 font-medium text-[11px]">Tip — referral tracking</p>
                    <p className="mt-1">Use the <strong>Note</strong> field to tag each code with the referrer&apos;s name. When someone new joins and asks for a code, note who referred them. Over time the notes give you a clear picture of who your best ambassadors are.</p>
                  </div>
                </div>
              )}
            </div>

            {/* ── Generator form ── */}
            <div className="rounded-xl border border-white/10 bg-white/3 p-5 space-y-4">
              <div className="text-sm font-semibold text-white">Generate a new invite code</div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Tier</label>
                  <div className="flex gap-2">
                    {(['citizen', 'pro'] as const).map(t => (
                      <button key={t} onClick={() => setInviteTier(t)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition capitalize ${
                          inviteTier === t
                            ? t === 'citizen' ? 'bg-cyan-500/30 border-cyan-500/50 text-cyan-300' : 'bg-purple-500/30 border-purple-500/50 text-purple-300'
                            : 'border-white/10 text-gray-500 hover:text-gray-300'
                        }`}>{t}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Max uses</label>
                  <input type="number" min={1} max={100} value={inviteUses}
                    onChange={e => setInviteUses(Number(e.target.value))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-cyan-500/50" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Expires in (days, optional)</label>
                  <input type="number" min={1} placeholder="Never"
                    value={inviteDays}
                    onChange={e => setInviteDays(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-cyan-500/50" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Note (internal)</label>
                  <input type="text" placeholder="e.g. John referral Jul 2026" value={inviteNote}
                    onChange={e => setInviteNote(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-cyan-500/50" />
                </div>
              </div>

              <button onClick={generateInvite} disabled={inviteGenerating}
                className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-bold text-sm py-2.5 rounded-lg transition">
                {inviteGenerating ? 'Generating…' : '🎟️ Generate Code'}
              </button>

              {inviteNewCode && (
                <div className="rounded-lg border border-green-500/30 bg-green-500/8 px-4 py-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] text-green-400 uppercase tracking-wider mb-1">New code — copy and send to VIP</div>
                    <div className="text-2xl font-mono font-bold text-white tracking-widest">{inviteNewCode}</div>
                  </div>
                  <button onClick={() => { navigator.clipboard.writeText(inviteNewCode); }}
                    className="shrink-0 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-white transition">
                    Copy
                  </button>
                </div>
              )}
            </div>

            {/* ── Code list ── */}
            <div className="space-y-2">
              <div className="text-xs text-slate-500 uppercase tracking-wider">Issued codes ({invites.length})</div>
              {invites.length === 0 && (
                <div className="py-10 text-center text-gray-600 text-sm">No codes generated yet</div>
              )}
              {invites.map(inv => {
                const expired = inv.expires_at ? new Date(inv.expires_at) < new Date() : false
                const exhausted = inv.uses_left <= 0
                const status = expired ? 'Expired' : exhausted ? 'Used up' : 'Active'
                const statusColor = expired || exhausted ? 'text-red-400' : 'text-green-400'
                return (
                  <div key={inv.code} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-mono font-bold text-white">{inv.code}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${inv.tier === 'pro' ? 'bg-purple-500/20 text-purple-400' : 'bg-cyan-500/20 text-cyan-400'} capitalize`}>{inv.tier}</span>
                        <span className={`text-[10px] font-medium ${statusColor}`}>{status}</span>
                      </div>
                      <div className="text-[11px] text-slate-600 mt-0.5 space-x-2">
                        <span>{inv.uses_left} use{inv.uses_left !== 1 ? 's' : ''} left · {inv.used_by?.length ?? 0} redeemed</span>
                        {inv.expires_at && <span>· expires {new Date(inv.expires_at).toLocaleDateString()}</span>}
                        {inv.note && <span>· {inv.note}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteInvite(inv.code)}
                      disabled={deletingCode === inv.code}
                      className="shrink-0 text-gray-600 hover:text-red-400 transition text-lg disabled:opacity-30"
                      title="Revoke code"
                    >
                      {deletingCode === inv.code ? '…' : '🗑'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}
        {/* ─── ECOTOPIA GAME ADMIN ─── */}
        {tab === 'ecotopia' && <EcotopiaPanel secret={authKey} />}

      </div>
    </div>
  )
}

// ─── Ecotopia Game Admin Panel ────────────────────────────────────────────────
function EcotopiaPanel({ secret }: { secret: string }) {
  const VPS = 'https://204.168.221.101:8444'

  const DISTRICTS = [
    { id:'hub',      name:'Nexus Hub',        color:'#7C3AED', genre:'Social Lobby'        },
    { id:'boutique', name:'Boutique District', color:'#EC4899', genre:'Social Plaza'        },
    { id:'harvest',  name:'Harvest Fields',    color:'#84CC16', genre:'Farming Sim'         },
    { id:'aqua',     name:'Aqua Zone',         color:'#06B6D4', genre:'Platformer'          },
    { id:'grove',    name:'Whispering Grove',  color:'#10B981', genre:'Open World'          },
    { id:'castle',   name:'Castle Ramparts',   color:'#F59E0B', genre:'RPG Raid'            },
    { id:'neon',     name:'Neon City',         color:'#EF4444', genre:'Top-down Shooter'    },
    { id:'carnival', name:'Carnival Square',   color:'#F97316', genre:'Party Games'         },
    { id:'glacier',  name:'Glacier Peak',      color:'#3B82F6', genre:'Ice Physics Puzzler' },
  ]

  const [zones, setZones]       = useState<any[]>([])
  const [merchants, setMerchants] = useState<any[]>([])
  const [products, setProducts]  = useState<any[]>([])
  const [ecoTab, setEcoTab]     = useState<'live'|'merchants'|'products'>('live')
  const [loading, setLoading]   = useState(false)
  const [msg, setMsg]           = useState('')

  // Merchant form
  const [mForm, setMForm] = useState({ name:'', district:'hub', logo_url:'', qr_url:'', website:'' })
  const [editM, setEditM] = useState<string|null>(null)

  // Product form
  const [pForm, setPForm] = useState({ merchant_id:'', name:'', price:'', image_url:'', active:true })
  const [editP, setEditP] = useState<string|null>(null)

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  const fetchZones = useCallback(async () => {
    try {
      const r = await fetch('/api/districts')
      if (r.ok) setZones(await r.json())
    } catch { setZones([]) }
  }, [])

  const fetchMerchants = useCallback(async () => {
    const r = await fetch('/api/admin/merchants?table=merchants', { headers: { 'x-admin-key': secret } })
    if (r.ok) { const j = await r.json(); setMerchants(j.data ?? []) }
  }, [secret])

  const fetchProducts = useCallback(async () => {
    const r = await fetch('/api/admin/merchants?table=products', { headers: { 'x-admin-key': secret } })
    if (r.ok) { const j = await r.json(); setProducts(j.data ?? []) }
  }, [secret])

  useEffect(() => {
    fetchZones()
    fetchMerchants()
    fetchProducts()
    const t = setInterval(fetchZones, 15000)
    return () => clearInterval(t)
  }, [fetchZones, fetchMerchants, fetchProducts])

  async function saveMerchant() {
    setLoading(true)
    const body = { table: 'merchants', row: mForm, ...(editM ? { id: editM } : {}) }
    const r = await fetch('/api/admin/merchants', { method:'POST', headers:{ 'content-type':'application/json','x-admin-key':secret }, body: JSON.stringify(body) })
    setLoading(false)
    if (r.ok) { flash(editM ? 'Merchant updated' : 'Merchant added'); setMForm({ name:'', district:'hub', logo_url:'', qr_url:'', website:'' }); setEditM(null); fetchMerchants() }
    else flash('Error saving merchant')
  }

  async function deleteMerchant(id: string) {
    if (!confirm('Delete merchant?')) return
    await fetch('/api/admin/merchants', { method:'DELETE', headers:{ 'content-type':'application/json','x-admin-key':secret }, body: JSON.stringify({ table:'merchants', id }) })
    fetchMerchants()
  }

  async function saveProduct() {
    setLoading(true)
    const row = { ...pForm, price: parseFloat(pForm.price) || 0 }
    const body = { table:'products', row, ...(editP ? { id: editP } : {}) }
    const r = await fetch('/api/admin/merchants', { method:'POST', headers:{ 'content-type':'application/json','x-admin-key':secret }, body: JSON.stringify(body) })
    setLoading(false)
    if (r.ok) { flash(editP ? 'Product updated' : 'Product added'); setPForm({ merchant_id:'', name:'', price:'', image_url:'', active:true }); setEditP(null); fetchProducts() }
    else flash('Error saving product')
  }

  async function deleteProduct(id: string) {
    if (!confirm('Delete product?')) return
    await fetch('/api/admin/merchants', { method:'DELETE', headers:{ 'content-type':'application/json','x-admin-key':secret }, body: JSON.stringify({ table:'products', id }) })
    fetchProducts()
  }

  const zoneList = Array.isArray(zones) ? zones : (zones as any)?.districts ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">🌍 Ecotopia Game Admin</h2>
          <p className="text-xs text-slate-500 mt-0.5">Manage districts, merchants and featured products</p>
        </div>
        <a href={`${VPS}/game/`} target="_blank" rel="noopener noreferrer"
          className="text-xs px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition">
          Open Game ↗
        </a>
      </div>

      {msg && <div className="text-xs px-3 py-2 rounded-lg bg-green-500/20 text-green-300">{msg}</div>}

      {/* Sub-tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-2">
        {(['live','merchants','products'] as const).map(t => (
          <button key={t} onClick={() => setEcoTab(t)}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition capitalize ${ecoTab===t ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white'}`}>
            {t === 'live' ? '📡 Live Zones' : t === 'merchants' ? '🏪 Merchants' : '📦 Products'}
          </button>
        ))}
      </div>

      {/* LIVE ZONES */}
      {ecoTab === 'live' && (
        <div className="grid grid-cols-3 gap-3">
          {DISTRICTS.map(d => {
            const z = zoneList.find((z: any) => z.id === d.id)
            const active = z?.active ?? false
            const players = z?.players ?? 0
            return (
              <div key={d.id} className="rounded-xl border border-white/10 p-4 space-y-2" style={{ borderLeftColor: d.color, borderLeftWidth: 3 }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">{d.name}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${active ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-slate-600'}`}>
                    {active ? 'LIVE' : 'IDLE'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">{d.genre}</p>
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <span>👥</span>
                  <span>{players} player{players !== 1 ? 's' : ''}</span>
                  {z?.port && <span className="ml-auto text-slate-600">:{z.port}</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* MERCHANTS */}
      {ecoTab === 'merchants' && (
        <div className="space-y-6">
          {/* Form */}
          <div className="rounded-xl border border-white/10 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-white">{editM ? 'Edit Merchant' : 'Add Merchant'}</h3>
            <div className="grid grid-cols-2 gap-3">
              <input value={mForm.name} onChange={e=>setMForm(f=>({...f,name:e.target.value}))}
                placeholder="Merchant name" className="col-span-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500" />
              <select value={mForm.district} onChange={e=>setMForm(f=>({...f,district:e.target.value}))}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500">
                {DISTRICTS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <input value={mForm.website} onChange={e=>setMForm(f=>({...f,website:e.target.value}))}
                placeholder="Website URL" className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500" />
              <input value={mForm.logo_url} onChange={e=>setMForm(f=>({...f,logo_url:e.target.value}))}
                placeholder="Logo image URL" className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500" />
              <input value={mForm.qr_url} onChange={e=>setMForm(f=>({...f,qr_url:e.target.value}))}
                placeholder="QR code image URL" className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500" />
            </div>
            <div className="flex gap-2">
              <button onClick={saveMerchant} disabled={loading || !mForm.name}
                className="px-4 py-2 text-xs rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-medium transition">
                {loading ? 'Saving…' : editM ? 'Update' : 'Add Merchant'}
              </button>
              {editM && <button onClick={()=>{setEditM(null);setMForm({name:'',district:'hub',logo_url:'',qr_url:'',website:''})}} className="px-4 py-2 text-xs rounded-lg bg-white/5 text-slate-400 hover:text-white transition">Cancel</button>}
            </div>
          </div>

          {/* List */}
          <div className="space-y-2">
            {merchants.map((m: any) => {
              const d = DISTRICTS.find(d => d.id === m.district)
              return (
                <div key={m.id} className="flex items-center gap-3 rounded-xl border border-white/10 p-3">
                  {m.logo_url && <img src={m.logo_url} alt="" className="w-10 h-10 rounded-lg object-cover" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{m.name}</span>
                      {d && <span className="text-[10px] px-2 py-0.5 rounded-full text-white" style={{background: d.color+'33', color: d.color}}>{d.name}</span>}
                    </div>
                    {m.website && <a href={m.website} target="_blank" rel="noopener noreferrer" className="text-[11px] text-purple-400 hover:underline">{m.website}</a>}
                    {m.qr_url && <span className="ml-2 text-[11px] text-green-400">QR ✓</span>}
                  </div>
                  <button onClick={()=>{setEditM(m.id);setMForm({name:m.name,district:m.district,logo_url:m.logo_url??'',qr_url:m.qr_url??'',website:m.website??''})}} className="text-xs text-slate-500 hover:text-white px-2">Edit</button>
                  <button onClick={()=>deleteMerchant(m.id)} className="text-xs text-slate-600 hover:text-red-400 px-2">🗑</button>
                </div>
              )
            })}
            {merchants.length === 0 && <p className="text-xs text-slate-600 text-center py-4">No merchants yet</p>}
          </div>
        </div>
      )}

      {/* PRODUCTS */}
      {ecoTab === 'products' && (
        <div className="space-y-6">
          {/* Form */}
          <div className="rounded-xl border border-white/10 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-white">{editP ? 'Edit Product' : 'Add Product'}</h3>
            <div className="grid grid-cols-2 gap-3">
              <select value={pForm.merchant_id} onChange={e=>setPForm(f=>({...f,merchant_id:e.target.value}))}
                className="col-span-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500">
                <option value="">Select merchant…</option>
                {merchants.map((m:any) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <input value={pForm.name} onChange={e=>setPForm(f=>({...f,name:e.target.value}))}
                placeholder="Product name" className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500" />
              <input value={pForm.price} onChange={e=>setPForm(f=>({...f,price:e.target.value}))}
                placeholder="Price (e.g. 29.90)" type="number" className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500" />
              <input value={pForm.image_url} onChange={e=>setPForm(f=>({...f,image_url:e.target.value}))}
                placeholder="Product image URL" className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500" />
              <label className="col-span-2 flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                <input type="checkbox" checked={pForm.active} onChange={e=>setPForm(f=>({...f,active:e.target.checked}))} className="rounded" />
                Active (visible in NPC shop)
              </label>
            </div>
            <div className="flex gap-2">
              <button onClick={saveProduct} disabled={loading || !pForm.name || !pForm.merchant_id}
                className="px-4 py-2 text-xs rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-medium transition">
                {loading ? 'Saving…' : editP ? 'Update' : 'Add Product'}
              </button>
              {editP && <button onClick={()=>{setEditP(null);setPForm({merchant_id:'',name:'',price:'',image_url:'',active:true})}} className="px-4 py-2 text-xs rounded-lg bg-white/5 text-slate-400 hover:text-white transition">Cancel</button>}
            </div>
          </div>

          {/* List */}
          <div className="space-y-2">
            {products.map((p: any) => {
              const m = merchants.find((m:any) => m.id === p.merchant_id)
              return (
                <div key={p.id} className="flex items-center gap-3 rounded-xl border border-white/10 p-3">
                  {p.image_url && <img src={p.image_url} alt="" className="w-10 h-10 rounded-lg object-cover" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{p.name}</span>
                      {!p.active && <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-400">Hidden</span>}
                    </div>
                    <div className="text-[11px] text-slate-500 space-x-2">
                      {m && <span>{m.name}</span>}
                      {p.price && <span>· ${p.price}</span>}
                    </div>
                  </div>
                  <button onClick={()=>{setEditP(p.id);setPForm({merchant_id:p.merchant_id,name:p.name,price:String(p.price??''),image_url:p.image_url??'',active:p.active??true})}} className="text-xs text-slate-500 hover:text-white px-2">Edit</button>
                  <button onClick={()=>deleteProduct(p.id)} className="text-xs text-slate-600 hover:text-red-400 px-2">🗑</button>
                </div>
              )
            })}
            {products.length === 0 && <p className="text-xs text-slate-600 text-center py-4">No products yet</p>}
          </div>
        </div>
      )}
    </div>
  )
}
