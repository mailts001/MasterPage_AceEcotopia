import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { awardCredits, processReferral } from '@/lib/credits'
import { sendWelcomeEmail } from '@/lib/email/send'
import Link from 'next/link'
import ApiKeyManager from '@/components/auth/ApiKeyManager'
import SignOutButton from '@/components/auth/SignOutButton'
import WatchlistPanel from '@/components/dashboard/WatchlistPanel'
import CreditsSpend from '@/components/dashboard/CreditsSpend'
import ReferralPanel from '@/components/dashboard/ReferralPanel'
import TelegramLink from '@/components/dashboard/TelegramLink'
import StreakBanner from '@/components/dashboard/StreakBanner'

// Districts — Financial links to internal signals page (not trading bot)
// E-commerce gated to Citizen tier
const DISTRICTS = [
  {
    id: 'propos',
    name: 'PropOS',
    icon: '🏙️',
    tagline: 'Property Intelligence',
    desc: 'AI monitors SG property market — refinance alerts, valuation changes, district trends.',
    href: 'http://5.223.72.120:8504',
    internal: false,
    citizenOnly: false,
    accent: 'border-blue-500/30',
    accentText: 'text-blue-400',
    what: ['Refinance opportunity alerts', 'Listing undervaluation signals', 'District price trend reports'],
  },
  {
    id: 'aceeconomy',
    name: 'Financial District',
    icon: '💹',
    tagline: 'Investment Intelligence',
    desc: 'AI scans US & HK stocks, ETFs, REITs. Signals only — execution is always yours.',
    href: '/citizen/dashboard/financial',
    internal: true,
    citizenOnly: false,
    accent: 'border-green-500/30',
    accentText: 'text-green-400',
    what: ['Momentum scanner picks', 'Bollinger squeeze setups', 'Earnings surprise alerts'],
  },
  {
    id: 'nexustravel',
    name: 'NexusTravel',
    icon: '✈️',
    tagline: 'Travel Intelligence',
    desc: 'AI monitors your saved routes and hotels. Alerts when prices drop below your threshold.',
    href: 'https://nexus-travel-seven.vercel.app',
    internal: false,
    citizenOnly: false,
    accent: 'border-purple-500/30',
    accentText: 'text-purple-400',
    what: ['Flight price drop alerts', 'Hotel deal notifications', 'Route price history'],
  },
  {
    id: 'commerce',
    name: 'E-commerce',
    icon: '🛒',
    tagline: 'Arbitrage Intelligence',
    desc: 'Multi-AI agents surface price gaps across Shopee, Lazada, Amazon with net margin calculated.',
    href: '/citizen/dashboard/commerce',
    internal: true,
    citizenOnly: true,   // ← Citizen tier required
    accent: 'border-amber-500/30',
    accentText: 'text-amber-400',
    what: ['Cross-platform arbitrage gaps', 'Demand & supply gap analysis', 'Net margin after fees & shipping'],
  },
]

export default async function CitizenDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/citizen/login')

  const { data: citizen } = await supabase
    .from('citizens')
    .select('*')
    .eq('id', user.id)
    .single()

  if (citizen && citizen.nexus_credits === 0) {
    const { count } = await supabase
      .from('credits_ledger')
      .select('*', { count: 'exact', head: true })
      .eq('citizen_id', user.id)
    if ((count ?? 0) === 0) {
      await awardCredits(user.id, 'signup_bonus').catch(() => {})
      sendWelcomeEmail({
        to: user.email!,
        citizenName: citizen.display_name ?? 'Citizen',
        referralCode: citizen.referral_code ?? '',
      }).catch(() => {})
      const referralCode = user.user_metadata?.referred_by_code
      if (referralCode) await processReferral(user.id, referralCode).catch(() => {})
      const { data: refreshed } = await supabase.from('citizens').select('*').eq('id', user.id).single()
      if (refreshed) Object.assign(citizen, refreshed)
    }
  }

  // Load watchlist
  const { data: watchlist } = await supabase
    .from('saved_assets')
    .select('*')
    .eq('citizen_id', user.id)
    .order('created_at', { ascending: false })

  const tier = citizen?.tier ?? 'explorer'
  const isExplorer = tier === 'explorer'
  const isPaid = !isExplorer
  const alertLimit = isPaid ? '∞' : '3'
  const credits = citizen?.nexus_credits ?? 0
  const telegramLinked = !!(citizen as Record<string, unknown>)?.telegram_chat_id

  return (
    <div className="min-h-screen bg-[#0A0E1A] text-white">
      <nav className="border-b border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 bg-[#0A0E1A]/95 backdrop-blur z-10">
        <Link href="/" className="text-lg font-bold gradient-text">X68</Link>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-600 hidden sm:block">{user.email}</span>
          <span className={`text-xs px-2 py-1 rounded-full border font-semibold uppercase tracking-wide ${
            tier === 'citizen' ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-400' :
            tier === 'enterprise' ? 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400' :
            'border-white/10 bg-white/5 text-gray-400'
          }`}>{tier}</span>
          <SignOutButton />
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-10">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">
            Welcome back, <span className="gradient-text">{citizen?.display_name ?? 'Citizen'}</span>
          </h1>
          <p className="text-gray-500 mt-1 text-sm">Your X68 command centre</p>
        </div>

        {/* Stats row — 5 cols on md, 2 on mobile */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Nexus Credits', value: credits, color: 'text-yellow-400', sub: '+10/day login' },
            { label: 'Alerts / month', value: alertLimit, color: 'text-cyan-400', sub: isPaid ? 'unlimited · all districts' : '3 free · upgrade' },
            { label: 'Watchlist Items', value: watchlist?.length ?? 0, color: 'text-green-400', sub: 'across districts' },
            { label: 'Member Since', value: citizen ? new Date(citizen.created_at).toLocaleDateString('en-SG', { month: 'short', year: 'numeric' }) : '—', color: 'text-gray-300', sub: '' },
          ].map(s => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className={`text-xl font-bold font-mono ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-400 mt-1">{s.label}</div>
              <div className="text-xs text-gray-600 mt-0.5">{s.sub}</div>
            </div>
          ))}
          {/* Streak chip — client component, fires streak API on mount */}
          <StreakBanner initialCredits={credits} />
        </div>

        {/* Explorer upgrade banner */}
        {isExplorer && (
          <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-white text-sm mb-2">Explorer Plan — 3 alerts/month</p>
                <div className="grid grid-cols-2 gap-x-8 gap-y-0.5 text-xs text-gray-400">
                  <p>• Unlimited alerts via Telegram</p>
                  <p>• Full e-commerce arbitrage access</p>
                  <p>• 10,000 API calls/day (3 keys)</p>
                  <p>• 100 bonus credits every month</p>
                </div>
              </div>
              <a href="/upgrade"
                className="shrink-0 bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-5 py-2.5 rounded-lg transition text-sm whitespace-nowrap">
                Upgrade $19/mo →
              </a>
            </div>
          </div>
        )}

        {/* Districts */}
        <div>
          <h2 className="text-base font-semibold mb-4">Your Districts</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {DISTRICTS.map(d => {
              const locked = d.citizenOnly && isExplorer
              const cardHref = locked ? '/upgrade' : d.href
              const isInternal = !locked && d.internal
              return (
                <a
                  key={d.id}
                  href={cardHref}
                  target={isInternal ? undefined : '_blank'}
                  rel={isInternal ? undefined : 'noopener noreferrer'}
                  className={`block rounded-xl bg-white/5 border ${d.accent} p-5 transition cursor-pointer ${locked ? 'opacity-75 hover:opacity-90' : 'hover:bg-white/8'}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{d.icon}</span>
                      <div>
                        <div className="font-semibold text-white text-sm">{d.name}</div>
                        <div className={`text-xs ${d.accentText}`}>{d.tagline}</div>
                      </div>
                    </div>
                    {locked ? (
                      <span className="text-xs bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-2 py-1 rounded-lg shrink-0">
                        Citizen only →
                      </span>
                    ) : (
                      <span className={`text-xs ${d.accentText} shrink-0`}>
                        Open →
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mb-3 leading-relaxed">{d.desc}</p>
                  <div className="space-y-1">
                    {d.what.map(w => (
                      <div key={w} className="flex items-center gap-2 text-xs text-gray-600">
                        <span className={`w-1 h-1 rounded-full ${d.accentText.replace('text-', 'bg-')} shrink-0`} />
                        {w}
                      </div>
                    ))}
                  </div>
                  {locked && (
                    <p className="mt-3 text-xs text-amber-400/70 border-t border-white/5 pt-2">
                      🔒 Arbitrage signals require Citizen tier — direct commercial value
                    </p>
                  )}
                </a>
              )
            })}
          </div>
        </div>

        {/* Telegram connection */}
        <TelegramLink initialLinked={telegramLinked} />

        {/* Watchlist */}
        <WatchlistPanel initialItems={watchlist ?? []} />

        {/* Credits */}
        <CreditsSpend credits={credits} />

        {/* API Keys */}
        <div>
          <h2 className="text-base font-semibold mb-1">API Keys</h2>
          <p className="text-xs text-gray-500 mb-4">
            Pull live district signals into your own apps — stock picks, property alerts, arbitrage gaps — all in JSON.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            {[
              { icon: '📊', label: 'Feed signals into your spreadsheet or trading app' },
              { icon: '🏠', label: 'Embed property alerts in your broker dashboard' },
              { icon: '🤖', label: 'Build a Telegram bot that re-routes X68 alerts' },
              { icon: '💱', label: 'Pipe arbitrage gaps into commerce automation' },
            ].map(u => (
              <div key={u.icon} className="bg-white/3 border border-white/5 rounded-lg p-3">
                <div className="text-base mb-1">{u.icon}</div>
                <div className="text-xs text-gray-500 leading-snug">{u.label}</div>
              </div>
            ))}
          </div>
          <ApiKeyManager />
        </div>

        {/* Referral */}
        <ReferralPanel
          referralCode={citizen?.referral_code ?? ''}
          citizenName={citizen?.display_name ?? 'A fellow citizen'}
        />

      </div>
    </div>
  )
}
