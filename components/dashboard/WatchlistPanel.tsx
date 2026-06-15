'use client'

import { useState } from 'react'

interface Asset {
  id: string
  district: string
  asset_id: string
  asset_meta: Record<string, string> | null
  created_at: string
}

// Per-district structured fields
const DISTRICT_CONFIG = {
  propos: {
    label: 'PropOS', icon: '🏙️',
    accentText: 'text-blue-400', accentBg: 'bg-blue-500/10', accentBorder: 'border-blue-500/20',
    description: 'Monitor Singapore properties. AI alerts you when refinance rates improve or valuation shifts.',
    fields: [
      { key: 'postal_code',  label: 'Postal Code',        placeholder: 'e.g. 523401',    hint: '6-digit SG postal code' },
      { key: 'property_type',label: 'Type (optional)',     placeholder: 'HDB / Condo / Landed' },
      { key: 'alert_below',  label: 'Alert if rate drops below (%)', placeholder: 'e.g. 2.8' },
    ],
    idField: 'postal_code',
    status: 'coming_soon' as const,
    statusNote: 'PropOS integration in progress — your saved properties will trigger alerts when live.',
  },
  aceeconomy: {
    label: 'Financial', icon: '💹',
    accentText: 'text-green-400', accentBg: 'bg-green-500/10', accentBorder: 'border-green-500/20',
    description: 'Track listed stocks & ETFs. AI prioritises momentum signals for tickers you watch. US & HK markets only.',
    fields: [
      { key: 'ticker',  label: 'Ticker Symbol', placeholder: 'e.g. NVDA, AAPL, 0700.HK', hint: 'Listed equities only — no private companies' },
      { key: 'alert_type', label: 'Alert on',   placeholder: 'Any signal / Squeeze only / Earnings only' },
    ],
    idField: 'ticker',
    status: 'partial' as const,
    statusNote: 'Scanner runs nightly. Your tickers will be cross-checked when signals fire — Telegram delivery coming.',
  },
  nexustravel: {
    label: 'NexusTravel', icon: '✈️',
    accentText: 'text-purple-400', accentBg: 'bg-purple-500/10', accentBorder: 'border-purple-500/20',
    description: 'Monitor flight routes. AI alerts you when fares drop below your target price.',
    fields: [
      { key: 'route',   label: 'Route',         placeholder: 'e.g. SIN-NRT',     hint: 'IATA airport codes, origin-destination' },
      { key: 'cabin',   label: 'Cabin Class',   placeholder: 'Economy / Business' },
      { key: 'budget',  label: 'Max Budget (SGD)', placeholder: 'e.g. 450',      hint: 'Alert when fare drops below this' },
    ],
    idField: 'route',
    status: 'coming_soon' as const,
    statusNote: 'NexusTravel monitoring integration in progress — routes saved now will activate when live.',
  },
  commerce: {
    label: 'E-commerce', icon: '🛒',
    accentText: 'text-amber-400', accentBg: 'bg-amber-500/10', accentBorder: 'border-amber-500/20',
    description: 'Track products for arbitrage. AI finds the same item cheaper on another platform with positive net margin.',
    fields: [
      { key: 'product',    label: 'Product Name',    placeholder: 'e.g. iPhone 15 Pro 256GB Natural Titanium' },
      { key: 'platform',   label: 'Currently on',    placeholder: 'Shopee / Lazada / Amazon / Any' },
      { key: 'target_price', label: 'Your price target (SGD)', placeholder: 'e.g. 900', hint: 'Alert when arbitrage gap > 10% below this' },
    ],
    idField: 'product',
    status: 'coming_soon' as const,
    statusNote: 'Commerce OS scans its own opportunity pool now. User-defined product tracking coming next.',
  },
}

type DistrictKey = keyof typeof DISTRICT_CONFIG

const STATUS_BADGE = {
  live:         { label: '● Live',         cls: 'text-green-400 bg-green-500/10 border-green-500/20' },
  partial:      { label: '◑ Partial',      cls: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
  coming_soon:  { label: '○ Coming soon',  cls: 'text-slate-500 bg-white/5 border-white/10' },
}

export default function WatchlistPanel({ initialItems }: { initialItems: Asset[] }) {
  const [items, setItems]       = useState<Asset[]>(initialItems)
  const [adding, setAdding]     = useState(false)
  const [district, setDistrict] = useState<DistrictKey>('aceeconomy')
  const [fields, setFields]     = useState<Record<string, string>>({})
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  const cfg = DISTRICT_CONFIG[district]

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const idVal = fields[cfg.idField]?.trim()
    if (!idVal) return
    setSaving(true); setError('')

    const res = await fetch('/api/citizen/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        district,
        asset_id:   idVal.toUpperCase(),
        asset_meta: fields,
      }),
    })
    if (res.ok) {
      const newItem = await res.json()
      setItems(prev => [newItem, ...prev])
      setFields({}); setAdding(false)
    } else {
      const d = await res.json()
      setError(d.error ?? 'Failed to save')
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    await fetch('/api/citizen/watchlist', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const byDistrict = (Object.keys(DISTRICT_CONFIG) as DistrictKey[]).reduce<Record<string, Asset[]>>((acc, d) => {
    acc[d] = items.filter(i => i.district === d)
    return acc
  }, {})

  return (
    <div id="watchlist">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold">Watchlist</h2>
          <p className="text-xs text-gray-600 mt-0.5">
            AI prioritises signals for assets you save here
          </p>
        </div>
        <button
          onClick={() => { setAdding(!adding); setFields({}); setError('') }}
          className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition"
        >
          {adding ? 'Cancel' : '+ Add Asset'}
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div className="mb-6 bg-white/5 border border-white/10 rounded-xl p-5">
          {/* District selector */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
            {(Object.keys(DISTRICT_CONFIG) as DistrictKey[]).map(d => {
              const c = DISTRICT_CONFIG[d]
              const status = STATUS_BADGE[c.status]
              return (
                <button key={d} type="button"
                  onClick={() => { setDistrict(d); setFields({}) }}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-center transition ${
                    d === district
                      ? `${c.accentBg} ${c.accentBorder} border`
                      : 'border-white/8 bg-white/3 hover:bg-white/8'
                  }`}
                >
                  <span className="text-xl">{c.icon}</span>
                  <span className={`text-xs font-medium ${d === district ? c.accentText : 'text-slate-400'}`}>
                    {c.label}
                  </span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-mono ${status.cls}`}>
                    {status.label}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Description + status note */}
          <div className={`rounded-lg px-4 py-3 mb-4 border ${cfg.accentBg} ${cfg.accentBorder}`}>
            <p className="text-xs text-slate-300 leading-relaxed mb-1">{cfg.description}</p>
            {(cfg.status === 'partial' || cfg.status === 'coming_soon') && (
              <p className="text-[11px] text-slate-500 italic">{cfg.statusNote}</p>
            )}
          </div>

          {/* Structured fields */}
          <form onSubmit={handleAdd} className="space-y-3">
            {cfg.fields.map(f => (
              <div key={f.key}>
                <label className="text-xs text-slate-500 block mb-1">
                  {f.label}
                  {f.hint && <span className="text-slate-700 ml-2">· {f.hint}</span>}
                </label>
                <input
                  type="text"
                  value={fields[f.key] ?? ''}
                  onChange={e => setFields(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2
                    text-white text-sm placeholder-slate-700 focus:outline-none focus:border-cyan-500/40"
                />
              </div>
            ))}

            {error && <p className="text-xs text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={saving || !fields[cfg.idField]?.trim()}
              className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-black
                font-semibold text-xs px-5 py-2 rounded-lg transition"
            >
              {saving ? 'Saving…' : `Save to ${cfg.label} Watchlist`}
            </button>
          </form>
        </div>
      )}

      {/* Saved items grouped by district */}
      {items.length === 0 && !adding ? (
        <div className="border border-dashed border-white/10 rounded-xl p-8 text-center">
          <p className="text-gray-600 text-sm mb-2">No assets saved yet</p>
          <p className="text-gray-700 text-xs">Add stocks, properties, flight routes or products</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {(Object.keys(DISTRICT_CONFIG) as DistrictKey[]).map(d => {
            const distItems = byDistrict[d] ?? []
            if (distItems.length === 0) return null
            const c   = DISTRICT_CONFIG[d]
            const st  = STATUS_BADGE[c.status]
            return (
              <div key={d} className={`${c.accentBg} border ${c.accentBorder} rounded-xl p-4`}>
                <div className="flex items-center justify-between mb-3">
                  <div className={`text-xs font-semibold ${c.accentText}`}>{c.icon} {c.label}</div>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-mono ${st.cls}`}>
                    {st.label}
                  </span>
                </div>
                <div className="space-y-2">
                  {distItems.map(item => (
                    <div key={item.id} className="flex items-start justify-between group">
                      <div>
                        <span className="text-xs text-slate-200 font-mono font-semibold">
                          {item.asset_id}
                        </span>
                        {/* Show additional meta fields */}
                        {item.asset_meta && Object.entries(item.asset_meta)
                          .filter(([k]) => k !== DISTRICT_CONFIG[d as DistrictKey].idField)
                          .filter(([, v]) => v)
                          .map(([k, v]) => (
                            <span key={k} className="text-[10px] text-slate-600 ml-2">
                              {v}
                            </span>
                          ))
                        }
                      </div>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-slate-700 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition ml-2 shrink-0"
                      >
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
