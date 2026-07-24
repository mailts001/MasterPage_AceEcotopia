import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ tier: 'explorer' })

  const { data } = await supabase
    .from('citizens')
    .select('tier')
    .eq('id', user.id)
    .single()

  return NextResponse.json({ id: user.id, tier: data?.tier ?? 'explorer' })
}
