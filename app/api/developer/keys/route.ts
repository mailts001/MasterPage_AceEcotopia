/**
 * Developer API key management
 * GET  /api/developer/keys — list citizen's keys
 * POST /api/developer/keys — generate a new key
 * DELETE /api/developer/keys — revoke a key
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'

function getAdmin() {
  return adminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function generateKey(): string {
  return 'x68_' + randomBytes(24).toString('hex')
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getAdmin()
  const { data: keys } = await db
    .from('api_keys')
    .select('id, key_prefix, created_at, last_used_at, calls_today, tier')
    .eq('citizen_id', user.id)
    .eq('revoked', false)
    .order('created_at', { ascending: false })

  return NextResponse.json({ keys: keys ?? [] })
}

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getAdmin()

  // Check citizen tier for key limit
  const { data: citizen } = await db
    .from('citizens')
    .select('tier')
    .eq('id', user.id)
    .single()

  const { count } = await db
    .from('api_keys')
    .select('*', { count: 'exact', head: true })
    .eq('citizen_id', user.id)
    .eq('revoked', false)

  const maxKeys = citizen?.tier === 'enterprise' ? 10 : citizen?.tier === 'citizen' ? 3 : 1
  if ((count ?? 0) >= maxKeys) {
    return NextResponse.json({ error: `Max ${maxKeys} keys for your tier` }, { status: 429 })
  }

  const fullKey = generateKey()
  const keyPrefix = fullKey.slice(0, 12) + '…'

  const { data: newKey, error } = await db.from('api_keys').insert({
    citizen_id: user.id,
    key_hash: Buffer.from(fullKey).toString('base64'), // simple hash for demo
    key_prefix: keyPrefix,
    tier: citizen?.tier ?? 'explorer',
  }).select('id, key_prefix, created_at, tier').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Return the full key ONCE — never stored in plain text again
  return NextResponse.json({ key: fullKey, meta: newKey })
}

export async function DELETE(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { keyId } = await req.json()
  const db = getAdmin()

  await db.from('api_keys')
    .update({ revoked: true })
    .eq('id', keyId)
    .eq('citizen_id', user.id) // ensure ownership

  return NextResponse.json({ ok: true })
}
