'use client'

import { useLocale } from '@/hooks/useLocale'

export default function HowItWorksAndPricing() {
  const { t, locale } = useLocale()

  const steps = [
    { step: '01', icon: '👀', titleKey: 'hiw_s1t', descKey: 'hiw_s1d' },
    { step: '02', icon: '🪪', titleKey: 'hiw_s2t', descKey: 'hiw_s2d' },
    { step: '03', icon: '🔔', titleKey: 'hiw_s3t', descKey: 'hiw_s3d' },
    { step: '04', icon: '💰', titleKey: 'hiw_s4t', descKey: 'hiw_s4d' },
  ] as const

  const tiers = [
    {
      nameKey: 'tier_explorer', descKey: 'tier_e_desc',
      price: locale === 'en' ? 'Free' : '免费',
      periodKey: 'pricing_forever',
      featureKeys: ['pf_alerts3','pf_readonly','pf_watchlist5','pf_api100','pf_credits50','pf_refer'] as const,
      ctaKey: 'cta_start_free', href: '/citizen/register', highlight: false,
    },
    {
      nameKey: 'tier_citizen', descKey: 'tier_c_desc',
      price: '$19',
      periodKey: 'pricing_month',
      featureKeys: ['pf_unlimited','pf_telegram','pf_watchlistU','pf_api10k','pf_credits100','pf_priority','pf_fullwrite'] as const,
      ctaKey: 'cta_become', href: '/upgrade', highlight: true,
    },
    {
      nameKey: 'tier_enterprise', descKey: 'tier_ent_desc',
      price: locale === 'en' ? 'Custom' : '定制',
      periodKey: null,
      featureKeys: ['pf_custom','pf_sla','pf_whitelabel','pf_api_bulk'] as const,
      ctaKey: 'cta_contact', href: 'mailto:admin@aceecotopia.com', highlight: false,
    },
  ] as const

  const moats = [
    { icon: '📡', label: { en: 'AI signals', zh: 'AI 信号' },     sub: { en: 'before the crowd',        zh: '领先市场' } },
    { icon: '💎', label: { en: 'Nexus Credits', zh: '积分系统' },  sub: { en: 'from referrals',           zh: '邀请赚积分' } },
    { icon: '🔑', label: { en: 'API access', zh: 'API 访问' },     sub: { en: 'build on top',             zh: '二次开发' } },
    { icon: '🏙️', label: { en: 'City rank', zh: '城市排名' },      sub: { en: 'district leaderboard',    zh: '智能区排行榜' } },
  ]

  return (
    <>
      {/* How it works */}
      <section className="py-24 px-4 border-t border-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">
            {t('hiw_h2a')} <span className="gradient-text">{t('hiw_h2b')}</span>{t('hiw_h2c') ? ` ${t('hiw_h2c')}` : ''}
          </h2>
          <p className="text-slate-400 text-lg mb-16">{t('hiw_sub')}</p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {steps.map((item) => (
              <div key={item.step} className="relative">
                <div className="text-4xl mb-3">{item.icon}</div>
                <div className="text-xs font-mono text-cyan-500 mb-2">{item.step}</div>
                <h3 className="font-bold text-white mb-2">{t(item.titleKey)}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{t(item.descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              {locale === 'en'
                ? <><span>Simple </span><span className="gradient-text">Pricing</span></>
                : <span className="gradient-text">{t('pricing_h2')}</span>
              }
            </h2>
            <p className="text-slate-400">{t('pricing_sub')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {tiers.map((tier) => (
              <div
                key={tier.nameKey}
                className={`district-card rounded-2xl p-6 ${tier.highlight ? 'border-cyan-500/50 bg-gradient-to-br from-cyan-500/10 to-blue-500/10' : ''}`}
              >
                {tier.highlight && (
                  <div className="text-xs font-medium text-cyan-400 mb-3 uppercase tracking-wider">
                    {t('pricing_popular')}
                  </div>
                )}
                <h3 className="text-xl font-bold text-white">{t(tier.nameKey)}</h3>
                <div className="mt-2 mb-1">
                  <span className="text-3xl font-bold text-white">{tier.price}</span>
                  {tier.periodKey && <span className="text-slate-500 text-sm">{t(tier.periodKey)}</span>}
                </div>
                <p className="text-slate-500 text-sm mb-4">{t(tier.descKey)}</p>
                <ul className="space-y-2 mb-6">
                  {tier.featureKeys.map(fk => (
                    <li key={fk} className="flex items-start gap-2 text-sm text-slate-400">
                      <span className="text-green-400 mt-0.5 shrink-0">✓</span> {t(fk)}
                    </li>
                  ))}
                </ul>
                <a
                  href={tier.href}
                  className={`block text-center py-3 px-4 rounded-xl font-semibold transition-all text-sm ${
                    tier.highlight
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:opacity-90'
                      : 'border border-slate-600 text-slate-300 hover:border-slate-400'
                  }`}
                >
                  {t(tier.ctaKey)}
                </a>
              </div>
            ))}
          </div>

          {/* Moat clarity */}
          <div className="mt-12 bg-white/3 border border-white/10 rounded-2xl p-6 text-center max-w-2xl mx-auto">
            <p className="text-sm text-gray-400 mb-3">
              <span className="text-white font-semibold">
                {locale === 'en' ? 'Beyond alerts:' : '不仅是提醒：'}
              </span>{' '}
              {locale === 'en' ? 'your moats as a citizen' : '您作为公民的专属权益'}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-gray-500">
              {moats.map(m => (
                <div key={m.label.en} className="bg-white/5 rounded-xl p-3">
                  <div className="text-lg mb-1">{m.icon}</div>
                  <div className="text-white font-medium">{m.label[locale]}</div>
                  <div className="text-gray-600">{m.sub[locale]}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
