// ─── Core game types ────────────────────────────────────────────────────────
// All game components, SDK, and admin work from these shared types.
// Changing a theme never touches these — themes only swap visuals/copy.

export type GameRole = 'target' | 'reward' | 'decoy' | 'collectible' | 'mystery'
export type CampaignObjective = 'sales' | 'awareness' | 'redemption' | 'footfall' | 'leads'
export type CampaignStatus = 'draft' | 'live' | 'paused' | 'ended'
export type RewardType = 'coupon_fixed' | 'coupon_pct' | 'points' | 'merchandise'

// ─── Merchant & product ──────────────────────────────────────────────────────

export interface Merchant {
  id: string
  name: string
  logo_url: string | null
  category: string
  description: string | null
  contact_email: string
  tier: 'basic' | 'campaign' | 'premium'
  created_at: string
}

export interface Product {
  id: string
  merchant_id: string
  merchant?: Merchant
  name: string
  image_url: string
  price: number
  currency: string
  category: string
  description: string | null
}

export interface Coupon {
  id: string
  product_id: string
  product?: Product
  reward_type: RewardType
  value: number          // dollar amount or percentage
  code: string | null    // null = QR/ID based
  inventory: number      // total available
  redeemed_count: number
  daily_cap: number | null
  expires_at: string | null
}

// ─── Campaign ────────────────────────────────────────────────────────────────

export interface Campaign {
  id: string
  merchant_id: string
  merchant?: Merchant
  name: string
  objective: CampaignObjective
  budget: number
  daily_cap: number
  start_date: string
  end_date: string
  status: CampaignStatus
}

export interface CampaignPlacement {
  id: string
  campaign_id: string
  campaign?: Campaign
  district_id: string    // 'ecommerce' | 'financial' | etc
  game_id: string        // 'deal_hunt' | 'market_pulse' | etc
  game_role: GameRole
  priority: number       // higher = appears more often
  product: Product
  coupon: Coupon
}

// ─── Game session ────────────────────────────────────────────────────────────

export interface GameSession {
  id: string
  user_id: string
  district_id: string
  game_id: string
  started_at: string
  ended_at: string | null
  score: number
  xp_earned: number
  completed: boolean
}

export interface RewardUnlock {
  id: string
  user_id: string
  session_id: string
  coupon_id: string
  coupon?: Coupon
  unlocked_at: string
  redeemed_at: string | null
}

// ─── Theme system ─────────────────────────────────────────────────────────────
// Swapping a theme changes ONLY visuals/copy. Game logic never changes.

export interface GameThemeColors {
  background: string      // main game canvas bg
  panel: string           // HUD / info panel bg
  panelBorder: string
  primary: string         // primary action color
  secondary: string       // secondary / accent
  text: string
  textMuted: string
  success: string
  danger: string
  reward: string          // reward/coupon highlight
  scoreGlow: string       // glow behind score
}

export interface GameThemeAssets {
  mascotIdle: React.FC<{ className?: string }>     // SVG component — idle
  mascotSuccess: React.FC<{ className?: string }>  // SVG component — celebrating
  mascotFail: React.FC<{ className?: string }>     // SVG component — sad/shrug
  guide: React.FC<{ className?: string }>          // small helper character
  targetGlow: string        // CSS color for correct-item glow
  decoyTint: string         // CSS filter for wrong items
}

export interface GameThemeCopy {
  gameName: string
  tagline: string
  objective: string         // shown before game starts
  scoreLabel: string        // "Points" / "Happiness" / "Gold"
  timerLabel: string
  rewardHeadline: string    // "You found it!" / "Treasure unlocked!"
  rewardSub: string         // "Snoopy approves." / etc
  failHeadline: string
  failSub: string
  ctaPlay: string
  ctaRedeem: string
  ctaShareScore: string
}

export interface GameThemeSounds {
  bgMusic?: string          // URL — optional
  tapCorrect: string        // URL
  tapWrong: string          // URL
  rewardUnlock: string      // URL
  timerTick?: string        // URL — optional
}

export interface GameTheme {
  id: string                // e.g. 'snoopy' | 'default' | 'lunar_new_year'
  name: string
  colors: GameThemeColors
  assets: GameThemeAssets
  copy: GameThemeCopy
  fontFamily: string        // Google Fonts name or system font
  borderRadius: string      // '8px' | '20px' | etc — controls roundness
}

// ─── Game config (what the engine receives per session) ──────────────────────

export interface DealHuntConfig {
  districtId: 'ecommerce'
  gameId: 'deal_hunt'
  durationSeconds: number   // default 45
  roundCount: number        // how many "find it" rounds
  targetCount: number       // targets per round (usually 1)
  decoyCount: number        // decoys shown alongside target
  xpPerCorrect: number
  xpPerRound: number
  placements: CampaignPlacement[]
  theme: GameTheme
}
