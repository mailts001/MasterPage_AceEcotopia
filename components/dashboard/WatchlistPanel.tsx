'use client'

import { useState } from 'react'

interface Asset {
  id: string
  district: string
  asset_id: string
  asset_meta: Record<string, string> | null
  created_at: string
}

const DISTRICT_CONFIG: Record<string, { label: string; icon: string; placeholder: string; accentText: string; accentBg: string }> = {
  propos:     { label: 'PropOS',     icon: '🏙️', placeholder: 'e.g. 123 Tampines Ave 1 #05-01', accentText: 'text-blue-400',   accentBg: 'bg-blue-500/10'  },
  aceeconomy: { label: 'Financial',  icon: '💹', placeholder: 'e.g. AAPL, NVDA, 0700.HK',       accentText: 'text-green-400',  accentBg: 'bg-green-500/10' },
  nexustravel:{ label: 'NexusTravel',icon: '✈️', placeholder: 'e.g. SIN-NRT economy',            accentText: 'text-purple-400', accentBg: 'bg-purple-500/10'},
  commerce:   { label: 'E-commerce', icon: '🛒', placeholder: 'e.g. iPhone 15 128GB',            accentText: 'text-amber-400',  accentBg: 'bg-amber-500/10' },
}

export default function WatchlistPanel({ initialItems }: { initialItems: Asset[] }) {
  const [items, setItems] = useState<Asset[]>(initialItems)
  const [adding, setAdding] = useState(false)
  const [district, setDistrict] = useState('aceeconomy')
  const [assetId, setAssetId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!assetId.trim()) return
    setSaving(true); setError('')
    const res = await fetch('/api/citizen/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ district, asset_id: assetId.trim(), asset_meta: { name: assetId.trim() } }),
    })
    if (res.ok) {
      const newItem = await res.json()
      setItems(prev => [newItem, ...prev])
      setAssetId(''); setAdding(false)
    } else {
      const d = await res.json()
      setError(d.error ?? 'Failed to save')
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    await fetch('/api/citizen/watchlist', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const byDistrict = Object.keys(DISTRICT_CONFIG).reduce<Record<string, Asset[]>>((acc, d) => {
    acc[d] = items.filter(i => i.district === d)
    return acc
  }, {})

  return (
    <div id="watchlist">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold">Watchlist</h2>
          <p className="text-xs text-gray-600 mt-0.5">Your saved assets — AI prioritises signals for these first</p>
        </div>
        <button onClick={() => { setAdding(!adding); setError('') }}
          className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition">
          {adding ? 'Cancel' : '+ Add Asset'}
        </button>
      </div>

      {adding && (
        <form onSubmit={handleAdd} className="mb-5 bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1.5">District</label>
              <select value={district} onChange={e => setDistrict(e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500/40">
                {Object.entries(DISTRICT_CONFIG).map(([id, cfg]) => (
                  <option key={id} value={id}>{cfg.icon} {cfg.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1.5">Asset</label>
              <input type="text" value={assetId} onChange={e => setAssetId(e.target.value)}
                placeholder={DISTRICT_CONFIG[district]?.placeholder}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-xs placeholder-gray-600 focus:outline-none focus:border-cyan-500/40" />
            </div>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button type="submit" disabled={saving || !assetId.trim()}
            className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-black font-semibold text-xs px-4 py-2 rounded-lg transition">
            {saving ? 'Saving…' : 'Add to Watchlist'}
          </button>
        </form>
      )}

      {items.length === 0 && !adding ? (
        <div className="border border-dashed border-white/10 rounded-xl p-8 text-center">
          <p className="text-gray-600 text-sm mb-2">No assets saved yet</p>
          <p className="text-gray-700 text-xs">Add stocks, properties, routes, or products — AI will prioritise signals for them</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {Object.entries(DISTRICT_CONFIG).map(([d, cfg]) => {
            const districtItems = byDistrict[d] ?? []
            if (districtItems.length === 0) return null
            return (
              <div key={d} className={`${cfg.accentBg} border border-white/10 rounded-xl p-4`}>
                <div className={`text-xs font-semibold ${cfg.accentText} mb-3`}>{cfg.icon} {cfg.label}</div>
                <div className="space-y-2">
                  {districtItems.map(item => (
                    <div key={item.id} className="flex items-center justify-between group">
                      <span className="text-xs text-gray-300 font-mono">{item.asset_id}</span>
                      <button onClick={() => handleDelete(item.id)}
                        className="text-gray-700 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition">
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
