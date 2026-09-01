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

type Tab = 'merchants' | 'products' | 'coupons' | 'campaigns' | 'placements' | 'arena'

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
            <div className="flex flex-wrap gap-3 mt-2">
              <a href="https://imgur.com" target="_blank" rel="noopener noreferrer"
                className="text-xs text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                📷 Imgur (host images)
              </a>
              <span className="text-gray-700 text-xs">→ upload → right-click image → Copy image address → use i.imgur.com/xxx.jpg</span>
              <a href="https://www.remove.bg/" target="_blank" rel="noopener noreferrer"
                className="text-xs text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                ✂️ remove.bg (transparent PNG)
              </a>
            </div>
          </div>
          <button onClick={() => { saveSecret(''); setSecret('') }}
            className="text-xs text-gray-600 hover:text-gray-400 transition">
            Sign out
          </button>
        </div>

        {/* Step guide */}
        <div className="flex items-center gap-2 text-xs text-gray-600 bg-white/3 border border-white/8 rounded-lg px-4 py-2">
          <span className="text-amber-500">Setup order:</span>
          <span>1 Merchant →</span>
          <span>2 Products →</span>
          <span>3 Coupons →</span>
          <span>4 Campaign →</span>
          <span>5 Placements</span>
        </div>

        <div className="flex gap-1 border-b border-white/10 overflow-x-auto">
          {([
            { key: 'merchants',  label: '① Merchants' },
            { key: 'products',   label: '② Products' },
            { key: 'coupons',    label: '③ Coupons' },
            { key: 'campaigns',  label: '④ Campaigns' },
            { key: 'placements', label: '⑤ Placements → Game' },
            { key: 'arena',      label: '🗺 Arena Builder' },
          ] as { key: Tab; label: string }[]).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm whitespace-nowrap border-b-2 transition ${
                tab === t.key ? 'border-cyan-500 text-white' : 'border-transparent text-gray-500 hover:text-white'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'merchants'  && <MerchantsTab  secret={secret} />}
        {tab === 'products'   && <ProductsTab   secret={secret} />}
        {tab === 'coupons'    && <CouponsTab    secret={secret} />}
        {tab === 'campaigns'  && <CampaignsTab  secret={secret} />}
        {tab === 'placements' && <PlacementsTab secret={secret} />}
        {tab === 'arena'      && <ArenaTab      secret={secret} />}
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

// ─── Products tab ─────────────────────────────────────────────────────────────

function ProductsTab({ secret }: { secret: string }) {
  const [products, setProducts]   = useState<any[]>([])
  const [merchants, setMerchants] = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [form, setForm]           = useState({ merchant_id: '', name: '', image_url: '', price: '0', currency: 'SGD', category: 'general', description: '' })
  const [saving, setSaving]       = useState(false)
  const [err, setErr]             = useState('')

  const loadAll = useCallback(async () => {
    const [pr, mr] = await Promise.all([
      adminFetch(secret, '/api/admin/merchants?table=products').then(r => r.json()),
      adminFetch(secret, '/api/admin/merchants?table=merchants').then(r => r.json()),
    ])
    setProducts(pr.data ?? [])
    setMerchants(mr.data ?? [])
    setLoading(false)
  }, [secret])

  useEffect(() => { loadAll() }, [loadAll])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setErr('')
    const res = await adminFetch(secret, '/api/admin/merchants', {
      method: 'POST',
      body: JSON.stringify({ table: 'products', row: { ...form, price: Number(form.price) } }),
    })
    const j = await res.json()
    if (j.error) { setErr(j.error); setSaving(false); return }
    setForm({ merchant_id: form.merchant_id, name: '', image_url: '', price: '0', currency: 'SGD', category: 'general', description: '' })
    setSaving(false)
    loadAll()
  }

  const del = async (id: string) => {
    if (!confirm('Delete this product?')) return
    await adminFetch(secret, '/api/admin/merchants', { method: 'DELETE', body: JSON.stringify({ table: 'products', id }) })
    loadAll()
  }

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
        <div>
          <h3 className="font-semibold text-sm">Add Product</h3>
          <p className="text-xs text-gray-600 mt-0.5">Products appear as collectible items inside the game. Use a square image URL (64×64 or 128×128).</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1 col-span-2">
            <label className="text-xs text-gray-500">Merchant *</label>
            <select value={form.merchant_id} onChange={e => setForm(f => ({ ...f, merchant_id: e.target.value }))} required
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cyan-500">
              <option value="">Select merchant…</option>
              {merchants.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <Input label="Product Name *"    value={form.name}        onChange={v => setForm(f => ({ ...f, name: v }))}        required />
          <Input label="Price (SGD)"       value={form.price}       onChange={v => setForm(f => ({ ...f, price: v }))}        placeholder="0" />
          <div className="col-span-2">
            <Input label="Image URL * (shown in game — use a direct image link, e.g. from Imgur or your CDN)"
              value={form.image_url} onChange={v => setForm(f => ({ ...f, image_url: v }))} required
              placeholder="https://i.imgur.com/xxx.png" />
          </div>
          <Input label="Category"          value={form.category}    onChange={v => setForm(f => ({ ...f, category: v }))}     placeholder="fashion / electronics / food" />
          <Input label="Description"       value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} />
        </div>
        {form.image_url && (
          <div className="flex items-center gap-3 bg-black/30 rounded-lg p-3">
            <img src={form.image_url} alt="preview" className="w-12 h-12 rounded object-cover border border-white/10" />
            <span className="text-xs text-gray-500">Image preview — this is what appears in the game</span>
          </div>
        )}
        {err && <p className="text-red-400 text-xs">{err}</p>}
        <button type="submit" disabled={saving}
          className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm font-medium disabled:opacity-50 transition">
          {saving ? 'Saving…' : 'Add Product'}
        </button>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-white/10">
              <th className="pb-2 pr-4">Product</th>
              <th className="pb-2 pr-4">Merchant</th>
              <th className="pb-2 pr-4">Price</th>
              <th className="pb-2 pr-4">Category</th>
              <th className="pb-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr><td colSpan={5} className="py-6 text-gray-600 text-center">Loading…</td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan={5} className="py-6 text-gray-600 text-center">No products yet — add one above</td></tr>
            ) : products.map(p => {
              const merchant = merchants.find(m => m.id === p.merchant_id)
              return (
                <tr key={p.id}>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      {p.image_url && <img src={p.image_url} alt="" className="w-8 h-8 rounded object-cover border border-white/10" />}
                      <span className="font-medium">{p.name}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-gray-400">{merchant?.name ?? '—'}</td>
                  <td className="py-3 pr-4 text-gray-400">${p.price} {p.currency}</td>
                  <td className="py-3 pr-4 text-gray-400">{p.category}</td>
                  <td className="py-3">
                    <button onClick={() => del(p.id)} className="text-xs text-red-400 hover:text-red-300 transition">Delete</button>
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

// ─── Coupons tab ──────────────────────────────────────────────────────────────

function CouponsTab({ secret }: { secret: string }) {
  const [coupons, setCoupons]   = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [form, setForm]         = useState({ product_id: '', reward_type: 'coupon_pct', value: '10', code: '', inventory: '100' })
  const [saving, setSaving]     = useState(false)
  const [err, setErr]           = useState('')

  const loadAll = useCallback(async () => {
    const [cr, pr] = await Promise.all([
      adminFetch(secret, '/api/admin/merchants?table=coupons').then(r => r.json()),
      adminFetch(secret, '/api/admin/merchants?table=products').then(r => r.json()),
    ])
    setCoupons(cr.data ?? [])
    setProducts(pr.data ?? [])
    setLoading(false)
  }, [secret])

  useEffect(() => { loadAll() }, [loadAll])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setErr('')
    const res = await adminFetch(secret, '/api/admin/merchants', {
      method: 'POST',
      body: JSON.stringify({ table: 'coupons', row: {
        product_id: form.product_id,
        reward_type: form.reward_type,
        value: Number(form.value),
        code: form.code || null,
        inventory: Number(form.inventory),
      }}),
    })
    const j = await res.json()
    if (j.error) { setErr(j.error); setSaving(false); return }
    setForm(f => ({ ...f, value: '10', code: '', inventory: '100' }))
    setSaving(false)
    loadAll()
  }

  const del = async (id: string) => {
    if (!confirm('Delete this coupon?')) return
    await adminFetch(secret, '/api/admin/merchants', { method: 'DELETE', body: JSON.stringify({ table: 'coupons', id }) })
    loadAll()
  }

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
        <div>
          <h3 className="font-semibold text-sm">Add Coupon / Reward</h3>
          <p className="text-xs text-gray-600 mt-0.5">Each coupon is the reward a player wins when they collect the product in-game.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1 col-span-2">
            <label className="text-xs text-gray-500">Product *</label>
            <select value={form.product_id} onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))} required
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cyan-500">
              <option value="">Select product this coupon belongs to…</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Reward Type *</label>
            <select value={form.reward_type} onChange={e => setForm(f => ({ ...f, reward_type: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cyan-500">
              <option value="coupon_pct">% Discount (e.g. 20% off)</option>
              <option value="coupon_fixed">Fixed $ Off (e.g. $10 off)</option>
              <option value="points">XP / Points</option>
              <option value="merchandise">Free Merchandise</option>
            </select>
          </div>
          <Input label="Value (% or $)" value={form.value} onChange={v => setForm(f => ({ ...f, value: v }))} placeholder="20" required />
          <Input label="Coupon Code (optional)" value={form.code} onChange={v => setForm(f => ({ ...f, code: v }))} placeholder="DEALHUNT20" />
          <Input label="Inventory (max redemptions)" value={form.inventory} onChange={v => setForm(f => ({ ...f, inventory: v }))} placeholder="100" />
        </div>
        {err && <p className="text-red-400 text-xs">{err}</p>}
        <button type="submit" disabled={saving}
          className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm font-medium disabled:opacity-50 transition">
          {saving ? 'Saving…' : 'Add Coupon'}
        </button>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-white/10">
              <th className="pb-2 pr-4">Product</th>
              <th className="pb-2 pr-4">Type</th>
              <th className="pb-2 pr-4">Value</th>
              <th className="pb-2 pr-4">Code</th>
              <th className="pb-2 pr-4">Inventory</th>
              <th className="pb-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr><td colSpan={6} className="py-6 text-gray-600 text-center">Loading…</td></tr>
            ) : coupons.length === 0 ? (
              <tr><td colSpan={6} className="py-6 text-gray-600 text-center">No coupons yet — add one above</td></tr>
            ) : coupons.map(c => {
              const product = products.find(p => p.id === c.product_id)
              return (
                <tr key={c.id}>
                  <td className="py-3 pr-4 font-medium">{product?.name ?? '—'}</td>
                  <td className="py-3 pr-4 text-gray-400 text-xs">{c.reward_type}</td>
                  <td className="py-3 pr-4 text-amber-400 font-mono">{c.reward_type === 'coupon_pct' ? `${c.value}%` : `$${c.value}`}</td>
                  <td className="py-3 pr-4 text-gray-400 font-mono text-xs">{c.code ?? '—'}</td>
                  <td className="py-3 pr-4 text-gray-400">{c.redeemed_count}/{c.inventory}</td>
                  <td className="py-3">
                    <button onClick={() => del(c.id)} className="text-xs text-red-400 hover:text-red-300 transition">Delete</button>
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

// ─── Campaigns tab ────────────────────────────────────────────────────────────

function CampaignsTab({ secret }: { secret: string }) {
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [merchants, setMerchants] = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [form, setForm]           = useState({ merchant_id: '', name: '', objective: 'redemption', start_date: '', end_date: '', budget: '0', background_image_url: '', map_theme: 'default' })
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
      body: JSON.stringify({ table: 'campaigns', id, row: { status } }),
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
    setForm({ merchant_id: '', name: '', objective: 'redemption', start_date: '', end_date: '', budget: '0', background_image_url: '', map_theme: 'default' })
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
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Arena Map Theme</label>
            <select value={form.map_theme} onChange={e => setForm(f => ({ ...f, map_theme: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cyan-500">
              <option value="default">🏰 Default (Dungeon)</option>
              <option value="boutique">🛍️ Boutique (Coming soon)</option>
              <option value="tech_hub">💻 Tech Hub (Coming soon)</option>
              <option value="street_food">🍜 Street Food (Coming soon)</option>
            </select>
          </div>
          <div className="col-span-2 space-y-1">
            <label className="text-xs text-gray-500">Arena Background Image URL — paste direct Imgur link (i.imgur.com/xxx.jpg) of your shop/brand photo</label>
            <input type="url" value={form.background_image_url}
              onChange={e => setForm(f => ({ ...f, background_image_url: e.target.value }))}
              placeholder="https://i.imgur.com/XXXXXXX.jpg"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-500" />
            {form.background_image_url && (
              <img src={form.background_image_url} alt="preview" className="mt-1 w-48 h-28 object-cover rounded-lg border border-white/10" onError={e => (e.currentTarget.style.display='none')} />
            )}
          </div>
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
              <th className="pb-2 pr-4">Theme</th>
              <th className="pb-2 pr-4">Arena BG</th>
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
                  <td className="py-3 pr-4 text-xs">
                    <select
                      value={c.map_theme ?? 'default'}
                      onChange={async e => {
                        const theme = e.target.value
                        await adminFetch(secret, '/api/admin/merchants', { method: 'POST', body: JSON.stringify({ table: 'campaigns', id: c.id, row: { map_theme: theme } }) })
                        setCampaigns(cs => cs.map(x => x.id === c.id ? { ...x, map_theme: theme } : x))
                      }}
                      className="bg-white/5 border border-white/10 rounded px-1 py-0.5 text-gray-300"
                    >
                      <option value="default">default</option>
                      <option value="boutique">boutique</option>
                      <option value="dungeon">dungeon</option>
                    </select>
                  </td>
                  <td className="py-3 pr-4">
                    {c.background_image_url
                      ? <img src={c.background_image_url} alt="bg" className="w-10 h-7 object-cover rounded border border-white/10" />
                      : <span className="text-gray-700 text-xs">no bg</span>}
                  </td>
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
  const [form, setForm]         = useState({ campaign_id: '', product_id: '', coupon_id: '', game_id: 'tosios', district_id: 'ecommerce', game_role: 'collectible', priority: '5', spawn_count: '3' })
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
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Spawn Count (marketing budget = items per game)</label>
            <input type="number" min="1" max="20" value={form.spawn_count}
              onChange={e => setForm(f => ({ ...f, spawn_count: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cyan-500" />
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
              <th className="pb-2 pr-4">Spawns</th>
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
                  <td className="py-3 pr-4 text-gray-400 text-xs">{r.spawn_count ?? 3}x</td>
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

// ─── Arena Builder tab ────────────────────────────────────────────────────────

const FEATURES = ['bridge', 'tunnel', 'portals', 'boss_room', 'maze'] as const
const THEMES   = ['default', 'boutique', 'tech_hub', 'street_food', 'district'] as const

type ArenaFeature = typeof FEATURES[number]
type ArenaTheme   = typeof THEMES[number]

function ArenaTab({ secret }: { secret: string }) {
  const [prompt,   setPrompt]   = useState('boutique fashion district, warm marble, pink brand accents')
  const [theme,    setTheme]    = useState<ArenaTheme>('boutique')
  const [features, setFeatures] = useState<ArenaFeature[]>(['bridge', 'tunnel', 'portals'])
  const [copied,   setCopied]   = useState(false)
  const [generating, setGenerating] = useState(false)
  const [preview,    setPreview]    = useState('')
  const [mapJson,    setMapJson]    = useState<object | null>(null)
  const [genError,   setGenError]   = useState('')
  const [deploying,   setDeploying]   = useState(false)
  const [deployMsg,   setDeployMsg]   = useState('')
  const [plazaLogo,   setPlazaLogo]   = useState<string>('')
  const [uploading,   setUploading]   = useState(false)
  const [uploadErr,   setUploadErr]   = useState('')

  async function uploadLogo(file: File) {
    setUploading(true); setUploadErr('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/arena/upload-logo', {
        method: 'POST',
        headers: { 'x-admin-secret': secret },
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) { setUploadErr(data.error ?? 'Upload failed'); return }
      setPlazaLogo(data.url)
    } catch (e: any) {
      setUploadErr(e.message)
    } finally {
      setUploading(false)
    }
  }

  function toggleFeature(f: ArenaFeature) {
    setFeatures(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])
  }

  async function generate() {
    setGenerating(true); setPreview(''); setGenError('')
    try {
      const res = await fetch('/api/admin/arena/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
        body: JSON.stringify({ prompt, theme, features }),
      })
      const data = await res.json()
      if (!res.ok) { setGenError(data.error ?? 'Generation failed'); return }
      setPreview(data.preview ?? '')
      setMapJson(data.mapJson ?? null)
      setDeployMsg('')
    } catch (e: any) {
      setGenError(e.message)
    } finally {
      setGenerating(false)
    }
  }

  async function deployLive() {
    if (!mapJson) return
    setDeploying(true); setDeployMsg('')
    try {
      const res = await fetch('/api/admin/arena/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
        body: JSON.stringify({ theme, mapJson, plazaLogoUrl: plazaLogo || null }),
      })
      const data = await res.json()
      setDeployMsg(data.ok ? '✓ Deployed! Game rebuilding (~3 min). Set map_theme in Campaign to activate.' : `Error: ${data.error}`)
    } catch (e: any) {
      setDeployMsg(`Error: ${e.message}`)
    } finally {
      setDeploying(false)
    }
  }

  const AGENT = '/Users/tslee/Documents/MasterPage_AceEcotopia/tilemap_agent.py'
  const OVERRIDES = `/Users/tslee/Documents/MasterPage_AceEcotopia/tile_overrides/${theme}`
  const cliCommand = [
    `export GROQ_API_KEY=gsk_YOUR_KEY_HERE`,
    `python3 ${AGENT} \\`,
    `  --prompt "${prompt}" \\`,
    `  --theme ${theme} \\`,
    `  --features ${features.join(' ')} \\`,
    `  --override-dir ${OVERRIDES} \\`,
    `  --preview-only`,
  ].join('\n')

  const deployCmds = [
    `scp /tmp/tilemap_agent/${theme}/dungeon_${theme}.png root@204.168.221.101:/root/x68-game/packages/client/src/game/assets/images/maps/dungeon_${theme}.png`,
    `scp /tmp/tilemap_agent/${theme}/district_${theme}.json root@204.168.221.101:/root/x68-game/packages/common/src/maps/district_${theme}.json`,
    `ssh root@204.168.221.101 "cd /root/x68-game && screen -dmS rebuild bash -c 'yarn build > /tmp/build_${theme}.log 2>&1; systemctl restart colyseus_game; echo DONE >> /tmp/build_${theme}.log'"`,
  ].join('\n')

  function copyCmd(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }


  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold">Arena Builder</h2>
        <p className="text-gray-500 text-sm mt-1">Generate a custom game map for any merchant theme</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Left: controls */}
        <div className="space-y-4 bg-white/3 border border-white/8 rounded-xl p-5">
          <div>
            <label className="block text-xs text-gray-400 mb-1">District vibe / prompt</label>
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cyan-500 resize-none"
              placeholder="e.g. tech hub, dark concrete, neon blue accents" />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Theme name</label>
            <select value={theme} onChange={e => setTheme(e.target.value as ArenaTheme)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cyan-500">
              {THEMES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <p className="text-xs text-gray-600 mt-1">Saved as <code className="text-cyan-700">district_{theme}.json</code> · set in Campaign → map_theme</p>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-2">Map features</label>
            <div className="flex flex-wrap gap-2">
              {FEATURES.map(f => (
                <button key={f} onClick={() => toggleFeature(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                    features.includes(f) ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300' : 'bg-white/5 border-white/10 text-gray-500 hover:text-gray-300'
                  }`}>
                  {f === 'bridge' ? '🌉 ' : f === 'tunnel' ? '🕳 ' : f === 'portals' ? '🌀 ' : f === 'boss_room' ? '💀 ' : '🧩 '}{f}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-600 mt-1.5">bridge=walk under it · tunnel=dark corridor · portals=teleport N/S/E/W</p>
          </div>

          <button onClick={generate} disabled={generating || !prompt}
            className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white font-semibold py-3 rounded-xl text-sm transition flex items-center justify-center gap-2">
            {generating ? <><span className="animate-spin inline-block">⚙</span> Generating…</> : '🗺 Generate Arena Preview'}
          </button>
          {genError && <p className="text-red-400 text-xs">{genError}</p>}

          {preview && (
            <div className="pt-2 border-t border-white/8 space-y-3">

              {/* Plaza logo upload */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Plaza logo / watermark <span className="text-gray-600">(optional — shown in center plaza)</span></label>
                <div className="flex items-center gap-2">
                  <label className="flex-1 cursor-pointer bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-400 hover:border-white/20 transition text-center">
                    {uploading ? '⏳ Uploading…' : plazaLogo ? '✓ Logo uploaded — click to replace' : '📁 Click to upload image (PNG/JPG/SVG)'}
                    <input type="file" accept="image/*" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) uploadLogo(f) }} />
                  </label>
                  {plazaLogo && (
                    <button onClick={() => setPlazaLogo('')} className="text-xs text-red-400 hover:text-red-300 px-2">✕</button>
                  )}
                </div>
                {plazaLogo && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <img src={plazaLogo} alt="plaza logo preview" className="h-10 w-10 object-contain rounded border border-white/10 bg-black/40" />
                    <span className="text-[10px] text-gray-600 truncate">{plazaLogo}</span>
                  </div>
                )}
                {uploadErr && <p className="text-red-400 text-xs mt-1">{uploadErr}</p>}
              </div>

              <button onClick={deployLive} disabled={deploying}
                className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white font-semibold py-3 rounded-xl text-sm transition flex items-center justify-center gap-2">
                {deploying ? <><span className="animate-spin inline-block">⚙</span> Deploying…</> : '🚀 Deploy to Game'}
              </button>
              {deployMsg && (
                <p className={`text-xs ${deployMsg.startsWith('✓') ? 'text-green-400' : 'text-red-400'}`}>{deployMsg}</p>
              )}
              <p className="text-xs text-gray-600">After deploy: go to Campaigns → set map_theme = <code className="text-cyan-800">{theme}</code></p>
            </div>
          )}
        </div>

        {/* Right: ASCII preview */}
        <div className="bg-black/50 border border-white/8 rounded-xl p-4 font-mono text-[9px] leading-[11px] overflow-auto min-h-[340px] flex flex-col">
          {preview ? (
            <>
              <p className="text-gray-600 text-[9px] mb-2">█=wall ░=plaza ·=shop -=bridge ▄=overhead ▪=tunnel P=pillar S=spawner +=portal</p>
              <pre className="text-green-400 whitespace-pre flex-1">{preview}</pre>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-700 text-xs">
              {generating ? 'Generating map layout…' : 'Click Generate to preview map'}
            </div>
          )}
        </div>

        {/* Right: step-by-step instructions */}
        <div className="space-y-3">
          {/* Step 1 */}
          <div className="bg-white/3 border border-white/8 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full">STEP 1</span>
              <span className="text-xs text-gray-300">Run in your Mac terminal to generate map</span>
            </div>
            <pre className="text-[10px] text-green-300 bg-black/40 rounded-lg p-3 whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto">{cliCommand}</pre>
            <button onClick={() => copyCmd(cliCommand)}
              className="mt-2 text-xs text-gray-500 hover:text-white transition">
              {copied ? '✓ Copied!' : '📋 Copy command'}
            </button>
            <p className="text-xs text-gray-600 mt-1">Get free GROQ_API_KEY at console.groq.com · Preview opens in /tmp/tilemap_agent/{theme}/</p>
          </div>

          {/* Step 2 */}
          <div className="bg-white/3 border border-white/8 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">STEP 2</span>
              <span className="text-xs text-gray-300">Check map in Tiled (optional) then deploy</span>
            </div>
            <pre className="text-[10px] text-amber-300 bg-black/40 rounded-lg p-3 whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto">{deployCmds}</pre>
            <button onClick={() => copyCmd(deployCmds)}
              className="mt-2 text-xs text-gray-500 hover:text-white transition">
              📋 Copy deploy commands
            </button>
          </div>

          {/* Step 3 */}
          <div className="bg-white/3 border border-white/8 rounded-xl p-4 text-xs text-gray-500 space-y-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">STEP 3</span>
              <span className="text-xs text-gray-300">Activate in admin</span>
            </div>
            <p>Go to <strong className="text-gray-300">Campaigns</strong> tab → edit campaign → set <code className="text-cyan-700">map_theme = {theme}</code></p>
            <p className="text-gray-600">Game rebuilds automatically after deploy (~3 min). Check: <code className="text-gray-600">ssh root@204.168.221.101 "tail -2 /tmp/build_{theme}.log"</code></p>
          </div>

          {/* Custom tiles tip */}
          <div className="bg-white/3 border border-white/8 rounded-xl p-4 text-xs text-gray-600 space-y-1">
            <p className="text-gray-400 font-medium mb-1">Want 3D / custom tiles?</p>
            <p>1. Generate image in <strong className="text-gray-400">Google ImageFX</strong> (128×128px, top-down, flat style)</p>
            <p>2. Convert at <strong className="text-gray-400">drububu.com</strong> → export .vox (voxel size 2, max height 8)</p>
            <p>3. Render in <strong className="text-gray-400">MagicaVoxel</strong> ISO view 128×128 → save as <code>tile_0XX.png</code></p>
            <p>4. Drop in <code className="text-cyan-800">tile_overrides/{theme}/tile_0XX.png</code> then re-run Step 1</p>
            <p className="text-gray-700 mt-1">GIDs: 27=stone · 28=wood · 29=carpet · 38=dark · 40=light · 84=pillar · 94=portal · 100=wall</p>
          </div>
        </div>
      </div>
    </div>
  )
}
