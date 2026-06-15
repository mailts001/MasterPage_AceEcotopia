import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const SPEND_OPTIONS = {
  alert_slot: { cost: 100, description: '+1 alert slot/month, permanently' },
  api_boost:  { cost: 200, description: '+1,000 API calls/day for 30 days' },
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { action } = await req.json()
  const option = SPEND_OPTIONS[action as keyof typeof SPEND_OPTIONS]
  if (!option) return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  // Check balance
  const { data: citizen } = await supabase
    .from('citizens')
    .select('nexus_credits')
    .eq('id', user.id)
    .single()

  if (!citizen || (citizen.nexus_credits ?? 0) < option.cost) {
    return NextResponse.json({ error: 'Insufficient credits' }, { status: 402 })
  }

  // Deduct credits + log
  const { error: deductErr } = await supabase
    .from('citizens')
    .update({ nexus_credits: citizen.nexus_credits - option.cost })
    .eq('id', user.id)

  if (deductErr) return NextResponse.json({ error: deductErr.message }, { status: 500 })

  await supabase.from('credits_ledger').insert({
    citizen_id: user.id,
    delta: -option.cost,
    reason: `spend_${action}`,
  })

  return NextResponse.json({
    ok: true,
    spent: option.cost,
    remaining: citizen.nexus_credits - option.cost,
    unlocked: option.description,
  })
}
