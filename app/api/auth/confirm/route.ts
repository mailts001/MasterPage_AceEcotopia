/**
 * GET /api/auth/confirm?token_hash=...&type=email&referral=CODE
 * Supabase email confirmation webhook alternative.
 * Set this as the confirmation redirect in Supabase:
 *   https://master-page-ace-ecotopia.vercel.app/api/auth/confirm
 *
 * Flow: confirm email → award credits → redirect to dashboard
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as 'email' | 'magiclink' | null
  const referralCode = searchParams.get('referral') ?? ''
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://master-page-ace-ecotopia.vercel.app'

  if (!tokenHash || !type) {
    return NextResponse.redirect(`${siteUrl}/citizen/login?error=invalid_link`)
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })

  if (error || !data.user) {
    return NextResponse.redirect(`${siteUrl}/citizen/login?error=expired`)
  }

  // Award signup credits (fire and forget — don't block redirect)
  const internalKey = process.env.INTERNAL_API_KEY || ''
  fetch(`${siteUrl}/api/credits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-internal-key': internalKey },
    body: JSON.stringify({ citizenId: data.user.id, referralCode }),
  }).catch(() => {}) // silent — credits can retry

  return NextResponse.redirect(`${siteUrl}/citizen/dashboard`)
}
