'use client'

import { useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

const DISTRICT_THEMES: Record<string, {
  name: string; icon: string; tagline: string; benefit: string
  accent: string; glow: string; border: string; btn: string
}> = {
  propos: {
    name: 'PropOS District',
    icon: '🏙️',
    tagline: 'Property Intelligence',
    benefit: 'Get refinance alerts & property deal signals worth $300–800/month',
    accent: 'text-blue-400',
    glow: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    btn: 'bg-blue-500 hover:bg-blue-400',
  },
  aceeconomy: {
    name: 'AceEconomy District',
    icon: '💹',
    tagline: 'Investment Intelligence',
    benefit: 'Get stock momentum signals, earnings alerts & REIT tracking',
    accent: 'text-green-400',
    glow: 'bg-green-500/10',
    border: 'border-green-500/30',
    btn: 'bg-green-500 hover:bg-green-400',
  },
  nexustravel: {
    name: 'NexusTravel District',
    icon: '✈️',
    tagline: 'Travel Intelligence',
    benefit: 'Get flight price drop alerts & hotel deals — save $100–400 per trip',
    accent: 'text-purple-400',
    glow: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    btn: 'bg-purple-500 hover:bg-purple-400',
  },
  commerce: {
    name: 'Commerce District',
    icon: '🛒',
    tagline: 'Arbitrage Intelligence',
    benefit: 'Get price gap signals across Shopee, Lazada & Amazon',
    accent: 'text-amber-400',
    glow: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    btn: 'bg-amber-500 hover:bg-amber-400',
  },
}

const DEFAULT_THEME = {
  name: 'AceEcotopia',
  icon: '🌐',
  tagline: 'AI Economic Ecosystem',
  benefit: 'Access all 4 districts — property, stocks, travel & commerce AI agents',
  accent: 'text-cyan-400',
  glow: 'bg-cyan-500/10',
  border: 'border-cyan-500/30',
  btn: 'bg-cyan-500 hover:bg-cyan-400',
}

function RegisterForm() {
  const searchParams = useSearchParams()
  const districtId = searchParams.get('district') ?? ''
  const theme = DISTRICT_THEMES[districtId] ?? DEFAULT_THEME

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [referral, setReferral] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: name, referred_by_code: referral || null },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || location.origin}/citizen/dashboard`,
      },
    })
    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({
        type: 'success',
        text: "Check your email to confirm your account. You'll receive 50 Nexus Credits on first login!",
      })
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#0A0E1A] flex items-center justify-center px-4">
      {/* Background glow — district colour */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 ${theme.glow} rounded-full blur-3xl`} />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-block">
            <span className="text-2xl font-bold gradient-text">AceEcotopia</span>
          </Link>
        </div>

        {/* District badge */}
        <div className={`flex items-center justify-center gap-2 mb-6 px-4 py-2 rounded-full border ${theme.border} ${theme.glow} w-fit mx-auto`}>
          <span className="text-xl">{theme.icon}</span>
          <span className={`text-sm font-medium ${theme.accent}`}>{theme.name}</span>
          <span className="text-xs text-gray-500">· {theme.tagline}</span>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
          <h1 className="text-xl font-semibold text-white mb-1">Become a Citizen</h1>
          <p className="text-sm text-gray-400 mb-6">{theme.benefit}</p>

          {message && (
            <div className={`mb-5 p-4 rounded-lg text-sm ${
              message.type === 'success'
                ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                : 'bg-red-500/10 border border-red-500/30 text-red-400'
            }`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Display Name</label>
              <input type="text" required value={name} onChange={e => setName(e.target.value)}
                placeholder="How should we call you?"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-white/30 transition text-sm" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-white/30 transition text-sm" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Password</label>
              <input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-white/30 transition text-sm" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">
                Referral Code <span className="text-gray-600">(optional)</span>
              </label>
              <input type="text" value={referral} onChange={e => setReferral(e.target.value.toUpperCase())}
                placeholder="e.g. AB12CD34" maxLength={8}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-white/30 transition text-sm font-mono" />
            </div>

            <button type="submit" disabled={loading}
              className={`w-full mt-2 ${theme.btn} disabled:opacity-50 text-black font-semibold py-3 rounded-lg transition text-sm`}>
              {loading ? 'Creating account…' : 'Join as a Citizen — Free'}
            </button>
          </form>

          {/* What you get */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="text-xs text-gray-500 mb-3">Free forever includes:</p>
            <div className="space-y-1.5">
              {['🏠 Property deal alerts', '📈 Market signals', '✈️ Travel deals', '💰 50 Nexus Credits on signup', '🔗 Earn 100 credits per referral'].map(b => (
                <div key={b} className="text-xs text-gray-400">{b}</div>
              ))}
            </div>
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already a citizen?{' '}
            <Link href="/citizen/login" className={`${theme.accent} hover:opacity-80`}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  )
}
