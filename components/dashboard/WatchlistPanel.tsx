'use client'

import { useState } from 'react'
import { routeToIATA } from '@/lib/airports'

const ITEMS_PREVIEW = 3   // show this many before "Show all"

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
    description: 'Monitor SG properties by postal code. AI surfaces recent HDB resale transactions, area price trends, and alerts twice weekly.',
    fields: [
      { key: 'postal_code',  label: 'Postal Code',  placeholder: 'e.g. 400320', hint: '6-digit SG postal code' },
      { key: 'property_type',label: 'Type (optional)', placeholder: 'HDB / Condo / Landed' },
      { key: 'alert_below',  label: 'Alert if refinance rate drops below (%)', placeholder: 'e.g. 2.8' },
    ],
    idField: 'postal_code',
    status: 'live' as const,
    statusNote: '',
  },
  aceeconomy: {
    label: 'Financial', icon: '💹',
    accentText: 'text-green-400', accentBg: 'bg-green-500/10', accentBorder: 'border-green-500/20',
    description: 'Track listed stocks & ETFs. AI cross-checks your tickers against nightly momentum + squeeze scans and alerts via Telegram.',
    fields: [
      { key: 'ticker',  label: 'Ticker Symbol', placeholder: 'e.g. NVDA, AAPL, 0700.HK', hint: 'Listed equities only — no private companies' },
      { key: 'alert_type', label: 'Alert on',   placeholder: 'Any signal / Squeeze only / Earnings only' },
    ],
    idField: 'ticker',
    status: 'live' as const,
    statusNote: '',
  },
  nexustravel: {
    label: 'NexusTravel', icon: '✈️',
    accentText: 'text-purple-400', accentBg: 'bg-purple-500/10', accentBorder: 'border-purple-500/20',
    description: 'Monitor flight routes. AI alerts you when fares drop below your target price.',
    fields: [
      { key: 'from_city', label: 'From',            placeholder: 'e.g. Singapore, London, Tokyo', hint: 'City name or IATA code' },
      { key: 'to_city',   label: 'To',              placeholder: 'e.g. Tokyo, Bali, New York',    hint: 'City name or IATA code' },
      { key: 'cabin',     label: 'Cabin Class',     placeholder: 'Economy / Business' },
      { key: 'budget',    label: 'Max Budget (SGD)', placeholder: 'e.g. 450', hint: 'Alert when fare drops below this' },
    ],
    idField: 'route',
    status: 'live' as const,
    statusNote: '',
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
    status: 'live' as const,
    statusNote: '',
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
  // per-district expanded state & sort
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [sortBy, setSortBy]     = useState<'newest' | 'oldest' | 'alpha'>('newest')

  const toggleExpand = (d: string) => setExpanded(prev => ({ ...prev, [d]: !prev[d] }))

  const cfg = DISTRICT_CONFIG[district]

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setError('')

    // NexusTravel: resolve city names → IATA route
    let finalFields = { ...fields }
    let assetId = fields[cfg.idField]?.trim()

    if (district === 'nexustravel') {
      const from = fields.from_city?.trim() || ''
      const to   = fields.to_city?.trim()   || ''
      if (!from || !to) { setError('Please enter both From and To cities'); setSaving(false); return }
      const resolved = routeToIATA(from, to)
      if (!resolved) {
        setError(`Could not find airports for "${from}" or "${to}". Try IATA codes (e.g. SIN, NRT) or check spelling.`)
        setSaving(false); return
      }
      assetId = resolved.route
      finalFields = { ...finalFields, route: resolved.route, from_city: resolved.fromCity, to_city: resolved.toCity }
    }

    if (!assetId) { setError('Required field missing'); setSaving(false); return }

    const res = await fetch('/api/citizen/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        district,
        asset_id:   assetId.toUpperCase(),
        asset_meta: finalFields,
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
            {cfg.statusNote && cfg.status !== 'live' && (
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

            {/* NexusTravel: live IATA preview */}
            {district === 'nexustravel' && fields.from_city && fields.to_city && (() => {
              const preview = routeToIATA(fields.from_city, fields.to_city)
              return preview ? (
                <div className="flex items-center gap-2 text-xs bg-purple-500/10 border border-purple-500/20 rounded-lg px-3 py-2">
                  <span className="text-purple-400">✓</span>
                  <span className="text-white font-mono font-bold">{preview.route}</span>
                  <span className="text-slate-500">{preview.fromCity} → {preview.toCity}</span>
                </div>
              ) : (
                <div className="text-xs text-amber-400/70 bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2">
                  ⚠ City not recognised — try IATA code (e.g. SIN, NRT, BKK)
                </div>
              )
            })()}

            {error && <p className="text-xs text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={saving || (district !== 'nexustravel' && !fields[cfg.idField]?.trim())}
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
        <>
          {/* Sort control */}
          {items.length > 1 && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] text-slate-600">Sort:</span>
              {(['newest', 'oldest', 'alpha'] as const).map(opt => (
                <button key={opt} onClick={() => setSortBy(opt)}
                  className={`text-[10px] px-2 py-0.5 rounded border transition ${
                    sortBy === opt
                      ? 'border-cyan-500/40 text-cyan-400 bg-cyan-500/10'
                      : 'border-white/10 text-slate-600 hover:text-slate-400'
                  }`}>
                  {opt === 'newest' ? 'Newest' : opt === 'oldest' ? 'Oldest' : 'A–Z'}
                </button>
              ))}
            </div>
          )}

        <div className="grid md:grid-cols-2 gap-4">
          {(Object.keys(DISTRICT_CONFIG) as DistrictKey[]).map(d => {
            const rawItems = byDistrict[d] ?? []
            if (rawItems.length === 0) return null

            // Apply sort
            const distItems = [...rawItems].sort((a, b) => {
              if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              if (sortBy === 'alpha')  return a.asset_id.localeCompare(b.asset_id)
              return new Date(b.created_at).getTime() - new Date(a.created_at).getTime() // newest
            })

            const isExpanded = expanded[d]
            const visibleItems = isExpanded ? distItems : distItems.slice(0, ITEMS_PREVIEW)
            const hasMore = distItems.length > ITEMS_PREVIEW

            const c   = DISTRICT_CONFIG[d]
            const st  = STATUS_BADGE[c.status]
            return (
              <div key={d} className={`${c.accentBg} border ${c.accentBorder} rounded-xl p-4`}>
                <div className="flex items-center justify-between mb-3">
                  <div className={`text-xs font-semibold ${c.accentText}`}>{c.icon} {c.label}
                    <span className="text-slate-600 font-normal ml-1">({distItems.length})</span>
                  </div>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-mono ${st.cls}`}>
                    {st.label}
                  </span>
                </div>
                <div className="space-y-3">
                  {visibleItems.map(item => {
                    const meta = item.asset_meta || {}
                    const isTravel = d === 'nexustravel'
                    const isFinancial = d === 'aceeconomy'
                    const lastFare = meta.last_fare ? parseInt(meta.last_fare) : null
                    const budget   = meta.budget   ? parseInt(meta.budget)    : null
                    const isDeal   = meta.fare_status === 'deal'

                    return (
                      <div key={item.id} className="group">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs text-slate-200 font-mono font-semibold">
                              {item.asset_id}
                            </span>
                            {/* cabin / alert_type inline */}
                            {(meta.cabin || meta.alert_type) && (
                              <span className="text-[10px] text-slate-600 ml-2">
                                {meta.cabin || meta.alert_type}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="text-slate-700 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition ml-2 shrink-0"
                          >
                            ✕
                          </button>
                        </div>

                        {/* NexusTravel: show last fare result */}
                        {isTravel && (
                          <div className="mt-1.5">
                            {lastFare ? (
                              <div className={`flex items-center gap-2 text-[10px] px-2 py-1 rounded-lg border ${
                                isDeal
                                  ? 'border-green-500/20 bg-green-500/8 text-green-400'
                                  : 'border-white/8 bg-white/3 text-slate-500'
                              }`}>
                                <span>{isDeal ? '🟢' : '🔴'}</span>
                                <span>
                                  SGD <strong>{lastFare}</strong>
                                  {budget && <span className="text-slate-600"> · budget {budget}</span>}
                                  {meta.last_fare_date && <span className="text-slate-600"> · {meta.last_fare_date}</span>}
                                </span>
                                {isDeal && <span className="text-green-400 font-medium ml-auto">✓ deal</span>}
                              </div>
                            ) : (
                              <div className="text-[10px] text-slate-700 italic">
                                {budget && `Budget: SGD ${budget} · `}Checking fares twice daily…
                              </div>
                            )}
                            {meta.last_checked && (
                              <div className="text-[9px] text-slate-700 mt-0.5 pl-1">
                                Last checked {meta.last_checked} UTC
                              </div>
                            )}
                          </div>
                        )}

                        {/* Financial: alert type */}
                        {isFinancial && (
                          <div className="text-[10px] text-slate-700 mt-0.5">
                            {meta.alert_type && `Alert on: ${meta.alert_type}`}
                          </div>
                        )}

                        {/* PropOS: show last transaction data */}
                        {d === 'propos' && (
                          <div className="mt-1.5 space-y-1">
                            {meta.address && (
                              <div className="text-[10px] text-slate-500">{meta.address}</div>
                            )}
                            {meta.block_avg_sgd ? (
                              <div className="flex items-center gap-2 text-[10px] px-2 py-1 rounded-lg border border-blue-500/20 bg-blue-500/5 text-blue-300">
                                <span>🏠</span>
                                <span>
                                  Block avg: <strong>${parseInt(meta.block_avg_sgd).toLocaleString()}</strong>
                                  {meta.block_txns_6m && <span className="text-slate-600"> · {meta.block_txns_6m} txn (6mo)</span>}
                                </span>
                              </div>
                            ) : meta.last_checked ? (
                              <div className="text-[10px] text-slate-700 italic">No HDB resale found — may be private/condo</div>
                            ) : (
                              <div className="text-[10px] text-slate-700 italic">Checking Mon & Thu…</div>
                            )}
                            {meta.last_checked && (
                              <div className="text-[9px] text-slate-700">Updated {meta.last_checked}</div>
                            )}
                          </div>
                        )}

                        {/* Commerce: show last match */}
                        {d === 'commerce' && (
                          <div className="mt-1.5">
                            {meta.last_match ? (
                              <div className="text-[10px] px-2 py-1 rounded-lg border border-amber-500/20 bg-amber-500/5 space-y-0.5">
                                <div className="text-amber-300 font-medium">
                                  {meta.last_match_margin}% margin matched
                                </div>
                                <div className="text-slate-500">
                                  {meta.last_match_src} → {meta.last_match_tgt}
                                </div>
                              </div>
                            ) : meta.last_checked ? (
                              <div className="text-[10px] text-slate-700 italic">No match found yet in Commerce OS pool</div>
                            ) : (
                              <div className="text-[10px] text-slate-700 italic">Checked daily after 10 PM SGT…</div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                {/* Show more / less toggle */}
                {hasMore && (
                  <button
                    onClick={() => toggleExpand(d)}
                    className={`mt-3 w-full text-[10px] py-1.5 rounded-lg border transition
                      ${c.accentBorder} ${c.accentText} hover:opacity-70`}
                  >
                    {isExpanded
                      ? '▲ Show less'
                      : `▼ Show all ${distItems.length} items`}
                  </button>
                )}
              </div>
            )
          })}
        </div>
        </>
      )}
    </div>
  )
}
