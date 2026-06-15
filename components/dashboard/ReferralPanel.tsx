'use client'

import { useState } from 'react'

interface Props {
  referralCode: string
  citizenName: string
}

const SITE_URL = 'https://master-page-ace-ecotopia.vercel.app'

const SHARE_MESSAGES = [
  `I'm using X68 — AI monitors my property, stocks & travel deals 24/7. Join free with my code and get 50 bonus credits:`,
  `Found this useful: X68 gives you AI signals across property, finance & travel in one place. Use my referral for bonus credits:`,
  `Thought you'd find this interesting — X68 tracks refinance opportunities, stock momentum & flight drops automatically. Join here:`,
]

export default function ReferralPanel({ referralCode, citizenName }: Props) {
  const referralLink = `${SITE_URL}/citizen/register?ref=${referralCode}`
  const [copied, setCopied]           = useState<'link' | 'code' | null>(null)
  const [showEmail, setShowEmail]     = useState(false)
  const [toEmail, setToEmail]         = useState('')
  const [msgIdx, setMsgIdx]           = useState(0)
  const [customNote, setCustomNote]   = useState('')
  const [sending, setSending]         = useState(false)
  const [sent, setSent]               = useState(false)
  const [emailError, setEmailError]   = useState('')

  const copyText = async (text: string, type: 'link' | 'code') => {
    await navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  const shareMessage = SHARE_MESSAGES[msgIdx]
  const fullEmailBody = `${shareMessage}\n\n${referralLink}\n\n${customNote ? `${customNote}\n\n` : ''}— ${citizenName}`

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!toEmail) return
    setSending(true); setEmailError('')
    const res = await fetch('/api/citizen/referral/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: toEmail,
        senderName: citizenName,
        referralCode,
        referralLink,
        message: shareMessage,
        personalNote: customNote,
      }),
    })
    if (res.ok) {
      setSent(true)
      setToEmail(''); setCustomNote('')
      setTimeout(() => { setSent(false); setShowEmail(false) }, 3000)
    } else {
      const d = await res.json()
      setEmailError(d.error ?? 'Failed to send — try copying the link instead')
    }
    setSending(false)
  }

  // Native share API (mobile / desktop with share support)
  const handleNativeShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Join X68 — AI Economic Ecosystem',
        text: shareMessage,
        url: referralLink,
      }).catch(() => {})
    }
  }

  return (
    <div className="bg-gradient-to-br from-yellow-500/5 to-green-500/5 border border-yellow-500/15 rounded-2xl p-6">

      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="font-semibold text-white text-sm mb-1">Invite Friends · Earn Credits</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Friend joins free → <span className="text-yellow-400">+100 credits</span> for you &nbsp;·&nbsp;
            Friend upgrades to Citizen → <span className="text-yellow-400">+500 credits</span>
          </p>
        </div>
        <span className="text-2xl">🎁</span>
      </div>

      {/* Referral link row */}
      <div className="mb-4">
        <label className="text-[11px] text-slate-600 uppercase tracking-wider mb-2 block">Your referral link</label>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-black/30 border border-white/8 px-3 py-2 rounded-lg
            text-cyan-400 font-mono text-xs truncate">
            {referralLink}
          </code>
          <button
            onClick={() => copyText(referralLink, 'link')}
            className={`shrink-0 text-xs px-3 py-2 rounded-lg border transition-all duration-200 ${
              copied === 'link'
                ? 'border-green-500/40 bg-green-500/10 text-green-400'
                : 'border-white/10 text-slate-400 hover:text-white hover:border-white/25'
            }`}
          >
            {copied === 'link' ? '✓ Copied!' : 'Copy link'}
          </button>
        </div>
      </div>

      {/* Code row */}
      <div className="mb-5">
        <label className="text-[11px] text-slate-600 uppercase tracking-wider mb-2 block">Or share your code</label>
        <div className="flex items-center gap-3">
          <code className="bg-black/30 border border-white/8 px-4 py-2 rounded-lg
            text-cyan-400 font-mono text-base tracking-[0.25em] font-bold">
            {referralCode || '——'}
          </code>
          <button
            onClick={() => copyText(referralCode, 'code')}
            className={`text-xs px-3 py-2 rounded-lg border transition-all duration-200 ${
              copied === 'code'
                ? 'border-green-500/40 bg-green-500/10 text-green-400'
                : 'border-white/10 text-slate-400 hover:text-white hover:border-white/25'
            }`}
          >
            {copied === 'code' ? '✓ Copied!' : 'Copy code'}
          </button>
        </div>
      </div>

      {/* Share buttons */}
      <div className="flex flex-wrap gap-2 mb-4">

        {/* Email invite */}
        <button
          onClick={() => setShowEmail(!showEmail)}
          className={`flex items-center gap-2 text-xs px-4 py-2 rounded-lg border transition ${
            showEmail
              ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-400'
              : 'border-white/10 text-slate-400 hover:text-white hover:border-white/20'
          }`}
        >
          <span>✉️</span> Email invite
        </button>

        {/* WhatsApp */}
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`${shareMessage}\n${referralLink}`)}`}
          target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs px-4 py-2 rounded-lg border
            border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition"
        >
          <span>💬</span> WhatsApp
        </a>

        {/* Telegram */}
        <a
          href={`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(shareMessage)}`}
          target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs px-4 py-2 rounded-lg border
            border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition"
        >
          <span>✈️</span> Telegram
        </a>

        {/* Native share (mobile) */}
        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <button
            onClick={handleNativeShare}
            className="flex items-center gap-2 text-xs px-4 py-2 rounded-lg border
              border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition"
          >
            <span>↑</span> Share
          </button>
        )}
      </div>

      {/* Email compose panel */}
      {showEmail && (
        <form onSubmit={handleEmail}
          className="bg-black/20 border border-white/8 rounded-xl p-4 space-y-3 mt-2">

          {sent ? (
            <div className="text-center py-4">
              <div className="text-2xl mb-2">🎉</div>
              <p className="text-green-400 text-sm font-medium">Invite sent!</p>
              <p className="text-slate-500 text-xs mt-1">You'll earn +100 credits when they join.</p>
            </div>
          ) : (
            <>
              <div>
                <label className="text-[11px] text-slate-500 mb-1.5 block">Friend's email</label>
                <input
                  type="email" required
                  value={toEmail} onChange={e => setToEmail(e.target.value)}
                  placeholder="friend@example.com"
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2
                    text-white text-sm placeholder-slate-700 focus:outline-none focus:border-cyan-500/40"
                />
              </div>

              {/* Message selector */}
              <div>
                <label className="text-[11px] text-slate-500 mb-1.5 block">Message tone</label>
                <div className="flex flex-col gap-1.5">
                  {SHARE_MESSAGES.map((m, i) => (
                    <button type="button" key={i}
                      onClick={() => setMsgIdx(i)}
                      className={`text-left text-xs px-3 py-2 rounded-lg border transition ${
                        msgIdx === i
                          ? 'border-cyan-500/40 bg-cyan-500/8 text-slate-300'
                          : 'border-white/5 text-slate-600 hover:text-slate-400'
                      }`}
                    >
                      {m.slice(0, 80)}…
                    </button>
                  ))}
                </div>
              </div>

              {/* Personal note */}
              <div>
                <label className="text-[11px] text-slate-500 mb-1.5 block">
                  Add a personal note <span className="text-slate-700">(optional)</span>
                </label>
                <textarea
                  value={customNote} onChange={e => setCustomNote(e.target.value)}
                  placeholder="Hey, I thought this would be useful for you..."
                  rows={2}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2
                    text-white text-xs placeholder-slate-700 focus:outline-none focus:border-cyan-500/40 resize-none"
                />
              </div>

              {emailError && (
                <p className="text-xs text-red-400">{emailError}</p>
              )}

              <button type="submit" disabled={sending || !toEmail}
                className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40
                  text-black font-semibold text-sm py-2.5 rounded-lg transition">
                {sending ? 'Sending…' : 'Send invite →'}
              </button>
            </>
          )}
        </form>
      )}

      {/* Credit milestones */}
      <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-3 gap-3">
        {[
          { icon: '1️⃣', label: '1 referral', reward: '+100c' },
          { icon: '5️⃣', label: '5 referrals', reward: '+600c' },
          { icon: '🏆', label: 'Friend upgrades', reward: '+500c' },
        ].map(m => (
          <div key={m.label} className="text-center">
            <div className="text-lg mb-0.5">{m.icon}</div>
            <div className="text-[10px] text-slate-600">{m.label}</div>
            <div className="text-xs text-yellow-400 font-mono font-semibold">{m.reward}</div>
          </div>
        ))}
      </div>

    </div>
  )
}
