import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import CopyButton from '@/components/auth/CopyButton'

export default async function CitizenDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/citizen/login')

  const { data: citizen } = await supabase
    .from('citizens')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-[#0A0E1A] text-white">
      {/* Nav */}
      <nav className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold gradient-text">AceEcotopia</Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">{citizen?.display_name ?? user.email}</span>
          <form action="/api/auth/signout" method="post">
            <button className="text-sm text-gray-500 hover:text-white transition">Sign out</button>
          </form>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold">
            Welcome back, <span className="gradient-text">{citizen?.display_name ?? 'Citizen'}</span>
          </h1>
          <p className="text-gray-400 mt-1 text-sm">Your AceEcotopia command centre</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Nexus Credits', value: citizen?.nexus_credits ?? 0, color: 'text-yellow-400' },
            { label: 'Tier', value: citizen?.tier ?? 'explorer', color: 'text-cyan-400' },
            { label: 'Referral Code', value: citizen?.referral_code ?? '—', color: 'text-green-400' },
            { label: 'Member Since', value: citizen ? new Date(citizen.created_at).toLocaleDateString('en-SG', { month: 'short', year: 'numeric' }) : '—', color: 'text-gray-300' },
          ].map(s => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className={`text-xl font-bold font-mono ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Districts */}
        <h2 className="text-lg font-semibold mb-4">Your Districts</h2>
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {[
            { id: 'propos', name: 'PropOS', desc: 'Property intelligence & deal alerts', color: 'cyan', href: 'http://5.223.72.120:8502' },
            { id: 'aceeconomy', name: 'AceEconomy', desc: 'Market signals & trading alerts', color: 'green', href: '#' },
            { id: 'nexustravel', name: 'NexusTravel', desc: 'Flight & hotel deal alerts', color: 'purple', href: 'https://nexus-travel-seven.vercel.app' },
            { id: 'commerce', name: 'Commerce', desc: 'Arbitrage & ecommerce deals', color: 'amber', href: '#' },
          ].map(d => (
            <a
              key={d.id}
              href={d.href}
              target="_blank"
              rel="noopener noreferrer"
              className="district-card group block p-5 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-white">{d.name}</span>
                <span className="text-xs text-gray-500 group-hover:text-gray-300 transition">Visit →</span>
              </div>
              <p className="text-sm text-gray-400">{d.desc}</p>
            </a>
          ))}
        </div>

        {/* Referral CTA */}
        <div className="bg-gradient-to-r from-cyan-500/10 to-green-500/10 border border-cyan-500/20 rounded-xl p-6">
          <h3 className="font-semibold text-white mb-1">Earn More Credits</h3>
          <p className="text-sm text-gray-400 mb-4">
            Share your referral code and earn <span className="text-yellow-400 font-semibold">100 Nexus Credits</span> for every friend who joins.
          </p>
          <div className="flex items-center gap-3">
            <code className="bg-black/30 border border-white/10 px-4 py-2 rounded-lg text-cyan-400 font-mono text-sm tracking-widest">
              {citizen?.referral_code ?? '——'}
            </code>
            <CopyButton text={citizen?.referral_code ?? ''} />
          </div>
        </div>
      </div>
    </div>
  )
}
