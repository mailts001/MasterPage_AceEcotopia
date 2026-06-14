'use client'

/**
 * DistrictShowcase
 *
 * Pinned scroll section — each scroll segment (100vh) activates one district.
 * The matching video plays and the info panel crossfades to show correct details.
 *
 * Total scroll travel = 4 districts × 100vh = 400vh (pinned).
 *
 * Asset filenames expected in /public/districts/:
 *   propos.mp4          PropOS
 *   financial.mp4       Financial District
 *   nexustravel.mp4     NexusTravel
 *   commerce.mp4        E-commerce
 *
 * Poster images (first frame JPG, keep under 80KB each):
 *   propos-poster.jpg
 *   financial-poster.jpg
 *   nexustravel-poster.jpg   ← reuse nexustravel-hero-poster.jpg → rename or alias
 *   commerce-poster.jpg
 */

import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Link from 'next/link'

gsap.registerPlugin(ScrollTrigger)

const DISTRICTS = [
  {
    id:       'propos',
    name:     'PropOS District',
    tagline:  'Property Intelligence',
    icon:     '🏙️',
    accent:   '#3B82F6',   // blue
    accentCls:'text-blue-400',
    borderCls:'border-blue-500/40',
    bgCls:    'from-blue-500/10 to-cyan-500/5',
    video:    '/districts/propos.mp4',
    poster:   '/districts/propos-poster.jpg',
    href:     'http://5.223.72.120:8504',
    joinHref: '/citizen/register?district=propos',
    externalLabel: 'Explore PropOS →',
    desc:     'AI monitors Singapore property 24/7. Get refinance alerts, valuation changes and sell signals before your neighbours.',
    features: [
      '🏠  Refinance opportunity alerts',
      '📊  Real-time valuation tracking',
      '📍  District price trend reports',
      '🔔  Sell-signal notifications',
      '💡  AI-scored deal ranking',
    ],
    stat: { value: '2.4k', label: 'Properties monitored' },
  },
  {
    id:       'financial',
    name:     'Financial District',
    tagline:  'Investment Intelligence',
    icon:     '💹',
    accent:   '#22C55E',   // green
    accentCls:'text-green-400',
    borderCls:'border-green-500/40',
    bgCls:    'from-green-500/10 to-emerald-500/5',
    video:    '/districts/financial.mp4',
    poster:   '/districts/financial-poster.jpg',
    href:     '/citizen/dashboard/financial',
    joinHref: '/citizen/register?district=aceeconomy',
    externalLabel: 'View signals →',
    desc:     'AI scans US & HK stocks, ETFs and REITs. Momentum picks, squeeze setups and earnings alerts — signals only, execution always yours.',
    features: [
      '📈  Momentum scanner (RSI + MACD)',
      '🔥  Bollinger squeeze setups',
      '📅  Earnings surprise alerts',
      '🏢  REIT & ETF tracking',
      '📲  Telegram instant delivery',
    ],
    stat: { value: '147', label: 'Signals sent today' },
  },
  {
    id:       'nexustravel',
    name:     'NexusTravel District',
    tagline:  'Travel Intelligence',
    icon:     '✈️',
    accent:   '#A855F7',   // purple
    accentCls:'text-purple-400',
    borderCls:'border-purple-500/40',
    bgCls:    'from-purple-500/10 to-pink-500/5',
    video:    '/districts/nexustravel.mp4',
    poster:   '/districts/nexustravel-poster.jpg',
    href:     'https://nexus-travel-seven.vercel.app',
    joinHref: '/citizen/register?district=nexustravel',
    externalLabel: 'Explore live →',
    desc:     'AI monitors your saved routes and hotels around the clock. Get instant alerts when fares drop below your threshold.',
    features: [
      '✈️  Flight price drop alerts',
      '🏨  Hotel deal notifications',
      '💱  Currency rate signals',
      '🔔  Telegram instant delivery',
      '📍  Your saved routes & routes',
    ],
    stat: { value: '$340', label: 'Avg saving per trip' },
  },
  {
    id:       'commerce',
    name:     'E-commerce District',
    tagline:  'Arbitrage Intelligence',
    icon:     '🛒',
    accent:   '#F59E0B',   // amber
    accentCls:'text-amber-400',
    borderCls:'border-amber-500/40',
    bgCls:    'from-amber-500/10 to-orange-500/5',
    video:    '/districts/commerce.mp4',
    poster:   '/districts/commerce-poster.jpg',
    href:     'http://204.168.221.101/',
    joinHref: '/citizen/register?district=commerce',
    externalLabel: 'Explore Commerce OS →',
    desc:     'Multi-AI agents surface price gaps across Shopee, Lazada and Amazon. Net margin calculated after fees and shipping.',
    features: [
      '🔍  Cross-platform arbitrage gaps',
      '📦  Demand & supply gap analysis',
      '💰  Net margin after all fees',
      '🤖  Multi-agent price scanning',
      '🔒  Citizen tier — direct value',
    ],
    stat: { value: '74%', label: 'Best margin found today' },
  },
]

export default function DistrictShowcase() {
  const wrapRef      = useRef<HTMLDivElement>(null)   // outer scroll trigger wrapper
  const pinRef       = useRef<HTMLDivElement>(null)   // pinned sticky panel
  const videoRefs    = useRef<(HTMLVideoElement | null)[]>([])
  const [active, setActive] = useState(0)
  const [prev,   setPrev]   = useState<number | null>(null)
  const prevRef  = useRef(0)

  useEffect(() => {
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: wrapRef.current,
        start:   'top top',
        end:     `+=${(DISTRICTS.length - 1) * 100}%`,
        pin:     pinRef.current,
        scrub:   false,
        snap: {
          snapTo:   1 / (DISTRICTS.length - 1),
          duration: { min: 0.3, max: 0.6 },
          ease:     'power2.inOut',
        },
        onUpdate(self) {
          const idx = Math.round(self.progress * (DISTRICTS.length - 1))
          if (idx !== prevRef.current) {
            setPrev(prevRef.current)
            prevRef.current = idx
            setActive(idx)
            // Play the new video, pause old ones
            videoRefs.current.forEach((v, i) => {
              if (!v) return
              if (i === idx) { v.currentTime = 0; v.play().catch(() => {}) }
              else v.pause()
            })
          }
        },
      })
    })

    // Autoplay first video on mount
    const first = videoRefs.current[0]
    if (first) first.play().catch(() => {})

    return () => ctx.revert()
  }, [])

  const d = DISTRICTS[active]

  return (
    <div ref={wrapRef}
      style={{ height: `${DISTRICTS.length * 100}vh` }}
      className="relative"
    >
      {/* ── Pinned panel ──────────────────────────────────────────────── */}
      <div ref={pinRef}
        className="h-screen w-full bg-[#030609] flex flex-col overflow-hidden"
        style={{ willChange: 'transform' }}
      >
        {/* Background grid */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.032]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.6) 1px,transparent 1px),' +
              'linear-gradient(90deg,rgba(255,255,255,0.6) 1px,transparent 1px)',
            backgroundSize: '72px 72px',
          }}
        />
        {/* Colour-tinted ambient glow — changes per district */}
        <div className="absolute inset-0 pointer-events-none transition-all duration-700"
          style={{
            background: `radial-gradient(ellipse 60% 50% at 70% 50%, ${d.accent}18 0%, transparent 70%)`,
          }}
        />
        {/* Top / bottom page blends */}
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#0A0E1A] to-transparent pointer-events-none z-10" />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#0A0E1A] to-transparent pointer-events-none z-10" />

        {/* ── Main two-column layout ─────────────────────────────────── */}
        <div className="relative z-20 flex-1 flex items-center max-w-6xl mx-auto w-full px-6 gap-12">

          {/* LEFT — info panel */}
          <div className="flex-1 min-w-0">

            {/* District stepper pills */}
            <div className="flex gap-2 mb-8">
              {DISTRICTS.map((dist, i) => (
                <button
                  key={dist.id}
                  onClick={() => {
                    // Scroll to the corresponding snap point
                    const wrap = wrapRef.current
                    if (!wrap) return
                    const targetY = wrap.offsetTop + (i / (DISTRICTS.length - 1)) * ((DISTRICTS.length - 1) * window.innerHeight)
                    window.scrollTo({ top: targetY, behavior: 'smooth' })
                  }}
                  className={`flex items-center gap-1.5 text-[11px] font-mono px-3 py-1.5 rounded-full border transition-all duration-300
                    ${i === active
                      ? `border-[${dist.accent}] bg-white/10 text-white`
                      : 'border-white/10 text-slate-600 hover:text-slate-400 hover:border-white/20'
                    }`}
                >
                  <span>{dist.icon}</span>
                  <span className="hidden sm:inline">{dist.id === 'aceeconomy' ? 'Finance' : dist.id.charAt(0).toUpperCase() + dist.id.slice(1)}</span>
                </button>
              ))}
            </div>

            {/* Animated info — key forces remount on district change */}
            <div key={active} className="animate-fadeInUp">

              <span className={`inline-block text-[10px] tracking-[0.35em] uppercase font-mono ${d.accentCls} mb-3`}>
                {d.icon}  {d.tagline}
              </span>

              <h2 className="text-3xl md:text-4xl font-bold text-white leading-snug mb-4">
                {d.name}
              </h2>

              <p className="text-slate-400 text-sm leading-relaxed mb-6 max-w-md">
                {d.desc}
              </p>

              {/* Features */}
              <ul className="space-y-2 mb-8">
                {d.features.map((f, i) => (
                  <li key={i}
                    className="flex items-center gap-3 text-sm text-slate-300"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0`}
                      style={{ background: d.accent }} />
                    {f}
                  </li>
                ))}
              </ul>

              {/* Stat chip */}
              <div className={`inline-flex items-center gap-3 border ${d.borderCls} rounded-xl px-4 py-2.5 bg-gradient-to-r ${d.bgCls} mb-8`}>
                <span className={`text-2xl font-bold font-mono ${d.accentCls}`}>{d.stat.value}</span>
                <span className="text-xs text-slate-500">{d.stat.label}</span>
              </div>

              {/* CTAs */}
              <div className="flex flex-wrap gap-3">
                <Link href={d.joinHref}
                  className="text-sm font-bold text-black px-6 py-2.5 rounded-xl transition hover:opacity-90"
                  style={{ background: `linear-gradient(135deg, ${d.accent}, ${d.accent}cc)` }}>
                  Join {d.icon} District →
                </Link>
                <a href={d.href}
                  target={d.href.startsWith('http') ? '_blank' : undefined}
                  rel={d.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className="text-sm text-slate-400 hover:text-white border border-white/10 hover:border-white/25 px-6 py-2.5 rounded-xl transition">
                  {d.externalLabel}
                </a>
              </div>

            </div>
          </div>

          {/* RIGHT — video stack (all rendered, only active plays) */}
          <div className="hidden md:block w-[420px] shrink-0">
            <div className="relative" style={{ height: 420 }}>
              {DISTRICTS.map((dist, i) => (
                <div
                  key={dist.id}
                  className="absolute inset-0 transition-all duration-700"
                  style={{
                    opacity:    i === active ? 1 : 0,
                    transform:  i === active ? 'scale(1) translateY(0)'
                               : i === prev  ? 'scale(0.96) translateY(-12px)'
                               : 'scale(0.94) translateY(16px)',
                    zIndex:     i === active ? 2 : 1,
                    pointerEvents: i === active ? 'auto' : 'none',
                  }}
                >
                  {/* Glass frame */}
                  <div className="absolute inset-0 rounded-2xl border border-white/10 overflow-hidden"
                    style={{
                      boxShadow: `0 0 80px ${dist.accent}22, 0 40px 80px rgba(0,0,0,0.6)`,
                    }}
                  >
                    <video
                      ref={el => { videoRefs.current[i] = el }}
                      src={dist.video}
                      poster={dist.poster}
                      muted
                      playsInline
                      loop
                      preload={i === 0 ? 'auto' : 'metadata'}
                      className="w-full h-full object-cover"
                    />
                    {/* Subtle overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />
                  </div>

                  {/* Corner accent marks */}
                  {['top-2 left-2 border-t border-l',
                    'top-2 right-2 border-t border-r',
                    'bottom-2 left-2 border-b border-l',
                    'bottom-2 right-2 border-b border-r'].map((cls, ci) => (
                    <div key={ci}
                      className={`absolute ${cls} w-4 h-4 pointer-events-none`}
                      style={{ borderColor: `${dist.accent}66` }}
                    />
                  ))}

                  {/* District badge */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5
                    text-[10px] font-mono bg-black/50 border border-white/10
                    backdrop-blur-sm px-2.5 py-1 rounded-full pointer-events-none">
                    <span className="w-1 h-1 rounded-full animate-pulse"
                      style={{ background: dist.accent }} />
                    <span className="text-slate-300">LIVE</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Scroll progress dots ───────────────────────────────────── */}
        <div className="relative z-20 flex justify-center gap-2 pb-8">
          {DISTRICTS.map((dist, i) => (
            <div
              key={dist.id}
              className="transition-all duration-500 rounded-full"
              style={{
                width:      i === active ? 24 : 6,
                height:     6,
                background: i === active ? dist.accent : 'rgba(255,255,255,0.15)',
              }}
            />
          ))}
        </div>

        {/* ── Scroll hint ───────────────────────────────────────────── */}
        <div className="relative z-20 flex flex-col items-center gap-1 pb-5 opacity-40">
          <span className="text-[9px] tracking-widest text-slate-500 uppercase font-mono">
            {active < DISTRICTS.length - 1 ? 'Scroll to next district' : 'All districts explored'}
          </span>
          {active < DISTRICTS.length - 1 && (
            <svg width="14" height="14" viewBox="0 0 14 14" className="animate-bounce text-slate-600">
              <path d="M7 2v10M2 7l5 5 5-5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
            </svg>
          )}
        </div>

      </div>
    </div>
  )
}
