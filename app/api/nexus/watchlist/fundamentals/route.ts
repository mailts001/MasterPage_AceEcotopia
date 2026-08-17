import { NextResponse } from 'next/server'

const VPS = process.env.ACEECONOMY_URL || 'http://204.168.221.101:8505'
const KEY = process.env.NEXUS_API_KEY  || 'x68-nexus-internal-2024'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const symbol = searchParams.get('symbol') || ''
  try {
    const res = await fetch(
      `${VPS}/api/nexus/watchlist/ticker-info?symbol=${encodeURIComponent(symbol)}`,
      { headers: { 'x-nexus-key': KEY }, signal: AbortSignal.timeout(12000) }
    )
    if (!res.ok) throw new Error(`upstream ${res.status}`)
    return NextResponse.json(await res.json())
  } catch (e) {
    return NextResponse.json({ ticker: symbol, news: [], error: String(e) })
  }
}
