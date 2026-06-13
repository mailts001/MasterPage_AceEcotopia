import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

const ADMIN_KEY = process.env.ADMIN_SECRET_KEY || ''

export async function GET(req: Request) {
  const key = req.headers.get('x-admin-key')
  if (!key || key !== ADMIN_KEY) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = adminDb()
  const { data, error } = await db
    .from('subscriptions')
    .select('id, citizen_id, status, plan_name, current_period_end')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
