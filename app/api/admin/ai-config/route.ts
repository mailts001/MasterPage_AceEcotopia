import { NextResponse } from 'next/server'
import { getActiveProvider } from '@/lib/ai/caller'

const ADMIN_KEY = process.env.ADMIN_SECRET_KEY || 'changeme'
const VALID_PROVIDERS = ['gemini', 'groq', 'claude-haiku', 'claude-sonnet', 'claude-opus']

// In-memory for now — replace with Supabase ai_config table read/write
// once Supabase is connected
let activeProvider = process.env.AI_PROVIDER || 'gemini'

function checkAdmin(req: Request): boolean {
  return req.headers.get('x-admin-key') === ADMIN_KEY
}

export async function GET(req: Request) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.json({
    provider: activeProvider,
    token_stats: null, // wire to Supabase later
  })
}

export async function POST(req: Request) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { provider } = await req.json()
  if (!VALID_PROVIDERS.includes(provider)) {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
  }
  activeProvider = provider
  // TODO: persist to Supabase ai_config table
  return NextResponse.json({ ok: true, provider })
}
