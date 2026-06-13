'use client'

import { useState } from 'react'

const SPEND_OPTIONS = [
  {
    action: 'alert_slot',
    icon: '🔔',
    label: '+1 Alert Slot / month',
    detail: 'Permanently increases your monthly alert quota by 1. Stack as many as you want.',
    cost: 100,
    color: 'border-cyan-500/30 hover:border-cyan-500/60',
    badgeColor: 'bg-cyan-500/20 text-cyan-400',
  },
  {
    action: 'api_boost',
    icon: '⚡',
    label: '+1,000 API calls / day',
    detail: 'Adds 1,000 API calls to your daily quota for the next 30 days.',
    cost: 200,
    color: 'border-purple-500/30 hover:border-purple-500/60',
    badgeColor: 'bg-purple-500/20 text-purple-400',
  },
]

export default function CreditsSpend({ credits }: { credits: number }) {
  const [spending, setSpending] = useState<string | null>(null)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [currentCredits, setCurrentCredits] = useState(credits)

  async function handleSpend(action: string, cost: number) {
    if (currentCredits < cost) {
      setResult({ ok: false, message: `Need ${cost} credits — you have ${currentCredits}` })
      return
    }
    setSpending(action); setResult(null)
    const res = await fetch('/api/citizen/credits/spend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    const data = await res.json()
    if (res.ok) {
      setCurrentCredits(data.remaining)
      setResult({ ok: true, message: `✓ Unlocked: ${data.unlocked} · ${data.remaining} credits remaining` })
    } else {
      setResult({ ok: false, message: data.error ?? 'Failed' })
    }
    setSpending(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold">Spend Credits</h2>
          <p className="text-xs text-gray-600 mt-0.5">
            You have <span className="text-yellow-400 font-semibold font-mono">{currentCredits}</span> credits
            · Earn more by referring friends
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {SPEND_OPTIONS.map(opt => {
          const canAfford = currentCredits >= opt.cost
          return (
            <div key={opt.action}
              className={`bg-white/5 border ${opt.color} rounded-xl p-4 transition ${!canAfford ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{opt.icon}</span>
                  <span className="font-semibold text-white text-sm">{opt.label}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-mono font-bold ${opt.badgeColor}`}>
                  {opt.cost}c
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-3 leading-relaxed">{opt.detail}</p>
              <button
                onClick={() => handleSpend(opt.action, opt.cost)}
                disabled={!!spending || !canAfford}
                className="text-xs bg-white/10 hover:bg-white/20 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg transition font-medium">
                {spending === opt.action ? 'Processing…' : canAfford ? `Spend ${opt.cost} credits` : 'Not enough credits'}
              </button>
            </div>
          )
        })}
      </div>

      {result && (
        <div className={`mt-3 text-xs px-4 py-2.5 rounded-lg border ${
          result.ok
            ? 'bg-green-500/10 border-green-500/20 text-green-400'
            : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          {result.message}
        </div>
      )}

      <p className="text-xs text-gray-700 mt-3">
        Referral → +100c · Friend upgrades → +500c · Daily login → +10c (coming soon)
      </p>
    </div>
  )
}
