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
      // regime
      regime: 'UNKNOWN', regime_score: 0, regime_signals: [], regime_updated: null,
      commentary: 'Intel data temporarily unavailable.', entry_allowed: true,
      size_multiplier: 1.0, halt_strategies: [],
      // internals
      vix: null, vix_5d_chg: null, spy_5d: null, breadth_pct: null,
      defensive_outperforming: false, rotation_signals: [],
      options_stress: false, options_signals: [],
      // news
      news_sentiment: null, news_summary: '', news_headline_count: 0,
      news_bearish: [], news_bullish: [], shock_event: false,
      // options
      options_recommendation: null, iron_condors: [],
      options_summary: { total_opportunities: 0, iron_condors: 0, avg_yield_pct: 0 },
      options_scanned_at: null,
      // ga
      ga_signals: [], hot_sectors: [], bearish_symbols: [], defensive: [],
      best_strategy: null, strategy_label: 'Unknown',
      // congress
      congress_trades: [],
      error: String(e),
    })
  }
}
