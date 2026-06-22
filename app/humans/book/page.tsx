'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useLocale } from '@/hooks/useLocale'

type Expert = {
  id: string
  full_name: string
  district: string
  role_title: string
  fee_per_session: number
  available_hours: string
  bio: string
}

function BookingForm() {
  const { locale } = useLocale()
  const zh = locale === 'zh'
  const params = useSearchParams()
  const expertId = params.get('expert') ?? ''

  const [expert, setExpert] = useState<Expert | null>(null)
  const [form, setForm] = useState({ citizen_name: '', citizen_email: '', citizen_telegram: '', brief: '', preferred_time: '' })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!expertId) return
    const supabase = createClient()
    supabase.from('human_experts').select('id,full_name,district,role_title,fee_per_session,available_hours,bio')
      .eq('id', expertId).single()
      .then(({ data }) => setExpert(data as Expert))
  }, [expertId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    await supabase.from('human_bookings').insert({
      expert_id: expertId,
      ...form,
      status: 'pending',
      fee_agreed: expert?.fee_per_session,
    })
    setLoading(false)
    setSubmitted(true)
  }

  const inputCls = "w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors text-sm"
  const labelCls = "block text-slate-400 text-xs font-semibold uppercase tracking-widest mb-2"

  if (submitted) return (
    <div className="min-h-screen bg-[#080C18] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">🎯</div>
        <h1 className="text-2xl font-bold mb-3">{zh ? '预约请求已发送！' : 'Booking request sent!'}</h1>
        <p className="text-slate-400 text-sm mb-6">
          {zh
            ? `${expert?.full_name} 将在 24 小时内通过 Telegram 与您联系确认时间。`
            : `${expert?.full_name} will reach out via Telegram within 24h to confirm your session.`}
        </p>
        <Link href="/humans/directory" className="text-cyan-400 hover:text-cyan-300 text-sm">
          {zh ? '← 返回专家目录' : '← Back to directory'}
        </Link>
      </div>
    </div>
  )

  return (
    <main className="min-h-screen bg-[#080C18] text-white">
      <div className="border-b border-slate-800 px-6 py-3 flex items-center gap-3">
        <Link href="/humans/directory" className="text-slate-400 hover:text-white text-sm transition-colors">← Directory</Link>
        <span className="text-slate-700">/</span>
        <span className="text-cyan-400 text-sm font-semibold">{zh ? '预约咨询' : 'Book Session'}</span>
      </div>

      <div className="max-w-xl mx-auto px-6 py-12">
        {expert && (
          <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 mb-8">
            <div className="font-bold text-white">{expert.full_name}</div>
            <div className="text-slate-400 text-sm">{expert.role_title}</div>
            <div className="flex items-center justify-between mt-3">
              <span className="text-slate-500 text-xs">🕐 {expert.available_hours || 'By arrangement'}</span>
              <span className="text-white font-bold">S${expert.fee_per_session} <span className="text-slate-500 font-normal text-xs">/ session</span></span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className={labelCls}>{zh ? '您的姓名' : 'Your Name'} *</label>
            <input required className={inputCls} placeholder={zh ? '您的全名' : 'Your full name'}
              value={form.citizen_name} onChange={e => setForm(f => ({ ...f, citizen_name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>{zh ? '电子邮件' : 'Email'} *</label>
              <input required type="email" className={inputCls} placeholder="you@email.com"
                value={form.citizen_email} onChange={e => setForm(f => ({ ...f, citizen_email: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Telegram</label>
              <input className={inputCls} placeholder="@handle"
                value={form.citizen_telegram} onChange={e => setForm(f => ({ ...f, citizen_telegram: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className={labelCls}>{zh ? '您需要什么帮助？' : 'What do you need help with?'} *</label>
            <textarea required rows={4} className={inputCls}
              placeholder={zh ? '简要描述您的情况和问题...' : 'Brief description of your situation and what you need...'}
              value={form.brief} onChange={e => setForm(f => ({ ...f, brief: e.target.value }))} />
          </div>
          <div>
            <label className={labelCls}>{zh ? '偏好时间（SGT）' : 'Preferred time (SGT)'}</label>
            <input className={inputCls} placeholder={zh ? '例如：本周六下午 3–5PM SGT' : 'e.g. This Saturday 3–5PM SGT'}
              value={form.preferred_time} onChange={e => setForm(f => ({ ...f, preferred_time: e.target.value }))} />
          </div>

          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 text-xs text-slate-400 space-y-1">
            <p>🔒 {zh ? '您的联系方式仅在双方确认后对专家可见。' : 'Your contact details are only shared with the expert after both parties confirm.'}</p>
            <p>💳 {zh ? '确认后通过 Stripe 支付。' : 'Payment via Stripe after confirmation.'}</p>
            <p>🔄 {zh ? '如专家未在 24 小时内回复，自动退款。' : 'Auto-refund if expert doesn\'t respond within 24h.'}</p>
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-colors text-lg">
            {loading ? (zh ? '发送中…' : 'Sending…') : (zh ? `发送预约请求 — S$${expert?.fee_per_session ?? '—'}` : `Send Booking Request — S$${expert?.fee_per_session ?? '—'}`)}
          </button>
        </form>
      </div>
    </main>
  )
}

export default function BookPage() {
  return <Suspense fallback={<div className="min-h-screen bg-[#080C18]" />}><BookingForm /></Suspense>
}
