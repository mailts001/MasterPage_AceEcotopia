'use client'

export default function CopyButton({ text }: { text: string }) {
  return (
    <button
      onClick={() => navigator.clipboard.writeText(text)}
      className="text-xs text-gray-400 hover:text-white border border-white/10 px-3 py-2 rounded-lg transition"
    >
      Copy
    </button>
  )
}
