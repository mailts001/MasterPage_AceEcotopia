import { NextResponse } from 'next/server'

const VPS = process.env.ACEECONOMY_URL || 'http://204.168.221.101:8505'
const KEY = process.env.NEXUS_API_KEY  || 'x68-nexus-internal-2024'

export async function GET() {
  try {
    const res = await fetch(`${VPS}/api/nexus/intel`, {
      headers: { 'x-nexus-key': KEY },
      next: { revalidate: 900 }, // cache 15 min — macro data doesn't change fast
    })
    if (!res.ok) throw new Error(`upstream ${res.status}`)
    const data = await res.json()
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({
      generated_at: null,
      market_regime: 'Unknown',
      regime_bias: 'neutral',
      regime_notes: [],
      ic_suitable: false,
      best_strategy: null,
      strategy_label: 'Unknown',
      rationale: 'Intel data temporarily unavailable.',
      ga_signals: [],
      hot_sectors: [],
      bearish_symbols: [],
      defensive: [],
      congress_trades: [],
      error: String(e),
    })
  }
}
