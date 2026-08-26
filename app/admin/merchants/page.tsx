'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Merchant, Campaign, CampaignPlacement } from '@/lib/game/types'

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = 'merchants' | 'campaigns' | 'placements'

export default function AdminMerchantsPage() {
  const [tab, setTab] = useState<Tab>('merchants')

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Merchant Admin</h1>
          <p className="text-gray-500 text-sm mt-1">Manage merchants, campaigns, and game placements</p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-2 border-b border-white/10 pb-0">
          {(['merchants', 'campaigns', 'placements'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm capitalize border-b-2 transition ${
                tab === t ? 'border-cyan-500 text-white' : 'border-transparent text-gray-500 hover:text-white'
              }`}>
              {t}
            </button>
          ))}
        </div>

        {tab === 'merchants'  && <MerchantsTab />}
        {tab === 'campaigns'  && <CampaignsTab />}
        {tab === 'placements' && <PlacementsTab />}
      </div>
    </div>
  )
}

// ─── Merchants tab ────────────────────────────────────────────────────────────

function MerchantsTab() {
  const supabase = createClient()
  const [merchants, setMerchants] = useState<Merchant[]>([])
  const [loading, setLoading]     = useState(true)
  const [form, setForm]           = useState({ name: '', category: '', contact_email: '', description: '' })
  const [saving, setSaving]       = useState(false)

  const load = async () => {
    const { data } = await supabase.from('merchants').select('*').order('created_at', { ascending: false })
    setMerchants(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, []) // eslint-disable-line

  const approve = async (id: string, approved: boolean) => {
    await supabase.from('merchants').update({ approved }).eq('id', id)
    load()
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await supabase.from('merchants').insert({ ...form, tier: 'basic', approved: false })
    setForm({ name: '', category: '', contact_email: '', description: '' })
    setSaving(false)
    load()
  }

  return (
    <div className="space-y-6">
      {/* Add form */}
      <form onSubmit={submit} className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-sm">Add Merchant</h3>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Name"    value={form.name}           onChange={v => setForm(f => ({ ...f, name: v }))} />
          <Input label="Category" value={form.category}       onChange={v => setForm(f => ({ ...f, category: v }))} />
          <Input label="Email"   value={form.contact_email}  onChange={v => setForm(f => ({ ...f, contact_email: v }))} />
          <Input label="Description" value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} />
        </div>
        <button type="submit" disabled={saving}
          className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm font-medium disabled:opacity-50">
          {saving ? 'Saving…' : 'Add Merchant'}
        </button>
      </form>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-white/10">
              <th className="pb-2 pr-4">Name</th>
              <th className="pb-2 pr-4">Category</th>
              <th className="pb-2 pr-4">Tier</th>
              <th className="pb-2 pr-4">Status</th>
              <th className="pb-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr><td colSpan={5} className="py-4 text-gray-600 text-center">Loading…</td></tr>
            ) : merchants.map(m => (
              <tr key={m.id}>
                <td className="py-3 pr-4 font-medium">{m.name}</td>
                <td className="py-3 pr-4 text-gray-400">{m.category}</td>
                <td className="py-3 pr-4"><span className="text-xs bg-white/10 px-2 py-0.5 rounded">{m.tier}</span></td>
                <td className="py-3 pr-4">
                  <span className={`text-xs px-2 py-0.5 rounded ${(m as any).approved ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                    {(m as any).approved ? 'Live' : 'Pending'}
                  </span>
                </td>
                <td className="py-3">
                  <button onClick={() => approve(m.id, !(m as any).approved)}
                    className="text-xs text-gray-400 hover:text-white underline">
                    {(m as any).approved ? 'Suspend' : 'Approve'}
                  </button>
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

function CampaignsTab() {
  const supabase = createClient()
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    supabase.from('campaigns')
      .select('*, merchants(name)')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setCampaigns(data ?? []); setLoading(false) })
  }, []) // eslint-disable-line

  const setStatus = async (id: string, status: string) => {
    await supabase.from('campaigns').update({ status }).eq('id', id)
    setCampaigns(cs => cs.map(c => c.id === id ? { ...c, status } : c))
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b border-white/10">
            <th className="pb-2 pr-4">Campaign</th>
            <th className="pb-2 pr-4">Merchant</th>
            <th className="pb-2 pr-4">Dates</th>
            <th className="pb-2 pr-4">Budget</th>
            <th className="pb-2 pr-4">Status</th>
            <th className="pb-2">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {loading ? (
            <tr><td colSpan={6} className="py-4 text-gray-600 text-center">Loading…</td></tr>
          ) : campaigns.map(c => (
            <tr key={c.id}>
              <td className="py-3 pr-4 font-medium">{c.name}</td>
              <td className="py-3 pr-4 text-gray-400">{c.merchants?.name ?? '—'}</td>
              <td className="py-3 pr-4 text-gray-400 text-xs">{c.start_date} → {c.end_date}</td>
              <td className="py-3 pr-4">${c.budget}</td>
              <td className="py-3 pr-4">
                <StatusBadge status={c.status} />
              </td>
              <td className="py-3 flex gap-2">
                {c.status !== 'live'   && <ActionBtn label="Go Live" onClick={() => setStatus(c.id, 'live')} />}
                {c.status === 'live'   && <ActionBtn label="Pause"   onClick={() => setStatus(c.id, 'paused')} />}
                {c.status !== 'ended'  && <ActionBtn label="End"     onClick={() => setStatus(c.id, 'ended')} danger />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Placements tab ───────────────────────────────────────────────────────────

function PlacementsTab() {
  const supabase  = createClient()
  const [rows, setRows]     = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('campaign_placements')
      .select('*, products(name, image_url), campaigns(name, status)')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setRows(data ?? []); setLoading(false) })
  }, []) // eslint-disable-line

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b border-white/10">
            <th className="pb-2 pr-4">Product</th>
            <th className="pb-2 pr-4">Campaign</th>
            <th className="pb-2 pr-4">District</th>
            <th className="pb-2 pr-4">Game</th>
            <th className="pb-2 pr-4">Role</th>
            <th className="pb-2">Priority</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {loading ? (
            <tr><td colSpan={6} className="py-4 text-gray-600 text-center">Loading…</td></tr>
          ) : rows.map(r => (
            <tr key={r.id}>
              <td className="py-3 pr-4">
                <div className="flex items-center gap-2">
                  <img src={r.products?.image_url} alt="" className="w-8 h-8 object-cover rounded" />
                  <span>{r.products?.name ?? '—'}</span>
                </div>
              </td>
              <td className="py-3 pr-4 text-gray-400">{r.campaigns?.name ?? '—'}</td>
              <td className="py-3 pr-4 text-gray-400">{r.district_id}</td>
              <td className="py-3 pr-4 text-gray-400">{r.game_id}</td>
              <td className="py-3 pr-4"><RoleBadge role={r.game_role} /></td>
              <td className="py-3">{r.priority}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Small shared components ──────────────────────────────────────────────────

function Input({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-gray-500">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
      />
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const cls = { live: 'bg-green-500/20 text-green-400', draft: 'bg-gray-500/20 text-gray-400',
    paused: 'bg-yellow-500/20 text-yellow-400', ended: 'bg-red-500/20 text-red-400' }
  return <span className={`text-xs px-2 py-0.5 rounded ${cls[status as keyof typeof cls] ?? cls.draft}`}>{status}</span>
}

function RoleBadge({ role }: { role: string }) {
  const cls = { target: 'text-yellow-400', decoy: 'text-gray-400', reward: 'text-green-400',
    collectible: 'text-cyan-400', mystery: 'text-purple-400' }
  return <span className={`text-xs font-mono ${cls[role as keyof typeof cls] ?? ''}`}>{role}</span>
}

function ActionBtn({ label, onClick, danger = false }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick}
      className={`text-xs px-2 py-1 rounded ${danger ? 'text-red-400 hover:bg-red-500/10' : 'text-cyan-400 hover:bg-cyan-500/10'}`}>
      {label}
    </button>
  )
}
