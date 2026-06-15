'use client'

import { useState } from 'react'

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className={`text-xs border px-3 py-2 rounded-lg transition-all duration-200 ${
        copied
          ? 'border-green-500/40 bg-green-500/10 text-green-400'
          : 'border-white/10 text-gray-400 hover:text-white hover:border-white/25'
      }`}
    >
      {copied ? '✓ Copied!' : 'Copy'}
    </button>
  )
}
