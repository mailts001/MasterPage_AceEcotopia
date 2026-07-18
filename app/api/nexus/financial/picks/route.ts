import { NextResponse, NextRequest } from 'next/server'

const VPS = process.env.ACEECONOMY_URL || 'http://204.168.221.101:8505'
const KEY = process.env.NEXUS_API_KEY  || 'x68-nexus-internal-2024'

export async function GET(req: NextRequest) {
  const market = req.nextUrl.searchParams.get('market') ?? 'US'
  try {
    const res = await fetch(`${VPS}/api/nexus/picks?market=${market}`, {
      headers: { 'x-nexus-key': KEY },
      next: { revalidate: 300 }, // cache 5 min
    })
    if (!res.ok) throw new Error(`upstream ${res.status}`)
    const data = await res.json()
    return NextResponse.json(data)
  } catch (e) {
    if (market === 'ETF') {
      return NextResponse.json({ market: 'ETF', timestamp: null, bullish: [], bearish: [], neutral: [], sector_rotation: [], error: String(e) })
    }
    if (market === 'HK') {
      return NextResponse.json({ market: 'HK', timestamp: null, scanner_picks: [], squeeze_alerts: [], error: String(e) })
    }
    return NextResponse.json({ market: 'US', timestamp: null, bullish: [], bearish: [], scanner_picks: [], squeeze_alerts: [], spike_alerts: [], error: String(e) })
  }
}
