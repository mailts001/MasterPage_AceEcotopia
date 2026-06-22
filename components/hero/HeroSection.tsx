'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useLocale } from '@/hooks/useLocale'

export default function HeroSection() {
  const { t, locale, setLocale } = useLocale()

  const scrollTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const [stats, setStats] = useState([
    { id: 'props',    value: '0' },
    { id: 'signals',  value: '0' },
    { id: 'citizens', value: '0' },
    { id: 'alerts',   value: '0' },
  ])

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/nexus/aggregate')
        if (res.ok) {
          const data = await res.json()
          setStats([
            { id: 'props',    value: data.properties?.toString() || '0' },
            { id: 'signals',  value: data.signals?.toString()    || '0' },
            { id: 'citizens', value: data.citizens?.toString()   || '0' },
            { id: 'alerts',   value: data.alerts?.toString()     || '0' },
          ])
        }
      } catch { /* keep defaults */ }
    }
    fetchStats()
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [])

  const statLabels = ['stat_properties', 'stat_signals', 'stat_citizens', 'stat_alerts'] as const

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-4 py-20 overflow-hidden">

      {/* Top nav */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4 z-20">
        <span className="text-sm font-bold gradient-text">X68</span>

        <div className="flex items-center gap-1 text-xs text-gray-500">
          <button onClick={() => scrollTo('guide')}   className="px-3 py-1.5 hover:text-white transition rounded-lg hover:bg-white/5">{t('nav_help')}</button>
          <button onClick={() => scrollTo('city')}    className="px-3 py-1.5 hover:text-white transition rounded-lg hover:bg-white/5">{t('nav_city')}</button>
          <button onClick={() => scrollTo('pricing')} className="px-3 py-1.5 hover:text-white transition rounded-lg hover:bg-white/5">{t('nav_pricing')}</button>
          <Link href="/humans"  className="px-3 py-1.5 hover:text-white transition rounded-lg hover:bg-white/5">{t('nav_humans')}</Link>

          <span className="w-px h-4 bg-white/10 mx-1" />

          {/* Language toggle */}
          <button
            onClick={() => setLocale(locale === 'en' ? 'zh' : 'en')}
            className="px-2.5 py-1 rounded-md border border-white/15 hover:border-cyan-500/50 text-slate-400 hover:text-cyan-400 transition font-mono text-[11px] tracking-wide"
            title="Switch language / 切换语言"
          >
            {locale === 'en' ? '中文' : 'EN'}
          </button>

          <span className="w-px h-4 bg-white/10 mx-1" />

          <Link href="/citizen/login"    className="px-3 py-1.5 hover:text-white transition">{t('nav_signin')}</Link>
          <Link href="/citizen/register" className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition ml-1">{t('nav_join')}</Link>
        </div>
      </div>

      {/* Background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,212,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />

      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 text-center max-w-5xl mx-auto">

        {/* Live indicator */}
        <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-4 py-2 mb-8">
          <span className="w-2 h-2 rounded-full bg-green-400 pulse-dot" />
          <span className="text-sm text-cyan-400 font-medium">{t('hero_badge')}</span>
        </div>

        {/* Main headline */}
        <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight tracking-tight">
          {t('hero_h1a')}
          <span className="block gradient-text">{t('hero_h1b')}</span>
        </h1>

        <p className="text-xl md:text-2xl text-slate-400 mb-6 max-w-3xl mx-auto leading-relaxed">
          {t('hero_sub')}
        </p>

        {/* Value hook pills */}
        <div className="flex flex-wrap justify-center gap-3 mb-10 max-w-2xl mx-auto">
          {(['pill_property','pill_stocks','pill_travel','pill_commerce','pill_wellness'] as const).map(k => (
            <span key={k} className="text-xs text-gray-400 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
              {t(k)}
            </span>
          ))}
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <Link href="/citizen/register"
            className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl hover:opacity-90 transition-all hover:scale-105 text-lg">
            {t('hero_cta1')}
          </Link>
          <button
            onClick={() => scrollTo('districts')}
            className="px-8 py-4 border border-slate-600 text-slate-300 font-semibold rounded-xl hover:border-cyan-500 hover:text-cyan-400 transition-all text-lg">
            {t('hero_cta2')}
          </button>
        </div>

        {/* Live stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
          {stats.map((stat, i) => (
            <div key={stat.id} className="district-card rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-cyan-400 stat-counter">{stat.value}</div>
              <div className="text-xs text-slate-500 mt-1">{t(statLabels[i])}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </section>
  )
}
