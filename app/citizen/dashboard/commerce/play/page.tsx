'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DealHunt from '@/components/game/DealHunt'
import { getTheme } from '@/lib/game/themes'
import type { DealHuntConfig, CampaignPlacement } from '@/lib/game/types'
import { useX68GameSDK } from '@/hooks/useX68GameSDK'

export default function CommercePlayPage() {
  const router  = useRouter()
  const sdk     = useX68GameSDK('ecommerce', 'deal_hunt')
  const [config, setConfig]     = useState<DealHuntConfig | null>(null)
  const [loading, setLoading]   = useState(true)
  const [themeKey]              = useState('snoopy')   // later: read from user preferences

  useEffect(() => {
    sdk.getCampaignProducts()
      .then((placements: CampaignPlacement[]) => {
        // If no live campaigns yet, use demo placements so the game always works
        const live = placements.length > 0 ? placements : DEMO_PLACEMENTS

        setConfig({
          districtId:      'ecommerce',
          gameId:          'deal_hunt',
          durationSeconds: 45,
          roundCount:      3,
          targetCount:     1,
          decoyCount:      5,
          xpPerCorrect:    20,
          xpPerRound:      10,
          placements:      live,
          theme:           getTheme(themeKey),
        })
      })
      .catch(() => {
        setConfig({
          districtId:      'ecommerce',
          gameId:          'deal_hunt',
          durationSeconds: 45,
          roundCount:      3,
          targetCount:     1,
          decoyCount:      5,
          xpPerCorrect:    20,
          xpPerRound:      10,
          placements:      DEMO_PLACEMENTS,
          theme:           getTheme(themeKey),
        })
      })
      .finally(() => setLoading(false))
  }, [themeKey]) // eslint-disable-line

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!config) return null

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Nav */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-white text-sm">
          ← Back
        </button>
        <span className="text-sm text-gray-400 font-mono">E-Commerce District · Deal Hunt</span>
        <span className="text-xs text-gray-600">Theme: Comic Strip</span>
      </div>

      {/* Game */}
      <div className="flex-1 flex items-center justify-center p-4">
        <DealHunt
          config={config}
          onComplete={(score, xp) => {
            // Future: update wallet display, show leaderboard entry
            console.log('[DealHunt] completed', { score, xp })
          }}
        />
      </div>

      <p className="text-center text-xs text-gray-700 pb-4">
        Deals provided by X68 merchants · Win real coupons
      </p>
    </div>
  )
}

// ─── Demo placements (shown when no live campaigns) ───────────────────────────
// Replace product images with real hosted URLs when merchants onboard.

const DEMO_PLACEMENTS: CampaignPlacement[] = [
  {
    id: 'demo-target-1', campaign_id: 'demo', district_id: 'ecommerce', game_id: 'deal_hunt',
    game_role: 'target', priority: 10,
    product: {
      id: 'p1', merchant_id: 'm1', name: 'AirPods Pro',
      image_url: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=80&h=80&fit=crop',
      price: 299, currency: 'SGD', category: 'electronics', description: null,
    },
    coupon: {
      id: 'c1', product_id: 'p1', reward_type: 'coupon_pct', value: 15,
      code: 'DEALHUNT15', inventory: 50, redeemed_count: 0, daily_cap: 10, expires_at: null,
    },
  },
  ...['Sneakers', 'Backpack', 'Watch', 'Sunglasses', 'Headphones'].map((name, i) => ({
    id: `demo-decoy-${i}`, campaign_id: 'demo', district_id: 'ecommerce', game_id: 'deal_hunt',
    game_role: 'decoy' as const, priority: 1,
    product: {
      id: `pd${i}`, merchant_id: 'm1', name,
      image_url: [
        'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=80&h=80&fit=crop',
        'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=80&h=80&fit=crop',
        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=80&h=80&fit=crop',
        'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=80&h=80&fit=crop',
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=80&h=80&fit=crop',
      ][i],
      price: 50 + i * 30, currency: 'SGD', category: 'fashion', description: null,
    },
    coupon: {
      id: `cd${i}`, product_id: `pd${i}`, reward_type: 'coupon_pct' as const, value: 5,
      code: null, inventory: 0, redeemed_count: 0, daily_cap: null, expires_at: null,
    },
  })),
]
