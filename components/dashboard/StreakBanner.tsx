'use client'

import { useEffect, useState } from 'react'

interface StreakData {
  streak: number
  credited: boolean
  awarded?: number
  milestone?: string | null
  credits: number
}

export default function StreakBanner({ initialCredits }: { initialCredits: number }) {
  const [streak, setStreak]     = useState<number | null>(null)
  const [toast, setToast]       = useState<string | null>(null)
  const [credits, setCredits]   = useState(initialCredits)

  useEffect(() => {
    fetch('/api/citizen/streak', { method: 'POST' })
      .then(r => r.json())
      .then((d: StreakData) => {
        setStreak(d.streak)
        setCredits(d.credits)
        if (d.credited) {
          const msg = d.milestone
            ? d.milestone
            : `+${d.awarded} credits · ${d.streak}-day streak`
          setToast(msg)
          setTimeout(() => setToast(null), 5000)
        }
      })
      .catch(() => {})
  }, [])

  if (streak === null) return null

  const streakColor =
    streak >= 30 ? 'text-yellow-400' :
    streak >= 7  ? 'text-orange-400' :
    streak >= 3  ? 'text-amber-400'  : 'text-slate-400'

  const flame =
    streak >= 30 ? '🏆' :
    streak >= 7  ? '🔥' :
    streak >= 3  ? '🔥' : '⚡'

  return (
    <>
      {/* Toast notification */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 bg-[#0A0E1A] border border-yellow-500/40 rounded-xl px-4 py-3 shadow-lg animate-fadeInUp">
          <div className="flex items-center gap-2 text-sm">
            <span>✨</span>
            <span className="text-yellow-400 font-medium">{toast}</span>
          </div>
        </div>
      )}

      {/* Inline streak chip in stats */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <div className={`text-xl font-bold font-mono ${streakColor}`}>
          {flame} {streak}
        </div>
        <div className="text-xs text-gray-400 mt-1">Day Streak</div>
        <div className="text-xs text-gray-600 mt-0.5">
          {streak >= 7 ? 'milestone unlocked · +50 bonus' : `${7 - streak} days to 7-day bonus`}
        </div>
      </div>
    </>
  )
}
