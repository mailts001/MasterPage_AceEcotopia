'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'

export default function NexusTravelCinematic() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(true)

  const toggle = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) { v.play(); setPlaying(true) }
    else          { v.pause(); setPlaying(false) }
  }

  return (
    <section className="relative w-full bg-[#030609] py-16 md:py-24 overflow-hidden">

      {/* Grid texture */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,212,255,0.8) 1px,transparent 1px),' +
            'linear-gradient(90deg,rgba(0,212,255,0.8) 1px,transparent 1px)',
          backgroundSize: '72px 72px',
        }} />
      {/* Fade edges into page */}
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#0A0E1A] to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#0A0E1A] to-transparent pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-4">

        {/* Header */}
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-2 text-[10px] tracking-[0.4em] text-cyan-400/70
            uppercase font-mono border border-cyan-500/20 bg-cyan-500/5 px-4 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            NexusTravel District
          </span>
          <h2 className="mt-4 text-3xl md:text-4xl font-bold text-white leading-snug">
            AI tracks every fare.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
              You just book.
            </span>
          </h2>
          <p className="mt-3 text-slate-400 text-sm max-w-md mx-auto">
            Flight drops · Hotel deals · Currency signals — delivered before the crowd.
          </p>
        </div>

        {/* Video frame */}
        <div className="relative mx-auto max-w-3xl">
          {/* Glow ring */}
          <div className="absolute -inset-[1px] rounded-2xl pointer-events-none"
            style={{
              background: 'linear-gradient(135deg,rgba(0,212,255,0.3),rgba(130,80,255,0.2),transparent 60%)',
            }} />

          <div className="relative rounded-2xl overflow-hidden border border-white/10 cursor-pointer group"
            style={{ boxShadow: '0 0 80px rgba(0,212,255,0.12), 0 40px 80px rgba(0,0,0,0.7)' }}
            onClick={toggle}
          >
            {/* Live badge */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20
              inline-flex items-center gap-1.5 text-[10px] font-mono text-cyan-400/90
              bg-black/60 border border-cyan-500/25 backdrop-blur-sm px-3 py-1 rounded-full pointer-events-none">
              <span className="w-1 h-1 rounded-full bg-cyan-400 animate-pulse" />
              DISTRICT PREVIEW
            </div>

            {/* THE VIDEO — poster shows immediately, no JS needed to display */}
            <video
              ref={videoRef}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              poster="/districts/nexustravel-hero-poster.jpg"
              className="w-full block"
              style={{ display: 'block' }}
            >
              <source src="/districts/nexustravel-hero.mp4" type="video/mp4" />
            </video>

            {/* Play / pause overlay — visible on hover or when paused */}
            <div className={`absolute inset-0 z-10 flex items-center justify-center
              transition-opacity duration-200 pointer-events-none
              ${!playing ? 'opacity-100 bg-black/20' : 'opacity-0 group-hover:opacity-100'}`}>
              <div className="w-16 h-16 rounded-full bg-black/60 border border-white/25 backdrop-blur-sm
                flex items-center justify-center shadow-2xl">
                <span className="text-white text-xl">{playing ? '⏸' : '▶'}</span>
              </div>
            </div>

            {/* Corner marks */}
            {['top-3 left-3 border-t border-l','top-3 right-3 border-t border-r',
              'bottom-3 left-3 border-b border-l','bottom-3 right-3 border-b border-r'].map((c,i) => (
              <div key={i} className={`absolute ${c} w-5 h-5 border-cyan-400/40 pointer-events-none z-10`} />
            ))}
          </div>

          {/* Click hint — fades after first interaction */}
          <p className="mt-2 text-center text-[11px] text-slate-600">
            Click video to pause · {playing ? 'Playing' : 'Paused'}
          </p>
        </div>

        {/* CTAs */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/citizen/register?district=nexustravel"
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 transition
              text-black font-bold px-8 py-3 rounded-xl text-sm shadow-lg shadow-cyan-500/20">
            Join NexusTravel District →
          </Link>
          <a href="https://nexus-travel-seven.vercel.app" target="_blank" rel="noopener noreferrer"
            className="text-sm text-slate-400 hover:text-cyan-400 transition
              border border-white/10 hover:border-cyan-500/30 px-6 py-3 rounded-xl">
            Explore live →
          </a>
        </div>

        {/* Feature pills */}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {['✈️ Flight price drops','🏨 Hotel deal alerts','💱 Currency signals',
            '🔔 Telegram instant delivery','📍 Your saved routes'].map(p => (
            <span key={p} className="text-xs text-slate-400 bg-white/5 border border-white/8 px-3 py-1.5 rounded-full">
              {p}
            </span>
          ))}
        </div>

      </div>
    </section>
  )
}
