'use client'

import { useEffect, useState } from 'react'

interface DistrictData {
  alerts_today: number
  active_monitors: number
  last_signal_at: string | null
  status: 'live' | 'offline' | 'loading'
}

const DISTRICTS = [
  {
    id: 'propos',
    name: 'PropOS District',
    tagline: 'Property Intelligence',
    description: 'AI monitors Singapore property market 24/7. Get alerts on refinance opportunities, valuation changes, and sell signals before your neighbours.',
    icon: '🏙️',
    color: 'from-blue-500/20 to-cyan-500/20',
    border: 'border-blue-500/30',
    accent: 'text-blue-400',
    href: 'https://propos.duckdns.org',
    features: ['Refinance alerts', 'Valuation tracking', 'District trends', 'Sell signals'],
    citizenValue: 'Save $300–800/month on mortgage',
  },
  {
    id: 'aceeconomy',
    name: 'AceEconomy District',
    tagline: 'Investment Intelligence',
    description: 'AI tracks your watchlist across US stocks, HK equities, REITs and ETFs. Get momentum signals and earnings alerts before the crowd.',
    icon: '💹',
    color: 'from-green-500/20 to-emerald-500/20',
    border: 'border-green-500/30',
    accent: 'text-green-400',
    href: '#',
    features: ['Stock signals', 'Portfolio monitoring', 'Earnings alerts', 'REIT tracking'],
    citizenValue: 'Intelligence edge on every trade',
  },
  {
    id: 'nexustravel',
    name: 'NexusTravel District',
    tagline: 'Travel Intelligence',
    description: 'AI monitors your saved routes and hotels. Get instant alerts when flight prices drop below your threshold.',
    icon: '✈️',
    color: 'from-purple-500/20 to-pink-500/20',
    border: 'border-purple-500/30',
    accent: 'text-purple-400',
    href: 'https://nexustravel.duckdns.org',
    features: ['Flight drop alerts', 'Hotel deals', 'Currency signals', 'Route monitoring'],
    citizenValue: 'Save $100–400 per trip',
  },
  {
    id: 'commerce',
    name: 'Commerce District',
    tagline: 'Arbitrage Intelligence',
    description: 'AI scans price gaps across Shopee, Lazada and Amazon. Surface arbitrage opportunities and optimise your listings automatically.',
    icon: '🛒',
    color: 'from-amber-500/20 to-orange-500/20',
    border: 'border-amber-500/30',
    accent: 'text-amber-400',
    href: '#',
    features: ['Price gap scanning', 'Arbitrage signals', 'Competitor monitoring', 'Auto-listing'],
    citizenValue: 'Find profit gaps others miss',
  },
]

export default function DistrictsSection() {
  const [districtData, setDistrictData] = useState<Record<string, DistrictData>>({})

  useEffect(() => {
    async function fetchDistrictData() {
      for (const d of DISTRICTS) {
        try {
          const res = await fetch(`/api/nexus/district/${d.id}`)
          if (res.ok) {
            const data = await res.json()
            setDistrictData(prev => ({ ...prev, [d.id]: { ...data, status: 'live' } }))
          }
        } catch {
          setDistrictData(prev => ({ ...prev, [d.id]: { alerts_today: 0, active_monitors: 0, last_signal_at: null, status: 'offline' } }))
        }
      }
    }
    fetchDistrictData()
  }, [])

  return (
    <section id="districts" className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Four <span className="gradient-text">Districts</span>
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Each district has AI agents running 24/7. As a citizen, you decide which ones work for you.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {DISTRICTS.map((district) => {
            const data = districtData[district.id]
            return (
              <div key={district.id} className={`district-card rounded-2xl p-6 bg-gradient-to-br ${district.color}`}>
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">{district.icon}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${district.border} ${district.accent} bg-transparent`}>
                        {district.tagline}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-white">{district.name}</h3>
                  </div>
                  {/* Live status */}
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${data?.status === 'live' ? 'bg-green-400 pulse-dot' : 'bg-slate-600'}`} />
                    <span className="text-xs text-slate-500">
                      {data?.status === 'live' ? 'LIVE' : 'Loading...'}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-slate-400 text-sm mb-4 leading-relaxed">
                  {district.description}
                </p>

                {/* Live metrics */}
                {data && data.status === 'live' && (
                  <div className="flex gap-4 mb-4 text-xs">
                    <div>
                      <span className={`font-bold text-base ${district.accent}`}>{data.alerts_today}</span>
                      <span className="text-slate-500 ml-1">alerts today</span>
                    </div>
                    <div>
                      <span className={`font-bold text-base ${district.accent}`}>{data.active_monitors}</span>
                      <span className="text-slate-500 ml-1">monitors active</span>
                    </div>
                  </div>
                )}

                {/* Features */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {district.features.map(f => (
                    <span key={f} className="text-xs bg-white/5 text-slate-400 px-2 py-1 rounded-md border border-white/5">
                      {f}
                    </span>
                  ))}
                </div>

                {/* Value prop */}
                <div className={`text-xs font-medium ${district.accent} mb-4`}>
                  ✦ {district.citizenValue}
                </div>

                {/* CTA */}
                <a
                  href={district.href !== '#' ? district.href : '/citizen/register'}
                  className={`inline-flex items-center gap-2 text-sm font-medium ${district.accent} hover:opacity-80 transition-opacity`}
                >
                  {district.href !== '#' ? 'Visit District →' : 'Join to Access →'}
                </a>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
