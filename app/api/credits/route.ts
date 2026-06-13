/**
 * POST /api/credits
 * Called server-side after signup to award signup bonus + process referral.
 * Protected by service role — not callable from browser directly.
 */
import { NextResponse } from 'next/server'
import { awardCredits, processReferral } from '@/lib/credits'

const INTERNAL_KEY = process.env.INTERNAL_API_KEY || ''

export async function POST(req: Request) {
  // Lightweight internal auth
  if (req.headers.get('x-internal-key') !== INTERNAL_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { citizenId, referralCode } = await req.json()
  if (!citizenId) return NextResponse.json({ error: 'Missing citizenId' }, { status: 400 })

  try {
    // Always award signup bonus
    await awardCredits(citizenId, 'signup_bonus')

    // Process referral if code provided
    if (referralCode) {
      await processReferral(citizenId, referralCode)
    }

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
