import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'

function randomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

// GET — generate (or return existing) a link code for the logged-in citizen
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = adminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Check if citizen already has telegram linked
  const { data: citizen } = await db
    .from('citizens')
    .select('telegram_chat_id, display_name')
    .eq('id', user.id)
    .single()

  if (citizen?.telegram_chat_id) {
    return NextResponse.json({ already_linked: true, telegram_chat_id: citizen.telegram_chat_id })
  }

  // Expire any old unused codes for this citizen
  await db.from('telegram_link_codes')
    .update({ used: true })
    .eq('citizen_id', user.id)
    .eq('used', false)

  // Generate new code
  const code = randomCode()
  const { error } = await db.from('telegram_link_codes').insert({
    code,
    citizen_id: user.id,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    code,
    expires_in_minutes: 15,
    bot_username: 'AceIBKRTradingBot',  // your bot's @username
    instruction: `Send /linkx68 ${code} to the bot`,
  })
}

// DELETE — unlink telegram
export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = adminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  await db.from('citizens').update({ telegram_chat_id: null }).eq('id', user.id)
  return NextResponse.json({ ok: true })
}
