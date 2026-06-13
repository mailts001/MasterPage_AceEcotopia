'use client'

import { useEffect, useState } from 'react'

const LIVE_STATS = [
  { label: 'Properties Monitored', value: '0', suffix: '', id: 'props' },
  { label: 'Signals Today', value: '0', suffix: '', id: 'signals' },
  { label: 'Citizens', value: '0', suffix: '', id: 'citizens' },
  { label: 'Alerts Sent', value: '0', suffix: '', id: 'alerts' },
]

export default function HeroSection() {
  const [stats, setStats] = useState(LIVE_STATS)

  // Fetch live counts from each district
  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/nexus/aggregate')
        if (res.ok) {
          const data = await res.json()
          setStats([
            { label: 'Properties Monitored', value: data.properties?.toString() || '0', suffix: '', id: 'props' },
            { label: 'Signals Today', value: data.signals?.toString() || '0', suffix: '', id: 'signals' },
            { label: 'Citizens', value: data.citizens?.toString() || '0', suffix: '', id: 'citizens' },
            { label: 'Alerts Sent', value: data.alerts?.toString() || '0', suffix: '', id: 'alerts' },
          ])
        }
      } catch {
        // Keep defaults if API unreachable
      }
    }
    fetchStats()
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-4 py-20 overflow-hidden">
      {/* Top nav */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4 z-20">
        <span className="text-sm font-bold gradient-text">X68</span>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <a href="/citizen/login" className="hover:text-white transition">Sign In</a>
          <a href="/citizen/register" className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition">Join Free</a>
        </div>
      </div>
      {/* Background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,212,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />

      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 text-center max-w-5xl mx-auto">
        {/* Live indicator */}
        <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-4 py-2 mb-8">
          <span className="w-2 h-2 rounded-full bg-green-400 pulse-dot" />
          <span className="text-sm text-cyan-400 font-medium">AI Agents Active</span>
        </div>

        {/* Main headline */}
        <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight tracking-tight">
          One Account.
          <span className="block gradient-text">Four AI Districts.</span>
        </h1>

        <p className="text-xl md:text-2xl text-slate-400 mb-6 max-w-3xl mx-auto leading-relaxed">
          X68 runs AI agents on property, stocks, flights, and commerce — 24/7.
          You get alerts when something is worth acting on.
        </p>

        {/* Concrete value hooks */}
        <div className="flex flex-wrap justify-center gap-3 mb-10 max-w-2xl mx-auto">
          {[
            '🏠 Refinance alert before rates move',
            '📈 Stock squeeze signal before breakout',
            '✈️ Fare drop on your saved route',
            '🛒 Arbitrage gap: buy low, sell high',
          ].map(h => (
            <span key={h} className="text-xs text-gray-400 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">{h}</span>
          ))}
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <a
            href="/citizen/register"
            className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl hover:opacity-90 transition-all hover:scale-105 text-lg"
          >
            Join as a Citizen — Free
          </a>
          <a
            href="#districts"
            className="px-8 py-4 border border-slate-600 text-slate-300 font-semibold rounded-xl hover:border-cyan-500 hover:text-cyan-400 transition-all text-lg"
          >
            Explore Districts
          </a>
        </div>

        {/* Live stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
          {stats.map((stat) => (
            <div key={stat.id} className="district-card rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-cyan-400 stat-counter">
                {stat.value}{stat.suffix}
              </div>
              <div className="text-xs text-slate-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </section>
  )
}
