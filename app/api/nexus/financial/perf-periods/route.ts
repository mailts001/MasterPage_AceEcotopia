import { NextResponse } from 'next/server'

const VPS = process.env.ACEECONOMY_URL || 'http://204.168.221.101:8505'
const KEY = process.env.NEXUS_API_KEY  || 'x68-nexus-internal-2024'

// Public (no auth) multi-period perf fetch for portfolio tickers
export async function POST(req: Request) {
  const { tickers } = await req.json()
  if (!Array.isArray(tickers) || tickers.length === 0) {
    return NextResponse.json({ tickers: [] })
  }
  try {
    const res = await fetch(`${VPS}/api/nexus/watchlist/performance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-nexus-key': KEY },
      body: JSON.stringify({ tickers: tickers.slice(0, 20) }),
      cache: 'no-store',
    })
    if (!res.ok) return NextResponse.json({ tickers: [] }, { status: 502 })
    return NextResponse.json(await res.json())
  } catch {
    return NextResponse.json({ tickers: [] }, { status: 502 })
  }
}
