'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function CreditsSpend({ credits }: { credits: number }) {
  const [spending, setSpending]         = useState<string | null>(null)
  const [result, setResult]             = useState<{ ok: boolean; message: string } | null>(null)
  const [currentCredits, setCurrentCredits] = useState(credits)
  const [downloading, setDownloading]   = useState(false)

  const handleExportSignals = async () => {
    if (currentCredits < 30) {
      setResult({ ok: false, message: `Need 30 credits — you have ${currentCredits}` })
      return
    }
    setDownloading(true); setResult(null)
    try {
      const res = await fetch('/api/citizen/credits/export-signals', { method: 'POST' })
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `x68-signals-${new Date().toISOString().slice(0, 10)}.csv`
        document.body.appendChild(a); a.click(); a.remove()
        URL.revokeObjectURL(url)
        setCurrentCredits(c => c - 30)
        setResult({ ok: true, message: '✓ Signal history downloaded · 30 credits spent' })
      } else {
        const d = await res.json()
        setResult({ ok: false, message: d.error ?? 'Download failed' })
      }
    } catch (e) {
      setResult({ ok: false, message: String(e) })
    }
    setDownloading(false)
  }

  async function handleSpend(action: string, cost: number, label: string) {
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
      setResult({ ok: true, message: `✓ ${label} unlocked · ${data.remaining} credits remaining` })
    } else {
      setResult({ ok: false, message: data.error ?? 'Failed' })
    }
    setSpending(null)
  }

  const SPEND_OPTIONS = [
    {
      action: 'export_signals',
      icon: '📊',
      label: 'Download Signal History',
      detail: 'Export all AI picks + squeeze alerts as CSV. Import into Excel, Google Sheets, or your trading app.',
      cost: 30,
      color: 'border-green-500/30 hover:border-green-500/50',
      badge: 'bg-green-500/20 text-green-400',
    },
    {
      action: 'alert_slot',
      icon: '🔔',
      label: '+1 Alert Slot / month',
      detail: 'Permanently increases your monthly Telegram alert quota by 1. Stack as many as you want.',
      cost: 100,
      color: 'border-cyan-500/30 hover:border-cyan-500/50',
      badge: 'bg-cyan-500/20 text-cyan-400',
    },
    {
      action: 'api_boost',
      icon: '⚡',
      label: '+1,000 API calls / day',
      detail: 'Adds 1,000 API calls to your daily quota for 30 days. Pull signals into your own apps.',
      cost: 200,
      color: 'border-purple-500/30 hover:border-purple-500/50',
      badge: 'bg-purple-500/20 text-purple-400',
    },
    {
      action: 'commerce_scan',
      icon: '🛒',
      label: 'Run Fresh Arbitrage Scan',
      detail: 'Triggers Commerce AI agents to run a new discovery scan right now, outside the usual schedule.',
      cost: 150,
      color: 'border-amber-500/30 hover:border-amber-500/50',
      badge: 'bg-amber-500/20 text-amber-400',
    },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-base font-semibold">Nexus Credits</h2>
        <Link href="/upgrade" className="text-xs text-cyan-400 hover:underline">Get more →</Link>
      </div>
      <p className="text-xs text-gray-600 mb-4">
        Balance: <span className="text-yellow-400 font-semibold font-mono">{currentCredits}</span> credits
        · Earn 10/day · 100/referral · 50 on streak milestones
      </p>

      {/* Earn at-a-glance */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        {[
          { icon: '🌅', label: '+10/day',  sub: 'Daily login' },
          { icon: '👥', label: '+100',      sub: 'Per referral' },
          { icon: '🏆', label: '+50 bonus', sub: '7 / 30 / 100 day streak' },
        ].map(e => (
          <div key={e.sub} className="bg-white/3 border border-white/8 rounded-lg p-2.5 text-center">
            <div className="text-lg mb-0.5">{e.icon}</div>
            <div className="text-xs font-bold font-mono text-yellow-400">{e.label}</div>
            <div className="text-[9px] text-slate-600 mt-0.5">{e.sub}</div>
          </div>
        ))}
      </div>

      {/* Spend options */}
      <div className="grid md:grid-cols-2 gap-3">
        {SPEND_OPTIONS.map(opt => {
          const canAfford = currentCredits >= opt.cost
          const isLoading = opt.action === 'export_signals' ? downloading : spending === opt.action

          return (
            <div key={opt.action}
              className={`bg-white/5 border ${opt.color} rounded-xl p-4 transition ${!canAfford ? 'opacity-50' : ''}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{opt.icon}</span>
                  <span className="text-sm font-medium text-white leading-tight">{opt.label}</span>
                </div>
                <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-mono font-bold ${opt.badge}`}>
                  {opt.cost}c
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-3 leading-relaxed">{opt.detail}</p>
              <button
                disabled={!canAfford || !!isLoading}
                onClick={() => opt.action === 'export_signals'
                  ? handleExportSignals()
                  : handleSpend(opt.action, opt.cost, opt.label)
                }
                className={`w-full text-xs py-2 rounded-lg font-medium transition ${
                  canAfford
                    ? 'bg-white/10 hover:bg-white/20 text-white'
                    : 'bg-white/5 text-slate-600 cursor-not-allowed'
                }`}
              >
                {isLoading
                  ? 'Processing…'
                  : canAfford
                    ? `Spend ${opt.cost} credits`
                    : `Need ${opt.cost - currentCredits} more`}
              </button>
            </div>
          )
        })}
      </div>

      {result && (
        <div className={`mt-4 text-xs px-4 py-2.5 rounded-lg border ${
          result.ok
            ? 'border-green-500/30 bg-green-500/10 text-green-400'
            : 'border-red-500/30 bg-red-500/10 text-red-400'
        }`}>
          {result.message}
        </div>
      )}
    </div>
  )
}
