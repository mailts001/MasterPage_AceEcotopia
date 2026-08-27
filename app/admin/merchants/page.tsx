'use client'

import { useEffect, useState, useCallback } from 'react'

// ─── Auth ─────────────────────────────────────────────────────────────────────

const SECRET_KEY = 'x68_admin_secret'

function getSecret() {
  try { return sessionStorage.getItem(SECRET_KEY) ?? '' } catch { return '' }
}
function saveSecret(s: string) {
  try { sessionStorage.setItem(SECRET_KEY, s) } catch {}
}

async function adminFetch(secret: string, path: string, opts?: RequestInit) {
  const res = await fetch(path, {
    ...opts,
    headers: { 'x-admin-secret': secret, 'Content-Type': 'application/json', ...(opts?.headers ?? {}) },
  })
  return res
}

// ─── Root ─────────────────────────────────────────────────────────────────────

type Tab = 'merchants' | 'campaigns' | 'placements'

export default function AdminMerchantsPage() {
  const [secret, setSecret]   = useState('')
  const [input, setInput]     = useState('')
  const [checking, setChecking] = useState(false)
  const [authErr, setAuthErr] = useState('')
  const [tab, setTab]         = useState<Tab>('merchants')

  // Restore session secret on mount
  useEffect(() => {
    const s = getSecret()
    if (s) setSecret(s)
  }, [])

  const unlock = async (e: React.FormEvent) => {
    e.preventDefault()
    setChecking(true)
    setAuthErr('')
    const res = await adminFetch(input, '/api/admin/merchants?table=merchants')
    setChecking(false)
    if (res.ok) {
      saveSecret(input)
      setSecret(input)
    } else {
      setAuthErr('Wrong admin secret.')
    }
  }

  if (!secret) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <form onSubmit={unlock} className="bg-white/5 border border-white/10 rounded-2xl p-8 w-full max-w-sm space-y-4">
          <div className="text-center mb-2">
            <div className="text-2xl mb-2">🔐</div>
            <h1 className="text-lg font-bold text-white">Merchant Admin</h1>
            <p className="text-gray-500 text-sm">Enter your admin secret to continue</p>
          </div>
          <input
            type="password"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Admin secret"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500"
          />
          {authErr && <p className="text-red-400 text-xs">{authErr}</p>}
          <button type="submit" disabled={checking || !input}
            className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm transition">
            {checking ? 'Checking…' : 'Unlock'}
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Merchant Admin</h1>
            <p className="text-gray-500 text-sm mt-1">Manage merchants, campaigns, and game placements</p>
          </div>
          <button onClick={() => { saveSecret(''); setSecret('') }}
            className="text-xs text-gray-600 hover:text-gray-400 transition">
            Sign out
          </button>
        </div>

        <div className="flex gap-2 border-b border-white/10">
          {(['merchants', 'campaigns', 'placements'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm capitalize border-b-2 transition ${
                tab === t ? 'border-cyan-500 text-white' : 'border-transparent text-gray-500 hover:text-white'
              }`}>
              {t}
            </button>
          ))}
        </div>

        {tab === 'merchants'  && <MerchantsTab  secret={secret} />}
        {tab === 'campaigns'  && <CampaignsTab  secret={secret} />}
        {tab === 'placements' && <PlacementsTab secret={secret} />}
      </div>
    </div>
  )
}

// ─── Merchants tab ────────────────────────────────────────────────────────────

function MerchantsTab({ secret }: { secret: string }) {
  const [merchants, setMerchants] = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [form, setForm]           = useState({ name: '', category: 'retail', contact_email: '', description: '', logo_url: '' })
  const [saving, setSaving]       = useState(false)
  const [err, setErr]             = useState('')

  const load = useCallback(async () => {
    const res = await adminFetch(secret, '/api/admin/merchants?table=merchants')
    const { data } = await res.json()
    setMerchants(data ?? [])
    setLoading(false)
  }, [secret])

  useEffect(() => { load() }, [load])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setErr('')
    const res = await adminFetch(secret, '/api/admin/merchants', {
      method: 'POST',
      body: JSON.stringify({ table: 'merchants', row: { ...form, tier: 'basic', approved: true } }),
    })
    const j = await res.json()
    if (j.error) { setErr(j.error); setSaving(false); return }
    setForm({ name: '', category: 'retail', contact_email: '', description: '', logo_url: '' })
    setSaving(false)
    load()
  }

  const del = async (id: string) => {
    if (!confirm('Delete this merchant and all its products/campaigns?')) return
    await adminFetch(secret, '/api/admin/merchants', {
      method: 'DELETE',
      body: JSON.stringify({ table: 'merchants', id }),
    })
    load()
  }

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-sm">Add Merchant</h3>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Business Name *"  value={form.name}          onChange={v => setForm(f => ({ ...f, name: v }))} required />
          <Input label="Category"          value={form.category}      onChange={v => setForm(f => ({ ...f, category: v }))} />
          <Input label="Contact Email *"   value={form.contact_email} onChange={v => setForm(f => ({ ...f, contact_email: v }))} required />
          <Input label="Logo URL"          value={form.logo_url}      onChange={v => setForm(f => ({ ...f, logo_url: v }))} />
          <div className="col-span-2">
            <Input label="Description"     value={form.description}   onChange={v => setForm(f => ({ ...f, description: v }))} />
          </div>
        </div>
        {err && <p className="text-red-400 text-xs">{err}</p>}
        <button type="submit" disabled={saving}
          className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm font-medium disabled:opacity-50 transition">
          {saving ? 'Saving…' : 'Add Merchant'}
        </button>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-white/10">
              <th className="pb-2 pr-4">Merchant</th>
              <th className="pb-2 pr-4">Category</th>
              <th className="pb-2 pr-4">Email</th>
              <th className="pb-2 pr-4">Tier</th>
              <th className="pb-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr><td colSpan={5} className="py-6 text-gray-600 text-center">Loading…</td></tr>
            ) : merchants.length === 0 ? (
              <tr><td colSpan={5} className="py-6 text-gray-600 text-center">No merchants yet — add one above</td></tr>
            ) : merchants.map(m => (
              <tr key={m.id}>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    {m.logo_url && <img src={m.logo_url} alt="" className="w-7 h-7 rounded object-cover" />}
                    <span className="font-medium">{m.name}</span>
                  </div>
                </td>
                <td className="py-3 pr-4 text-gray-400">{m.category}</td>
                <td className="py-3 pr-4 text-gray-400 text-xs">{m.contact_email}</td>
                <td className="py-3 pr-4"><span className="text-xs bg-white/10 px-2 py-0.5 rounded">{m.tier}</span></td>
                <td className="py-3">
                  <button onClick={() => del(m.id)} className="text-xs text-red-400 hover:text-red-300 transition">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Campaigns tab ────────────────────────────────────────────────────────────

function CampaignsTab({ secret }: { secret: string }) {
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [merchants, setMerchants] = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [form, setForm]           = useState({ merchant_id: '', name: '', objective: 'redemption', start_date: '', end_date: '', budget: '0' })
  const [saving, setSaving]       = useState(false)
  const [err, setErr]             = useState('')

  const loadAll = useCallback(async () => {
    const [cr, mr] = await Promise.all([
      adminFetch(secret, '/api/admin/merchants?table=campaigns').then(r => r.json()),
      adminFetch(secret, '/api/admin/merchants?table=merchants').then(r => r.json()),
    ])
    setCampaigns(cr.data ?? [])
    setMerchants(mr.data ?? [])
    setLoading(false)
  }, [secret])

  useEffect(() => { loadAll() }, [loadAll])

  const setStatus = async (id: string, status: string) => {
    await adminFetch(secret, '/api/admin/merchants', {
      method: 'POST',
      body: JSON.stringify({ table: 'campaigns', row: { id, status } }),
    })
    setCampaigns(cs => cs.map(c => c.id === id ? { ...c, status } : c))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setErr('')
    const res = await adminFetch(secret, '/api/admin/merchants', {
      method: 'POST',
      body: JSON.stringify({ table: 'campaigns', row: { ...form, budget: Number(form.budget), daily_cap: 0, status: 'live' } }),
    })
    const j = await res.json()
    if (j.error) { setErr(j.error); setSaving(false); return }
    setForm({ merchant_id: '', name: '', objective: 'redemption', start_date: '', end_date: '', budget: '0' })
    setSaving(false)
    loadAll()
  }

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-sm">Create Campaign</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Merchant *</label>
            <select value={form.merchant_id} onChange={e => setForm(f => ({ ...f, merchant_id: e.target.value }))} required
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cyan-500">
              <option value="">Select merchant…</option>
              {merchants.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <Input label="Campaign Name *" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} required />
          <Input label="Start Date *" value={form.start_date} onChange={v => setForm(f => ({ ...f, start_date: v }))} placeholder="YYYY-MM-DD" required />
          <Input label="End Date *"   value={form.end_date}   onChange={v => setForm(f => ({ ...f, end_date: v }))}   placeholder="YYYY-MM-DD" required />
        </div>
        {err && <p className="text-red-400 text-xs">{err}</p>}
        <button type="submit" disabled={saving}
          className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm font-medium disabled:opacity-50 transition">
          {saving ? 'Saving…' : 'Create (auto-live)'}
        </button>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-white/10">
              <th className="pb-2 pr-4">Campaign</th>
              <th className="pb-2 pr-4">Merchant</th>
              <th className="pb-2 pr-4">Dates</th>
              <th className="pb-2 pr-4">Status</th>
              <th className="pb-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr><td colSpan={5} className="py-6 text-gray-600 text-center">Loading…</td></tr>
            ) : campaigns.map(c => {
              const merchant = merchants.find(m => m.id === c.merchant_id)
              return (
                <tr key={c.id}>
                  <td className="py-3 pr-4 font-medium">{c.name}</td>
                  <td className="py-3 pr-4 text-gray-400">{merchant?.name ?? '—'}</td>
                  <td className="py-3 pr-4 text-gray-400 text-xs">{c.start_date} → {c.end_date}</td>
                  <td className="py-3 pr-4"><StatusBadge status={c.status} /></td>
                  <td className="py-3 flex gap-2">
                    {c.status !== 'live'  && <ActionBtn label="Go Live" onClick={() => setStatus(c.id, 'live')} />}
                    {c.status === 'live'  && <ActionBtn label="Pause"   onClick={() => setStatus(c.id, 'paused')} />}
                    {c.status !== 'ended' && <ActionBtn label="End"     onClick={() => setStatus(c.id, 'ended')} danger />}
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

// ─── Placements tab ───────────────────────────────────────────────────────────

function PlacementsTab({ secret }: { secret: string }) {
  const [rows, setRows]         = useState<any[]>([])
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [coupons, setCoupons]   = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [form, setForm]         = useState({ campaign_id: '', product_id: '', coupon_id: '', game_id: 'tosios', district_id: 'ecommerce', game_role: 'collectible', priority: '5' })
  const [saving, setSaving]     = useState(false)
  const [err, setErr]           = useState('')

  const loadAll = useCallback(async () => {
    const [pr, cr, prod, coup] = await Promise.all([
      adminFetch(secret, '/api/admin/merchants?table=campaign_placements').then(r => r.json()),
      adminFetch(secret, '/api/admin/merchants?table=campaigns').then(r => r.json()),
      adminFetch(secret, '/api/admin/merchants?table=products').then(r => r.json()),
      adminFetch(secret, '/api/admin/merchants?table=coupons').then(r => r.json()),
    ])
    setRows(pr.data ?? [])
    setCampaigns(cr.data ?? [])
    setProducts(prod.data ?? [])
    setCoupons(coup.data ?? [])
    setLoading(false)
  }, [secret])

  useEffect(() => { loadAll() }, [loadAll])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setErr('')
    const res = await adminFetch(secret, '/api/admin/merchants', {
      method: 'POST',
      body: JSON.stringify({ table: 'campaign_placements', row: { ...form, priority: Number(form.priority) } }),
    })
    const j = await res.json()
    if (j.error) { setErr(j.error); setSaving(false); return }
    setForm(f => ({ ...f, campaign_id: '', product_id: '', coupon_id: '' }))
    setSaving(false)
    loadAll()
  }

  const del = async (id: string) => {
    await adminFetch(secret, '/api/admin/merchants', {
      method: 'DELETE',
      body: JSON.stringify({ table: 'campaign_placements', id }),
    })
    loadAll()
  }

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-sm">Add Game Placement</h3>
        <p className="text-xs text-gray-600">Links a product + coupon into a game slot. The game fetches active placements at room creation.</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Campaign *</label>
            <select value={form.campaign_id} onChange={e => setForm(f => ({ ...f, campaign_id: e.target.value }))} required
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cyan-500">
              <option value="">Select campaign…</option>
              {campaigns.map(c => <option key={c.id} value={c.id}>{c.name} [{c.status}]</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Product *</label>
            <select value={form.product_id} onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))} required
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cyan-500">
              <option value="">Select product…</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Coupon *</label>
            <select value={form.coupon_id} onChange={e => setForm(f => ({ ...f, coupon_id: e.target.value }))} required
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cyan-500">
              <option value="">Select coupon…</option>
              {coupons.map(c => <option key={c.id} value={c.id}>{c.reward_type} — {c.value} (inv: {c.inventory})</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Game Role</label>
            <select value={form.game_role} onChange={e => setForm(f => ({ ...f, game_role: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cyan-500">
              {['collectible','target','reward','decoy','mystery'].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
        {err && <p className="text-red-400 text-xs">{err}</p>}
        <button type="submit" disabled={saving}
          className="px-5 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg text-sm font-medium disabled:opacity-50 transition">
          {saving ? 'Saving…' : 'Add Placement → Game'}
        </button>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-white/10">
              <th className="pb-2 pr-4">Product</th>
              <th className="pb-2 pr-4">Campaign</th>
              <th className="pb-2 pr-4">Game / District</th>
              <th className="pb-2 pr-4">Role</th>
              <th className="pb-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr><td colSpan={5} className="py-6 text-gray-600 text-center">Loading…</td></tr>
            ) : rows.map(r => {
              const prod = products.find(p => p.id === r.product_id)
              const camp = campaigns.find(c => c.id === r.campaign_id)
              return (
                <tr key={r.id}>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      {prod?.image_url && <img src={prod.image_url} alt="" className="w-7 h-7 rounded object-cover" />}
                      <span>{prod?.name ?? r.product_id.slice(0,8)}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-gray-400">{camp?.name ?? '—'}</td>
                  <td className="py-3 pr-4 text-gray-400 text-xs">{r.game_id} / {r.district_id}</td>
                  <td className="py-3 pr-4"><RoleBadge role={r.game_role} /></td>
                  <td className="py-3">
                    <button onClick={() => del(r.id)} className="text-xs text-red-400 hover:text-red-300 transition">Remove</button>
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

// ─── Shared components ────────────────────────────────────────────────────────

function Input({ label, value, onChange, required, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; required?: boolean; placeholder?: string
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-gray-500">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} required={required} placeholder={placeholder}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
      />
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const cls: Record<string, string> = { live: 'bg-green-500/20 text-green-400', draft: 'bg-gray-500/20 text-gray-400',
    paused: 'bg-yellow-500/20 text-yellow-400', ended: 'bg-red-500/20 text-red-400' }
  return <span className={`text-xs px-2 py-0.5 rounded ${cls[status] ?? cls.draft}`}>{status}</span>
}

function RoleBadge({ role }: { role: string }) {
  const cls: Record<string, string> = { target: 'text-yellow-400', decoy: 'text-gray-400', reward: 'text-green-400',
    collectible: 'text-cyan-400', mystery: 'text-purple-400' }
  return <span className={`text-xs font-mono ${cls[role] ?? ''}`}>{role}</span>
}

function ActionBtn({ label, onClick, danger = false }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick}
      className={`text-xs px-2 py-1 rounded transition ${danger ? 'text-red-400 hover:bg-red-500/10' : 'text-cyan-400 hover:bg-cyan-500/10'}`}>
      {label}
    </button>
  )
}
