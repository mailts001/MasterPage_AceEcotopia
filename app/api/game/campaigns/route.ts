import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,OPTIONS' }

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

// Public read-only endpoint — game fetches active campaign placements for a district
// GET /api/game/campaigns?district=hub
export async function GET(req: NextRequest) {
  const district = new URL(req.url).searchParams.get('district') ?? 'hub'

  // Get active placements for this district
  const { data: placements, error } = await db
    .from('campaign_placements')
    .select('id, campaign_id, product_id, coupon_id, spawn_count, active, game_role')
    .eq('active', true)
    .eq('district_id', district)

  if (error || !placements?.length) return NextResponse.json({ placements: [] }, { headers: CORS })

  // Filter to live campaigns only
  const campaignIds = [...new Set(placements.map(p => p.campaign_id).filter(Boolean))]
  const { data: campaigns } = campaignIds.length
    ? await db.from('campaigns').select('id, status').in('id', campaignIds).eq('status', 'live')
    : { data: [] }
  const liveCampaignIds = new Set((campaigns ?? []).map(c => c.id))

  // Fetch product details (name, image, qr, price, currency, description)
  const productIds = [...new Set(placements.map(p => p.product_id).filter(Boolean))]
  const { data: products } = productIds.length
    ? await db.from('products').select('id, name, image_url, qr_url, price, currency, description').in('id', productIds)
    : { data: [] }

  // Fetch coupon details (reward_type, value, code)
  const couponIds = [...new Set(placements.map(p => p.coupon_id).filter(Boolean))]
  const { data: coupons } = couponIds.length
    ? await db.from('coupons').select('id, reward_type, value, code, qr_url').in('id', couponIds)
    : { data: [] }

  const productMap = Object.fromEntries((products ?? []).map(p => [p.id, p]))
  const couponMap  = Object.fromEntries((coupons  ?? []).map(c => [c.id, c]))

  const result = placements
    .filter(pl => liveCampaignIds.has(pl.campaign_id))
    .map(pl => {
      const prod   = productMap[pl.product_id] ?? {}
      const coupon = couponMap[pl.coupon_id]   ?? {}
      return {
        ...pl,
        product_name:  prod.name        ?? null,
        image_url:     prod.image_url   ?? null,
        qr_url:        prod.qr_url      ?? coupon.qr_url ?? null,
        price:         prod.price       ?? null,
        currency:      prod.currency    ?? 'SGD',
        description:   prod.description ?? null,
        reward_type:   coupon.reward_type ?? null,
        coupon_value:  coupon.value       ?? null,
        coupon_code:   coupon.code        ?? null,
        coupon_qr_url: coupon.qr_url      ?? null,
      }
    })

  return NextResponse.json({ placements: result }, { headers: CORS })
}
