import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VPS = process.env.ACEECONOMY_URL || 'http://204.168.221.101:8505'
const KEY = process.env.NEXUS_API_KEY  || 'x68-nexus-internal-2024'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: saved } = await supabase
    .from('saved_assets')
    .select('asset_id')
    .eq('citizen_id', user.id)
    .eq('district', 'aceeconomy')
    .order('created_at', { ascending: false })

  const tickers = (saved ?? []).map(r => (r.asset_id as string).toUpperCase()).filter(Boolean)
  if (tickers.length === 0) return NextResponse.json({ tickers: [] })

  try {
    const res = await fetch(`${VPS}/api/nexus/watchlist/fundamentals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-nexus-key': KEY },
      body: JSON.stringify({ tickers }),
      cache: 'no-store',
    })
    if (!res.ok) return NextResponse.json({ error: `VPS ${res.status}`, tickers: [] }, { status: 502 })
    return NextResponse.json(await res.json())
  } catch (e) {
    return NextResponse.json({ error: String(e), tickers: [] }, { status: 502 })
  }
}
