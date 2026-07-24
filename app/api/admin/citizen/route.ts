import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ADMIN_KEY = process.env.ADMIN_SECRET_KEY || 'changeme'
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const VALID_TIERS = ['explorer', 'citizen', 'pro', 'enterprise']

export async function POST(req: Request) {
  if (req.headers.get('x-admin-key') !== ADMIN_KEY)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, tier } = await req.json()
  if (!id || !VALID_TIERS.includes(tier))
    return NextResponse.json({ error: 'Invalid params' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('citizens')
    .update({ tier })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, id, tier })
}
