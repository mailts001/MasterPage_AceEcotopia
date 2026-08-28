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

type Tab = 'merchants' | 'products' | 'coupons' | 'campaigns' | 'placements'

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
  const [form, setForm]           = useState({ merchant_id: '', name: '', objective: 'redemption', start_date: '', end_date: '', budget: '0', background_image_url: '' })
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
    setForm({ merchant_id: '', name: '', objective: 'redemption', start_date: '', end_date: '', budget: '0', background_image_url: '' })
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
