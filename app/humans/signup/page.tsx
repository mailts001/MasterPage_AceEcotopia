'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useLocale } from '@/hooks/useLocale'

const DISTRICT_OPTIONS = [
  { value: 'marketingos', label: '📣 MarketingOS — Content Creator / Copywriter' },
  { value: 'propos',      label: '🏠 PropOS — Licensed Property Agent' },
  { value: 'nexustravel', label: '✈️ NexusTravel — Travel Concierge' },
  { value: 'commerce',    label: '🛒 E-Commerce — Sourcing Agent / Seller Consultant' },
  { value: 'aceeconomy',  label: '💹 Financial — Trading Mentor / Analyst' },
  { value: 'serenity',    label: '🌿 SerenityOS — Wellness Coach' },
]

function SignupForm() {
  const { locale } = useLocale()
  const zh = locale === 'zh'
  const params = useSearchParams()
  const defaultDistrict = params.get('district') ?? ''

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    telegram_handle: '',
    district: defaultDistrict,
    role_title: '',
    qualifications: '',
    credential_number: '',   // CEA / IATA / ICF etc
    portfolio_url: '',
    fee_per_session: '',
    bio: '',
    available_hours: '',     // e.g. "Weekday evenings, SGT"
    languages: 'English',
  })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function update(k: string, v: string) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const supabase = createClient()

      // 1. Insert into Supabase
      const { data, error: err } = await supabase
        .from('human_experts')
        .insert({
          ...form,
          fee_per_session: parseFloat(form.fee_per_session) || 0,
          status: 'pending_review',
        })
        .select('id')
        .single()
      if (err) throw err

      // 2. Trigger AI screening (non-blocking — we show success regardless)
      fetch('/api/humans/screen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expertId: data.id, ...form }),
      }).catch(() => {/* screening failure is silent to user */})

      setSubmitted(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#080C18] flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <div className="text-6xl mb-6">✅</div>
          <h1 className="text-2xl font-bold text-white mb-3">
            {zh ? '申请已提交！' : 'Application received!'}
          </h1>
          <p className="text-slate-400 mb-6">
            {zh
              ? '我们将在 2–3 个工作日内核实您的资质。通过后，您将通过 Telegram 收到通知。'
              : 'We\'ll verify your credentials within 2–3 working days. You\'ll get a Telegram ping once approved.'}
          </p>
          <Link href="/humans/directory" className="text-cyan-400 hover:text-cyan-300 text-sm transition-colors">
            {zh ? '浏览当前专家目录 →' : 'Browse the current expert directory →'}
          </Link>
        </div>
      </div>
    )
  }

  const inputCls = "w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors text-sm"
  const labelCls = "block text-slate-400 text-xs font-semibold uppercase tracking-widest mb-2"

  return (
    <main className="min-h-screen bg-[#080C18] text-white">
      <div className="border-b border-slate-800 px-6 py-3 flex items-center gap-3">
        <Link href="/humans" className="text-slate-400 hover:text-white text-sm transition-colors">← Human Experts</Link>
        <span className="text-slate-700">/</span>
        <span className="text-cyan-400 text-sm font-semibold">{zh ? '专家申请' : 'Expert Signup'}</span>
      </div>

      <div className="max-w-xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-2">{zh ? '加入专家网络' : 'Join the Expert Network'}</h1>
          <p className="text-slate-400 text-sm">
            {zh ? '提交资质后，我们将在 2–3 个工作日内完成核实。' : 'Submit your credentials. We verify within 2–3 working days.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Personal */}
          <div>
            <label className={labelCls}>{zh ? '全名' : 'Full Name'} *</label>
            <input required className={inputCls} placeholder={zh ? '与证书上一致' : 'As on your credentials'}
              value={form.full_name} onChange={e => update('full_name', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>{zh ? '电子邮件' : 'Email'} *</label>
              <input required type="email" className={inputCls} placeholder="you@email.com"
                value={form.email} onChange={e => update('email', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Telegram *</label>
              <input required className={inputCls} placeholder="@handle"
                value={form.telegram_handle} onChange={e => update('telegram_handle', e.target.value)} />
            </div>
          </div>

          {/* District */}
          <div>
            <label className={labelCls}>{zh ? '申请智能区' : 'District'} *</label>
            <select required className={inputCls}
              value={form.district} onChange={e => update('district', e.target.value)}>
              <option value="">{zh ? '请选择...' : 'Select district...'}</option>
              {DISTRICT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div>
            <label className={labelCls}>{zh ? '职位名称' : 'Your Role Title'} *</label>
            <input required className={inputCls} placeholder={zh ? '例如：持牌房产经纪人' : 'e.g. Licensed Property Agent'}
              value={form.role_title} onChange={e => update('role_title', e.target.value)} />
          </div>

          {/* Credentials */}
          <div>
            <label className={labelCls}>{zh ? '官方资质' : 'Official Qualifications'} *</label>
            <textarea required rows={3} className={inputCls}
              placeholder={zh ? '例如：CEA 注册号 R012345A，持牌 10 年' : 'e.g. CEA Reg No. R012345A, 10 years licensed'}
              value={form.qualifications} onChange={e => update('qualifications', e.target.value)} />
          </div>

          <div>
            <label className={labelCls}>{zh ? '证书编号（如适用）' : 'Licence / Cert Number (if applicable)'}</label>
            <input className={inputCls} placeholder="CEA / IATA / ICF / CFA / CMT..."
              value={form.credential_number} onChange={e => update('credential_number', e.target.value)} />
          </div>

          <div>
            <label className={labelCls}>{zh ? '作品集 / LinkedIn / 网站' : 'Portfolio / LinkedIn / Website'}</label>
            <input type="url" className={inputCls} placeholder="https://"
              value={form.portfolio_url} onChange={e => update('portfolio_url', e.target.value)} />
          </div>

          {/* Service */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>{zh ? '每次收费 (SGD)' : 'Fee per session (SGD)'} *</label>
              <input required type="number" min="5" className={inputCls} placeholder="e.g. 49"
                value={form.fee_per_session} onChange={e => update('fee_per_session', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>{zh ? '服务语言' : 'Languages'}</label>
              <input className={inputCls} placeholder="English, 中文..."
                value={form.languages} onChange={e => update('languages', e.target.value)} />
            </div>
          </div>

          <div>
            <label className={labelCls}>{zh ? '可服务时段 (SGT)' : 'Available Hours (SGT)'}</label>
            <input className={inputCls} placeholder={zh ? '例如：工作日晚上 7–10PM，周末全天' : 'e.g. Weekday evenings 7–10PM, weekends'}
              value={form.available_hours} onChange={e => update('available_hours', e.target.value)} />
          </div>

          <div>
            <label className={labelCls}>{zh ? '简短介绍' : 'Short Bio'} *</label>
            <textarea required rows={4} className={inputCls}
              placeholder={zh ? '介绍您的专业背景以及您能如何帮助 X68 公民（最多 200 字）' : 'Your expertise and how you help X68 citizens (max 200 words)'}
              value={form.bio} onChange={e => update('bio', e.target.value)} />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 text-xs text-slate-400 space-y-1">
            <p>✅ {zh ? '平台收取 15% 服务费，其余 85% 归您所有。' : 'Platform takes 15%. You keep 85%.'}</p>
            <p>✅ {zh ? '所有资质将经独立核实后方可公开展示。' : 'All credentials verified before your profile goes live.'}</p>
            <p>✅ {zh ? '公民通过平台联系您，无需公开个人联系方式。' : 'Citizens contact you through the platform. Your personal details stay private.'}</p>
            <p>✅ {zh ? '每周通过 Stripe 结算付款。' : 'Payments via Stripe, paid out weekly.'}</p>
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-colors text-lg">
            {loading ? (zh ? '提交中…' : 'Submitting…') : (zh ? '提交申请 →' : 'Submit Application →')}
          </button>
        </form>
      </div>
    </main>
  )
}

export default function HumanSignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#080C18]" />}>
      <SignupForm />
    </Suspense>
  )
}
