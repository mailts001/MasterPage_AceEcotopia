/**
 * POST /api/stripe/webhook
 * Handles Stripe events: subscription created, updated, cancelled.
 * Add this URL in Stripe Dashboard → Webhooks.
 */
import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'

function adminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const db = adminDb()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.CheckoutSession
      const citizenId = session.metadata?.citizen_id
      const plan = session.metadata?.plan
      if (!citizenId || !plan) break

      // Upgrade citizen tier
      await db.from('citizens').update({ tier: plan }).eq('id', citizenId)

      // Upsert subscription record
      await db.from('subscriptions').upsert({
        citizen_id: citizenId,
        stripe_sub_id: session.subscription as string,
        plan,
        status: 'active',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'citizen_id' })

      // Award monthly credits
      const creditAmount = plan === 'enterprise' ? 500 : 100
      await db.from('credits_ledger').insert({
        citizen_id: citizenId,
        delta: creditAmount,
        reason: 'subscription_monthly',
        ref_id: session.subscription as string,
      })
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const citizenId = sub.metadata?.citizen_id

      if (citizenId) {
        await db.from('citizens').update({ tier: 'explorer' }).eq('id', citizenId)
        await db.from('subscriptions')
          .update({ status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('stripe_sub_id', sub.id)
      }
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const subId = typeof invoice.subscription === 'string' ? invoice.subscription : null
      if (subId) {
        await db.from('subscriptions')
          .update({ status: 'past_due', updated_at: new Date().toISOString() })
          .eq('stripe_sub_id', subId)
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
