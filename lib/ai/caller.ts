/**
 * Provider-agnostic AI caller for AceEcotopia
 * Supports: Gemini (free), Groq (free), Claude Haiku/Sonnet/Opus (paid)
 * Switch models via admin panel → stored in DB or env var AI_PROVIDER
 *
 * Usage:
 *   const result = await callAI({ prompt: 'Summarise this property...', maxTokens: 512 })
 */

export type AIProvider = 'gemini' | 'groq' | 'claude-haiku' | 'claude-sonnet' | 'claude-opus'

export interface AICallOptions {
  prompt: string
  systemPrompt?: string
  maxTokens?: number
  provider?: AIProvider   // override — if omitted, uses getActiveProvider()
  temperature?: number
}

export interface AIResult {
  text: string
  provider: AIProvider
  tokensUsed?: number
}

// ---------------------------------------------------------------
// Which provider is active? Read from env or a runtime config store
// ---------------------------------------------------------------
export function getActiveProvider(): AIProvider {
  const p = (process.env.AI_PROVIDER || 'gemini') as AIProvider
  const valid: AIProvider[] = ['gemini', 'groq', 'claude-haiku', 'claude-sonnet', 'claude-opus']
  return valid.includes(p) ? p : 'gemini'
}

// ---------------------------------------------------------------
// Main dispatcher
// ---------------------------------------------------------------
export async function callAI(opts: AICallOptions): Promise<AIResult> {
  const provider = opts.provider ?? getActiveProvider()

  switch (provider) {
    case 'gemini':
      return callGemini(opts)
    case 'groq':
      return callGroq(opts)
    case 'claude-haiku':
    case 'claude-sonnet':
    case 'claude-opus':
      return callClaude(opts, provider)
    default:
      return callGemini(opts)
  }
}

// ---------------------------------------------------------------
// Gemini — free tier (gemini-1.5-flash)
// ---------------------------------------------------------------
async function callGemini(opts: AICallOptions): Promise<AIResult> {
  const key = process.env.GOOGLE_API_KEY
  if (!key) throw new Error('GOOGLE_API_KEY not set')

  const model = 'gemini-1.5-flash'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`

  const body = {
    contents: [
      ...(opts.systemPrompt ? [{ role: 'user', parts: [{ text: opts.systemPrompt }] }] : []),
      { role: 'user', parts: [{ text: opts.prompt }] },
    ],
    generationConfig: {
      maxOutputTokens: opts.maxTokens ?? 512,
      temperature: opts.temperature ?? 0.4,
    },
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini error ${res.status}: ${err}`)
  }

  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  const tokensUsed = data.usageMetadata?.totalTokenCount

  return { text, provider: 'gemini', tokensUsed }
}

// ---------------------------------------------------------------
// Groq — free tier (llama-3.1-8b-instant)
// ---------------------------------------------------------------
async function callGroq(opts: AICallOptions): Promise<AIResult> {
  const key = process.env.GROQ_API_KEY
  if (!key) throw new Error('GROQ_API_KEY not set')

  const messages: { role: string; content: string }[] = []
  if (opts.systemPrompt) messages.push({ role: 'system', content: opts.systemPrompt })
  messages.push({ role: 'user', content: opts.prompt })

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages,
      max_tokens: opts.maxTokens ?? 512,
      temperature: opts.temperature ?? 0.4,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Groq error ${res.status}: ${err}`)
  }

  const data = await res.json()
  const text = data.choices?.[0]?.message?.content ?? ''
  const tokensUsed = data.usage?.total_tokens

  return { text, provider: 'groq', tokensUsed }
}

// ---------------------------------------------------------------
// Claude — paid (Haiku cheapest, Opus most capable)
// ---------------------------------------------------------------
const CLAUDE_MODELS: Record<string, string> = {
  'claude-haiku':  'claude-haiku-4-5',
  'claude-sonnet': 'claude-sonnet-4-6',
  'claude-opus':   'claude-opus-4-8',
}

async function callClaude(opts: AICallOptions, provider: AIProvider): Promise<AIResult> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('ANTHROPIC_API_KEY not set')

  const model = CLAUDE_MODELS[provider]

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: opts.maxTokens ?? 512,
      ...(opts.systemPrompt ? { system: opts.systemPrompt } : {}),
      messages: [{ role: 'user', content: opts.prompt }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Claude error ${res.status}: ${err}`)
  }

  const data = await res.json()
  const text = data.content?.[0]?.text ?? ''
  const tokensUsed = data.usage ? data.usage.input_tokens + data.usage.output_tokens : undefined

  return { text, provider, tokensUsed }
}

// ---------------------------------------------------------------
// Cost estimate helper (for admin panel display)
// ---------------------------------------------------------------
export function estimateCost(provider: AIProvider, tokens: number): string {
  const rates: Record<AIProvider, number> = {
    'gemini':        0,        // free tier
    'groq':          0,        // free tier
    'claude-haiku':  0.000001, // ~$1/1M
    'claude-sonnet': 0.000003, // ~$3/1M input
    'claude-opus':   0.000005, // ~$5/1M input
  }
  const cost = (rates[provider] ?? 0) * tokens
  return cost === 0 ? 'Free' : `~$${cost.toFixed(5)}`
}
