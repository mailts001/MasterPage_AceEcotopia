'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLocale } from '@/hooks/useLocale'

interface DistrictData {
  alerts_today: number
  active_monitors: number
  last_signal_at: string | null
  status: 'live' | 'offline' | 'loading'
}

// external: open in new tab | internal: Next.js navigation | register: go to sign-up
type DistrictEntry = {
  id: string
  nameKey: string; tagKey: string; descKey: string
  icon: string
  color: string; border: string; accent: string
  visitHref: string          // where "Visit" goes (external or internal page)
  external: boolean          // open in new tab?
  requiresAuth: boolean      // show "Join to Access" instead of "Visit"
  features: { en: string[]; zh: string[] }
  citizenValue: { en: string; zh: string }
  secondaryHref?: string
  secondaryLabel?: { en: string; zh: string }
  secondaryExternal?: boolean
}

const DISTRICTS: DistrictEntry[] = [
  {
    id: 'propos',
    nameKey: 'd_propos_name', tagKey: 'd_propos_tag', descKey: 'd_propos_desc',
    icon: '🏙️',
    color: 'from-blue-500/20 to-cyan-500/20', border: 'border-blue-500/30', accent: 'text-blue-400',
    visitHref: 'http://5.223.72.120:8504', external: true, requiresAuth: false,
    features: { en: ['Refinance alerts','Valuation tracking','District trends','Sell signals'],
                zh: ['再融资提醒','估值追踪','区域趋势','出售信号'] },
    citizenValue: { en: 'Save $300–800/month on mortgage', zh: '每月节省 $300–800 贷款利息' },
  },
  {
    id: 'aceeconomy',
    nameKey: 'd_finance_name', tagKey: 'd_finance_tag', descKey: 'd_finance_desc',
    icon: '💹',
    color: 'from-green-500/20 to-emerald-500/20', border: 'border-green-500/30', accent: 'text-green-400',
    visitHref: '/citizen/register?district=aceeconomy', external: false, requiresAuth: true,
    features: { en: ['Stock signals','Portfolio monitoring','Earnings alerts','REIT tracking'],
                zh: ['股票信号','投资组合监测','财报提醒','房产信托追踪'] },
    citizenValue: { en: 'Intelligence edge on every trade', zh: '每笔交易都领先一步' },
  },
  {
    id: 'nexustravel',
    nameKey: 'd_travel_name', tagKey: 'd_travel_tag', descKey: 'd_travel_desc',
    icon: '✈️',
    color: 'from-purple-500/20 to-pink-500/20', border: 'border-purple-500/30', accent: 'text-purple-400',
    visitHref: 'https://nexus-travel-seven.vercel.app', external: true, requiresAuth: false,
    features: { en: ['Flight drop alerts','Hotel deals','Currency signals','Route monitoring'],
                zh: ['机票降价提醒','酒店特价','汇率信号','航线监测'] },
    citizenValue: { en: 'Save $100–400 per trip', zh: '每次旅行节省 $100–400' },
  },
  {
    id: 'commerce',
    nameKey: 'd_commerce_name', tagKey: 'd_commerce_tag', descKey: 'd_commerce_desc',
    icon: '🛒',
    color: 'from-amber-500/20 to-orange-500/20', border: 'border-amber-500/30', accent: 'text-amber-400',
    visitHref: '/citizen/register?district=commerce', external: false, requiresAuth: true,
    features: { en: ['Price gap scanning','Arbitrage signals','Competitor monitoring','Auto-listing'],
                zh: ['价差扫描','套利信号','竞品监测','自动刊登'] },
    citizenValue: { en: 'Find profit gaps others miss', zh: '发现他人忽视的利润空间' },
  },
  {
    id: 'serenity',
    nameKey: 'd_serenity_name', tagKey: 'd_serenity_tag', descKey: 'd_serenity_desc',
    icon: '🌿',
    color: 'from-emerald-500/20 to-teal-500/20', border: 'border-emerald-500/30', accent: 'text-emerald-400',
    visitHref: '/citizen/dashboard/wellness', external: false, requiresAuth: false,
    features: { en: ['SG events radar','Daily Serenity Score™','Breathing exercises','Morning brief'],
                zh: ['新加坡活动雷达','每日宁静评分™','呼吸练习','早间简报'] },
    citizenValue: { en: 'Daily wellness ritual + never miss an event', zh: '每日健康习惯＋不错过任何活动' },
  },
  {
    id: 'marketingos',
    nameKey: 'd_marketing_name', tagKey: 'd_marketing_tag', descKey: 'd_marketing_desc',
    icon: '📣',
    color: 'from-rose-500/20 to-pink-500/20', border: 'border-rose-500/30', accent: 'text-rose-400',
    visitHref: '/marketing', external: false, requiresAuth: false,
    features: { en: ['AI video scripts','EN + Chinese voiceover','TikTok / IG / YT / LinkedIn','24h turnaround'],
                zh: ['AI 视频脚本','英文与中文配音','TikTok / IG / YT / LinkedIn','24小时完成'] },
    citizenValue: { en: '10 videos in 5 minutes — free beta', zh: '5 分钟生成 10 条视频——免费公测' },
  },
  {
    id: 'careergenome',
    nameKey: 'd_careergenome_name', tagKey: 'd_careergenome_tag', descKey: 'd_careergenome_desc',
    icon: '🧬',
    color: 'from-indigo-500/20 to-violet-500/20', border: 'border-indigo-500/30', accent: 'text-indigo-400',
    visitHref: 'https://career-genome.vercel.app/interview', external: true, requiresAuth: false,
    features: { en: ['Career Genome interview','Trajectory Simulator','Hiring cycle prediction','Recruiter search (B2B)'],
                zh: ['职业基因访谈','路径模拟器','招聘周期预测','招聘方搜索（B2B）'] },
    citizenValue: { en: 'Discover your Career Genome — free sample', zh: '探索您的职业基因——免费体验' },
    secondaryHref: 'https://career-genome.vercel.app/for-recruiters/search',
    secondaryLabel: { en: 'For Recruiters →', zh: '招聘方入口 →' },
    secondaryExternal: true,
  },
]

export default function DistrictsSection() {
  const { t, locale } = useLocale()
  const [districtData, setDistrictData] = useState<Record<string, DistrictData>>({})

  useEffect(() => {
    async function fetchDistrictData() {
      for (const d of DISTRICTS) {
        try {
          const res = await fetch(`/api/nexus/district/${d.id}`)
          if (res.ok) {
            const data = await res.json()
            setDistrictData(prev => ({ ...prev, [d.id]: { ...data, status: 'live' } }))
          }
        } catch {
          setDistrictData(prev => ({ ...prev, [d.id]: { alerts_today: 0, active_monitors: 0, last_signal_at: null, status: 'offline' } }))
        }
      }
    }
    fetchDistrictData()
  }, [])

  return (
    <section id="districts" className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            {t('districts_h2a')} <span className="gradient-text">{t('districts_h2b')}</span>
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            {t('districts_sub')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {DISTRICTS.map((district) => {
            const data = districtData[district.id]
            const name    = t(district.nameKey as Parameters<typeof t>[0])
            const tagline = t(district.tagKey  as Parameters<typeof t>[0])
            const desc    = t(district.descKey as Parameters<typeof t>[0])
            const features     = district.features[locale]
            const citizenValue = district.citizenValue[locale]
            return (
              <div key={district.id} className={`district-card rounded-2xl p-6 bg-gradient-to-br ${district.color}`}>
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">{district.icon}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${district.border} ${district.accent} bg-transparent`}>
                        {tagline}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-white">{name}</h3>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${data?.status === 'live' ? 'bg-green-400 pulse-dot' : 'bg-slate-600'}`} />
                    <span className="text-xs text-slate-500">
                      {data?.status === 'live' ? t('districts_live') : t('districts_loading')}
                    </span>
                  </div>
                </div>

                <p className="text-slate-400 text-sm mb-4 leading-relaxed">{desc}</p>

                {data?.status === 'live' && (
                  <div className="flex gap-4 mb-4 text-xs">
                    <div>
                      <span className={`font-bold text-base ${district.accent}`}>{data.alerts_today}</span>
                      <span className="text-slate-500 ml-1">{t('districts_alerts')}</span>
                    </div>
                    <div>
                      <span className={`font-bold text-base ${district.accent}`}>{data.active_monitors}</span>
                      <span className="text-slate-500 ml-1">{t('districts_monitors')}</span>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 mb-4">
                  {features.map((f: string) => (
                    <span key={f} className="text-xs bg-white/5 text-slate-400 px-2 py-1 rounded-md border border-white/5">{f}</span>
                  ))}
                </div>

                <div className={`text-xs font-medium ${district.accent} mb-4`}>✦ {citizenValue}</div>

                <div className="flex flex-wrap items-center gap-4">
                  {district.external ? (
                    <a
                      href={district.visitHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-2 text-sm font-medium ${district.accent} hover:opacity-80 transition-opacity`}
                    >
                      {district.requiresAuth ? t('districts_join') : t('districts_visit')}
                    </a>
                  ) : (
                    <Link
                      href={district.visitHref}
                      className={`inline-flex items-center gap-2 text-sm font-medium ${district.accent} hover:opacity-80 transition-opacity`}
                    >
                      {district.requiresAuth ? t('districts_join') : t('districts_visit')}
                    </Link>
                  )}
                  {district.secondaryHref && district.secondaryLabel && (
                    district.secondaryExternal ? (
                      <a
                        href={district.secondaryHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        {district.secondaryLabel[locale]}
                      </a>
                    ) : (
                      <Link
                        href={district.secondaryHref}
                        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        {district.secondaryLabel[locale]}
                      </Link>
                    )
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
