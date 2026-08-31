'use client'

import { useRef, useState, useEffect } from 'react'
import Link from 'next/link'

const DISTRICTS = [
  {
    id:       'propos',
    name:     'PropOS District',
    tagline:  'Property Intelligence',
    icon:     '🏙️',
    accent:   '#3B82F6',
    accentCls:'text-blue-400',
    borderCls:'border-blue-500/30',
    video:    '/districts/propos.mp4',
    poster:   '/districts/propos-poster.jpg',
    href:     'http://5.223.72.120:8504',
    joinHref: '/citizen/register?district=propos',
    externalLabel: 'Explore PropOS →',
    desc:     'AI monitors Singapore property 24/7. Refinance alerts, valuation changes and sell signals before your neighbours.',
    features: ['🏠 Refinance opportunity alerts','📊 Real-time valuation tracking','📍 District price trend reports','🔔 Sell-signal notifications','💡 AI-scored deal ranking'],
    stat: { value: '2.4k', label: 'Properties monitored' },
  },
  {
    id:       'financial',
    name:     'Financial District',
    tagline:  'Investment Intelligence',
    icon:     '💹',
    accent:   '#22C55E',
    accentCls:'text-green-400',
    borderCls:'border-green-500/30',
    video:    '/districts/financial.mp4',
    poster:   '/districts/financial-poster.jpg',
    href:     '/citizen/dashboard/financial',
    joinHref: '/citizen/register?district=aceeconomy',
    externalLabel: 'View signals →',
    desc:     'AI scans US & HK stocks, ETFs and REITs. Momentum picks, squeeze setups and earnings alerts — signals only, execution always yours.',
    features: ['📈 Momentum scanner (RSI + MACD)','🔥 Bollinger squeeze setups','📅 Earnings surprise alerts','🏢 REIT & ETF tracking','📲 Telegram instant delivery'],
    stat: { value: '147', label: 'Signals sent today' },
  },
  {
    id:       'nexustravel',
    name:     'NexusTravel District',
    tagline:  'Travel Intelligence',
    icon:     '✈️',
    accent:   '#A855F7',
    accentCls:'text-purple-400',
    borderCls:'border-purple-500/30',
    video:    '/districts/nexustravel.mp4',
    poster:   '/districts/nexustravel-poster.jpg',
    href:     'https://nexus-travel-seven.vercel.app',
    joinHref: '/citizen/register?district=nexustravel',
    externalLabel: 'Explore live →',
    desc:     'AI monitors your saved routes and hotels around the clock. Instant alerts when fares drop below your threshold.',
    features: ['✈️ Flight price drop alerts','🏨 Hotel deal notifications','💱 Currency rate signals','🔔 Telegram instant delivery','📍 Your saved routes'],
    stat: { value: '$340', label: 'Avg saving per trip' },
  },
  {
    id:       'commerce',
    name:     'E-commerce District',
    tagline:  'Arbitrage Intelligence',
    icon:     '🛒',
    accent:   '#F59E0B',
    accentCls:'text-amber-400',
    borderCls:'border-amber-500/30',
    video:    '/districts/commerce.mp4',
    poster:   '/districts/commerce-poster.jpg',
    href:     'http://204.168.221.101:2567/',
    joinHref: '/citizen/register?district=commerce',
    externalLabel: 'Explore Commerce OS →',
    desc:     'Multi-AI agents surface price gaps across Shopee, Lazada and Amazon. Net margin calculated after fees and shipping.',
    features: ['🔍 Cross-platform arbitrage gaps','📦 Demand & supply gap analysis','💰 Net margin after all fees','🤖 Multi-agent price scanning','🔒 Citizen tier — direct value'],
    stat: { value: '74%', label: 'Best margin found today' },
  },
  {
    id:       'serenity',
    name:     'SerenityOS District',
    tagline:  'Wellness + Events Intelligence',
    icon:     '🌿',
    accent:   '#10B981',
    accentCls:'text-emerald-400',
    borderCls:'border-emerald-500/30',
    video:    '/districts/serenity.mp4',
    poster:   '/districts/serenity-poster.jpg',
    href:     '/citizen/dashboard/wellness',
    joinHref: '/citizen/register?district=serenity',
    externalLabel: 'Open SerenityOS →',
    desc:     'Daily Serenity Score™ check-in, SG events radar, ambient radio and breathing exercises. Your morning wellness ritual, automated.',
    features: ['🌿 Daily Serenity Score™','📅 SG events radar (20+ events)','🫁 Guided breathing exercises','🎵 Ambient radio channels','📲 Morning Telegram wellness brief'],
    stat: { value: '30', label: 'Events live this month' },
  },
  {
    id:       'marketingos',
    name:     'MarketingOS District',
    tagline:  'AI Video Marketing',
    icon:     '📣',
    accent:   '#F43F5E',
    accentCls:'text-rose-400',
    borderCls:'border-rose-500/30',
    video:    '/districts/marketingos.mp4',
    poster:   '/districts/marketingos-poster.jpg',
    href:     '/marketing',
    joinHref: '/marketing/submit',
    externalLabel: 'Create a video →',
    desc:     'Submit your product and receive TikTok-ready EN + Chinese videos within 24h. AI writes the script, records the voiceover, and edits the final cut.',
    features: ['🎬 AI-written hook + video script','🎙️ EN + Chinese voiceover auto-generated','📱 TikTok, IG Reels, YouTube Shorts, LinkedIn','⚡ 24h turnaround from submission','🔗 Optional affiliate link in video CTA'],
    stat: { value: '5 min', label: 'Avg generation time' },
  },
  {
    id:       'careergenome',
    name:     'CareerGenome District',
    tagline:  'Career Intelligence',
    icon:     '🧬',
    accent:   '#6366F1',
    accentCls:'text-indigo-400',
    borderCls:'border-indigo-500/30',
    video:    '/districts/careergenome.mp4',
    poster:   '/districts/careergenome-poster.jpg',
    href:     'https://career-genome.vercel.app/for-recruiters/search',
    joinHref: 'https://career-genome.vercel.app/interview',
    externalLabel: 'For Recruiters →',
    desc:     'AI narrative interview maps your Career Genome across 10 dimensions, simulates trajectory paths, and predicts hiring cycles before roles are posted. Recruiters get B2B candidate search.',
    features: ['🧬 AI narrative interview → Career Genome','🗺️ Trajectory Simulator with probability scores','📡 Hiring cycle prediction before roles post','👔 Recruiter search access (B2B)','💼 For senior/executive professionals'],
    stat: { value: '10', label: 'Genome dimensions scored' },
  },
  {
    id:       'deepqi',
    name:     'Alternative HealthCare',
    tagline:  'TCM Wellness & BaZi',
    icon:     '☯',
    accent:   '#f97316',
    accentCls:'text-orange-400',
    borderCls:'border-orange-500/30',
    video:    '/districts/deepqi.mp4',
    poster:   '/districts/deepqi-poster.jpg',
    href:     'https://deep-qi-web.vercel.app',
    joinHref: 'https://deep-qi-web.vercel.app',
    externalLabel: 'Start Diagnosis →',
    desc:     'TCM symptom analysis meets BaZi astrology — maps your constitution pattern, cross-references your birth chart, and delivers personalised herb & diet recommendations via Telegram. Check in daily to track your recovery.',
    features: ['🌿 TCM symptom → constitution pattern', '🀄 BaZi & ZiWei birth chart cross-reference', '🫙 Personalised herb & diet recommendations', '🤖 Telegram bot daily check-in loop', '🗺️ 3D acupuncture body map (Qi points)'],
    stat: { value: '3D', label: 'Acupuncture body map' },
  },
]

const REPLAY_DELAY_MS = 3000   // hold on last frame for 3s before replaying

export default function DistrictShowcase() {
  const [active, setActive] = useState(0)
  const videoRefs  = useRef<(HTMLVideoElement | null)[]>([])
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Clear any pending replay timer
  const clearTimer = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
  }

  // Called when a video finishes — hold on last frame, then replay after delay
  const handleEnded = (i: number) => {
    if (i !== active) return
    clearTimer()
    timerRef.current = setTimeout(() => {
      const v = videoRefs.current[i]
      if (v) { v.currentTime = 0; v.play().catch(() => {}) }
    }, REPLAY_DELAY_MS)
  }

  // When active tab changes, cancel timer + restart that video
  useEffect(() => {
    clearTimer()
    videoRefs.current.forEach((v, i) => {
      if (!v) return
      if (i === active) {
        v.currentTime = 0
        v.play().catch(() => {})
      } else {
        v.pause()
      }
    })
    return clearTimer
  }, [active])

  const d = DISTRICTS[active]

  return (
    <section className="w-full bg-[#030609] py-16 md:py-20 overflow-hidden">

      {/* Subtle grid bg */}
      <div className="absolute inset-x-0 pointer-events-none opacity-[0.03] h-full"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.6) 1px,transparent 1px),' +
            'linear-gradient(90deg,rgba(255,255,255,0.6) 1px,transparent 1px)',
          backgroundSize: '72px 72px',
        }} />

      <div className="max-w-6xl mx-auto px-4">

        {/* Section label */}
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-2 text-[10px] tracking-[0.35em] uppercase
            font-mono text-slate-500 border border-white/8 bg-white/3 px-4 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            District Previews · Click to explore
          </span>
        </div>

        {/* ── District tab pills ── */}
        <div className="flex justify-center gap-2 mb-8 flex-wrap">
          {DISTRICTS.map((dist, i) => (
            <button
              key={dist.id}
              onClick={() => setActive(i)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium
                border transition-all duration-300"
              style={i === active ? {
                background: `${dist.accent}22`,
                borderColor: `${dist.accent}66`,
                color: dist.accent,
              } : {
                background: 'rgba(255,255,255,0.03)',
                borderColor: 'rgba(255,255,255,0.08)',
                color: '#64748b',
              }}
            >
              <span>{dist.icon}</span>
              <span className="hidden sm:inline">{dist.name.replace(' District','')}</span>
            </button>
          ))}
        </div>

        {/* ── Video — full width, 16:9 ── */}
        <div className="relative w-full rounded-2xl overflow-hidden mb-8"
          style={{
            boxShadow: `0 0 80px ${d.accent}25, 0 40px 100px rgba(0,0,0,0.7)`,
            border: `1px solid ${d.accent}33`,
            transition: 'box-shadow 0.5s, border-color 0.5s',
          }}
        >
          {/* Ambient glow tint */}
          <div className="absolute inset-0 pointer-events-none z-10"
            style={{
              background: `radial-gradient(ellipse 80% 40% at 50% 0%, ${d.accent}18 0%, transparent 60%)`,
              transition: 'background 0.5s',
            }} />

          {/* Only render the active video — avoids downloading all 8 MP4s on load */}
          {DISTRICTS.map((dist, i) => (
            i === active ? (
              <video
                key={dist.id}
                ref={el => { videoRefs.current[i] = el }}
                src={dist.video}
                poster={dist.poster}
                muted
                autoPlay
                playsInline
                preload="auto"
                onEnded={() => handleEnded(i)}
                className="w-full block"
                style={{ aspectRatio: '16/9', objectFit: 'cover' }}
              />
            ) : (
              // Keep a poster-only placeholder for inactive slots so layout doesn't shift
              <img
                key={dist.id}
                src={dist.poster}
                alt=""
                className="w-full block"
                style={{ display: 'none', aspectRatio: '16/9', objectFit: 'cover' }}
              />
            )
          ))}

          {/* Corner marks */}
          {['top-3 left-3 border-t border-l','top-3 right-3 border-t border-r',
            'bottom-3 left-3 border-b border-l','bottom-3 right-3 border-b border-r'].map((cls, i) => (
            <div key={i}
              className={`absolute z-20 ${cls} w-5 h-5 pointer-events-none transition-colors duration-500`}
              style={{ borderColor: `${d.accent}88` }} />
          ))}

          {/* Live badge */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20
            flex items-center gap-1.5 text-[10px] font-mono
            bg-black/50 border border-white/10 backdrop-blur-sm px-3 py-1 rounded-full pointer-events-none">
            <span className="w-1 h-1 rounded-full animate-pulse" style={{ background: d.accent }} />
            <span className="text-slate-300">{d.tagline.toUpperCase()}</span>
          </div>
        </div>

        {/* ── Info row below video ── */}
        <div key={active} className="animate-fadeInUp grid md:grid-cols-2 gap-8 items-start">

          {/* Left: description + features */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">{d.icon}</span>
              <div>
                <h3 className="text-xl font-bold text-white">{d.name}</h3>
                <span className="text-xs font-mono" style={{ color: d.accent }}>{d.tagline}</span>
              </div>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed mb-5">{d.desc}</p>
            <ul className="space-y-2">
              {d.features.map((f, i) => (
                <li key={i} className="flex items-center gap-2.5 text-sm text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: d.accent }} />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Right: stat + CTAs */}
          <div className="flex flex-col gap-5">

            {/* Stat chip */}
            <div className="inline-flex items-center gap-4 border rounded-2xl px-6 py-4 w-fit"
              style={{ borderColor: `${d.accent}44`, background: `${d.accent}0f` }}>
              <span className="text-3xl font-bold font-mono" style={{ color: d.accent }}>
                {d.stat.value}
              </span>
              <span className="text-sm text-slate-500">{d.stat.label}</span>
            </div>

            {/* Progress dots */}
            <div className="flex gap-2 items-center">
              {DISTRICTS.map((dist, i) => (
                <button key={dist.id} onClick={() => setActive(i)}
                  className="rounded-full transition-all duration-400"
                  style={{
                    width:      i === active ? 28 : 8,
                    height:     8,
                    background: i === active ? dist.accent : 'rgba(255,255,255,0.12)',
                  }} />
              ))}
              <span className="text-xs text-slate-600 ml-2 font-mono">
                {active + 1} / {DISTRICTS.length}
              </span>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3">
              {d.joinHref.startsWith('http') ? (
                <a href={d.joinHref} target="_blank" rel="noopener noreferrer"
                  className="text-sm font-bold text-black px-6 py-3 rounded-xl
                    hover:opacity-90 transition shadow-lg"
                  style={{
                    background: `linear-gradient(135deg, ${d.accent}, ${d.accent}bb)`,
                    boxShadow: `0 4px 24px ${d.accent}44`,
                  }}>
                  Join {d.icon} District →
                </a>
              ) : (
                <Link href={d.joinHref}
                  className="text-sm font-bold text-black px-6 py-3 rounded-xl
                    hover:opacity-90 transition shadow-lg"
                  style={{
                    background: `linear-gradient(135deg, ${d.accent}, ${d.accent}bb)`,
                    boxShadow: `0 4px 24px ${d.accent}44`,
                  }}>
                  Join {d.icon} District →
                </Link>
              )}
              {d.href.startsWith('http') ? (
                <a href={d.href} target="_blank" rel="noopener noreferrer"
                  className="text-sm text-slate-400 hover:text-white border border-white/10
                    hover:border-white/25 px-6 py-3 rounded-xl transition">
                  {d.externalLabel}
                </a>
              ) : (
                <Link href={d.href}
                  className="text-sm text-slate-400 hover:text-white border border-white/10
                    hover:border-white/25 px-6 py-3 rounded-xl transition">
                  {d.externalLabel}
                </Link>
              )}
            </div>

            {/* Next district hint */}
            {active < DISTRICTS.length - 1 && (
              <button onClick={() => setActive(active + 1)}
                className="flex items-center gap-2 text-xs text-slate-600 hover:text-slate-400 transition w-fit">
                <span>Next: {DISTRICTS[active + 1].icon} {DISTRICTS[active + 1].name}</span>
                <span>→</span>
              </button>
            )}

          </div>
        </div>

      </div>
    </section>
  )
}
