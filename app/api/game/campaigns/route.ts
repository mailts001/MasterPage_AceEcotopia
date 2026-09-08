import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// Public read-only endpoint — game fetches active campaign placements for a district
// GET /api/game/campaigns?district=hub
export async function GET(req: NextRequest) {
  const district = new URL(req.url).searchParams.get('district') ?? 'hub'

  // Get active placements for this district with live campaigns
  const { data: placements, error } = await db
    .from('campaign_placements')
    .select('id, campaign_id, product_id, spawn_count, active, game_role')
    .eq('active', true)
    .eq('district_id', district)

  if (error || !placements?.length) return NextResponse.json({ placements: [] })

  // Get products for these placements
  const productIds = [...new Set(placements.map(p => p.product_id).filter(Boolean))]
  const { data: products } = productIds.length
    ? await db.from('products').select('id, name, image_url, qr_url').in('id', productIds)
    : { data: [] }

  // Get live campaigns to filter by status
  const campaignIds = [...new Set(placements.map(p => p.campaign_id).filter(Boolean))]
  const { data: campaigns } = campaignIds.length
    ? await db.from('campaigns').select('id, status').in('id', campaignIds).eq('status', 'live')
    : { data: [] }
  const liveCampaignIds = new Set((campaigns ?? []).map(c => c.id))

  const productMap = Object.fromEntries((products ?? []).map(p => [p.id, p]))

  const result = placements
    .filter(pl => liveCampaignIds.has(pl.campaign_id))
    .map(pl => ({
      ...pl,
      product_name: productMap[pl.product_id]?.name ?? null,
      image_url: productMap[pl.product_id]?.image_url ?? null,
      qr_url: productMap[pl.product_id]?.qr_url ?? null,
    }))

  return NextResponse.json({ placements: result })
}
