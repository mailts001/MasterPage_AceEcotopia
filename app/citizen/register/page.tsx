'use client'

import { useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useLocale } from '@/hooks/useLocale'
import { strings, districtFeatures } from '@/lib/i18n'

// ── District config (locale-aware) ───────────────────────────────
type DistrictKey = 'propos' | 'aceeconomy' | 'nexustravel' | 'commerce'

const DISTRICT_THEME_KEYS: Record<DistrictKey, {
  nameKey: string; tagKey: string; benefitKey: string
  accent: string; glow: string; border: string; btn: string; icon: string
}> = {
  propos: {
    nameKey: 'dt_propos_name', tagKey: 'dt_propos_tag', benefitKey: 'dt_propos_benefit',
    icon: '🏙️', accent: 'text-blue-400', glow: 'bg-blue-500/10', border: 'border-blue-500/30', btn: 'bg-blue-500 hover:bg-blue-400',
  },
  aceeconomy: {
    nameKey: 'dt_finance_name', tagKey: 'dt_finance_tag', benefitKey: 'dt_finance_benefit',
    icon: '💹', accent: 'text-green-400', glow: 'bg-green-500/10', border: 'border-green-500/30', btn: 'bg-green-500 hover:bg-green-400',
  },
  nexustravel: {
    nameKey: 'dt_travel_name', tagKey: 'dt_travel_tag', benefitKey: 'dt_travel_benefit',
    icon: '✈️', accent: 'text-purple-400', glow: 'bg-purple-500/10', border: 'border-purple-500/30', btn: 'bg-purple-500 hover:bg-purple-400',
  },
  commerce: {
    nameKey: 'dt_commerce_name', tagKey: 'dt_commerce_tag', benefitKey: 'dt_commerce_benefit',
    icon: '🛒', accent: 'text-amber-400', glow: 'bg-amber-500/10', border: 'border-amber-500/30', btn: 'bg-amber-500 hover:bg-amber-400',
  },
}

const DEFAULT_THEME_KEYS = {
  nameKey: 'dt_default_name', tagKey: 'dt_default_tag', benefitKey: 'dt_default_benefit',
  icon: '🌐', accent: 'text-cyan-400', glow: 'bg-cyan-500/10', border: 'border-cyan-500/30', btn: 'bg-cyan-500 hover:bg-cyan-400',
}

function RegisterForm() {
  const { t, locale, setLocale } = useLocale()
  const searchParams = useSearchParams()
  const districtId = searchParams.get('district') ?? ''
  const themeKeys = DISTRICT_THEME_KEYS[districtId as DistrictKey] ?? DEFAULT_THEME_KEYS

  // pull locale-aware strings
  const themeName    = strings[themeKeys.nameKey as keyof typeof strings][locale]
  const themeTagline = strings[themeKeys.tagKey as keyof typeof strings][locale]
  const themeBenefit = strings[themeKeys.benefitKey as keyof typeof strings][locale]
  const featureKey   = (districtId in districtFeatures ? districtId : 'default') as keyof typeof districtFeatures
  const features     = districtFeatures[featureKey][locale]

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [name, setName]         = useState('')
  const [referral, setReferral] = useState('')
  const [loading, setLoading]   = useState(false)
  const [checking, setChecking] = useState(true)
  const [alreadyIn, setAlreadyIn] = useState(false)
  const [message, setMessage]   = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useState(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user) setAlreadyIn(true)
      setChecking(false)
    })
  })

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
      setMessage({ type: 'success', text: t('reg_success') })
    }
    setLoading(false)
  }

  if (checking) return (
    <div className="min-h-screen bg-[#0A0E1A] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
    </div>
  )

  if (alreadyIn) return (
    <div className="min-h-screen bg-[#0A0E1A] flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="text-5xl mb-4">{themeKeys.icon}</div>
        <h1 className="text-2xl font-bold text-white mb-2">{t('reg_already_title')}</h1>
        <p className="text-slate-400 text-sm mb-2">
          {t('reg_already_sub')} <strong className="text-white">{themeName}</strong>.
        </p>
        <p className="text-slate-500 text-xs mb-8">
          {t('reg_already_note')} {themeName} {t('reg_already_note2')}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/citizen/dashboard"
            className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-6 py-3 rounded-xl transition text-sm">
            {t('reg_go_dashboard')}
          </Link>
          <Link href="/"
            className="border border-white/10 hover:border-white/25 text-slate-400 hover:text-white px-6 py-3 rounded-xl transition text-sm">
            {t('reg_back_home')}
          </Link>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0A0E1A] flex items-center justify-center px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 ${themeKeys.glow} rounded-full blur-3xl`} />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo + lang toggle */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/" className="inline-block">
            <span className="text-2xl font-bold gradient-text">X68</span>
          </Link>
          <button
            onClick={() => setLocale(locale === 'en' ? 'zh' : 'en')}
            className="text-xs px-2.5 py-1 rounded-md border border-white/15 hover:border-cyan-500/50 text-slate-400 hover:text-cyan-400 transition font-mono"
          >
            {locale === 'en' ? '中文' : 'EN'}
          </button>
        </div>

        {/* District badge */}
        <div className={`flex items-center justify-center gap-2 mb-6 px-4 py-2 rounded-full border ${themeKeys.border} ${themeKeys.glow} w-fit mx-auto`}>
          <span className="text-xl">{themeKeys.icon}</span>
          <span className={`text-sm font-medium ${themeKeys.accent}`}>{themeName}</span>
          <span className="text-xs text-gray-500">· {themeTagline}</span>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
          <h1 className="text-xl font-semibold text-white mb-1">{t('reg_title')}</h1>
          <p className="text-sm text-gray-400 mb-6">{themeBenefit}</p>

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
              <label className="block text-sm text-gray-400 mb-1.5">{t('reg_label_name')}</label>
              <input type="text" required value={name} onChange={e => setName(e.target.value)}
                placeholder={t('reg_ph_name')}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-white/30 transition text-sm" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">{t('reg_label_email')}</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-white/30 transition text-sm" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">{t('reg_label_password')}</label>
              <input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)}
                placeholder={t('reg_ph_password')}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-white/30 transition text-sm" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">
                {t('reg_label_referral')} <span className="text-gray-600">{t('reg_optional')}</span>
              </label>
              <input type="text" value={referral} onChange={e => setReferral(e.target.value.toUpperCase())}
                placeholder={t('reg_ph_referral')} maxLength={8}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-white/30 transition text-sm font-mono" />
            </div>

            <button type="submit" disabled={loading}
              className={`w-full mt-2 ${themeKeys.btn} disabled:opacity-50 text-black font-semibold py-3 rounded-lg transition text-sm`}>
              {loading ? t('reg_btn_loading') : t('reg_btn_join')}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="text-xs text-gray-500 mb-3">{t('reg_free_includes')}</p>
            <div className="space-y-1.5">
              {features.map((f: string) => (
                <div key={f} className="text-xs text-gray-400">{f}</div>
              ))}
            </div>
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            {t('reg_signin_prompt')}{' '}
            <Link href="/citizen/login" className={`${themeKeys.accent} hover:opacity-80`}>{t('reg_signin_link')}</Link>
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
