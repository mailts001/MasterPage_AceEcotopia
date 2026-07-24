import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Cache so we're not hitting Supabase on every request
let _cached: boolean | null = null
let _cachedAt = 0
const CACHE_TTL_MS = 60_000 // 60 seconds

export async function isPromoMode(): Promise<boolean> {
  // Local dev override via env var
  if (process.env.PROMO_MODE === 'true') return true
  if (process.env.PROMO_MODE === 'false') return false

  const now = Date.now()
  if (_cached !== null && now - _cachedAt < CACHE_TTL_MS) return _cached

  try {
    const { data } = await supabaseAdmin
      .from('platform_settings')
      .select('value')
      .eq('id', 'promo_mode')
      .single()
    _cached = data?.value === 'true'
  } catch {
    _cached = false
  }
  _cachedAt = now
  return _cached
}

export function invalidatePromoCache() {
  _cached = null
  _cachedAt = 0
}
