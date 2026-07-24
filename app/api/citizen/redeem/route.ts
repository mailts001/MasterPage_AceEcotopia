import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const { code, citizen_id } = await req.json()
  if (!code || !citizen_id)
    return NextResponse.json({ error: 'Missing code or citizen_id' }, { status: 400 })

  const upper = String(code).toUpperCase().trim()

  // Fetch the code row
  const { data: row, error: fetchErr } = await supabaseAdmin
    .from('invite_codes')
    .select('*')
    .eq('code', upper)
    .single()

  if (fetchErr || !row)
    return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })
  if (row.uses_left <= 0)
    return NextResponse.json({ error: 'This code has already been fully used' }, { status: 410 })
  if (row.expires_at && new Date(row.expires_at) < new Date())
    return NextResponse.json({ error: 'This invite code has expired' }, { status: 410 })
  if (row.used_by?.includes(citizen_id))
    return NextResponse.json({ error: 'You have already used this code' }, { status: 409 })

  // Apply tier upgrade
  const { error: upgradeErr } = await supabaseAdmin
    .from('citizens')
    .update({ tier: row.tier })
    .eq('id', citizen_id)
  if (upgradeErr)
    return NextResponse.json({ error: upgradeErr.message }, { status: 500 })

  // Decrement uses and record who used it
  await supabaseAdmin
    .from('invite_codes')
    .update({
      uses_left: row.uses_left - 1,
      used_by: [...(row.used_by ?? []), citizen_id],
    })
    .eq('code', upper)

  return NextResponse.json({ ok: true, tier: row.tier })
}
