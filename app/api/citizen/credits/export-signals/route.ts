import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'

const VPS = process.env.ACEECONOMY_URL || 'http://204.168.221.101:8505'
const KEY = process.env.NEXUS_API_KEY  || 'x68-nexus-internal-2024'
const COST = 30

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = adminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Check credits
  const { data: citizen } = await db
    .from('citizens')
    .select('nexus_credits, display_name')
    .eq('id', user.id)
    .single()

  if (!citizen || (citizen.nexus_credits ?? 0) < COST) {
    return NextResponse.json({ error: `Need ${COST} credits (you have ${citizen?.nexus_credits ?? 0})` }, { status: 402 })
  }

  // Fetch signal history from VPS
  const res = await fetch(`${VPS}/api/nexus/signal-history?days=30`, {
    headers: { 'x-nexus-key': KEY },
  })
  const data = await res.json()
  const rows: Record<string, unknown>[] = data.rows ?? []

  if (rows.length === 0) {
    return NextResponse.json({ error: 'No signal data available yet — check back after tonight\'s scan' }, { status: 404 })
  }

  // Deduct credits
  await db.from('citizens').update({ nexus_credits: citizen.nexus_credits - COST }).eq('id', user.id)
  await db.from('credits_ledger').insert({ citizen_id: user.id, delta: -COST, reason: 'spend_export_signals' })

  // Build CSV
  const cols = ['date', 'symbol', 'direction', 'price', 'rsi', 'macd_hist', 'vol_surge_pct', 'bull_score', 'signals']
  const header = cols.join(',')
  const csvRows = rows.map(r =>
    cols.map(c => {
      const v = r[c]
      if (v === null || v === undefined) return ''
      const s = String(v)
      return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s
    }).join(',')
  )
  const csv = [header, ...csvRows].join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="x68-signals-${new Date().toISOString().slice(0,10)}.csv"`,
    },
  })
}
