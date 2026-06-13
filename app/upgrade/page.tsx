'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PLANS } from '@/lib/stripe'

export default function UpgradePage() {
  const [loading, setLoading] = useState<string | null>(null)

  async function checkout(plan: 'citizen' | 'enterprise') {
    setLoading(plan)
    const res = await fetch('/api/stripe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    })
    const data = await res.json()
    if (data.url) {
      window.location.href = data.url
    } else if (data.error === 'Unauthorized') {
      window.location.href = '/citizen/login'
    }
    setLoading(null)
  }

  return (
    <div className="min-h-screen bg-[#0A0E1A] text-white">
      <nav className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold gradient-text">X68</Link>
        <Link href="/citizen/dashboard" className="text-sm text-gray-400 hover:text-white transition">
          ← Dashboard
        </Link>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-3">
            Upgrade Your <span className="gradient-text">Citizenship</span>
          </h1>
          <p className="text-gray-400">Unlock full district access and higher API limits</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Citizen */}
          <div className="bg-white/5 border border-cyan-500/30 rounded-2xl p-8 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-cyan-500 text-black text-xs font-bold px-3 py-1 rounded-full">
              MOST POPULAR
            </div>
            <div className="text-cyan-400 font-semibold mb-1">Citizen</div>
            <div className="text-4xl font-bold text-white mb-1">$19</div>
            <div className="text-gray-500 text-sm mb-6">per month</div>
            <ul className="space-y-2 mb-8">
              {PLANS.citizen.features.map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                  <span className="text-cyan-400">✓</span> {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => checkout('citizen')}
              disabled={loading !== null}
              className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-bold py-3 rounded-xl transition"
            >
              {loading === 'citizen' ? 'Redirecting…' : 'Upgrade to Citizen'}
            </button>
          </div>

          {/* Enterprise */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
            <div className="text-yellow-400 font-semibold mb-1">Enterprise</div>
            <div className="text-4xl font-bold text-white mb-1">$99</div>
            <div className="text-gray-500 text-sm mb-6">per month</div>
            <ul className="space-y-2 mb-8">
              {PLANS.enterprise.features.map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                  <span className="text-yellow-400">✓</span> {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => checkout('enterprise')}
              disabled={loading !== null}
              className="w-full border border-yellow-400/50 hover:bg-yellow-400/10 disabled:opacity-50 text-yellow-400 font-bold py-3 rounded-xl transition"
            >
              {loading === 'enterprise' ? 'Redirecting…' : 'Upgrade to Enterprise'}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-600 mt-8">
          Secure payment via Stripe · Cancel anytime · Credits earned are yours to keep
        </p>
      </div>
    </div>
  )
}
