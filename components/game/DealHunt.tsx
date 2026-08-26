'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { DealHuntConfig, CampaignPlacement } from '@/lib/game/types'
import { useX68GameSDK } from '@/hooks/useX68GameSDK'

type Phase = 'intro' | 'playing' | 'reward' | 'fail' | 'loading'

interface RoundItem {
  placement: CampaignPlacement
  isTarget: boolean
  x: number   // percent
  y: number   // percent
  found: boolean
}

interface Props {
  config: DealHuntConfig
  onComplete?: (score: number, xp: number) => void
}

// Fisher-Yates shuffle
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function randomPos(existing: { x: number; y: number }[], minDist = 18) {
  let x: number, y: number, tries = 0
  do {
    x = 10 + Math.random() * 75
    y = 15 + Math.random() * 60
    tries++
  } while (tries < 50 && existing.some(p => Math.hypot(p.x - x, p.y - y) < minDist))
  return { x, y }
}

export default function DealHunt({ config, onComplete }: Props) {
  const { theme, placements, durationSeconds, decoyCount } = config
  const sdk = useX68GameSDK(config.districtId, config.gameId)

  const [phase, setPhase]         = useState<Phase>('intro')
  const [items, setItems]         = useState<RoundItem[]>([])
  const [timeLeft, setTimeLeft]   = useState(durationSeconds)
  const [score, setScore]         = useState(0)
  const [xp, setXp]               = useState(0)
  const [feedback, setFeedback]   = useState<'correct' | 'wrong' | null>(null)
  const [unlockedCoupon, setUnlockedCoupon] = useState<CampaignPlacement | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const { colors, assets, copy, fontFamily, borderRadius } = theme
  const { mascotIdle: MascotIdle, mascotSuccess: MascotSuccess, mascotFail: MascotFail, guide: Guide } = assets

  // Build round: 1 target + N decoys, scattered randomly
  const buildRound = useCallback(() => {
    const targets   = placements.filter(p => p.game_role === 'target')
    const decoys    = placements.filter(p => p.game_role === 'decoy')
    const target    = targets[Math.floor(Math.random() * targets.length)]
    if (!target) return

    const pool      = shuffle(decoys).slice(0, decoyCount)
    const allItems  = shuffle([target, ...pool])
    const placed: { x: number; y: number }[] = []

    const round: RoundItem[] = allItems.map(p => {
      const pos = randomPos(placed)
      placed.push(pos)
      return { placement: p, isTarget: p.id === target.id, found: false, ...pos }
    })
    setItems(round)
  }, [placements, decoyCount])

  // Start game
  const handleStart = useCallback(async () => {
    setPhase('loading')
    try {
      const id = await sdk.startSession()
      setSessionId(id)
    } catch {
      // Guest play — no session (unauthenticated users can still play, just no wallet credit)
    }
    setScore(0)
    setXp(0)
    setTimeLeft(durationSeconds)
    buildRound()
    setPhase('playing')
    sdk.trackEvent('deal_hunt_start')
  }, [sdk, durationSeconds, buildRound])

  // Timer
  useEffect(() => {
    if (phase !== 'playing') return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!)
          setPhase('fail')
          sdk.trackEvent('deal_hunt_timeout', { score })
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current!)
  }, [phase, sdk, score])

  // Tap handler
  const handleTap = useCallback((item: RoundItem) => {
    if (phase !== 'playing' || item.found) return

    if (item.isTarget) {
      clearInterval(timerRef.current!)
      setFeedback('correct')
      const gained = Math.max(10, Math.round(timeLeft * 2))
      const gainedXp = Math.max(5, Math.round(timeLeft))
      setScore(s => s + gained)
      setXp(x => x + gainedXp)
      setUnlockedCoupon(item.placement)
      setTimeout(async () => {
        // Attempt reward unlock
        if (item.placement.coupon?.id) {
          try { await sdk.unlockReward(item.placement.coupon.id) } catch {}
        }
        setPhase('reward')
        sdk.trackEvent('deal_hunt_correct', { product: item.placement.product.name })
      }, 400)
    } else {
      setFeedback('wrong')
      setScore(s => Math.max(0, s - 5))
      setTimeout(() => setFeedback(null), 500)
      sdk.trackEvent('deal_hunt_wrong_tap')
    }
  }, [phase, timeLeft, sdk])

  // End — submit score
  useEffect(() => {
    if (phase === 'reward' || phase === 'fail') {
      sdk.submitScore(score, xp).catch(() => {})
      if (onComplete && (phase === 'reward' || phase === 'fail')) onComplete(score, xp)
    }
  }, [phase]) // eslint-disable-line

  const bgStyle = { background: colors.background, fontFamily }
  const panelStyle = { background: colors.panel, border: `2px solid ${colors.panelBorder}`, borderRadius }

  return (
    <div className="w-full max-w-lg mx-auto select-none" style={bgStyle}>

      {/* ── INTRO ── */}
      {phase === 'intro' && (
        <div className="p-6 text-center space-y-4" style={panelStyle}>
          <MascotIdle className="w-24 h-24 mx-auto" />
          <Guide className="w-10 h-10 mx-auto" />
          <h2 className="text-2xl font-bold" style={{ color: colors.text }}>{copy.gameName}</h2>
          <p className="text-sm" style={{ color: colors.textMuted }}>{copy.tagline}</p>
          <p className="text-xs px-4" style={{ color: colors.textMuted }}>{copy.objective}</p>
          {placements.length > 0 && (
            <div className="flex items-center gap-3 bg-black/5 rounded-xl p-3 text-left">
              <img src={placements.find(p => p.game_role === 'target')?.product.image_url ?? ''}
                alt="" className="w-12 h-12 object-cover rounded-lg border" />
              <div>
                <div className="text-xs font-semibold" style={{ color: colors.text }}>
                  Find: {placements.find(p => p.game_role === 'target')?.product.name}
                </div>
                <div className="text-xs" style={{ color: colors.reward }}>
                  Win: {placements.find(p => p.game_role === 'target')?.coupon?.reward_type === 'coupon_pct'
                    ? `${placements.find(p => p.game_role === 'target')?.coupon?.value}% off`
                    : `$${placements.find(p => p.game_role === 'target')?.coupon?.value} off`
                  }
                </div>
              </div>
            </div>
          )}
          <button
            onClick={handleStart}
            className="w-full py-3 font-bold text-white rounded-xl transition active:scale-95"
            style={{ background: colors.primary, borderRadius }}>
            {copy.ctaPlay} →
          </button>
        </div>
      )}

      {/* ── LOADING ── */}
      {phase === 'loading' && (
        <div className="p-8 text-center" style={panelStyle}>
          <div className="w-8 h-8 border-4 border-current border-t-transparent rounded-full animate-spin mx-auto"
            style={{ borderColor: colors.primary }} />
        </div>
      )}

      {/* ── PLAYING ── */}
      {phase === 'playing' && (
        <div style={panelStyle} className="overflow-hidden">
          {/* HUD */}
          <div className="flex items-center justify-between px-4 py-2 border-b-2"
            style={{ borderColor: colors.panelBorder }}>
            <div className="text-sm font-bold" style={{ color: colors.text }}>
              {copy.scoreLabel}: <span style={{ color: colors.primary }}>{score}</span>
            </div>
            <div className={`text-lg font-mono font-bold ${timeLeft <= 10 ? 'animate-pulse' : ''}`}
              style={{ color: timeLeft <= 10 ? colors.danger : colors.text }}>
              {timeLeft}s
            </div>
            <Guide className="w-8 h-8" />
          </div>

          {/* Game arena */}
          <div className="relative w-full" style={{ paddingTop: '75%', background: '#f0ece3' }}>
            {/* Feedback flash */}
            {feedback && (
              <div className={`absolute inset-0 pointer-events-none transition-opacity z-20 ${
                feedback === 'correct' ? 'bg-green-400/20' : 'bg-red-400/20'
              }`} />
            )}

            {items.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleTap(item)}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all active:scale-90"
                style={{
                  left:   `${item.x}%`,
                  top:    `${item.y}%`,
                  filter: item.found ? 'opacity(0.3)' : (!item.isTarget ? assets.decoyTint : 'none'),
                  boxShadow: item.isTarget ? `0 0 0 2px ${assets.targetGlow}` : 'none',
                  borderRadius: '12px',
                }}>
                <img
                  src={item.placement.product.image_url}
                  alt={item.placement.product.name}
                  className="w-16 h-16 object-cover rounded-xl border-2 border-black/20 shadow"
                />
              </button>
            ))}
          </div>

          {/* Target reminder */}
          {items[0] && (
            <div className="flex items-center gap-2 px-4 py-2 text-xs" style={{ color: colors.textMuted }}>
              <span>Find →</span>
              <img src={items.find(i => i.isTarget)?.placement.product.image_url ?? ''}
                alt="" className="w-6 h-6 object-cover rounded" />
              <span style={{ color: colors.text, fontWeight: 600 }}>
                {items.find(i => i.isTarget)?.placement.product.name}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── REWARD ── */}
      {phase === 'reward' && (
        <div className="p-6 text-center space-y-4" style={panelStyle}>
          <MascotSuccess className="w-24 h-24 mx-auto" />
          <h2 className="text-2xl font-bold" style={{ color: colors.success }}>{copy.rewardHeadline}</h2>
          <p className="text-sm" style={{ color: colors.textMuted }}>{copy.rewardSub}</p>
          <div className="text-lg font-bold" style={{ color: colors.reward }}>
            +{score} {copy.scoreLabel} · +{xp} XP
          </div>
          {unlockedCoupon?.coupon && (
            <div className="rounded-2xl p-4 border-2 border-dashed space-y-2"
              style={{ borderColor: colors.reward, background: colors.reward + '18' }}>
              <div className="text-xs font-semibold" style={{ color: colors.textMuted }}>Your reward</div>
              <div className="text-xl font-bold" style={{ color: colors.reward }}>
                {unlockedCoupon.coupon.reward_type === 'coupon_pct'
                  ? `${unlockedCoupon.coupon.value}% OFF`
                  : `$${unlockedCoupon.coupon.value} OFF`}
              </div>
              <div className="text-sm font-medium" style={{ color: colors.text }}>
                {unlockedCoupon.product.name}
              </div>
              {unlockedCoupon.coupon.code && (
                <div className="font-mono text-xs bg-black/10 rounded px-3 py-1">
                  {unlockedCoupon.coupon.code}
                </div>
              )}
              <button className="w-full py-2 font-bold text-white rounded-xl"
                style={{ background: colors.reward, borderRadius }}>
                {copy.ctaRedeem} →
              </button>
            </div>
          )}
          <button onClick={handleStart} className="w-full py-2 border-2 font-bold rounded-xl"
            style={{ borderColor: colors.primary, color: colors.primary, borderRadius }}>
            Play again
          </button>
        </div>
      )}

      {/* ── FAIL ── */}
      {phase === 'fail' && (
        <div className="p-6 text-center space-y-4" style={panelStyle}>
          <MascotFail className="w-24 h-24 mx-auto" />
          <h2 className="text-2xl font-bold" style={{ color: colors.danger }}>{copy.failHeadline}</h2>
          <p className="text-sm" style={{ color: colors.textMuted }}>{copy.failSub}</p>
          <div className="text-sm" style={{ color: colors.textMuted }}>Score: {score}</div>
          <button onClick={handleStart} className="w-full py-3 font-bold text-white rounded-xl"
            style={{ background: colors.primary, borderRadius }}>
            Try again
          </button>
        </div>
      )}
    </div>
  )
}
