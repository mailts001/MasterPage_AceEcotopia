'use client'

import { useState, useEffect } from 'react'

interface ApiKey {
  id: string
  key_prefix: string
  created_at: string
  tier: string
  calls_today: number
}

export default function ApiKeyManager() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [newKey, setNewKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => { fetchKeys() }, [])

  async function fetchKeys() {
    const res = await fetch('/api/developer/keys')
    if (res.ok) {
      const data = await res.json()
      setKeys(data.keys ?? [])
    }
  }

  async function generateKey() {
    setLoading(true)
    const res = await fetch('/api/developer/keys', { method: 'POST' })
    const data = await res.json()
    if (data.key) {
      setNewKey(data.key)
      fetchKeys()
    }
    setLoading(false)
  }

  async function revokeKey(keyId: string) {
    await fetch('/api/developer/keys', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyId }),
    })
    setKeys(prev => prev.filter(k => k.id !== keyId))
  }

  function copyKey() {
    if (newKey) {
      navigator.clipboard.writeText(newKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-white">API Keys</h3>
          <p className="text-xs text-gray-500 mt-0.5">Use these to access X68 district APIs</p>
        </div>
        <button
          onClick={generateKey}
          disabled={loading}
          className="text-xs bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-semibold px-3 py-1.5 rounded-lg transition"
        >
          {loading ? 'Generating…' : '+ New Key'}
        </button>
      </div>

      {/* Show new key once */}
      {newKey && (
        <div className="mb-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
          <p className="text-xs text-green-400 mb-2">
            ⚠ Copy this key now — it won't be shown again
          </p>
          <div className="flex items-center gap-2">
            <code className="text-xs text-green-300 font-mono bg-black/30 px-3 py-1.5 rounded flex-1 overflow-x-auto">
              {newKey}
            </code>
            <button
              onClick={copyKey}
              className="text-xs text-gray-400 hover:text-white border border-white/10 px-2 py-1.5 rounded transition shrink-0"
            >
              {copied ? '✓' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      {/* Key list */}
      {keys.length === 0 ? (
        <p className="text-sm text-gray-600 text-center py-4">No API keys yet</p>
      ) : (
        <div className="space-y-2">
          {keys.map(k => (
            <div key={k.id} className="flex items-center justify-between bg-black/20 rounded-lg px-4 py-2.5">
              <div>
                <code className="text-xs text-cyan-400 font-mono">{k.key_prefix}</code>
                <div className="text-xs text-gray-600 mt-0.5">
                  {k.calls_today} calls today · Created {new Date(k.created_at).toLocaleDateString()}
                </div>
              </div>
              <button
                onClick={() => revokeKey(k.id)}
                className="text-xs text-red-400 hover:text-red-300 transition"
              >
                Revoke
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-white/10">
        <p className="text-xs text-gray-600">
          Explorer: 1 key · 100 calls/day &nbsp;|&nbsp;
          Citizen: 3 keys · 10,000 calls/day &nbsp;|&nbsp;
          Enterprise: 10 keys · unlimited
        </p>
      </div>
    </div>
  )
}
