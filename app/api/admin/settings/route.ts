import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { invalidatePromoCache } from '@/lib/promo'

const ADMIN_KEY = process.env.ADMIN_SECRET_KEY || 'changeme'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function checkAdmin(req: Request): boolean {
  return req.headers.get('x-admin-key') === ADMIN_KEY
}

export async function GET(req: Request) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data } = await supabaseAdmin.from('platform_settings').select('*')
  const settings: Record<string, string> = {}
  for (const row of data ?? []) settings[row.id] = row.value
  return NextResponse.json(settings)
}

export async function POST(req: Request) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const allowed = ['promo_mode', 'promo_label', 'citizen_preview']
  const updates = Object.entries(body).filter(([k]) => allowed.includes(k))
  if (!updates.length) return NextResponse.json({ error: 'No valid fields' }, { status: 400 })

  for (const [id, value] of updates) {
    await supabaseAdmin.from('platform_settings').upsert(
      { id, value: String(value), updated_at: new Date().toISOString() },
      { onConflict: 'id' }
    )
  }
  invalidatePromoCache()
  return NextResponse.json({ ok: true })
}
