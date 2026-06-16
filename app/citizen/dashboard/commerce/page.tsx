'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Opportunity {
  id: string
  product_title: string
  category: string
  source_marketplace: string
  source_price_usd: number
  target_marketplace: string
  target_price_usd: number
  net_margin_pct: number
  estimated_monthly_profit_usd: number
  risk_level: 'low' | 'medium' | 'high'
  confidence_score: number
  status: string
  agent_notes: string
  fulfillment_type: string
  shipping_days_estimate: number
  created_at: string
}

const RISK_STYLE = {
  low:    'text-green-400 bg-green-500/10 border-green-500/20',
  medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  high:   'text-red-400 bg-red-500/10 border-red-500/20',
}

const MARGIN_COLOR = (pct: number) =>
  pct >= 60 ? 'text-green-400' : pct >= 35 ? 'text-yellow-400' : 'text-slate-400'

function OpportunityCard({ opp }: { opp: Opportunity }) {
  const [open, setOpen] = useState(false)
  const spread = opp.target_price_usd - opp.source_price_usd

  return (
    <div className="bg-white/5 border border-amber-500/15 rounded-xl p-5 hover:bg-white/8 transition">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="text-sm font-semibold text-white leading-snug">{opp.product_title}</h3>
        <span className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded-full border font-medium uppercase ${RISK_STYLE[opp.risk_level] ?? RISK_STYLE.medium}`}>
          {opp.risk_level} risk
        </span>
      </div>

      {/* Price flow */}
      <div className="flex items-center gap-2 mb-4 text-xs">
        <div className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-center">
          <div className="text-slate-400 text-[9px] mb-0.5">BUY FROM</div>
          <div className="font-bold text-white">${opp.source_price_usd.toFixed(2)}</div>
          <div className="text-slate-500 text-[9px]">{opp.source_marketplace}</div>
        </div>
        <div className="text-slate-600 shrink-0">→</div>
        <div className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-center">
          <div className="text-slate-400 text-[9px] mb-0.5">SELL ON</div>
          <div className="font-bold text-white">${opp.target_price_usd.toFixed(2)}</div>
          <div className="text-slate-500 text-[9px]">{opp.target_marketplace}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className={`text-xl font-bold font-mono ${MARGIN_COLOR(opp.net_margin_pct)}`}>
            {opp.net_margin_pct.toFixed(0)}%
          </div>
          <div className="text-[9px] text-slate-600">net margin</div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mb-3 text-center">
        <div>
          <div className="text-xs font-mono font-bold text-amber-400">
            ${spread.toFixed(2)}
          </div>
          <div className="text-[9px] text-slate-600">spread/unit</div>
        </div>
        <div>
          <div className="text-xs font-mono font-bold text-green-400">
            ${opp.estimated_monthly_profit_usd.toFixed(0)}/mo
          </div>
          <div className="text-[9px] text-slate-600">est. profit</div>
        </div>
        <div>
          <div className="text-xs font-mono font-bold text-slate-300">
            {opp.shipping_days_estimate}d
          </div>
          <div className="text-[9px] text-slate-600">ship time</div>
        </div>
      </div>

      {/* Confidence bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] text-slate-600">AI confidence</span>
          <span className="text-[9px] text-slate-400">{(opp.confidence_score * 100).toFixed(0)}%</span>
        </div>
        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-500 rounded-full"
            style={{ width: `${opp.confidence_score * 100}%` }}
          />
        </div>
      </div>

      {/* Fulfillment badge + notes toggle */}
      <div className="flex items-center justify-between">
        <span className="text-[9px] text-slate-600 bg-white/5 border border-white/8 px-2 py-0.5 rounded-full">
          {opp.fulfillment_type === 'dropship' ? '📦 Dropship' : '🚚 ' + opp.fulfillment_type}
        </span>
        <button
          onClick={() => setOpen(!open)}
          className="text-[10px] text-amber-500/70 hover:text-amber-400 transition"
        >
          {open ? '▲ less' : '▼ AI notes'}
        </button>
      </div>

      {open && (
        <p className="mt-3 text-[11px] text-slate-500 leading-relaxed border-t border-white/8 pt-3">
          {opp.agent_notes}
        </p>
      )}
    </div>
  )
}

type SortKey = 'margin' | 'profit' | 'confidence'

export default function CommercePage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState('')
  const [sort, setSort]                   = useState<SortKey>('margin')
  const [riskFilter, setRiskFilter]       = useState<string>('all')

  useEffect(() => {
    fetch('/api/nexus/commerce/opportunities')
      .then(async r => {
        const d = await r.json()
        if (r.status === 403) { setError('upgrade_required'); setLoading(false); return }
        if (d.error && !d.opportunities) { setError(d.error); setLoading(false); return }
        setOpportunities(d.opportunities ?? [])
        setLoading(false)
      })
      .catch(e => { setError(String(e)); setLoading(false) })
  }, [])

  const filtered = opportunities
    .filter(o => riskFilter === 'all' || o.risk_level === riskFilter)
    .sort((a, b) => {
      if (sort === 'margin')     return b.net_margin_pct - a.net_margin_pct
      if (sort === 'profit')     return b.estimated_monthly_profit_usd - a.estimated_monthly_profit_usd
      if (sort === 'confidence') return b.confidence_score - a.confidence_score
      return 0
    })

  const totalMonthlyProfit = filtered.reduce((s, o) => s + o.estimated_monthly_profit_usd, 0)
  const avgMargin = filtered.length
    ? filtered.reduce((s, o) => s + o.net_margin_pct, 0) / filtered.length
    : 0

  return (
    <div className="min-h-screen bg-[#0A0E1A] text-white">
      <nav className="border-b border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 bg-[#0A0E1A]/95 backdrop-blur z-10">
        <Link href="/" className="text-lg font-bold gradient-text">X68</Link>
        <Link href="/citizen/dashboard" className="text-sm text-gray-400 hover:text-white transition">← Dashboard</Link>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">

        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl">🛒</span>
            <h1 className="text-2xl font-bold">Commerce Intelligence</h1>
            <span className="text-xs px-2 py-0.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-400">● LIVE</span>
          </div>
          <p className="text-gray-500 text-sm">
            Multi-AI agents surface cross-platform arbitrage gaps with net margin calculated.
            Dropship or source — execution is yours.
          </p>
        </div>

        {/* Stats */}
        {!loading && opportunities.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold font-mono text-amber-400">{opportunities.length}</div>
              <div className="text-xs text-gray-500 mt-1">Active opportunities</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold font-mono text-green-400">{avgMargin.toFixed(0)}%</div>
              <div className="text-xs text-gray-500 mt-1">Avg net margin</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold font-mono text-green-400">${totalMonthlyProfit.toFixed(0)}</div>
              <div className="text-xs text-gray-500 mt-1">Total est. mo. profit</div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 bg-white/5 border border-white/10 rounded-lg p-1">
            {(['all', 'low', 'medium', 'high'] as const).map(r => (
              <button key={r} onClick={() => setRiskFilter(r)}
                className={`text-xs px-3 py-1.5 rounded-md transition capitalize ${
                  riskFilter === r ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'
                }`}>
                {r === 'all' ? 'All risk' : `${r}`}
              </button>
            ))}
          </div>
          <div className="flex gap-1 bg-white/5 border border-white/10 rounded-lg p-1 ml-auto">
            <span className="text-[10px] text-slate-600 self-center px-2">Sort:</span>
            {([
              { key: 'margin', label: 'Margin %' },
              { key: 'profit', label: 'Monthly $' },
              { key: 'confidence', label: 'Confidence' },
            ] as const).map(s => (
              <button key={s.key} onClick={() => setSort(s.key)}
                className={`text-xs px-3 py-1.5 rounded-md transition ${
                  sort === s.key ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'
                }`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cards */}
        {loading ? (
          <div className="grid md:grid-cols-2 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-56 rounded-xl bg-white/5 animate-pulse" />)}
          </div>
        ) : error === 'upgrade_required' ? (
          <div className="border border-cyan-500/20 bg-cyan-500/5 rounded-xl p-10 text-center">
            <div className="text-3xl mb-3">🔒</div>
            <p className="text-white font-semibold mb-1">Citizen tier required</p>
            <p className="text-slate-500 text-sm mb-5">
              Arbitrage intelligence is gated to Citizen members — direct commercial value that pays for itself.
            </p>
            <a href="/upgrade"
              className="inline-block bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-6 py-2.5 rounded-lg transition text-sm">
              Upgrade to Citizen $19/mo →
            </a>
          </div>
        ) : error ? (
          <div className="border border-red-500/20 bg-red-500/5 rounded-xl p-8 text-center">
            <p className="text-red-400 text-sm mb-1">Failed to load opportunities</p>
            <p className="text-slate-600 text-xs">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="border border-dashed border-white/10 rounded-xl p-10 text-center">
            <p className="text-slate-600 text-sm">No opportunities match this filter</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {filtered.map(o => <OpportunityCard key={o.id} opp={o} />)}
          </div>
        )}

        {/* How it works */}
        <div className="bg-white/3 border border-white/8 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-amber-400 mb-3">How Commerce Intelligence works</h3>
          <div className="grid md:grid-cols-3 gap-4 text-xs text-slate-500">
            <div>
              <div className="text-white font-medium mb-1">1. Discovery agent</div>
              Scans AliExpress, Amazon, Shopee, Lazada for price gaps across categories.
            </div>
            <div>
              <div className="text-white font-medium mb-1">2. Margin calculation</div>
              Deducts platform fees, shipping, estimated customs. Net margin = what you actually keep.
            </div>
            <div>
              <div className="text-white font-medium mb-1">3. Risk scoring</div>
              AI evaluates competition density, supplier reliability, shipping time vs platform SLA.
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
