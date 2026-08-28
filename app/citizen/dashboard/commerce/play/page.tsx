'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// ─── Phase machine ─────────────────────────────────────────────────────────────
type Phase = 'intro' | 'launch' | 'game'

const GAME_BASE_URL = 'https://admit-layout-representative-processed.trycloudflare.com'

export default function CommercePlayPage() {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('intro')
  const [tick, setTick]   = useState(0)
  const rafRef = useRef<number | null>(null)
  const [gameUrl, setGameUrl] = useState(GAME_BASE_URL)

  // Fetch logged-in user and embed their id+email in the game URL
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const params = new URLSearchParams({
          uid:   user.id,
          email: user.email ?? '',
          name:  user.user_metadata?.display_name ?? user.email ?? 'Citizen',
        })
        setGameUrl(`${GAME_BASE_URL}?${params.toString()}`)
      }
    })
  }, [])

  // Ambient ticker for the intro animation
  useEffect(() => {
    if (phase !== 'intro') return
    const id = setInterval(() => setTick(t => t + 1), 120)
    return () => clearInterval(id)
  }, [phase])

  function handlePlay() {
    setPhase('launch')
    setTimeout(() => setPhase('game'), 1800)
  }

  // ─── Game phase: full-screen iframe ──────────────────────────────────────────
  if (phase === 'game') {
    return (
      <div className="fixed inset-0 bg-black flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 shrink-0">
          <button
            onClick={() => router.back()}
            className="text-gray-400 hover:text-white text-sm transition"
          >
            ← Exit
          </button>
          <span className="text-xs text-amber-400 font-mono tracking-widest uppercase">
            E-Commerce District · Deal Hunt Arena
          </span>
          <span className="text-xs text-gray-700">Collect merchant items to win coupons</span>
        </div>
        <iframe
          src={gameUrl}
          className="flex-1 w-full border-0"
          allow="fullscreen"
          title="Deal Hunt Arena"
        />
      </div>
    )
  }

  // ─── Launch overlay ───────────────────────────────────────────────────────────
  if (phase === 'launch') {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-6 z-50">
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 rounded-full border-4 border-amber-500/30 animate-ping" />
          <div className="absolute inset-2 rounded-full border-4 border-amber-400/50 animate-spin" style={{ animationDuration: '1.5s' }} />
          <div className="absolute inset-4 rounded-full bg-amber-500/20 flex items-center justify-center">
            <span className="text-3xl">🎮</span>
          </div>
        </div>
        <div className="text-center">
          <p className="text-amber-300 font-semibold text-lg tracking-wide">Entering the District</p>
          <p className="text-gray-600 text-sm mt-1">Connecting to Deal Hunt Arena…</p>
        </div>
      </div>
    )
  }

  // ─── Intro animation ──────────────────────────────────────────────────────────
  const tickers = [
    { sym: 'AMZN', val: '+2.4%', up: true },
    { sym: 'SHOP', val: '-0.8%', up: false },
    { sym: 'BABA', val: '+1.1%', up: true },
    { sym: 'EBAY', val: '+0.3%', up: true },
    { sym: 'MELI', val: '-1.5%', up: false },
  ]
  const deals = [
    { from: 'AliExpress', to: 'Amazon', margin: '64%', item: 'Smart Watch' },
    { from: 'Shopee',     to: 'Lazada', margin: '41%', item: 'Earbuds' },
    { from: 'AliExpress', to: 'eBay',   margin: '58%', item: 'LED Strip' },
  ]
  const activeDeal = tick % 3

  return (
    <div className="min-h-screen bg-[#06080F] text-white overflow-hidden relative">

      {/* Ambient grid lines */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(245,158,11,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(245,158,11,0.04) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Floating ticker tape */}
      <div className="absolute top-0 left-0 right-0 h-8 bg-amber-500/5 border-b border-amber-500/10 flex items-center overflow-hidden">
        <div
          className="flex gap-10 text-[11px] font-mono whitespace-nowrap"
          style={{ transform: `translateX(-${(tick * 0.6) % 400}px)`, transition: 'transform 0.12s linear' }}
        >
          {[...tickers, ...tickers, ...tickers].map((t, i) => (
            <span key={i} className={t.up ? 'text-green-400' : 'text-red-400'}>
              {t.sym} {t.val}
            </span>
          ))}
        </div>
      </div>

      {/* Nav */}
      <nav className="relative flex items-center justify-between px-6 pt-10 pb-4">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-white text-sm transition">
          ← Commerce
        </button>
        <span className="text-xs text-amber-500/60 font-mono tracking-widest uppercase">
          E-Commerce District
        </span>
        <span className="text-xs text-gray-700">Deal Hunt Arena</span>
      </nav>

      <div className="relative max-w-2xl mx-auto px-6 py-10 space-y-10">

        {/* District header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/8 text-amber-400 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" />
            DISTRICT LIVE
          </div>
          <h1 className="text-4xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">
              Deal Hunt
            </span>
            <span className="text-white"> Arena</span>
          </h1>
          <p className="text-gray-500 text-sm max-w-sm mx-auto leading-relaxed">
            Navigate the e-commerce district. Collect hidden merchant deals.
            Outrun the competition — earn real coupons.
          </p>
        </div>

        {/* Animated deal flow */}
        <div className="bg-white/3 border border-white/8 rounded-2xl p-5 space-y-3">
          <div className="text-[10px] text-gray-600 uppercase tracking-widest mb-3">Live arbitrage intel</div>
          {deals.map((d, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-500 ${
                i === activeDeal
                  ? 'bg-amber-500/10 border border-amber-500/30'
                  : 'bg-white/3 border border-transparent'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center text-sm shrink-0">
                🛍
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-white truncate">{d.item}</div>
                <div className="text-[10px] text-gray-600">{d.from} → {d.to}</div>
              </div>
              <div className={`text-sm font-bold font-mono ${i === activeDeal ? 'text-amber-400' : 'text-gray-600'}`}>
                {d.margin}
              </div>
            </div>
          ))}
        </div>

        {/* How to play */}
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { icon: '🎮', title: 'Join', desc: 'Enter multiplayer room' },
            { icon: '🏃', title: 'Collect', desc: 'Grab merchant item drops' },
            { icon: '🎁', title: 'Redeem', desc: 'Win real discount coupons' },
          ].map((s, i) => (
            <div key={i} className="bg-white/3 border border-white/8 rounded-xl p-4 space-y-2">
              <div className="text-2xl">{s.icon}</div>
              <div className="text-xs font-semibold text-white">{s.title}</div>
              <div className="text-[10px] text-gray-600 leading-relaxed">{s.desc}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={handlePlay}
            className="relative group w-full max-w-xs bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold text-base py-4 rounded-2xl hover:shadow-[0_0_40px_rgba(245,158,11,0.4)] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              <span>Enter the Arena</span>
              <span className="group-hover:translate-x-1 transition-transform inline-block">→</span>
            </span>
          </button>
          <p className="text-[10px] text-gray-700">
            Multiplayer · Real-time · Merchant rewards
          </p>
        </div>

        {/* Admin hint */}
        <div className="border-t border-white/5 pt-6 flex items-center justify-between text-[10px] text-gray-700">
          <span>Merchants: add products via</span>
          <a href="/admin/merchants" className="text-amber-600 hover:text-amber-400 transition">
            /admin/merchants →
          </a>
        </div>

      </div>
    </div>
  )
}
