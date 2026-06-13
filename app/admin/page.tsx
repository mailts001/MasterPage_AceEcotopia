'use client'

import { useState, useEffect } from 'react'

const PROVIDERS = [
  { id: 'gemini',        label: 'Gemini 1.5 Flash',  tier: 'Free',   cost: '$0',         desc: 'Google — fast, generous free tier' },
  { id: 'groq',          label: 'Llama 3.1 8B',       tier: 'Free',   cost: '$0',         desc: 'Groq — ultra-fast inference, free' },
  { id: 'claude-haiku',  label: 'Claude Haiku 4.5',   tier: 'Paid',   cost: '~$1/1M tok', desc: 'Anthropic — cheapest paid, very fast' },
  { id: 'claude-sonnet', label: 'Claude Sonnet 4.6',  tier: 'Paid',   cost: '~$3/1M tok', desc: 'Anthropic — balanced quality/cost' },
  { id: 'claude-opus',   label: 'Claude Opus 4.8',    tier: 'Paid',   cost: '~$5/1M tok', desc: 'Anthropic — highest quality' },
]

export default function AdminPage() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState(false)
  const [current, setCurrent] = useState('gemini')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [tokenStats, setTokenStats] = useState<{ provider: string; tokens: number; cost: string } | null>(null)

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/admin/ai-config', {
      headers: { 'x-admin-key': password },
    })
    if (res.ok) {
      const data = await res.json()
      setCurrent(data.provider)
      setTokenStats(data.token_stats ?? null)
      setAuthed(true)
    } else {
      setAuthError(true)
    }
  }

  async function saveProvider(provider: string) {
    setSaving(true)
    setSaved(false)
    await fetch('/api/admin/ai-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': password },
      body: JSON.stringify({ provider }),
    })
    setCurrent(provider)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#0A0E1A] flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <span className="text-2xl font-bold gradient-text">X68</span>
            <p className="text-gray-400 mt-2 text-sm">Admin Panel</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Admin Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => { setPassword(e.target.value); setAuthError(false) }}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500/50 transition text-sm"
                />
                {authError && <p className="text-red-400 text-xs mt-1">Invalid password</p>}
              </div>
              <button
                type="submit"
                className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-semibold py-3 rounded-lg transition text-sm"
              >
                Enter Admin
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0E1A] text-white">
      <nav className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <span className="text-lg font-bold gradient-text">X68 Admin</span>
        <button onClick={() => setAuthed(false)} className="text-sm text-gray-500 hover:text-white transition">
          Lock
        </button>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-xl font-bold mb-1">AI Provider</h1>
        <p className="text-gray-400 text-sm mb-8">
          Switch the AI model used across all districts. Start free, scale up as revenue grows.
        </p>

        <div className="space-y-3 mb-8">
          {PROVIDERS.map(p => (
            <button
              key={p.id}
              onClick={() => saveProvider(p.id)}
              disabled={saving}
              className={`w-full text-left p-4 rounded-xl border transition ${
                current === p.id
                  ? 'bg-cyan-500/10 border-cyan-500/40'
                  : 'bg-white/5 border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full border-2 ${
                    current === p.id ? 'bg-cyan-400 border-cyan-400' : 'border-gray-600'
                  }`} />
                  <div>
                    <div className="font-medium text-white text-sm">{p.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{p.desc}</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    p.tier === 'Free'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {p.tier}
                  </span>
                  <div className="text-xs text-gray-500 mt-1">{p.cost}</div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {saved && (
          <div className="text-center text-sm text-green-400 mb-4">✓ Provider updated</div>
        )}

        {/* Token stats */}
        {tokenStats && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-300 mb-3">Usage This Month</h2>
            <div className="flex gap-6">
              <div>
                <div className="text-xl font-mono text-white">{tokenStats.tokens.toLocaleString()}</div>
                <div className="text-xs text-gray-500">tokens used</div>
              </div>
              <div>
                <div className="text-xl font-mono text-yellow-400">{tokenStats.cost}</div>
                <div className="text-xs text-gray-500">estimated cost</div>
              </div>
              <div>
                <div className="text-xl font-mono text-cyan-400">{tokenStats.provider}</div>
                <div className="text-xs text-gray-500">active provider</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
