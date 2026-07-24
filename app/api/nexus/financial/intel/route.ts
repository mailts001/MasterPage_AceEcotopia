import { NextResponse } from 'next/server'
import { isPromoMode } from '@/lib/promo'

const VPS = process.env.ACEECONOMY_URL || 'http://204.168.221.101:8505'
const KEY = process.env.NEXUS_API_KEY  || 'x68-nexus-internal-2024'

export async function GET() {
  const [vpsRes, promo] = await Promise.allSettled([
    fetch(`${VPS}/api/nexus/intel`, {
      headers: { 'x-nexus-key': KEY },
      next: { revalidate: 900 },
    }),
    isPromoMode(),
  ])

  const promoMode = promo.status === 'fulfilled' ? promo.value : false

  try {
    if (vpsRes.status !== 'fulfilled' || !vpsRes.value.ok)
      throw new Error(vpsRes.status === 'fulfilled' ? `upstream ${vpsRes.value.status}` : 'fetch failed')
    const data = await vpsRes.value.json()
    return NextResponse.json({ ...data, promo_mode: promoMode })
  } catch (e) {
    return NextResponse.json({
      regime: 'UNKNOWN', regime_score: 0, regime_signals: [], regime_updated: null,
      commentary: 'Intel data temporarily unavailable.', entry_allowed: true,
      size_multiplier: 1.0, halt_strategies: [],
      vix: null, vix_5d_chg: null, spy_5d: null, breadth_pct: null,
      defensive_outperforming: false, rotation_signals: [],
      options_stress: false, options_signals: [],
      news_sentiment: null, news_summary: '', news_headline_count: 0,
      news_bearish: [], news_bullish: [], shock_event: false,
      options_recommendation: null, iron_condors: [],
      options_summary: { total_opportunities: 0, iron_condors: 0, avg_yield_pct: 0 },
      options_scanned_at: null,
      ga_signals: [], hot_sectors: [], bearish_symbols: [], defensive: [],
      best_strategy: null, strategy_label: 'Unknown',
      congress_trades: [],
      // portfolio intel (new)
      strategy_lifecycle: [], all_strategy_stats: {},
      asset_classes: [], sectors: [], seasonality: null,
      risk_heat: null, bond_intel: [], correlation: null,
      promo_mode: promoMode,
      error: String(e),
    })
  }
}
