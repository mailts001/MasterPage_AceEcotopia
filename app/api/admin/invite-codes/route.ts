import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ADMIN_KEY = process.env.ADMIN_SECRET_KEY || 'changeme'
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function checkAdmin(req: Request) {
  return req.headers.get('x-admin-key') === ADMIN_KEY
}

function randomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = 'VIP-'
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

export async function GET(req: Request) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await supabaseAdmin
    .from('invite_codes')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: Request) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { tier = 'citizen', uses = 1, note = '', expires_days } = await req.json()
  const valid_tiers = ['citizen', 'pro']
  if (!valid_tiers.includes(tier))
    return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })

  const code = randomCode()
  const expires_at = expires_days
    ? new Date(Date.now() + expires_days * 86400_000).toISOString()
    : null

  const { data, error } = await supabaseAdmin
    .from('invite_codes')
    .insert({ code, tier, uses_left: uses, note, expires_at, used_by: [] })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: Request) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { code } = await req.json()
  const { error } = await supabaseAdmin.from('invite_codes').delete().eq('code', code)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
