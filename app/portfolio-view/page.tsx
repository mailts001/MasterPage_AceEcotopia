'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Holding { ticker: string; name: string; pct: number }
interface Portfolio { label: string; date: string; holdings: Holding[] }

export default function PortfolioViewPage() {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const d = params.get('d')
      if (!d) { setError(true); return }
      const parsed = JSON.parse(atob(d)) as Portfolio
      if (!parsed.holdings?.length) { setError(true); return }
      setPortfolio(parsed)
    } catch { setError(true) }
  }, [])

  if (error) return (
    <div className="min-h-screen bg-[#0A0E1A] flex items-center justify-center text-center px-4">
      <div>
        <div className="text-slate-400 text-sm mb-3">Invalid or expired portfolio link.</div>
        <Link href="/" className="text-cyan-400 text-xs hover:underline">← Back to X68</Link>
      </div>
    </div>
  )

  if (!portfolio) return (
    <div className="min-h-screen bg-[#0A0E1A] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
    </div>
  )

  const CATEGORY_COLORS: Record<string, string> = {
    equity: 'bg-blue-500', fixed_income: 'bg-green-500', fx: 'bg-yellow-500',
    commodities: 'bg-orange-500', private_equity: 'bg-purple-500', philanthropy: 'bg-pink-500',
  }

  return (
    <div className="min-h-screen bg-[#0A0E1A] text-white">
      <div className="max-w-md mx-auto px-4 py-10 space-y-6">
        <div className="text-center space-y-1">
          <div className="text-lg font-bold gradient-text">X68</div>
          <h1 className="text-xl font-bold text-white">{portfolio.label}</h1>
          <p className="text-[11px] text-slate-500">Prepared {portfolio.date} · For discussion only</p>
        </div>

        <div className="space-y-2">
          {portfolio.holdings.map((h, i) => (
            <div key={i} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-mono font-bold text-white">{h.ticker}</div>
                <div className="text-[10px] text-slate-500 truncate">{h.name}</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold font-mono text-cyan-300">{h.pct.toFixed(1)}%</div>
              </div>
              <div className="w-20 bg-white/10 rounded-full h-1.5">
                <div className={`h-1.5 rounded-full ${CATEGORY_COLORS['equity']}`} style={{ width: `${Math.min(h.pct, 100)}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-white/8 bg-white/3 px-4 py-3 text-[9px] text-slate-600 leading-relaxed">
          This portfolio allocation is shared for discussion purposes only and does not constitute investment advice. Consult a licensed financial adviser before making any investment decisions.
        </div>

        <div className="text-center">
          <Link href="/" className="text-xs text-slate-600 hover:text-slate-400 transition">Powered by X68 Financial District</Link>
        </div>
      </div>
    </div>
  )
}
