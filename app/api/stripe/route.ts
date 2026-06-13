/**
 * POST /api/stripe
 * Creates a Stripe Checkout session for plan upgrade.
 * Citizen must be logged in.
 */
import { NextResponse } from 'next/server'
import { stripe, PLANS } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://master-page-ace-ecotopia.vercel.app'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { plan } = await req.json() as { plan: 'citizen' | 'enterprise' }
  const planConfig = PLANS[plan]
  if (!planConfig) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })

  // Get or create Stripe customer
  const { data: citizen } = await supabase
    .from('citizens')
    .select('stripe_customer_id, display_name')
    .eq('id', user.id)
    .single()

  let customerId = citizen?.stripe_customer_id as string | undefined

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email!,
      name: citizen?.display_name ?? undefined,
      metadata: { x68_citizen_id: user.id },
    })
    customerId = customer.id
    // Save customer ID
    await supabase
      .from('citizens')
      .update({ stripe_customer_id: customerId })
      .eq('id', user.id)
  }

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{
      price_data: {
        currency: planConfig.currency,
        product_data: {
          name: `X68 ${planConfig.name}`,
          description: planConfig.description,
        },
        unit_amount: planConfig.price,
        recurring: { interval: planConfig.interval },
      },
      quantity: 1,
    }],
    metadata: { citizen_id: user.id, plan },
    success_url: `${SITE_URL}/upgrade/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${SITE_URL}/citizen/dashboard`,
    allow_promotion_codes: true,
  })

  return NextResponse.json({ url: session.url })
}
