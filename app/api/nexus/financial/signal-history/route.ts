import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VPS = process.env.ACEECONOMY_URL || 'http://204.168.221.101:8505'
const KEY = process.env.NEXUS_API_KEY  || 'x68-nexus-internal-2024'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const res = await fetch(`${VPS}/api/nexus/signal-history?days=30`, {
      headers: { 'x-nexus-key': KEY },
      next: { revalidate: 300 },
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ rows: [], count: 0, error: String(e) })
  }
}
