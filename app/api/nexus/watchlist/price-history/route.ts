import { NextResponse } from 'next/server'

const VPS = process.env.ACEECONOMY_URL || 'http://204.168.221.101:8505'
const KEY = process.env.NEXUS_API_KEY  || 'x68-nexus-internal-2024'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const symbols = searchParams.get('symbols') || ''
  const period  = searchParams.get('period')  || '3M'
  try {
    const res = await fetch(
      `${VPS}/api/nexus/watchlist/price-history?symbols=${encodeURIComponent(symbols)}&period=${period}`,
      { headers: { 'x-nexus-key': KEY } }
    )
    if (!res.ok) throw new Error(`upstream ${res.status}`)
    return NextResponse.json(await res.json())
  } catch (e) {
    return NextResponse.json({ series: {}, period, error: String(e) })
  }
}
