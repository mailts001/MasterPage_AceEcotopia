'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface FinancialSignals {
  alerts_today: number
  active_monitors: number
  signals_today: number
  trades_today: number
  daily_pnl: number
  momentum_picks: number
  squeeze_alerts: number
  open_positions: number
  last_signal_at: string | null
  status: string
}

export default function FinancialDashboard() {
  const [signals, setSignals] = useState<FinancialSignals | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/nexus/district/aceeconomy')
      .then(r => r.json())
      .then(d => { setSignals(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-[#0A0E1A] text-white">
      <nav className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold gradient-text">X68</Link>
        <Link href="/citizen/dashboard" className="text-sm text-gray-400 hover:text-white transition">← Dashboard</Link>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl">💹</span>
            <h1 className="text-2xl font-bold">Financial District</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${
              signals?.status === 'live'
                ? 'border-green-500/40 bg-green-500/10 text-green-400'
                : 'border-white/10 text-gray-500'
            }`}>
              {signals?.status === 'live' ? '● LIVE' : '○ Loading'}
            </span>
          </div>
          <p className="text-gray-500 text-sm">AI-powered stock signals — US & HK markets. Intelligence layer only. Execution is yours.</p>
        </div>

        {/* Signal metrics */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-24 rounded-xl bg-white/5 animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Open Positions', value: signals?.open_positions ?? 0, color: 'text-cyan-400', sub: 'AI-monitored' },
              { label: 'Signals Today', value: signals?.signals_today ?? 0, color: 'text-green-400', sub: 'scanner + squeeze' },
              { label: 'Momentum Picks', value: signals?.momentum_picks ?? 0, color: 'text-yellow-400', sub: 'from last scan' },
              { label: 'Squeeze Alerts', value: signals?.squeeze_alerts ?? 0, color: 'text-purple-400', sub: 'Tier1 + Tier2' },
            ].map(s => (
              <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-5">
                <div className={`text-3xl font-bold font-mono ${s.color}`}>{s.value}</div>
                <div className="text-xs text-gray-400 mt-1">{s.label}</div>
                <div className="text-xs text-gray-600">{s.sub}</div>
              </div>
            ))}
          </div>
        )}

        {/* What these signals mean */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white/5 border border-green-500/20 rounded-xl p-5">
            <h3 className="font-semibold text-green-400 mb-3 text-sm">📈 Momentum Scanner</h3>
            <p className="text-xs text-gray-400 leading-relaxed mb-3">
              Scans US and HK stocks for RSI 50–72, MACD crossover, and volume &gt;1.5× average.
              Runs nightly at 9PM SGT. Picks are ranked by signal strength.
            </p>
            <div className="text-xs text-gray-600">
              Last scan: {signals?.last_signal_at
                ? new Date(signals.last_signal_at).toLocaleString('en-SG')
                : 'Not yet run today'}
            </div>
          </div>

          <div className="bg-white/5 border border-purple-500/20 rounded-xl p-5">
            <h3 className="font-semibold text-purple-400 mb-3 text-sm">⚡ Squeeze Alerts</h3>
            <p className="text-xs text-gray-400 leading-relaxed mb-3">
              Bollinger Band squeeze setup detection. Tier 1 pre-market scan at 8:30PM SGT,
              Tier 2 opening range breakout confirmation at 9:40PM SGT.
            </p>
            <div className="text-xs text-gray-600">
              Active squeeze monitors: {signals?.open_positions ?? 0}
            </div>
          </div>
        </div>

        {/* Upgrade gate for deeper data */}
        <div className="bg-gradient-to-r from-green-500/10 to-cyan-500/10 border border-green-500/20 rounded-xl p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="font-semibold text-white text-sm mb-2">Want Telegram delivery when signals fire?</p>
              <div className="space-y-1 text-xs text-gray-400">
                <p>• Real-time alert the moment scanner picks a momentum setup</p>
                <p>• Squeeze entry + stop-loss + target sent to your Telegram</p>
                <p>• Daily P&L summary at market close</p>
              </div>
            </div>
            <div className="shrink-0">
              <Link href="/upgrade"
                className="inline-block bg-green-500 hover:bg-green-400 text-black font-bold px-5 py-2.5 rounded-lg transition text-sm">
                Upgrade to Citizen →
              </Link>
            </div>
          </div>
        </div>

        {/* Watchlist prompt */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 text-center">
          <p className="text-sm text-gray-400 mb-3">Add stocks to your watchlist so AI prioritises signals for you</p>
          <Link href="/citizen/dashboard?tab=watchlist&district=aceeconomy"
            className="text-xs text-green-400 hover:underline">
            + Add to Financial Watchlist →
          </Link>
        </div>
      </div>
    </div>
  )
}
