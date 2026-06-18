'use client'

import { useState } from 'react'
import Link from 'next/link'

const APIS = [
  {
    district: 'PropOS',
    icon: '🏙️',
    color: 'text-blue-400',
    border: 'border-blue-500/30',
    bg: 'bg-blue-500/10',
    badge: 'bg-blue-500/20 text-blue-400',
    plan: 'Citizen+',
    price: '$19/mo',
    endpoints: [
      { method: 'POST', path: '/v1/propos/valuation', desc: 'AI property valuation — private & HDB' },
      { method: 'POST', path: '/v1/propos/deals', desc: 'Scan undervalued properties by district' },
      { method: 'GET',  path: '/v1/propos/rental-arbitrage', desc: 'Find rental yield opportunities' },
      { method: 'GET',  path: '/v1/propos/news/sentiment', desc: 'Singapore property sentiment index' },
    ],
    useCases: ['PropTech apps', 'Mortgage brokers', 'Agent CRM tools', 'Investment dashboards'],
  },
  {
    district: 'AceEconomy',
    icon: '💹',
    color: 'text-green-400',
    border: 'border-green-500/30',
    bg: 'bg-green-500/10',
    badge: 'bg-green-500/20 text-green-400',
    plan: 'Citizen+',
    price: '$19/mo',
    endpoints: [
      { method: 'GET',  path: '/v1/economy/signals', desc: 'Live momentum signals — US & HK stocks' },
      { method: 'GET',  path: '/v1/economy/scanner', desc: 'RSI + MACD scanner results' },
      { method: 'GET',  path: '/v1/economy/squeeze', desc: 'Volatility squeeze opportunities' },
      { method: 'GET',  path: '/v1/economy/earnings', desc: 'Upcoming earnings catalysts' },
    ],
    useCases: ['Retail trading apps', 'Robo-advisors', 'Financial newsletters', 'Portfolio trackers'],
  },
  {
    district: 'NexusTravel',
    icon: '✈️',
    color: 'text-purple-400',
    border: 'border-purple-500/30',
    bg: 'bg-purple-500/10',
    badge: 'bg-purple-500/20 text-purple-400',
    plan: 'Citizen+',
    price: '$19/mo',
    endpoints: [
      { method: 'GET',  path: '/v1/travel/deals', desc: 'Live flight & hotel deal alerts' },
      { method: 'POST', path: '/v1/travel/monitor', desc: 'Set a price-drop monitor for a route' },
      { method: 'GET',  path: '/v1/travel/currency', desc: 'FX signals for travel routes' },
      { method: 'GET',  path: '/v1/travel/alerts', desc: 'Recent alerts fired on monitored routes' },
    ],
    useCases: ['Travel apps', 'Corporate travel tools', 'Points optimisers', 'Deal newsletters'],
  },
  {
    district: 'Commerce',
    icon: '🛒',
    color: 'text-amber-400',
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/10',
    badge: 'bg-amber-500/20 text-amber-400',
    plan: 'Enterprise',
    price: 'Custom',
    endpoints: [
      { method: 'GET',  path: '/v1/commerce/arbitrage', desc: 'Price gaps across Shopee, Lazada, Amazon' },
      { method: 'POST', path: '/v1/commerce/scan', desc: 'Scan a product category for gaps' },
      { method: 'GET',  path: '/v1/commerce/competitors', desc: 'Competitor price movements' },
      { method: 'POST', path: '/v1/commerce/list', desc: 'Auto-generate optimised listing copy' },
    ],
    useCases: ['eCommerce sellers', 'Dropshipping tools', 'Amazon/Shopee analytics', 'Sourcing agents'],
  },
]

const METHOD_COLOR: Record<string, string> = {
  GET:  'bg-blue-500/20 text-blue-400',
  POST: 'bg-green-500/20 text-green-400',
  DELETE: 'bg-red-500/20 text-red-400',
}

export default function DeveloperPage() {
  const [activeApi, setActiveApi] = useState(0)
  const api = APIS[activeApi]

  return (
    <div className="min-h-screen bg-[#0A0E1A] text-white">
      {/* Nav */}
      <nav className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold gradient-text">X68</Link>
        <div className="flex items-center gap-4">
          <Link href="/citizen/login" className="text-sm text-gray-400 hover:text-white transition">Sign in</Link>
          <Link href="/citizen/register" className="text-sm bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-4 py-1.5 rounded-lg transition">
            Get API Key
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-5xl mx-auto px-6 py-16 text-center">
        <div className="inline-flex items-center gap-2 text-xs text-cyan-400 border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 rounded-full mb-6">
          <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
          Developer API — Beta
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Build on the<br /><span className="gradient-text">X68 Network</span>
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-8">
          Five AI-powered district APIs — property intelligence, market signals, travel deals, commerce arbitrage, and wellness. One key, all districts.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/citizen/register" className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-6 py-3 rounded-lg transition text-sm">
            Start Free — Get API Key
          </Link>
          <a href="#endpoints" className="text-sm text-gray-400 hover:text-white transition border border-white/10 px-6 py-3 rounded-lg">
            View Endpoints
          </a>
        </div>
      </div>

      {/* Pricing strip */}
      <div className="border-y border-white/10 bg-white/2 py-8">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-3 gap-6">
          {[
            { tier: 'Explorer', price: 'Free', calls: '100 calls/day', note: 'No credit card' },
            { tier: 'Citizen', price: '$19/mo', calls: '10,000 calls/day', note: 'All 5 districts' },
            { tier: 'Enterprise', price: 'Custom', calls: 'Unlimited', note: 'SLA + dedicated support' },
          ].map(p => (
            <div key={p.tier} className="text-center">
              <div className="text-lg font-bold text-white">{p.price}</div>
              <div className="text-sm text-cyan-400 font-medium">{p.tier}</div>
              <div className="text-xs text-gray-500 mt-1">{p.calls}</div>
              <div className="text-xs text-gray-600">{p.note}</div>
            </div>
          ))}
        </div>
      </div>

      {/* API Explorer */}
      <div id="endpoints" className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold mb-8">API Reference</h2>

        <div className="flex gap-6">
          {/* District tabs */}
          <div className="w-44 shrink-0 space-y-2">
            {APIS.map((a, i) => (
              <button
                key={a.district}
                onClick={() => setActiveApi(i)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition flex items-center gap-2 ${
                  activeApi === i
                    ? `${a.bg} ${a.color} border ${a.border}`
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>{a.icon}</span>
                {a.district}
              </button>
            ))}
          </div>

          {/* Endpoint panel */}
          <div className="flex-1">
            <div className={`p-5 rounded-xl border ${api.border} ${api.bg} mb-5`}>
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-white">{api.icon} {api.district} API</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full ${api.badge}`}>
                  {api.plan} · {api.price}
                </span>
              </div>
              <p className="text-sm text-gray-400">Use cases: {api.useCases.join(' · ')}</p>
            </div>

            <div className="space-y-3">
              {api.endpoints.map(ep => (
                <div key={ep.path} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4">
                  <span className={`text-xs font-mono px-2 py-0.5 rounded ${METHOD_COLOR[ep.method] ?? 'bg-gray-500/20 text-gray-400'} shrink-0`}>
                    {ep.method}
                  </span>
                  <code className="text-sm text-cyan-300 font-mono">{ep.path}</code>
                  <span className="text-sm text-gray-500 ml-auto text-right">{ep.desc}</span>
                </div>
              ))}
            </div>

            {/* Auth example */}
            <div className="mt-6 bg-black/40 border border-white/10 rounded-xl p-4">
              <div className="text-xs text-gray-500 mb-2 font-mono">Authentication</div>
              <pre className="text-xs text-green-400 font-mono overflow-x-auto">{`curl https://master-page-ace-ecotopia.vercel.app/v1/${api.district.toLowerCase()}/signals \\
  -H "Authorization: Bearer YOUR_API_KEY"`}</pre>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-2xl p-10">
          <h3 className="text-2xl font-bold mb-2">Ready to build?</h3>
          <p className="text-gray-400 mb-6 text-sm">Get your API key in 30 seconds. Free tier, no credit card.</p>
          <Link href="/citizen/register" className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-8 py-3 rounded-lg transition">
            Get Your API Key →
          </Link>
        </div>
      </div>
    </div>
  )
}
