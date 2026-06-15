import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'

// Called on dashboard load — awards daily streak credits, returns current streak
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = adminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: citizen } = await db
    .from('citizens')
    .select('nexus_credits, login_streak, last_login_date, longest_streak')
    .eq('id', user.id)
    .single()

  if (!citizen) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const todaySG = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' }) // YYYY-MM-DD
  const lastLogin = citizen.last_login_date ?? ''

  // Already visited today
  if (lastLogin === todaySG) {
    return NextResponse.json({
      streak: citizen.login_streak ?? 0,
      credited: false,
      credits: citizen.nexus_credits ?? 0,
    })
  }

  // Calculate new streak
  const yesterdaySG = new Date(Date.now() - 86400000).toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' })
  const newStreak = lastLogin === yesterdaySG ? (citizen.login_streak ?? 0) + 1 : 1

  // Milestone bonus: +50 extra at 7 / 30 / 100 days
  const milestoneBonus = [7, 30, 100].includes(newStreak) ? 50 : 0
  const baseAward = 10
  const totalAward = baseAward + milestoneBonus
  const newCredits = (citizen.nexus_credits ?? 0) + totalAward
  const newLongest = Math.max(citizen.longest_streak ?? 0, newStreak)

  await db.from('citizens').update({
    nexus_credits: newCredits,
    login_streak: newStreak,
    last_login_date: todaySG,
    longest_streak: newLongest,
  }).eq('id', user.id)

  await db.from('credits_ledger').insert({
    citizen_id: user.id,
    delta: totalAward,
    reason: milestoneBonus > 0 ? `streak_${newStreak}_milestone` : 'daily_login',
  })

  return NextResponse.json({
    streak: newStreak,
    credited: true,
    awarded: totalAward,
    milestone: milestoneBonus > 0 ? `🎉 ${newStreak}-day streak bonus!` : null,
    credits: newCredits,
  })
}
