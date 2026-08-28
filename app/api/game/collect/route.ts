import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendCouponEmail } from '@/lib/email/send'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// Called by the game server (VPS) when a player collects a placement item
// Auth: shared GAME_SERVER_SECRET env var
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-game-secret')
  if (secret !== process.env.GAME_SERVER_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { placement_id, citizen_id, citizen_email, citizen_name } = await req.json()
  if (!placement_id || !citizen_id || !citizen_email) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Fetch placement + joined product + coupon + merchant
  const { data: placement, error: pErr } = await adminSupabase
    .from('campaign_placements')
    .select(`
      id,
      coupon_id,
      products ( name, image_url ),
      coupons ( reward_type, reward_value, coupon_code ),
      campaigns ( merchant_id, merchants ( name, website_url ) )
    `)
    .eq('id', placement_id)
    .single()

  if (pErr || !placement) {
    return NextResponse.json({ error: 'Placement not found' }, { status: 404 })
  }

  // Record the unlock
  const { error: ulErr } = await adminSupabase.from('reward_unlocks').insert({
    citizen_id,
    placement_id,
    coupon_id: placement.coupon_id,
  })
  if (ulErr) {
    // Duplicate collect — citizen already got this one
    return NextResponse.json({ already_collected: true })
  }

  // Send coupon email (fire-and-forget — don't block response)
  const p = placement as unknown as {
    products:  { name: string; image_url: string } | null
    coupons:   { reward_type: string; reward_value: number; coupon_code?: string } | null
    campaigns: { merchants: { name: string; website_url?: string } } | null
  }
  const product  = p.products
  const coupon   = p.coupons
  const merchant = p.campaigns?.merchants

  void sendCouponEmail({
    to:           citizen_email,
    citizenName:  citizen_name ?? 'Citizen',
    brandName:    merchant?.name ?? 'Merchant',
    productName:  product?.name ?? 'Item',
    rewardType:   coupon?.reward_type ?? 'coupon_pct',
    rewardValue:  coupon?.reward_value ?? 0,
    couponCode:   coupon?.coupon_code,
    merchantUrl:  merchant?.website_url,
  }).catch(() => {})

  return NextResponse.json({
    ok: true,
    coupon_code:   coupon?.coupon_code,
    reward_type:   coupon?.reward_type,
    reward_value:  coupon?.reward_value,
    brand_name:    merchant?.name,
    product_name:  product?.name,
  })
}
