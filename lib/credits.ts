/**
 * Nexus Credits engine — server-side only (uses service role key)
 * All mutations go through the credits_ledger table.
 * citizen.nexus_credits is auto-updated by DB trigger.
 */
import { createClient } from '@supabase/supabase-js'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export type CreditReason =
  | 'signup_bonus'
  | 'referral_earn'       // referrer earns when friend signs up
  | 'referral_bonus'      // new citizen bonus for using a code
  | 'alert_action'        // citizen acted on an alert (future)
  | 'subscription_redeem' // spent credits for subscription month

const CREDIT_AMOUNTS: Record<CreditReason, number> = {
  signup_bonus:        50,
  referral_earn:       100,
  referral_bonus:      25,
  alert_action:        10,
  subscription_redeem: -190,  // ~1 month Citizen tier
}

export async function awardCredits(
  citizenId: string,
  reason: CreditReason,
  refId?: string
) {
  const db = adminClient()
  const delta = CREDIT_AMOUNTS[reason]
  const { error } = await db.from('credits_ledger').insert({
    citizen_id: citizenId,
    delta,
    reason,
    ref_id: refId ?? null,
  })
  if (error) throw error
  return delta
}

export async function processReferral(newCitizenId: string, referralCode: string) {
  const db = adminClient()

  // Find referrer by code
  const { data: referrer } = await db
    .from('citizens')
    .select('id')
    .eq('referral_code', referralCode.toUpperCase())
    .single()

  if (!referrer) return // invalid code — silent fail

  // Prevent self-referral
  if (referrer.id === newCitizenId) return

  // Award both parties
  await Promise.all([
    awardCredits(referrer.id, 'referral_earn', newCitizenId),
    awardCredits(newCitizenId, 'referral_bonus', referrer.id),
  ])

  // Record who referred whom
  await db
    .from('citizens')
    .update({ referred_by: referrer.id })
    .eq('id', newCitizenId)
}

export async function getCitizenCredits(citizenId: string) {
  const db = adminClient()
  const { data } = await db
    .from('citizens')
    .select('nexus_credits, tier')
    .eq('id', citizenId)
    .single()
  return data
}
