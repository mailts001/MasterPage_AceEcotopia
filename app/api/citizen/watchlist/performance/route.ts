import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VPS = process.env.ACEECONOMY_URL || 'http://204.168.221.101:8505'
const KEY = process.env.NEXUS_API_KEY  || 'x68-nexus-internal-2024'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Load this citizen's financial watchlist tickers
  const { data: saved } = await supabase
    .from('saved_assets')
    .select('asset_id, asset_meta')
    .eq('citizen_id', user.id)
    .eq('district', 'aceeconomy')
    .order('created_at', { ascending: false })

  const tickers = (saved ?? []).map(r => (r.asset_id as string).toUpperCase()).filter(Boolean)

  if (tickers.length === 0) {
    return NextResponse.json({ tickers: [], spy: null, generated_at: new Date().toISOString() })
  }

  try {
    const res = await fetch(`${VPS}/api/nexus/watchlist/performance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-nexus-key': KEY },
      body: JSON.stringify({ tickers }),
      // No cache — always fetch fresh data for signal pages
      cache: 'no-store',
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: `VPS error ${res.status}: ${text}` }, { status: 502 })
    }

    const data = await res.json()
    // Attach alert_meta from saved_assets so frontend knows per-ticker alert prefs
    const metaMap = Object.fromEntries((saved ?? []).map(r => [r.asset_id.toUpperCase(), r.asset_meta]))
    data.tickers = (data.tickers ?? []).map((t: Record<string, unknown>) => ({
      ...t,
      alert_meta: metaMap[(t.ticker as string)?.toUpperCase()] ?? {},
    }))

    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: String(e), tickers: [], spy: null }, { status: 502 })
  }
}
