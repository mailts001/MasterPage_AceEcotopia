'use client'

import Link from 'next/link'
import { useLocale } from '@/hooks/useLocale'

const DISTRICTS = [
  {
    id: 'marketingos',
    icon: '📣',
    accent: 'rose',
    accentHex: '#F43F5E',
    borderCls: 'border-rose-500/30',
    bgCls: 'bg-rose-500/10',
    textCls: 'text-rose-400',
    en: {
      name: 'MarketingOS',
      role: 'Content Creator / Copywriter',
      what: 'Review AI-generated scripts, punch up hooks, add SG cultural flavour before video renders.',
      qualifications: 'Portfolio of viral content, TikTok/IG following a plus',
      fee: '$15–25 per script review',
      catchphrase: 'AI writes it. You make it viral.',
    },
    zh: {
      name: 'MarketingOS 营销区',
      role: '内容创作者 / 文案',
      what: '审核 AI 生成的脚本，优化钩子文案，加入新加坡本地文化元素，再进行视频渲染。',
      qualifications: '需提供病毒式内容作品集，有 TikTok/IG 粉丝者优先',
      fee: '每次脚本审核 $15–25',
      catchphrase: 'AI 写稿，你来爆款。',
    },
  },
  {
    id: 'propos',
    icon: '🏠',
    accent: 'blue',
    accentHex: '#3B82F6',
    borderCls: 'border-blue-500/30',
    bgCls: 'bg-blue-500/10',
    textCls: 'text-blue-400',
    en: {
      name: 'PropOS',
      role: 'Licensed Property Agent',
      what: 'Confirm AI refinancing signals, advise on HDB/condo decisions, review valuation alerts before citizens act.',
      qualifications: 'CEA registration required. RES/REN licence number verified.',
      fee: '$49–99 per consult',
      catchphrase: 'AI finds the deal. You confirm it\'s real.',
    },
    zh: {
      name: 'PropOS 房产区',
      role: '持牌房产经纪',
      what: '确认 AI 再融资信号，就 HDB/公寓决策提供建议，在公民行动前审核估值提醒。',
      qualifications: '需持有 CEA 注册资格，RES/REN 执照号码经核实。',
      fee: '每次咨询 $49–99',
      catchphrase: 'AI 找到机会，你来确认真实性。',
    },
  },
  {
    id: 'nexustravel',
    icon: '✈️',
    accent: 'purple',
    accentHex: '#A855F7',
    borderCls: 'border-purple-500/30',
    bgCls: 'bg-purple-500/10',
    textCls: 'text-purple-400',
    en: {
      name: 'NexusTravel',
      role: 'Travel Concierge',
      what: 'Handle complex multi-leg bookings, group trips, visa paperwork, seat upgrades that AI can\'t execute.',
      qualifications: 'Travel agent experience or IATA/NATAS accreditation preferred',
      fee: '$30–50 per booking',
      catchphrase: 'AI hunts the fare. You close the trip.',
    },
    zh: {
      name: 'NexusTravel 旅行区',
      role: '旅行礼宾专员',
      what: '处理复杂的多段行程预订、团体旅游、签证文件及升舱等 AI 无法完成的事务。',
      qualifications: '有旅行社经验或持 IATA/NATAS 认证者优先',
      fee: '每次预订 $30–50',
      catchphrase: 'AI 搜到最低价，你来完成旅程。',
    },
  },
  {
    id: 'commerce',
    icon: '🛒',
    accent: 'amber',
    accentHex: '#F59E0B',
    borderCls: 'border-amber-500/30',
    bgCls: 'bg-amber-500/10',
    textCls: 'text-amber-400',
    en: {
      name: 'E-Commerce',
      role: 'Sourcing Agent / Seller Consultant',
      what: 'Verify supplier legitimacy, validate product quality, advise on MOQ and shipping before citizens commit to bulk orders.',
      qualifications: 'Active Shopee/Lazada seller or sourcing experience (Alibaba, 1688)',
      fee: '$20–40 per product check',
      catchphrase: 'AI finds the gap. You validate the goods.',
    },
    zh: {
      name: '电商区',
      role: '采购专员 / 卖家顾问',
      what: '核实供应商资质，验证产品质量，在公民批量下单前就 MOQ 和运费提供建议。',
      qualifications: '现役 Shopee/Lazada 卖家或有采购经验（速卖通、1688）',
      fee: '每次产品核查 $20–40',
      catchphrase: 'AI 找到差价，你来验货。',
    },
  },
  {
    id: 'aceeconomy',
    icon: '💹',
    accent: 'green',
    accentHex: '#22C55E',
    borderCls: 'border-green-500/30',
    bgCls: 'bg-green-500/10',
    textCls: 'text-green-400',
    en: {
      name: 'Financial District',
      role: 'Trading Mentor / Analyst',
      what: 'Help citizens interpret AI signals, explain momentum setups, review watchlists. Education only — no regulated advice.',
      qualifications: 'Proven trading track record. CMT / CFA a strong plus. Must not offer regulated advice.',
      fee: '$30–60 per session',
      catchphrase: 'AI spots the signal. You explain the story.',
    },
    zh: {
      name: '金融区',
      role: '交易导师 / 分析师',
      what: '帮助公民解读 AI 信号，讲解动能形态，审核自选列表。仅限教育性质，不提供受监管的投资建议。',
      qualifications: '需有可验证的交易记录，持 CMT/CFA 者优先。不得提供受监管的投资建议。',
      fee: '每次课程 $30–60',
      catchphrase: 'AI 发现信号，你讲清楚背后的故事。',
    },
  },
  {
    id: 'serenity',
    icon: '🌿',
    accent: 'emerald',
    accentHex: '#10B981',
    borderCls: 'border-emerald-500/30',
    bgCls: 'bg-emerald-500/10',
    textCls: 'text-emerald-400',
    en: {
      name: 'SerenityOS',
      role: 'Wellness Coach',
      what: 'Follow up with citizens whose Serenity Score stays critical for 3+ days. Guided sessions, accountability check-ins.',
      qualifications: 'ICF coaching certification or counselling diploma preferred',
      fee: '$30–50 per session',
      catchphrase: 'AI tracks your score. Humans help you raise it.',
    },
    zh: {
      name: 'SerenityOS 健康区',
      role: '健康教练',
      what: '跟进宁静评分持续偏低超过 3 天的公民，提供引导性课程和问责式陪跑。',
      qualifications: '优先考虑持有 ICF 教练认证或辅导文凭者',
      fee: '每次课程 $30–50',
      catchphrase: 'AI 追踪你的状态，人类帮你改善它。',
    },
  },
]

export default function HumansLandingPage() {
  const { locale } = useLocale()
  const zh = locale === 'zh'

  return (
    <main className="min-h-screen bg-[#080C18] text-white">
      {/* Nav */}
      <div className="border-b border-slate-800 px-6 py-3 flex items-center gap-3">
        <Link href="/" className="text-slate-400 hover:text-white text-sm transition-colors">← X68 新国度</Link>
        <span className="text-slate-700">/</span>
        <span className="text-cyan-400 text-sm font-semibold">{zh ? '人类专家' : 'Human Experts'}</span>
      </div>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-4 py-1.5 mb-6">
          <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
          <span className="text-cyan-400 text-sm font-semibold">{zh ? '真人 × AI' : 'Human × AI'}</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
          {zh ? (
            <>AI 做基础工作。<br /><span className="gradient-text">人类完成交易。</span></>
          ) : (
            <>AI does the groundwork.<br /><span className="gradient-text">Humans close the deal.</span></>
          )}
        </h1>

        <p className="text-slate-400 text-lg mb-10 max-w-2xl mx-auto">
          {zh
            ? '每个智能区都有经过验证的人类专家待命——当 AI 信号需要真人判断时，他们随时响应。'
            : 'Every district has verified human experts on standby — for when an AI signal needs a human call.'}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/humans/directory"
            className="bg-cyan-500 hover:bg-cyan-600 text-white font-semibold px-8 py-4 rounded-xl transition-colors text-lg">
            {zh ? '浏览专家目录 →' : 'Browse Expert Directory →'}
          </Link>
          <Link href="/humans/signup"
            className="border border-slate-700 hover:border-slate-500 text-slate-300 font-semibold px-8 py-4 rounded-xl transition-colors text-lg">
            {zh ? '成为人类专家' : 'Join as a Human Expert'}
          </Link>
        </div>
      </section>

      {/* Per-district roles */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <h2 className="text-2xl font-bold text-center mb-10">
          {zh ? '各智能区正在招募' : 'Open roles across all 6 districts'}
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          {DISTRICTS.map(d => {
            const copy = zh ? d.zh : d.en
            return (
              <div key={d.id}
                className={`bg-slate-800/50 border ${d.borderCls} rounded-2xl p-6 flex flex-col gap-4`}>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{d.icon}</span>
                  <div>
                    <div className={`font-bold ${d.textCls}`}>{copy.name}</div>
                    <div className="text-white text-sm font-semibold">{copy.role}</div>
                  </div>
                  <div className={`ml-auto text-xs ${d.bgCls} ${d.textCls} border ${d.borderCls} px-3 py-1 rounded-full font-mono`}>
                    {copy.fee}
                  </div>
                </div>

                <p className="text-slate-400 text-sm leading-relaxed">{copy.what}</p>

                <div className={`text-xs ${d.textCls} border-l-2 pl-3`}
                  style={{ borderColor: d.accentHex }}>
                  <span className="text-slate-500">{zh ? '资质要求：' : 'Qualifications: '}</span>
                  {copy.qualifications}
                </div>

                <div className="flex items-center justify-between mt-1">
                  <span className="text-slate-500 text-xs italic">"{copy.catchphrase}"</span>
                  <Link href={`/humans/signup?district=${d.id}`}
                    className={`text-xs ${d.textCls} hover:opacity-80 font-semibold transition-opacity`}>
                    {zh ? '申请 →' : 'Apply →'}
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* How it works for experts */}
      <section className="border-t border-slate-800 py-20">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-center mb-10">
            {zh ? '成为专家的流程' : 'How it works for experts'}
          </h2>
          <div className="grid md:grid-cols-3 gap-6 text-center">
            {[
              { icon: '📋', en: { t: 'Apply + verify', d: 'Submit your qualifications and set your service fee. We verify credentials before approval.' }, zh: { t: '申请并认证', d: '提交资质并设定服务费，我们在批准前核实证书。' } },
              { icon: '🔔', en: { t: 'Get matched', d: 'Citizens in your district request your help. You receive a Telegram ping with the job brief.' }, zh: { t: '获得匹配', d: '您所在智能区的公民发起求助请求，您将收到包含任务摘要的 Telegram 推送。' } },
              { icon: '💰', en: { t: 'Get paid', d: 'Complete the task. Payment released to you after citizen confirms satisfaction. Platform takes 15%.' }, zh: { t: '获得报酬', d: '完成任务后，公民确认满意即释放付款。平台收取 15% 服务费。' } },
            ].map((s, i) => (
              <div key={i} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-6">
                <div className="text-4xl mb-3">{s.icon}</div>
                <div className="font-bold text-white mb-2">{zh ? s.zh.t : s.en.t}</div>
                <p className="text-slate-400 text-sm">{zh ? s.zh.d : s.en.d}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-slate-500 text-xs mt-8">
            {zh
              ? '平台抽成 15%，其余 85% 直接结算给专家。付款通过 Stripe 处理。'
              : 'Platform takes 15%. You keep 85%. Payments processed via Stripe. Paid out weekly.'}
          </p>
        </div>
      </section>

      {/* Footer CTA */}
      <div className="border-t border-slate-800 py-10 text-center">
        <Link href="/humans/signup"
          className="bg-white text-slate-900 font-bold px-10 py-4 rounded-xl hover:bg-slate-100 transition-colors text-lg">
          {zh ? '立即加入专家网络 →' : 'Join the Expert Network →'}
        </Link>
        <p className="text-slate-500 text-xs mt-4">
          {zh ? '人类专家网络由 X68 新国度运营。所有资质均经独立核实。' : 'Human Expert Network operated by X68 新国度. All credentials independently verified.'}
        </p>
      </div>
    </main>
  )
}
