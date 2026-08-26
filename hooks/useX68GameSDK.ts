'use client'

import { useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { CampaignPlacement, GameSession, RewardUnlock } from '@/lib/game/types'

interface SDKState {
  session: GameSession | null
  loading: boolean
  error: string | null
}

export function useX68GameSDK(districtId: string, gameId: string) {
  const supabase = createClient()
  const [state, setState] = useState<SDKState>({ session: null, loading: false, error: null })
  const sessionRef = useRef<string | null>(null)

  // ─── Fetch live campaign placements for this game slot ───────────────────

  const getCampaignProducts = useCallback(async (): Promise<CampaignPlacement[]> => {
    const { data, error } = await supabase
      .from('campaign_placements')
      .select(`
        id, game_role, priority,
        campaign_id,
        campaigns!inner ( id, status, start_date, end_date ),
        products ( id, merchant_id, name, image_url, price, currency, category, description,
          merchants ( id, name, logo_url, category )
        ),
        coupons ( id, product_id, reward_type, value, code, inventory, redeemed_count, daily_cap, expires_at )
      `)
      .eq('district_id', districtId)
      .eq('game_id', gameId)
      .order('priority', { ascending: false })
      .limit(20)

    if (error) throw new Error(error.message)

    return (data ?? []).map((row: any) => ({
      id:          row.id,
      campaign_id: row.campaign_id,
      campaign:    row.campaigns,
      district_id: districtId,
      game_id:     gameId,
      game_role:   row.game_role,
      priority:    row.priority,
      product:     { ...row.products, merchant: row.products?.merchants },
      coupon:      row.coupons,
    }))
  }, [districtId, gameId, supabase])

  // ─── Start a game session ────────────────────────────────────────────────

  const startSession = useCallback(async (): Promise<string> => {
    setState(s => ({ ...s, loading: true, error: null }))
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('game_sessions')
      .insert({ user_id: user.id, district_id: districtId, game_id: gameId })
      .select()
      .single()

    if (error) { setState(s => ({ ...s, loading: false, error: error.message })); throw error }

    sessionRef.current = data.id
    setState({ session: data, loading: false, error: null })
    return data.id
  }, [districtId, gameId, supabase])

  // ─── Submit score at end ─────────────────────────────────────────────────

  const submitScore = useCallback(async (score: number, xpEarned: number) => {
    if (!sessionRef.current) return
    const { error } = await supabase
      .from('game_sessions')
      .update({ score, xp_earned: xpEarned, ended_at: new Date().toISOString(), completed: true })
      .eq('id', sessionRef.current)

    if (error) console.error('[SDK] submitScore:', error.message)

    // Upsert citizen wallet
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.rpc('upsert_citizen_xp', { p_user_id: user.id, p_xp: xpEarned }).maybeSingle()
  }, [supabase])

  // ─── Unlock a reward coupon ──────────────────────────────────────────────

  const unlockReward = useCallback(async (couponId: string): Promise<RewardUnlock> => {
    if (!sessionRef.current) throw new Error('No active session')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .rpc('claim_coupon', {
        p_coupon_id:  couponId,
        p_user_id:    user.id,
        p_session_id: sessionRef.current,
      })

    if (error) throw new Error(error.message)
    return data as RewardUnlock
  }, [supabase])

  // ─── Analytics event ─────────────────────────────────────────────────────

  const trackEvent = useCallback((eventName: string, payload?: Record<string, unknown>) => {
    // Lightweight — extend with PostHog / Mixpanel if needed
    if (typeof window !== 'undefined' && (window as any).posthog) {
      (window as any).posthog.capture(eventName, { district_id: districtId, game_id: gameId, ...payload })
    }
  }, [districtId, gameId])

  // ─── End session without score (quit / timeout) ──────────────────────────

  const endSession = useCallback(async () => {
    if (!sessionRef.current) return
    await supabase
      .from('game_sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', sessionRef.current)
    sessionRef.current = null
    setState({ session: null, loading: false, error: null })
  }, [supabase])

  return {
    ...state,
    getCampaignProducts,
    startSession,
    submitScore,
    unlockReward,
    trackEvent,
    endSession,
  }
}
