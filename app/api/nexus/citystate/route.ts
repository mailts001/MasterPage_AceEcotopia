/**
 * GET /api/nexus/citystate
 * Returns live health metrics per district for the X68 city visualisation.
 * Drives building heights, light intensity, animation speed.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function healthScore(alerts: number, citizens: number, active: number): number {
  const alertScore   = Math.min(alerts / 5, 1)    // 5 alerts = full
  const citizenScore = Math.min(citizens / 10, 1) // 10 citizens = full
  const activeScore  = Math.min(active / 10, 1)   // 10 monitors = full
  return Math.round(((alertScore + citizenScore + activeScore) / 3) * 100) / 100
}

function revenueTier(citizens: number): 'seed' | 'growing' | 'thriving' | 'elite' {
  if (citizens >= 100) return 'elite'
  if (citizens >= 20)  return 'thriving'
  if (citizens >= 5)   return 'growing'
  return 'seed'
}

const NEXUS_KEY = process.env.NEXUS_API_KEY || ''

export async function GET(req: Request) {
  // Public but rate-limited — no auth needed for the visual
  const db = adminDb()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://master-page-ace-ecotopia.vercel.app'

  // Total citizens — count from auth.users (service role required)
  let totalCitizens = 0
  try {
    const { data } = await db.auth.admin.listUsers({ perPage: 9999 })
    totalCitizens = data?.users?.length ?? 0
  } catch { /* fallback to 0 */ }

  // Alerts fired today per district
  const today = new Date().toISOString().slice(0, 10)
  const { data: alertRows } = await db
    .from('alert_events')
    .select('district')
    .gte('sent_at', today)

  const alertsByDistrict: Record<string, number> = {}
  alertRows?.forEach(r => {
    alertsByDistrict[r.district] = (alertsByDistrict[r.district] ?? 0) + 1
  })

  // Fetch live signal data from each district
  const districtSignals: Record<string, { active_monitors: number; alerts_today: number }> = {}
  const districtIds = ['propos', 'aceeconomy', 'nexustravel', 'commerce']

  await Promise.allSettled(
    districtIds.map(async (id) => {
      try {
        const res = await fetch(`${siteUrl}/api/nexus/district/${id}`, {
          headers: { 'x-nexus-key': NEXUS_KEY },
          next: { revalidate: 120 },
        })
        if (res.ok) districtSignals[id] = await res.json()
      } catch {}
    })
  )

  const citizens = totalCitizens ?? 0

  const districts = {
    propos: {
      id: 'propos',
      name: 'PropOS',
      style: 'skyline',
      citizens,
      alerts_today: alertsByDistrict['propos'] ?? districtSignals['propos']?.alerts_today ?? 0,
      active_monitors: districtSignals['propos']?.active_monitors ?? 0,
      health_score: healthScore(
        alertsByDistrict['propos'] ?? 0, citizens, districtSignals['propos']?.active_monitors ?? 0
      ),
      revenue_tier: revenueTier(citizens),
    },
    aceeconomy: {
      id: 'aceeconomy',
      name: 'Financial',
      style: 'trading_floor',
      citizens,
      alerts_today: alertsByDistrict['aceeconomy'] ?? districtSignals['aceeconomy']?.alerts_today ?? 0,
      active_monitors: districtSignals['aceeconomy']?.active_monitors ?? 0,
      health_score: healthScore(
        alertsByDistrict['aceeconomy'] ?? 0, citizens, districtSignals['aceeconomy']?.active_monitors ?? 0
      ),
      revenue_tier: revenueTier(citizens),
    },
    nexustravel: {
      id: 'nexustravel',
      name: 'NexusTravel',
      style: 'cosmic_port',
      citizens,
      alerts_today: alertsByDistrict['nexustravel'] ?? districtSignals['nexustravel']?.alerts_today ?? 0,
      active_monitors: districtSignals['nexustravel']?.active_monitors ?? 0,
      health_score: healthScore(
        alertsByDistrict['nexustravel'] ?? 0, citizens, districtSignals['nexustravel']?.active_monitors ?? 0
      ),
      revenue_tier: revenueTier(citizens),
    },
    commerce: {
      id: 'commerce',
      name: 'E-commerce',
      style: 'night_market',
      citizens,
      alerts_today: alertsByDistrict['commerce'] ?? districtSignals['commerce']?.alerts_today ?? 0,
      active_monitors: districtSignals['commerce']?.active_monitors ?? 0,
      health_score: healthScore(
        alertsByDistrict['commerce'] ?? 0, citizens, districtSignals['commerce']?.active_monitors ?? 0
      ),
      revenue_tier: revenueTier(citizens),
    },
    serenity: {
      id: 'serenity',
      name: 'SerenityOS',
      style: 'zen_garden',
      citizens,
      alerts_today: alertsByDistrict['serenity'] ?? 0,
      active_monitors: districtSignals['serenity']?.active_monitors ?? 0,
      health_score: healthScore(alertsByDistrict['serenity'] ?? 0, citizens, 0),
      revenue_tier: revenueTier(citizens),
    },
    marketingos: {
      id: 'marketingos',
      name: 'MarketingOS',
      style: 'media_hub',
      citizens,
      alerts_today: alertsByDistrict['marketingos'] ?? 0,
      active_monitors: districtSignals['marketingos']?.active_monitors ?? 0,
      health_score: healthScore(alertsByDistrict['marketingos'] ?? 0, citizens, 0),
      revenue_tier: revenueTier(citizens),
    },
    careergenome: {
      id: 'careergenome',
      name: 'CareerGenome',
      style: 'genome_lab',
      citizens,
      alerts_today: alertsByDistrict['careergenome'] ?? 0,
      active_monitors: districtSignals['careergenome']?.active_monitors ?? 0,
      health_score: healthScore(alertsByDistrict['careergenome'] ?? 0, citizens, 0),
      revenue_tier: revenueTier(citizens),
    },
    deepqi: {
      id: 'deepqi',
      name: 'Alternative HealthCare',
      style: 'wellness_temple',
      citizens,
      alerts_today: alertsByDistrict['deepqi'] ?? 0,
      active_monitors: districtSignals['deepqi']?.active_monitors ?? 0,
      health_score: healthScore(alertsByDistrict['deepqi'] ?? 0, citizens, 0),
      revenue_tier: revenueTier(citizens),
    },
  }

  // Unique IPs today and all-time
  const { count: uniqueIpsToday } = await db
    .from('visitor_logs')
    .select('*', { count: 'exact', head: true })
    .eq('date', today)
  const { count: uniqueIpsTotal } = await db
    .from('visitor_logs')
    .select('*', { count: 'exact', head: true })

  return NextResponse.json({
    districts,
    total_citizens: citizens,
    unique_ips_today: uniqueIpsToday ?? 0,
    unique_ips_total: uniqueIpsTotal ?? 0,
    generated_at: new Date().toISOString(),
  })
}
