import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// Public read-only endpoint — zone servers call this on startup
// GET /api/game/merchants?district=hub
export async function GET(req: NextRequest) {
  const district = new URL(req.url).searchParams.get('district') ?? ''

  const { data: merchants, error } = await db
    .from('merchants')
    .select('id, name, logo_url, qr_url, website, district')
    .eq('district', district)

  if (error) return NextResponse.json({ merchants: [] })

  const ids = merchants.map(m => m.id)
  const { data: products } = ids.length
    ? await db.from('products').select('id, merchant_id, name, price, image_url, active').in('merchant_id', ids)
    : { data: [] }

  const result = merchants.map((m, i) => ({
    ...m,
    npc_index: i,
    products: (products ?? []).filter(p => p.merchant_id === m.id),
  }))

  return NextResponse.json({ merchants: result })
}
