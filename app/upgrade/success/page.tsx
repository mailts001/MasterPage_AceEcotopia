import { redirect } from 'next/navigation'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import Link from 'next/link'

export default async function UpgradeSuccess({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const { session_id } = await searchParams

  // Need a logged-in user
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/citizen/login')

  // If session_id provided, verify with Stripe and update tier directly
  // This is a reliable fallback in case the webhook was slow or misconfigured
  if (session_id) {
    try {
      const session = await stripe.checkout.sessions.retrieve(session_id)

      if (
        session.payment_status === 'paid' &&
        session.metadata?.citizen_id === user.id
      ) {
        const plan = session.metadata.plan as string
        const db = createSupabaseAdmin(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // Update citizen tier
        await db.from('citizens').update({ tier: plan }).eq('id', user.id)

        // Upsert subscription record
        await db.from('subscriptions').upsert({
          citizen_id: user.id,
          stripe_sub_id: session.subscription as string,
          plan,
          status: 'active',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'citizen_id' })

        // Award credits only if this session hasn't been credited already
        const { count } = await db
          .from('credits_ledger')
          .select('*', { count: 'exact', head: true })
          .eq('citizen_id', user.id)
          .eq('ref_id', session.id)

        if ((count ?? 0) === 0) {
          const creditAmount = plan === 'enterprise' ? 500 : 100

          // Get current credits, then add
          const { data: citizenRow } = await db
            .from('citizens')
            .select('nexus_credits')
            .eq('id', user.id)
            .single()

          await db.from('citizens')
            .update({ nexus_credits: (citizenRow?.nexus_credits ?? 0) + creditAmount })
            .eq('id', user.id)

          await db.from('credits_ledger').insert({
            citizen_id: user.id,
            delta: creditAmount,
            reason: 'subscription_upgrade',
            ref_id: session.id,
          })
        }
      }
    } catch {
      // Stripe verification failed — webhook will handle it or already did
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0E1A] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">🎉</div>
        <h1 className="text-3xl font-bold text-white mb-3">
          Welcome, <span className="gradient-text">Citizen</span>
        </h1>
        <p className="text-gray-400 mb-2">Your subscription is active.</p>
        <p className="text-gray-500 text-sm mb-8">
          All 4 districts unlocked · Telegram alerts enabled · 100 Nexus Credits added to your account.
        </p>
        <Link
          href="/citizen/dashboard"
          className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-8 py-3 rounded-xl transition inline-block"
        >
          Go to Dashboard →
        </Link>
      </div>
    </div>
  )
}
