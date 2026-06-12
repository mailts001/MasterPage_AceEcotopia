import { NextResponse } from 'next/server'

const NEXUS_KEY = process.env.NEXUS_API_KEY || 'changeme'

const DISTRICT_URLS: Record<string, string | undefined> = {
  propos:      process.env.PROPOS_URL,
  aceeconomy:  process.env.ACEECONOMY_URL,
  nexustravel: process.env.NEXUSTRAVEL_URL,
  commerce:    process.env.COMMERCE_URL,
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const url = DISTRICT_URLS[params.id]

  if (!url) {
    return NextResponse.json({
      alerts_today: 0,
      active_monitors: 0,
      last_signal_at: null,
      status: 'offline',
    })
  }

  try {
    const res = await fetch(`${url}/api/nexus/signals`, {
      headers: { 'x-nexus-key': NEXUS_KEY },
      next: { revalidate: 60 },
    })
    if (!res.ok) throw new Error('upstream error')
    const data = await res.json()
    return NextResponse.json({ ...data, status: 'live' })
  } catch {
    return NextResponse.json({
      alerts_today: 0,
      active_monitors: 0,
      last_signal_at: null,
      status: 'offline',
    })
  }
}
