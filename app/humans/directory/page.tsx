'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useLocale } from '@/hooks/useLocale'

type Expert = {
  id: string
  full_name: string
  district: string
  role_title: string
  bio: string
  fee_per_session: number
  available_hours: string
  languages: string
  portfolio_url: string
  rating_avg: number
  sessions_completed: number
}

const DISTRICT_META: Record<string, { icon: string; label: string; accent: string; border: string }> = {
  marketingos: { icon: '📣', label: 'MarketingOS',      accent: 'text-rose-400',    border: 'border-rose-500/30' },
  propos:      { icon: '🏠', label: 'PropOS',           accent: 'text-blue-400',    border: 'border-blue-500/30' },
  nexustravel: { icon: '✈️', label: 'NexusTravel',      accent: 'text-purple-400',  border: 'border-purple-500/30' },
  commerce:    { icon: '🛒', label: 'E-Commerce',       accent: 'text-amber-400',   border: 'border-amber-500/30' },
  aceeconomy:  { icon: '💹', label: 'Financial',        accent: 'text-green-400',   border: 'border-green-500/30' },
  serenity:    { icon: '🌿', label: 'SerenityOS',       accent: 'text-emerald-400', border: 'border-emerald-500/30' },
}

const FILTERS = ['All', 'marketingos', 'propos', 'nexustravel', 'commerce', 'aceeconomy', 'serenity']

export default function HumanDirectoryPage() {
  const { locale } = useLocale()
  const zh = locale === 'zh'
  const [experts, setExperts] = useState<Expert[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('human_experts')
      .select('id,full_name,district,role_title,bio,fee_per_session,available_hours,languages,portfolio_url,rating_avg,sessions_completed')
      .eq('status', 'approved')
      .order('rating_avg', { ascending: false })
      .then(({ data }) => {
        setExperts((data as Expert[]) ?? [])
        setLoading(false)
      })
  }, [])

  const filtered = filter === 'All' ? experts : experts.filter(e => e.district === filter)

  return (
    <main className="min-h-screen bg-[#080C18] text-white">
      {/* Nav */}
      <div className="border-b border-slate-800 px-6 py-3 flex items-center gap-3">
        <Link href="/humans" className="text-slate-400 hover:text-white text-sm transition-colors">← Human Experts</Link>
        <span className="text-slate-700">/</span>
        <span className="text-cyan-400 text-sm font-semibold">{zh ? '专家目录' : 'Directory'}</span>
        <Link href="/humans/signup" className="ml-auto text-xs bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 px-3 py-1.5 rounded-lg hover:bg-cyan-500/20 transition-colors">
          {zh ? '申请成为专家 →' : 'Apply as Expert →'}
        </Link>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2 text-center">{zh ? '人类专家目录' : 'Human Expert Directory'}</h1>
        <p className="text-slate-400 text-sm text-center mb-8">
          {zh ? '所有专家均经资质核实。通过平台预约，保护双方隐私。' : 'All experts credential-verified. Book through the platform — your privacy protected.'}
        </p>

        {/* District filter pills */}
        <div className="flex flex-wrap gap-2 justify-center mb-10">
          {FILTERS.map(f => {
            const meta = f !== 'All' ? DISTRICT_META[f] : null
            const active = filter === f
            return (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                  active
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                    : 'bg-white/3 border-white/10 text-slate-500 hover:text-white'
                }`}>
                {meta ? `${meta.icon} ${meta.label}` : (zh ? '全部' : 'All')}
              </button>
            )
          })}
        </div>

        {/* Loading */}
        {loading && (
          <div className="grid md:grid-cols-2 gap-6">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-52 rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-slate-400 mb-4">
              {zh ? '该智能区暂无已认证的专家。' : 'No verified experts in this district yet.'}
            </p>
            <Link href="/humans/signup" className="text-cyan-400 hover:text-cyan-300 text-sm transition-colors">
              {zh ? '成为第一位 →' : 'Be the first →'}
            </Link>
          </div>
        )}

        {/* Expert cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {filtered.map(expert => {
            const meta = DISTRICT_META[expert.district] ?? DISTRICT_META.marketingos
            return (
              <div key={expert.id}
                className={`bg-slate-800/50 border ${meta.border} rounded-2xl p-6 flex flex-col gap-4 hover:bg-slate-800/80 transition-colors`}>

                {/* Header */}
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl flex-shrink-0">
                    {meta.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-white">{expert.full_name}</div>
                    <div className={`text-xs ${meta.accent}`}>{expert.role_title}</div>
                    <div className="text-xs text-slate-500">{meta.label}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-white font-bold text-sm">S${expert.fee_per_session}</div>
                    <div className="text-slate-500 text-xs">{zh ? '/ 次' : '/ session'}</div>
                  </div>
                </div>

                {/* Bio */}
                <p className="text-slate-400 text-sm leading-relaxed line-clamp-3">{expert.bio}</p>

                {/* Meta row */}
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  {expert.rating_avg > 0 && (
                    <span>⭐ {expert.rating_avg.toFixed(1)}</span>
                  )}
                  {expert.sessions_completed > 0 && (
                    <span>✅ {expert.sessions_completed} {zh ? '次服务' : 'sessions'}</span>
                  )}
                  <span>🗣 {expert.languages}</span>
                  {expert.available_hours && (
                    <span className="truncate">🕐 {expert.available_hours}</span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-1">
                  <Link href={`/humans/book?expert=${expert.id}`}
                    className="flex-1 text-center bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
                    {zh ? '预约咨询' : 'Book Session'}
                  </Link>
                  {expert.portfolio_url && (
                    <a href={expert.portfolio_url} target="_blank" rel="noopener noreferrer"
                      className="px-4 py-2.5 border border-slate-700 hover:border-slate-500 text-slate-400 hover:text-white text-sm rounded-xl transition-colors">
                      {zh ? '查看作品集' : 'Portfolio'}
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}
