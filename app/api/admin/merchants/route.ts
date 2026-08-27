import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Service role client — bypasses RLS, server-side only
const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

// Simple admin secret check (set ADMIN_SECRET in Vercel env vars)
function checkAuth(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret')
  return secret === process.env.ADMIN_SECRET
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return unauthorized()
  const { searchParams } = new URL(req.url)
  const table = searchParams.get('table') ?? 'merchants'

  const allowed = ['merchants', 'products', 'campaigns', 'coupons', 'campaign_placements']
  if (!allowed.includes(table)) return NextResponse.json({ error: 'Invalid table' }, { status: 400 })

  const { data, error } = await adminSupabase.from(table).select('*').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return unauthorized()
  const { table, row } = await req.json()

  const allowed = ['merchants', 'products', 'campaigns', 'coupons', 'campaign_placements']
  if (!allowed.includes(table)) return NextResponse.json({ error: 'Invalid table' }, { status: 400 })

  const { data, error } = await adminSupabase.from(table).insert(row).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(req: NextRequest) {
  if (!checkAuth(req)) return unauthorized()
  const { table, id } = await req.json()

  const allowed = ['merchants', 'products', 'campaigns', 'coupons', 'campaign_placements']
  if (!allowed.includes(table)) return NextResponse.json({ error: 'Invalid table' }, { status: 400 })

  const { error } = await adminSupabase.from(table).delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
