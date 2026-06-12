/**
 * ADD THIS FILE TO YOUR NEXUSTRAVEL VERCEL PROJECT:
 * Copy to: app/api/nexus/signals/route.ts  (Next.js App Router)
 * OR:      pages/api/nexus/signals.ts       (Next.js Pages Router)
 *
 * This exposes a READ-ONLY signal endpoint for AceEcotopia master platform.
 * NO user data, NO bookings, NO prices — only aggregate counts.
 *
 * Add NEXUS_API_KEY to your Vercel environment variables (same value as master).
 */

import { NextResponse } from 'next/server'

const NEXUS_KEY = process.env.NEXUS_API_KEY || ''

export async function GET(req: Request) {
  // Verify shared secret
  const key = req.headers.get('x-nexus-key')
  if (!key || key !== NEXUS_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ---------------------------------------------------------------
  // Replace these with real counts from your database / state
  // e.g. query Supabase, read from a KV store, etc.
  // ---------------------------------------------------------------
  const alertsToday = await getAlertsToday()
  const activeMonitors = await getActiveMonitors()
  const lastSignalAt = await getLastSignalAt()

  return NextResponse.json({
    district: 'nexustravel',
    alerts_today: alertsToday,
    active_monitors: activeMonitors,   // e.g. active route monitors
    signals_today: alertsToday,
    last_signal_at: lastSignalAt,
    status: 'live',
  })
}

// ---------------------------------------------------------------
// Stub functions — replace with your real data source
// ---------------------------------------------------------------

async function getAlertsToday(): Promise<number> {
  // Example: count rows in your alerts table where created_at > today
  // const { count } = await supabase
  //   .from('price_alerts')
  //   .select('*', { count: 'exact', head: true })
  //   .gte('created_at', new Date().toISOString().slice(0, 10))
  // return count ?? 0
  return 0
}

async function getActiveMonitors(): Promise<number> {
  // Example: count active route/price monitors
  // const { count } = await supabase
  //   .from('monitors')
  //   .select('*', { count: 'exact', head: true })
  //   .eq('active', true)
  // return count ?? 0
  return 0
}

async function getLastSignalAt(): Promise<string | null> {
  // Example: get the most recent alert timestamp
  // const { data } = await supabase
  //   .from('price_alerts')
  //   .select('created_at')
  //   .order('created_at', { ascending: false })
  //   .limit(1)
  //   .single()
  // return data?.created_at ?? null
  return null
}
