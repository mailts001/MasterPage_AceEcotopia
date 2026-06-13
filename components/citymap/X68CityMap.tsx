'use client'

import { useEffect, useState } from 'react'
import PropOSDistrict from './PropOSDistrict'
import FinancialDistrict from './FinancialDistrict'
import NexusTravelDistrict from './NexusTravelDistrict'
import EcommerceDistrict from './EcommerceDistrict'

interface DistrictState {
  id: string
  name: string
  style: string
  health_score: number
  alerts_today: number
  active_monitors: number
  revenue_tier: string
}

interface CityState {
  districts: Record<string, DistrictState>
  total_citizens: number
}

const TIER_LABEL: Record<string, { label: string; color: string }> = {
  seed:      { label: 'Seed',      color: 'text-gray-400' },
  growing:   { label: 'Growing',   color: 'text-green-400' },
  thriving:  { label: 'Thriving',  color: 'text-cyan-400' },
  elite:     { label: 'Elite',     color: 'text-yellow-400' },
}

export default function X68CityMap() {
  const [city, setCity] = useState<CityState | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/nexus/citystate')
      .then(r => r.json())
      .then(data => { setCity(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const districts = city?.districts

  const mockDistrict = (id: string): DistrictState => ({
    id, name: id, style: id,
    health_score: 0.1, alerts_today: 0,
    active_monitors: 0, revenue_tier: 'seed',
  })

  const propos      = districts?.propos      ?? mockDistrict('propos')
  const aceeconomy  = districts?.aceeconomy  ?? mockDistrict('aceeconomy')
  const nexustravel = districts?.nexustravel ?? mockDistrict('nexustravel')
  const commerce    = districts?.commerce    ?? mockDistrict('commerce')

  return (
    <section className="py-24 px-4 border-t border-white/5">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 text-xs text-cyan-400 border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 rounded-full mb-4">
            <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
            Live City State
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            The <span className="gradient-text">X68 Verse</span>
          </h2>
          <p className="text-gray-400 text-sm max-w-xl mx-auto">
            Each district grows with citizen activity, alerts fired, and subscriptions.
            {city && <span className="text-cyan-400 font-semibold"> {city.total_citizens} citizens</span>} building this economy.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-48 rounded-xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* PropOS */}
            <DistrictCard
              district={propos}
              accent="blue"
              href="http://5.223.72.120:8504"
            >
              <PropOSDistrict
                healthScore={propos.health_score}
                alertsToday={propos.alerts_today}
                revenueTier={propos.revenue_tier}
                activeMonitors={propos.active_monitors}
              />
            </DistrictCard>

            {/* Financial */}
            <DistrictCard
              district={aceeconomy}
              accent="green"
              href="/citizen/register?district=aceeconomy"
            >
              <FinancialDistrict
                healthScore={aceeconomy.health_score}
                alertsToday={aceeconomy.alerts_today}
                revenueTier={aceeconomy.revenue_tier}
                activeMonitors={aceeconomy.active_monitors}
              />
            </DistrictCard>

            {/* NexusTravel */}
            <DistrictCard
              district={nexustravel}
              accent="purple"
              href="https://nexus-travel-seven.vercel.app"
            >
              <NexusTravelDistrict
                healthScore={nexustravel.health_score}
                alertsToday={nexustravel.alerts_today}
                revenueTier={nexustravel.revenue_tier}
                activeMonitors={nexustravel.active_monitors}
              />
            </DistrictCard>

            {/* E-commerce */}
            <DistrictCard
              district={commerce}
              accent="amber"
              href="/citizen/register?district=commerce"
            >
              <EcommerceDistrict
                healthScore={commerce.health_score}
                alertsToday={commerce.alerts_today}
                revenueTier={commerce.revenue_tier}
                activeMonitors={commerce.active_monitors}
              />
            </DistrictCard>
          </div>
        )}

        {/* Global stats */}
        {city && (
          <div className="mt-8 grid grid-cols-4 gap-4">
            {[
              { label: 'Total Citizens', value: city.total_citizens, color: 'text-cyan-400' },
              { label: 'Districts Live', value: Object.values(city.districts).filter(d => d.health_score > 0).length, color: 'text-green-400' },
              { label: 'Alerts Today', value: Object.values(city.districts).reduce((a, d) => a + d.alerts_today, 0), color: 'text-yellow-400' },
              { label: 'Monitors Active', value: Object.values(city.districts).reduce((a, d) => a + d.active_monitors, 0), color: 'text-purple-400' },
            ].map(s => (
              <div key={s.label} className="text-center bg-white/5 border border-white/10 rounded-xl p-4">
                <div className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function DistrictCard({
  district, accent, href, children,
}: {
  district: DistrictState
  accent: string
  href: string
  children: React.ReactNode
}) {
  const tier = TIER_LABEL[district.revenue_tier] ?? TIER_LABEL.seed
  const accentColors: Record<string, string> = {
    blue:   'border-blue-500/30 hover:border-blue-500/60',
    green:  'border-green-500/30 hover:border-green-500/60',
    purple: 'border-purple-500/30 hover:border-purple-500/60',
    amber:  'border-amber-500/30 hover:border-amber-500/60',
  }

  return (
    <div className={`bg-white/3 border ${accentColors[accent]} rounded-2xl overflow-hidden transition group`}>
      {/* District visual */}
      {children}

      {/* Info bar */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div>
          <span className="text-sm font-semibold text-white">{district.name}</span>
          <span className={`ml-2 text-xs ${tier.color}`}>· {tier.label}</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Health bar */}
          <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all"
              style={{ width: `${district.health_score * 100}%` }} />
          </div>
          <a href={href} target={href.startsWith('http') ? '_blank' : undefined}
            rel="noopener noreferrer"
            className="text-xs text-gray-500 group-hover:text-white transition">
            Visit →
          </a>
        </div>
      </div>
    </div>
  )
}
