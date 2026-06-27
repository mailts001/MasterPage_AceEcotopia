import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const NEXUS_KEY = process.env.NEXUS_API_KEY || 'changeme'

function adminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const DISTRICTS = [
  { id: 'propos', url: process.env.PROPOS_URL },
  { id: 'aceeconomy', url: process.env.ACEECONOMY_URL },
  { id: 'nexustravel', url: process.env.NEXUSTRAVEL_URL },
]

export async function GET() {
  let properties = 0, signals = 0, alerts = 0

  // Fetch from each district in parallel
  await Promise.allSettled(
    DISTRICTS.map(async (d) => {
      if (!d.url) return
      try {
        const res = await fetch(`${d.url}/api/nexus/signals`, {
          headers: { 'x-nexus-key': NEXUS_KEY },
          next: { revalidate: 60 }, // cache 60s
        })
        if (!res.ok) return
        const data = await res.json()
        if (d.id === 'propos') {
          properties += data.active_monitors || 0
          alerts += data.alerts_today || 0
        }
        signals += data.signals_today || 0
      } catch { /* district offline */ }
    })
  )

  // Citizens count from auth.users
  let citizens = 0
  try {
    const { data } = await adminDb().auth.admin.listUsers({ perPage: 9999 })
    citizens = data?.users?.length ?? 0
  } catch { /* fallback to 0 */ }

  return NextResponse.json({ properties, signals, citizens, alerts })
}
