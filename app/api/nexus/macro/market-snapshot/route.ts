import { NextResponse } from 'next/server'

const VPS = process.env.ACEECONOMY_URL || 'http://204.168.221.101:8505'
const KEY = process.env.NEXUS_API_KEY  || 'x68-nexus-internal-2024'

// No CDN cache — VPS already caches 15 min, we want fresh on each Next.js request
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const res = await fetch(`${VPS}/api/nexus/macro/market-snapshot`, {
      headers: { 'x-nexus-key': KEY },
      next: { revalidate: 900 },
    })
    if (!res.ok) throw new Error(`upstream ${res.status}`)
    return NextResponse.json(await res.json())
  } catch (e) {
    return NextResponse.json({
      error: String(e), classes: [], top_gainers: [], top_losers: [],
      us_top3: [], us_bottom3: [], us_sectors: null, narrative: '',
      generated_at: null, summary: 'Market data temporarily unavailable.', regime: 'UNKNOWN',
    })
  }
}
