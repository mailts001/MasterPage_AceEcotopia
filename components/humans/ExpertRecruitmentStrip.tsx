'use client'

import Link from 'next/link'
import { useLocale } from '@/hooks/useLocale'

const ROLES = [
  { icon: '🏠', en: 'Property Agent', zh: '房产经纪' },
  { icon: '📣', en: 'Content Creator', zh: '内容创作者' },
  { icon: '✈️', en: 'Travel Concierge', zh: '旅行礼宾' },
  { icon: '💹', en: 'Trading Mentor', zh: '交易导师' },
  { icon: '🛒', en: 'Sourcing Agent', zh: '采购专员' },
  { icon: '🌿', en: 'Wellness Coach', zh: '健康教练' },
]

export default function ExpertRecruitmentStrip() {
  const { locale } = useLocale()
  const zh = locale === 'zh'

  return (
    <div className="border-y border-white/5 bg-white/[0.02] py-5 px-4">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center gap-4 justify-between">

        {/* Left — scrolling role pills */}
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar flex-1">
          <span className="text-slate-500 text-xs whitespace-nowrap shrink-0">
            {zh ? '正在招募：' : 'Now recruiting:'}
          </span>
          <div className="flex gap-2">
            {ROLES.map(r => (
              <span key={r.en}
                className="flex items-center gap-1.5 text-xs text-slate-400 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full whitespace-nowrap">
                {r.icon} {zh ? r.zh : r.en}
              </span>
            ))}
          </div>
        </div>

        {/* Right — CTA */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-slate-500 text-xs hidden md:block">
            {zh ? 'AI 做基础，人类赚收入。' : 'AI does the work. You earn the income.'}
          </span>
          <Link
            href="/humans/signup"
            className="text-xs font-semibold bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
          >
            {zh ? '成为人类专家 →' : 'Join as Expert →'}
          </Link>
          <Link
            href="/humans/directory"
            className="text-xs text-slate-500 hover:text-white transition-colors whitespace-nowrap"
          >
            {zh ? '浏览专家' : 'Find an Expert'}
          </Link>
        </div>
      </div>
    </div>
  )
}
