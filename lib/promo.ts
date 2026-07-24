import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const CACHE_TTL_MS = 60_000

// promo_mode — unlocks everything (citizen + pro) for all visitors
let _promo: boolean | null = null
let _promoAt = 0

export async function isPromoMode(): Promise<boolean> {
  if (process.env.PROMO_MODE === 'true') return true
  if (process.env.PROMO_MODE === 'false') return false
  const now = Date.now()
  if (_promo !== null && now - _promoAt < CACHE_TTL_MS) return _promo
  try {
    const { data } = await supabaseAdmin.from('platform_settings').select('value').eq('id', 'promo_mode').single()
    _promo = data?.value === 'true'
  } catch { _promo = false }
  _promoAt = now
  return _promo
}

// citizen_preview — unlocks citizen-tier content for all visitors (not pro)
let _preview: boolean | null = null
let _previewAt = 0

export async function isCitizenPreview(): Promise<boolean> {
  if (process.env.CITIZEN_PREVIEW === 'true') return true
  if (process.env.CITIZEN_PREVIEW === 'false') return false
  const now = Date.now()
  if (_preview !== null && now - _previewAt < CACHE_TTL_MS) return _preview
  try {
    const { data } = await supabaseAdmin.from('platform_settings').select('value').eq('id', 'citizen_preview').single()
    _preview = data?.value === 'true'
  } catch { _preview = false }
  _previewAt = now
  return _preview
}

export function invalidatePromoCache() {
  _promo = null; _promoAt = 0
  _preview = null; _previewAt = 0
}
