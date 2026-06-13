import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { awardCredits, processReferral } from '@/lib/credits'
import { sendWelcomeEmail } from '@/lib/email/send'
import Link from 'next/link'
import CopyButton from '@/components/auth/CopyButton'
import ApiKeyManager from '@/components/auth/ApiKeyManager'

const DISTRICTS = [
  {
    id: 'propos',
    name: 'PropOS',
    icon: '🏙️',
    tagline: 'Property Intelligence',
    desc: 'AI monitors SG property market. Get refinance alerts, valuation changes, deal signals.',
    href: 'http://5.223.72.120:8504',  // PropOS Streamlit via nginx proxy
    accent: 'border-blue-500/30 text-blue-400',
    what: ['Refinance opportunity alerts', 'Listing undervaluation signals', 'District price trend reports'],
  },
  {
    id: 'aceeconomy',
    name: 'Financial District',
    icon: '💹',
    tagline: 'Investment Intelligence',
    desc: 'AI scans US & HK stocks, ETFs, REITs. Momentum picks, squeeze setups, earnings alerts.',
    href: 'http://204.168.221.101:8501',  // Trading Streamlit dashboard
    accent: 'border-green-500/30 text-green-400',
    what: ['Stock momentum signals', 'Bollinger squeeze setups', 'Earnings surprise alerts'],
  },
  {
    id: 'nexustravel',
    name: 'NexusTravel',
    icon: '✈️',
    tagline: 'Travel Intelligence',
    desc: 'AI monitors your saved flight routes and hotels. Alerts you when prices drop.',
    href: 'https://nexus-travel-seven.vercel.app',
    accent: 'border-purple-500/30 text-purple-400',
    what: ['Flight price drop alerts', 'Hotel deal notifications', 'Route price history'],
  },
  {
    id: 'commerce',
    name: 'E-commerce',
    icon: '🛒',
    tagline: 'Arbitrage Intelligence',
    desc: 'Multi-AI agents find price gaps across Shopee, Lazada, Amazon. Net margin calculated.',
    href: 'http://204.168.221.101/',
    accent: 'border-amber-500/30 text-amber-400',
    what: ['Cross-platform arbitrage gaps', 'Demand & supply analysis', 'Net margin after fees & shipping'],
  },
]

const TIER_LIMITS: Record<string, { alerts: string; api: string; keys: number; districts: string }> = {
  explorer: { alerts: '3 alerts/month', api: '100 calls/day', keys: 1, districts: 'Read-only access' },
  citizen:  { alerts: 'Unlimited alerts', api: '10,000 calls/day', keys: 3, districts: 'Full access + Telegram' },
  enterprise: { alerts: 'Unlimited alerts', api: 'Unlimited', keys: 10, districts: 'White-label + custom districts' },
}

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

  const tier = citizen?.tier ?? 'explorer'
  const limits = TIER_LIMITS[tier] ?? TIER_LIMITS.explorer
  const isExplorer = tier === 'explorer'

  return (
    <div className="min-h-screen bg-[#0A0E1A] text-white">
      {/* Nav */}
      <nav className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold gradient-text">X68</Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">{citizen?.display_name ?? user.email}</span>
          <form action="/api/auth/signout" method="post">
            <button className="text-sm text-gray-500 hover:text-white transition">Sign out</button>
          </form>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">

        {/* Header + tier badge */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              Welcome back, <span className="gradient-text">{citizen?.display_name ?? 'Citizen'}</span>
            </h1>
            <p className="text-gray-500 mt-1 text-sm">Your X68 command centre</p>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold uppercase tracking-wide ${
            tier === 'citizen' ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-400' :
            tier === 'enterprise' ? 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400' :
            'border-white/10 bg-white/5 text-gray-400'
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {tier}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Nexus Credits', value: citizen?.nexus_credits ?? 0, color: 'text-yellow-400', tip: 'Earn by referring friends. Spend to unlock extra alert slots.' },
            { label: 'Alerts / month', value: limits.alerts, color: 'text-cyan-400', tip: 'How many district signals you receive.' },
            { label: 'API Calls / day', value: limits.api, color: 'text-green-400', tip: 'For developers building on top of X68 district data.' },
            { label: 'Member Since', value: citizen ? new Date(citizen.created_at).toLocaleDateString('en-SG', { month: 'short', year: 'numeric' }) : '—', color: 'text-gray-300', tip: '' },
          ].map(s => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className={`text-lg font-bold font-mono ${s.color} leading-tight`}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              {s.tip && <div className="text-xs text-gray-700 mt-1 leading-tight">{s.tip}</div>}
            </div>
          ))}
        </div>

        {/* Upgrade banner — explorer only */}
        {isExplorer && (
          <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-white text-sm mb-1">You&apos;re on Explorer (free)</p>
                <div className="space-y-0.5 text-xs text-gray-400">
                  <p>• 3 alerts/month across all districts</p>
                  <p>• 100 API calls/day</p>
                  <p>• Read-only district access</p>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs text-gray-500 mb-2">Citizen tier unlocks:</p>
                <div className="space-y-0.5 text-xs text-cyan-300 mb-3">
                  <p>✓ Unlimited alerts via Telegram</p>
                  <p>✓ 10,000 API calls/day</p>
                  <p>✓ Full write access to all 4 districts</p>
                  <p>✓ 100 bonus credits/month</p>
                </div>
                <a href="/upgrade"
                  className="inline-block bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-5 py-2 rounded-lg transition text-sm">
                  Upgrade $19/mo →
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Districts */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold">Your Districts</h2>
            <span className="text-xs text-gray-600">All citizens access all 4 districts</span>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {DISTRICTS.map(d => (
              <div key={d.id} className={`rounded-xl bg-white/5 border ${d.accent.split(' ')[0]} p-5 hover:bg-white/8 transition`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{d.icon}</span>
                    <div>
                      <div className="font-semibold text-white text-sm">{d.name}</div>
                      <div className={`text-xs ${d.accent.split(' ')[1]}`}>{d.tagline}</div>
                    </div>
                  </div>
                  <a href={d.href} target="_blank" rel="noopener noreferrer"
                    className={`text-xs ${d.accent.split(' ')[1]} hover:opacity-70 transition shrink-0`}>
                    Open →
                  </a>
                </div>
                <p className="text-xs text-gray-400 mb-3 leading-relaxed">{d.desc}</p>
                <div className="space-y-1">
                  {d.what.map(w => (
                    <div key={w} className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="w-1 h-1 rounded-full bg-current shrink-0" />
                      {w}
                    </div>
                  ))}
                </div>
                {isExplorer && (
                  <div className="mt-3 text-xs text-gray-600 border-t border-white/5 pt-2">
                    Explorer: view only · <a href="/upgrade" className="text-cyan-500 hover:underline">Upgrade for Telegram alerts</a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* API Keys */}
        <div>
          <div className="mb-3">
            <h2 className="text-base font-semibold mb-1">API Keys</h2>
            <p className="text-xs text-gray-500">
              API keys let you (or your apps) pull live district signals programmatically — stock picks, property alerts, travel deals, arbitrage opportunities — in JSON.
              {' '}<span className="text-gray-600">Your tier: {limits.keys} key{limits.keys > 1 ? 's' : ''} · {limits.api}</span>
            </p>
          </div>

          {/* Use cases */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            {[
              { icon: '📊', label: 'Pull stock signals into your own spreadsheet or trading app' },
              { icon: '🏠', label: 'Embed property alerts in your broker dashboard' },
              { icon: '🤖', label: 'Build a Telegram bot that re-routes X68 alerts' },
              { icon: '💱', label: 'Feed arbitrage gaps into your own commerce automation' },
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
        <div className="bg-gradient-to-r from-yellow-500/5 to-green-500/5 border border-yellow-500/20 rounded-xl p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h3 className="font-semibold text-white text-sm mb-1">Earn Nexus Credits</h3>
              <p className="text-xs text-gray-400 mb-3">
                Share your code — you earn <span className="text-yellow-400 font-semibold">100 credits</span> per friend who joins.
                Credits unlock extra alert slots beyond your tier limit.
              </p>
              <div className="text-xs text-gray-500 space-y-0.5">
                <p>100 credits = 1 bonus alert slot per month</p>
                <p>Refer 5 friends = 5 extra slots, permanently free</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <code className="bg-black/30 border border-white/10 px-4 py-2 rounded-lg text-cyan-400 font-mono text-sm tracking-widest">
                {citizen?.referral_code ?? '——'}
              </code>
              <CopyButton text={citizen?.referral_code ?? ''} />
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
