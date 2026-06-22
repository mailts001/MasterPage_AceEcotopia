'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Item {
  q: string
  icon: string
  answer: React.ReactNode
}

const ITEMS: Item[] = [
  {
    q: 'What do I actually get as a citizen?',
    icon: '🎯',
    answer: (
      <div className="space-y-3 text-sm text-gray-400 leading-relaxed">
        <p>AI agents monitor the things you already spend money on — property, stocks, flights, and products — 24/7. When a signal fires (price anomaly, squeeze setup, arbitrage gap, deal alert) you get notified instantly via <strong className="text-white">Telegram or email</strong> before the window closes.</p>
        <p>Without X68 you'd need six different apps, manual price checking, and stock scanner subscriptions. Here it's one account, one Telegram, six districts all running in parallel.</p>
        <div className="grid grid-cols-2 gap-2 mt-3">
          {[
            ['PropOS',       'Property price alerts, neighbourhood data'],
            ['Financial',    'Stock signals, momentum picks, squeeze setups'],
            ['NexusTravel',  'Cheapest flights/hotels, error fare alerts'],
            ['E-commerce',   'Arbitrage gaps across Shopee, Amazon, Lazada'],
            ['SerenityOS',   'Daily wellness score, SG events radar, morning brief'],
            ['MarketingOS',  'AI video scripts + EN/ZH voiceover, TikTok-ready in 24h'],
          ].map(([d, desc]) => (
            <div key={d} className="bg-white/5 rounded-lg p-3">
              <div className="text-white text-xs font-semibold mb-1">{d}</div>
              <div className="text-gray-500 text-xs">{desc}</div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    q: 'How are the districts different? Which one is for me?',
    icon: '🏙️',
    answer: (
      <div className="space-y-4 text-sm text-gray-400">
        <p>Each district has its own AI stack, data sources, and signal logic — they don't overlap.</p>
        <div className="space-y-3">
          {[
            {
              name: 'PropOS', color: 'text-blue-400', border: 'border-blue-500/30',
              who: 'Own or rent property, or planning to buy',
              signals: 'Listing undervaluation, rental yield vs mortgage spreads, neighbourhood price momentum',
              action: 'Buy below market, avoid overpaying, time your exit',
            },
            {
              name: 'Financial District', color: 'text-green-400', border: 'border-green-500/30',
              who: 'Active or passive stock/ETF investor',
              signals: 'Momentum scanner picks, Bollinger squeeze setups, congressional trade follows, earnings catalysts',
              action: 'Enter positions before breakouts, manage risk with real-time stops',
            },
            {
              name: 'NexusTravel', color: 'text-purple-400', border: 'border-purple-500/30',
              who: 'Travel 2+ times per year, flexible dates',
              signals: 'Fare drops on your saved routes, error fares, hotel deals, last-minute availability',
              action: 'Save $200–$800 per trip — one alert pays the subscription for years',
            },
            {
              name: 'E-commerce', color: 'text-amber-400', border: 'border-amber-500/30',
              who: 'Side hustle seller, dropshipper, or deal hunter',
              signals: 'Multi-AI analysis of price, demand, and supply gaps across 6 platforms. Best margin opportunities surfaced instantly.',
              action: 'Arbitrage between Shopee/Lazada/Amazon/Carousell — system calculates net margin after fees and shipping',
            },
            {
              name: 'MarketingOS', color: 'text-rose-400', border: 'border-rose-500/30',
              who: 'Shopee/Lazada seller, SME owner, or content creator',
              signals: 'Submit product → AI generates hook, script, EN + Chinese voiceover, and final MP4 within 24h',
              action: 'Post TikTok/IG/LinkedIn videos without a video team — free during beta',
            },
          ].map(d => (
            <div key={d.name} className={`border ${d.border} rounded-xl p-4 space-y-2`}>
              <div className={`font-semibold ${d.color}`}>{d.name}</div>
              <div className="text-xs"><span className="text-gray-500">Best for: </span><span className="text-white">{d.who}</span></div>
              <div className="text-xs"><span className="text-gray-500">Signals: </span>{d.signals}</div>
              <div className="text-xs"><span className="text-gray-500">Act on it: </span>{d.action}</div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    q: 'How do Nexus Credits work — can I earn without paying?',
    icon: '💎',
    answer: (
      <div className="space-y-3 text-sm text-gray-400">
        <p>Nexus Credits are your in-platform currency. They unlock premium alert slots and API calls without upgrading your plan.</p>
        <div className="space-y-2">
          {[
            ['Sign up',           '+50 credits',  'Instant, just for joining'],
            ['Refer a friend',    '+100 credits', 'When they verify their email'],
            ['Friend joins',      '+25 credits',  'Your friend gets a welcome bonus too'],
          ].map(([action, reward, note]) => (
            <div key={action} className="flex items-center gap-3 bg-white/5 rounded-lg px-4 py-3">
              <div className="text-yellow-400 font-mono font-bold text-sm w-24 shrink-0">{reward}</div>
              <div>
                <div className="text-white text-xs font-medium">{action}</div>
                <div className="text-gray-600 text-xs">{note}</div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500">100 credits → 1 bonus alert slot. Refer 5 friends = 500 credits = 5 extra monitored assets, free forever.</p>
      </div>
    ),
  },
  {
    q: 'What do I need to do to maximise my returns?',
    icon: '⚡',
    answer: (
      <div className="space-y-4 text-sm text-gray-400">
        <p>The AI does the scanning. You do three things:</p>
        <div className="space-y-3">
          {[
            {
              step: '01', title: 'Link Telegram',
              desc: 'Alerts fire to @AceIBKRTradingBot instantly. Without Telegram you\'re on email — usually too slow for time-sensitive signals.',
            },
            {
              step: '02', title: 'Build your watchlist',
              desc: 'The more assets you tell each district to monitor, the more signal surface area you have. Start with things you already own or plan to buy.',
            },
            {
              step: '03', title: 'Set your risk tier',
              desc: 'Each district lets you configure risk appetite. Conservative = fewer but higher-conviction signals. Aggressive = early entries, higher volatility.',
            },
            {
              step: '04', title: 'Act within the window',
              desc: 'Arbitrage gaps and momentum setups have expiry. Most signals have a 15-minute to 4-hour action window. The system timestamps everything.',
            },
          ].map(s => (
            <div key={s.step} className="flex gap-4">
              <div className="text-cyan-500 font-mono text-xs pt-0.5 w-6 shrink-0">{s.step}</div>
              <div>
                <div className="text-white text-xs font-semibold mb-0.5">{s.title}</div>
                <div className="text-gray-500 text-xs leading-relaxed">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    q: 'Is the $19/month Citizen plan worth it?',
    icon: '📈',
    answer: (
      <div className="space-y-3 text-sm text-gray-400">
        <p>It pays for itself if any one of these happens once per month:</p>
        <div className="space-y-2">
          {[
            ['NexusTravel', 'Catches a single $50+ fare drop on a route you fly regularly'],
            ['E-commerce',  'Surfaces one arbitrage opportunity with >$50 net margin'],
            ['Financial',   'One squeeze entry that gains more than $19 before stop-loss'],
            ['PropOS',      'Saves you from one overpriced viewing that wastes half a day'],
          ].map(([d, desc]) => (
            <div key={d} className="flex gap-3 items-start">
              <span className="text-green-400 mt-0.5">✓</span>
              <div>
                <span className="text-white text-xs font-medium">{d}: </span>
                <span className="text-xs">{desc}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-3 mt-2">
          <p className="text-xs text-cyan-300">Start free. The free tier gives you 3 alerts/month across all districts. Upgrade only when you see a signal you wish you could act on faster.</p>
        </div>
      </div>
    ),
  },
]

export default function DistrictGuide() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <section className="py-24 px-4 border-t border-white/5">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            Your <span className="gradient-text">Questions</span>, Answered
          </h2>
          <p className="text-gray-400 text-sm">Everything you need to know before claiming your citizenship.</p>
        </div>

        <div className="space-y-2">
          {ITEMS.map((item, i) => (
            <div key={i}
              className={`border rounded-xl overflow-hidden transition-all ${
                open === i ? 'border-cyan-500/30 bg-cyan-500/5' : 'border-white/10 bg-white/3 hover:border-white/20'
              }`}>
              <button
                className="w-full flex items-center justify-between px-5 py-4 text-left"
                onClick={() => setOpen(open === i ? null : i)}>
                <div className="flex items-center gap-3">
                  <span className="text-lg">{item.icon}</span>
                  <span className="font-medium text-white text-sm">{item.q}</span>
                </div>
                <span className={`text-gray-500 transition-transform text-lg ${open === i ? 'rotate-45' : ''}`}>+</span>
              </button>
              {open === i && (
                <div className="px-5 pb-5 pt-1 border-t border-white/10">
                  {item.answer}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link href="/citizen/register"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold px-8 py-3 rounded-xl hover:opacity-90 transition">
            Claim Your Citizenship — Free
            <span>→</span>
          </Link>
          <p className="text-gray-600 text-xs mt-3">No credit card required · Cancel Telegram alerts anytime</p>
        </div>
      </div>
    </section>
  )
}
