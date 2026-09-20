'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Phase = 'intro' | 'launch'

const GAME_BASE_URL = 'https://aceconology.duckdns.org:8444/nonya/'

export default function MarketingPlayPage() {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('intro')
  const [tick, setTick]   = useState(0)
  const [gameUrl, setGameUrl] = useState(GAME_BASE_URL)

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

  useEffect(() => {
    if (phase !== 'intro') return
    const id = setInterval(() => setTick(t => t + 1), 120)
    return () => clearInterval(id)
  }, [phase])

  function handlePlay() {
    window.open(gameUrl, '_blank', 'noopener')
    setPhase('launch')
    setTimeout(() => setPhase('intro'), 2000)
  }

  if (phase === 'launch') {
    return (
      <div className="fixed inset-0 bg-[#080C18] flex flex-col items-center justify-center gap-6 z-50">
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 rounded-full border-4 border-rose-500/30 animate-ping" />
          <div className="absolute inset-2 rounded-full border-4 border-rose-400/50 animate-spin" style={{ animationDuration: '1.5s' }} />
          <div className="absolute inset-4 rounded-full bg-rose-500/20 flex items-center justify-center text-3xl">
            🍱
          </div>
        </div>
        <div className="text-center">
          <p className="text-rose-300 font-semibold text-lg tracking-wide">Opening Nonya Kitchen</p>
          <p className="text-slate-600 text-sm mt-1">Preparing your lunchbox math challenge…</p>
        </div>
      </div>
    )
  }

  const floatItems = [
    { icon: '🍱', label: 'Nasi Lemak Set',  price: '$4.50' },
    { icon: '🥟', label: 'Kueh Lapis',       price: '$2.80' },
    { icon: '🍜', label: 'Laksa Bowl',        price: '$6.00' },
    { icon: '🧆', label: 'Otah Otah',         price: '$1.50' },
    { icon: '🍮', label: 'Chendol Cup',       price: '$3.20' },
  ]
  const active = tick % floatItems.length

  return (
    <div className="min-h-screen bg-[#080C18] text-white overflow-hidden relative">

      {/* Ambient grid */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(244,63,94,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(244,63,94,0.04) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Scrolling price tape */}
      <div className="absolute top-0 left-0 right-0 h-8 bg-rose-500/5 border-b border-rose-500/10 flex items-center overflow-hidden">
        <div
          className="flex gap-10 text-[11px] font-mono whitespace-nowrap"
          style={{ transform: `translateX(-${(tick * 0.6) % 400}px)`, transition: 'transform 0.12s linear' }}
        >
          {[...floatItems, ...floatItems, ...floatItems].map((item, i) => (
            <span key={i} className="text-rose-400">
              {item.icon} {item.label} {item.price}
            </span>
          ))}
        </div>
      </div>

      {/* Nav */}
      <nav className="relative flex items-center justify-between px-6 pt-10 pb-4">
        <button onClick={() => router.back()} className="text-slate-500 hover:text-white text-sm transition">
          ← Marketing
        </button>
        <span className="text-xs text-rose-500/60 font-mono tracking-widest uppercase">
          Marketing District
        </span>
        <span className="text-xs text-slate-700">Nonya Kitchen Math</span>
      </nav>

      <div className="relative max-w-2xl mx-auto px-6 py-10 space-y-10">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full border border-rose-500/30 bg-rose-500/8 text-rose-400 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse inline-block" />
            DISTRICT LIVE
          </div>
          <h1 className="text-4xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-rose-400 to-pink-300 bg-clip-text text-transparent">
              Nonya Kitchen
            </span>
            <span className="text-white"> Math</span>
          </h1>
          <p className="text-slate-500 text-sm max-w-sm mx-auto leading-relaxed">
            Run the Peranakan kopitiam. Collect orders, tally the totals, deliver lunchboxes —
            earn your way through the kampung.
          </p>
        </div>

        {/* Animated menu board */}
        <div className="bg-white/3 border border-white/8 rounded-2xl p-5 space-y-3">
          <div className="text-[10px] text-slate-600 uppercase tracking-widest mb-3">Today's Menu</div>
          {floatItems.map((item, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-500 ${
                i === active
                  ? 'bg-rose-500/10 border border-rose-500/30'
                  : 'bg-white/3 border border-transparent'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-rose-500/15 flex items-center justify-center text-sm shrink-0">
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-white truncate">{item.label}</div>
                <div className="text-[10px] text-slate-600">Peranakan specialty</div>
              </div>
              <div className={`text-sm font-bold font-mono ${i === active ? 'text-rose-400' : 'text-slate-600'}`}>
                {item.price}
              </div>
            </div>
          ))}
        </div>

        {/* How to play */}
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { icon: '🎯', title: 'Take Order', desc: 'Answer the Majie\'s price question' },
            { icon: '🍱', title: 'Pack Food',  desc: 'Jump to collect the right ingredients' },
            { icon: '🚀', title: 'Deliver',    desc: 'Bring the lunchbox to earn points' },
          ].map((s, i) => (
            <div key={i} className="bg-white/3 border border-white/8 rounded-xl p-4 space-y-2">
              <div className="text-2xl">{s.icon}</div>
              <div className="text-xs font-semibold text-white">{s.title}</div>
              <div className="text-[10px] text-slate-600 leading-relaxed">{s.desc}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={handlePlay}
            className="relative group w-full max-w-xs bg-gradient-to-r from-rose-500 to-pink-400 text-white font-bold text-base py-4 rounded-2xl hover:shadow-[0_0_40px_rgba(244,63,94,0.4)] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              <span>Enter the Kitchen</span>
              <span className="group-hover:translate-x-1 transition-transform inline-block">→</span>
            </span>
          </button>
          <p className="text-[10px] text-slate-700">
            Single player · Math challenge · Peranakan culture
          </p>
        </div>

      </div>
    </div>
  )
}
