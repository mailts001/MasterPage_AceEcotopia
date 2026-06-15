'use client'

import { useState } from 'react'

interface Props {
  initialLinked: boolean
}

export default function TelegramLink({ initialLinked }: Props) {
  const [linked,   setLinked]   = useState(initialLinked)
  const [code,     setCode]     = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [unlinking,setUnlinking]= useState(false)
  const [copied,   setCopied]   = useState(false)

  const getCode = async () => {
    setLoading(true)
    const res = await fetch('/api/citizen/telegram/link-code')
    const data = await res.json()
    if (data.already_linked) {
      setLinked(true)
    } else {
      setCode(data.code)
    }
    setLoading(false)
  }

  const copyCommand = async () => {
    await navigator.clipboard.writeText(`/linkx68 ${code}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const unlink = async () => {
    setUnlinking(true)
    await fetch('/api/citizen/telegram/link-code', { method: 'DELETE' })
    setLinked(false); setCode(null)
    setUnlinking(false)
  }

  if (linked) return (
    <div className="flex items-center justify-between bg-green-500/8 border border-green-500/20 rounded-xl px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="text-lg">✈️</span>
        <div>
          <p className="text-sm font-medium text-green-400">Telegram connected</p>
          <p className="text-xs text-slate-500">Signal alerts will be delivered instantly</p>
        </div>
      </div>
      <button onClick={unlink} disabled={unlinking}
        className="text-xs text-slate-600 hover:text-red-400 transition">
        {unlinking ? 'Unlinking…' : 'Unlink'}
      </button>
    </div>
  )

  if (code) return (
    <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-cyan-400">
        <span>✈️</span> Connect your Telegram
      </div>

      <ol className="space-y-2 text-xs text-slate-400">
        <li className="flex gap-2">
          <span className="text-cyan-500 font-mono font-bold shrink-0">1.</span>
          Open Telegram and search for{' '}
          <a href="https://t.me/AceIBKRTradingBot" target="_blank" rel="noopener noreferrer"
            className="text-cyan-400 underline">@AceIBKRTradingBot</a>
        </li>
        <li className="flex gap-2">
          <span className="text-cyan-500 font-mono font-bold shrink-0">2.</span>
          Send this command to the bot:
        </li>
      </ol>

      {/* Command to copy */}
      <div className="flex items-center gap-2">
        <code className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2
          text-cyan-300 font-mono text-sm tracking-wider">
          /linkx68 {code}
        </code>
        <button onClick={copyCommand}
          className={`shrink-0 text-xs px-3 py-2 rounded-lg border transition-all ${
            copied
              ? 'border-green-500/40 bg-green-500/10 text-green-400'
              : 'border-white/10 text-slate-400 hover:text-white'
          }`}>
          {copied ? '✓ Copied!' : 'Copy'}
        </button>
      </div>

      <p className="text-[11px] text-slate-600">
        ⏱ Code expires in 15 minutes · Refresh this page after linking to confirm
      </p>

      <button onClick={() => window.location.reload()}
        className="text-xs text-cyan-500 hover:text-cyan-400 transition underline">
        I sent it — check status
      </button>
    </div>
  )

  return (
    <div className="flex items-center justify-between bg-white/3 border border-white/8 rounded-xl px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="text-lg">📵</span>
        <div>
          <p className="text-sm font-medium text-white">Telegram not connected</p>
          <p className="text-xs text-slate-500">Connect to receive instant signal alerts</p>
        </div>
      </div>
      <button onClick={getCode} disabled={loading}
        className="text-xs bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 border
          border-cyan-500/25 px-3 py-1.5 rounded-lg transition disabled:opacity-40">
        {loading ? 'Generating…' : 'Connect →'}
      </button>
    </div>
  )
}
