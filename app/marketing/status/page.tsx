'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLocale } from '@/hooks/useLocale'

export default function StatusLookupPage() {
  const { locale } = useLocale()
  const zh = locale === 'zh'
  const router = useRouter()
  const [jobId, setJobId] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = jobId.trim()
    if (!trimmed) return
    router.push(`/marketing/status/${trimmed}`)
  }

  return (
    <main className="min-h-screen bg-[#080C18] text-white flex flex-col">
      <div className="border-b border-slate-800 px-6 py-3 flex items-center gap-3">
        <Link href="/marketing" className="text-slate-400 hover:text-white text-sm transition-colors">
          ← MarketingOS
        </Link>
        <span className="text-slate-700">/</span>
        <span className="text-rose-400 text-sm font-semibold">
          {zh ? '查询状态' : 'Check Status'}
        </span>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-bold text-center mb-2">
            {zh ? '查询视频状态' : 'Check Your Video Status'}
          </h1>
          <p className="text-slate-400 text-sm text-center mb-8">
            {zh ? '输入您在提交时收到的任务 ID' : 'Enter the job ID you received after submitting'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              value={jobId}
              onChange={e => setJobId(e.target.value)}
              placeholder={zh ? '任务 ID，例如：3f2988a4-8085-41c4-…' : 'Job ID, e.g. 3f2988a4-8085-41c4-…'}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors font-mono text-sm"
            />
            <button
              type="submit"
              disabled={!jobId.trim()}
              className="w-full bg-rose-500 hover:bg-rose-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {zh ? '查询 →' : 'Look Up →'}
            </button>
          </form>

          <p className="text-slate-500 text-xs text-center mt-6">
            {zh
              ? '任务 ID 已通过 Telegram 或页面确认发送给您。'
              : 'Your job ID was sent to you via Telegram or shown on the confirmation screen.'}
          </p>
        </div>
      </div>
    </main>
  )
}
