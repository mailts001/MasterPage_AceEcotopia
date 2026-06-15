import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VPS = process.env.ACEECONOMY_URL || 'http://204.168.221.101:8505'
const KEY = process.env.NEXUS_API_KEY  || 'x68-nexus-internal-2024'

export async function GET() {
  // Auth check — commerce is citizen-only
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: citizen } = await supabase
    .from('citizens')
    .select('tier')
    .eq('id', user.id)
    .single()

  if (!citizen || citizen.tier === 'explorer') {
    return NextResponse.json({ error: 'Citizen tier required' }, { status: 403 })
  }

  try {
    const res = await fetch(`${VPS}/api/nexus/commerce`, {
      headers: { 'x-nexus-key': KEY },
      next: { revalidate: 120 },
    })
    if (!res.ok) throw new Error(`upstream ${res.status}`)
    const data = await res.json()
    return NextResponse.json({ opportunities: data })
  } catch (e) {
    return NextResponse.json({ opportunities: [], error: String(e) })
  }
}
