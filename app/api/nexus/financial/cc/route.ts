import { NextResponse } from 'next/server'

const VPS = process.env.ACEECONOMY_URL || 'http://204.168.221.101:8505'
const KEY = process.env.NEXUS_API_KEY  || 'x68-nexus-internal-2024'

export async function GET() {
  try {
    const res = await fetch(`${VPS}/api/nexus/cc`, {
      headers: { 'x-nexus-key': KEY },
      cache: 'no-store', // scanner runs every 4h; always fetch fresh
    })
    if (!res.ok) throw new Error(`upstream ${res.status}`)
    return NextResponse.json(await res.json())
  } catch (e) {
    return NextResponse.json({
      scanned_at: null,
      crypto: [], commodities: [],
      macro: { fear_greed: null, fg_label: null, btc_dominance_pct: null,
               btc_funding_ann_pct: null, total_crypto_mcap_usd: null,
               mcap_change_24h: null, vix: null, dxy_5d_chg: null,
               eia_draw_mbbl: null, tnx_5d_chg: null, macro_events_48h: [] },
      crypto_headlines: [], commodity_headlines: [],
      leading_indicators: {}, cot_data: {},
      error: String(e),
    })
  }
}
