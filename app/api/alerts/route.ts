/**
 * POST /api/alerts
 * Districts call this to send email alerts to subscribed citizens.
 * Protected by NEXUS_API_KEY — same key districts already have.
 *
 * Body: {
 *   district: 'propos' | 'aceeconomy' | 'nexustravel' | 'commerce'
 *   alertType: string        e.g. "Price Drop Alert"
 *   message: string          e.g. "SQ flight SIN→NRT dropped to $480"
 *   ctaUrl: string           deep link to the district
 *   ctaLabel: string         e.g. "View Deal"
 *   citizenIds?: string[]    optional — send to specific citizens only
 * }
 */
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendDistrictAlert } from '@/lib/email/send'

const NEXUS_KEY = process.env.NEXUS_API_KEY || ''

function adminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: Request) {
  if (req.headers.get('x-nexus-key') !== NEXUS_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { district, alertType, message, ctaUrl, ctaLabel, citizenIds } = await req.json()

  if (!district || !alertType || !message) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const db = adminDb()

  // Get citizens to notify — all citizens or specific ones
  let query = db
    .from('citizens')
    .select('id, display_name, stripe_customer_id')
    .neq('tier', 'explorer') // only paid citizens get district alerts

  // Join with auth.users to get emails — use service role
  const { data: citizens } = await query
  if (!citizens?.length) return NextResponse.json({ sent: 0 })

  // Get emails from auth
  const { data: { users } } = await db.auth.admin.listUsers()
  const emailMap = Object.fromEntries(users.map(u => [u.id, u.email]))

  // Filter to specific citizens if provided
  const targets = citizenIds
    ? citizens.filter(c => citizenIds.includes(c.id))
    : citizens

  // Send emails + log alerts
  let sent = 0
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://master-page-ace-ecotopia.vercel.app'

  await Promise.allSettled(
    targets.map(async (citizen) => {
      const email = emailMap[citizen.id]
      if (!email) return

      await sendDistrictAlert({
        to: email,
        citizenName: citizen.display_name ?? 'Citizen',
        district,
        alertType,
        message,
        ctaUrl: ctaUrl || siteUrl,
        ctaLabel: ctaLabel || 'View Alert',
      })

      // Log to alert_events
      await db.from('alert_events').insert({
        citizen_id: citizen.id,
        district,
        alert_type: alertType,
        payload: { message, ctaUrl, ctaLabel },
      })

      sent++
    })
  )

  return NextResponse.json({ sent, total: targets.length })
}
