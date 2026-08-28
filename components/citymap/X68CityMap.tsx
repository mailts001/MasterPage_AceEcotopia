'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import PropOSDistrict from './PropOSDistrict'
import FinancialDistrict from './FinancialDistrict'
import NexusTravelDistrict from './NexusTravelDistrict'
import EcommerceDistrict from './EcommerceDistrict'
import SerenityDistrict from './SerenityDistrict'
import MarketingOSDistrict from './MarketingOSDistrict'
import CareerGenomeDistrict from './CareerGenomeDistrict'
import DeepQiDistrict from './DeepQiDistrict'

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
  unique_ips_today: number
  unique_ips_total: number
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
  const serenity    = districts?.serenity    ?? mockDistrict('serenity')
  const marketingos = districts?.marketingos ?? mockDistrict('marketingos')
  const careergenome = districts?.careergenome ?? mockDistrict('careergenome')
  const deepqi       = districts?.deepqi       ?? mockDistrict('deepqi')

  return (
    <section className="pt-24 pb-12 px-4 border-t border-white/5">
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
            {[1,2,3,4,5,6,7,8].map(i => (
              <div key={i} className="h-48 rounded-xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* PropOS — direct public access */}
            <DistrictCard
              district={propos}
              accent="blue"
              href="http://5.223.72.120:8504"
              external
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

            {/* NexusTravel — direct public access */}
            <DistrictCard
              district={nexustravel}
              accent="purple"
              href="https://nexus-travel-seven.vercel.app"
              external
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
              gameHref="/citizen/dashboard/commerce/play"
            >
              <EcommerceDistrict
                healthScore={commerce.health_score}
                alertsToday={commerce.alerts_today}
                revenueTier={commerce.revenue_tier}
                activeMonitors={commerce.active_monitors}
              />
            </DistrictCard>

            {/* SerenityOS */}
            <DistrictCard
              district={serenity}
              accent="emerald"
              href="/citizen/dashboard/wellness"
            >
              <SerenityDistrict
                healthScore={serenity.health_score}
                alertsToday={serenity.alerts_today}
                revenueTier={serenity.revenue_tier}
                activeMonitors={serenity.active_monitors}
                citizens={city?.total_citizens ?? 0}
              />
            </DistrictCard>

            {/* MarketingOS */}
            <DistrictCard
              district={marketingos}
              accent="rose"
              href="/marketing"
            >
              <MarketingOSDistrict
                healthScore={marketingos.health_score}
                alertsToday={marketingos.alerts_today}
                revenueTier={marketingos.revenue_tier}
                activeMonitors={marketingos.active_monitors}
              />
            </DistrictCard>

            {/* CareerGenome — direct public access */}
            <DistrictCard
              district={careergenome}
              accent="indigo"
              href="https://career-genome.vercel.app"
              external
            >
              <CareerGenomeDistrict
                healthScore={careergenome.health_score}
                alertsToday={careergenome.alerts_today}
                revenueTier={careergenome.revenue_tier}
                activeMonitors={careergenome.active_monitors}
              />
            </DistrictCard>

            {/* DeepQi — TCM + BaZi Wellness, District 8 */}
            <DistrictCard
              district={deepqi}
              accent="orange"
              href="https://deep-qi-web.vercel.app"
              external
            >
              <DeepQiDistrict
                healthScore={deepqi.health_score}
                alertsToday={deepqi.alerts_today}
                revenueTier={deepqi.revenue_tier}
                activeMonitors={deepqi.active_monitors}
              />
            </DistrictCard>
          </div>
        )}

        {/* Global stats */}
        {city && (
          <div className="mt-8 grid grid-cols-3 md:grid-cols-6 gap-3">
            {[
              { label: 'Citizens', value: city.total_citizens, color: 'text-cyan-400' },
              { label: 'Districts Live', value: Object.values(city.districts).filter(d => d.health_score > 0).length, color: 'text-green-400' },
              { label: 'Alerts Today', value: Object.values(city.districts).reduce((a, d) => a + d.alerts_today, 0), color: 'text-yellow-400' },
              { label: 'Monitors Active', value: Object.values(city.districts).reduce((a, d) => a + d.active_monitors, 0), color: 'text-purple-400' },
              { label: 'Visitors Today', value: city.unique_ips_today, color: 'text-rose-400' },
              { label: 'Total Visitors', value: city.unique_ips_total, color: 'text-orange-400' },
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
  district, accent, href, external, gameHref, children,
}: {
  district: DistrictState
  accent: string
  href: string
  external?: boolean
  gameHref?: string
  children: React.ReactNode
}) {
  const tier = TIER_LABEL[district.revenue_tier] ?? TIER_LABEL.seed
  const accentColors: Record<string, string> = {
    blue:    'border-blue-500/30 hover:border-blue-500/60',
    green:   'border-green-500/30 hover:border-green-500/60',
    purple:  'border-purple-500/30 hover:border-purple-500/60',
    amber:   'border-amber-500/30 hover:border-amber-500/60',
    emerald: 'border-emerald-500/30 hover:border-emerald-500/60',
    rose:    'border-rose-500/30 hover:border-rose-500/60',
    indigo:  'border-indigo-500/30 hover:border-indigo-500/60',
    orange:  'border-orange-500/30 hover:border-orange-500/60',
  }

  return (
    <div className={`bg-white/3 border ${accentColors[accent]} rounded-2xl overflow-hidden transition group`}>
      {/* District visual — with optional game overlay */}
      <div className="relative">
        {children}
        {gameHref && (
          <Link
            href={gameHref}
            className="absolute inset-0 z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/50 backdrop-blur-[2px]"
            onClick={e => e.stopPropagation()}
          >
            <span className="flex flex-col items-center gap-1.5 text-center">
              <span className="text-2xl">🎮</span>
              <span className="text-xs font-bold text-amber-300 tracking-wide uppercase">Hunt for Deals</span>
              <span className="text-[10px] text-amber-400/70">Win real coupons →</span>
            </span>
          </Link>
        )}
      </div>

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
          {external ? (
            <a href={href} target="_blank" rel="noopener noreferrer"
              className="text-xs text-gray-500 group-hover:text-white transition whitespace-nowrap">
              Visit →
            </a>
          ) : (
            <Link href={href}
              className="text-xs text-gray-500 group-hover:text-white transition whitespace-nowrap">
              Join →
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
