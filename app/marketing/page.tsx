'use client'

import Link from 'next/link'
import { useLocale } from '@/hooks/useLocale'

const PLATFORMS = ['TikTok', 'Instagram Reels', 'YouTube Shorts', 'LinkedIn']

const STEPS = [
  {
    icon: '📦',
    en: { title: 'Submit your product', desc: 'Upload your product name, image, and details. Takes 2 minutes.' },
    zh: { title: '提交产品资料', desc: '上传产品名称、图片及相关信息，仅需 2 分钟。' },
  },
  {
    icon: '✅',
    en: { title: 'We review & approve', desc: 'Our team reviews your submission and queues it for production.' },
    zh: { title: '我们审核并批准', desc: '团队审核您的提交内容，并将其加入制作队列。' },
  },
  {
    icon: '🎬',
    en: { title: 'Receive EN + 中文 videos', desc: 'Get two ready-to-post MP4 videos via Telegram within 24h.' },
    zh: { title: '接收英文与中文视频', desc: '24 小时内通过 Telegram 收到两条可直接发布的 MP4 视频。' },
  },
]

export default function MarketingLandingPage() {
  const { locale } = useLocale()
  const zh = locale === 'zh'

  return (
    <main className="min-h-screen bg-[#080C18] text-white">
      {/* Nav back to X68 */}
      <div className="border-b border-slate-800 px-6 py-3 flex items-center gap-3">
        <Link href="/" className="text-slate-400 hover:text-white text-sm transition-colors">
          ← X68 新国度
        </Link>
        <span className="text-slate-700">/</span>
        <span className="text-rose-400 text-sm font-semibold">MarketingOS</span>
        <span className="ml-auto bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs px-3 py-1 rounded-full">
          {zh ? '免费公测中' : 'Free Beta'}
        </span>
      </div>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 rounded-full px-4 py-1.5 mb-6">
          <span className="text-rose-400 text-sm font-semibold">📣 MarketingOS District</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
          {zh ? (
            <>AI 营销视频<br /><span className="text-rose-400">5 分钟搞定</span></>
          ) : (
            <>AI Marketing Videos<br /><span className="text-rose-400">in Minutes</span></>
          )}
        </h1>

        <p className="text-slate-400 text-lg md:text-xl mb-10 max-w-2xl mx-auto">
          {zh
            ? '提交产品 → 24小时内获得英文与中文双语短视频 — AI 自动撰写脚本、配音并完成剪辑。'
            : 'Submit your product → receive TikTok-ready EN + Chinese videos within 24h — AI writes the script, records the voiceover, and edits the final cut.'}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/marketing/submit"
            className="bg-rose-500 hover:bg-rose-600 text-white font-semibold px-8 py-4 rounded-xl transition-colors text-lg"
          >
            {zh ? '免费生成我的视频 →' : 'Create My Video Free →'}
          </Link>
          <Link
            href="/marketing/status"
            className="border border-slate-700 hover:border-slate-500 text-slate-300 font-semibold px-8 py-4 rounded-xl transition-colors text-lg"
          >
            {zh ? '查询视频状态' : 'Check Job Status'}
          </Link>
        </div>

        {/* Platform badges */}
        <div className="flex flex-wrap justify-center gap-2 mt-8">
          {PLATFORMS.map(p => (
            <span key={p} className="bg-slate-800 border border-slate-700 text-slate-300 text-sm px-3 py-1 rounded-full">
              {p}
            </span>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-2xl font-bold text-center mb-10">
          {zh ? '三步完成' : 'How It Works'}
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {STEPS.map((step, i) => (
            <div key={i} className="bg-slate-800/60 border border-slate-700 rounded-xl p-6 text-center">
              <div className="text-4xl mb-4">{step.icon}</div>
              <div className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">
                {zh ? `第 ${i + 1} 步` : `Step ${i + 1}`}
              </div>
              <h3 className="font-bold text-white mb-2">{zh ? step.zh.title : step.en.title}</h3>
              <p className="text-slate-400 text-sm">{zh ? step.zh.desc : step.en.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-slate-800 py-20">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-center mb-10">
            {zh ? '每个视频包含' : "What's in every video"}
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { icon: '🎙️', en: 'AI voiceover in EN + Chinese', zh: 'AI 英文与中文双语配音' },
              { icon: '📝', en: 'AI-written hook + script', zh: 'AI 撰写钩子文案与脚本' },
              { icon: '📱', en: '9:16 vertical format (TikTok-ready)', zh: '9:16 竖版格式（TikTok 即用）' },
              { icon: '💬', en: 'Auto-generated subtitles', zh: '自动生成字幕' },
              { icon: '⏱️', en: '15–45 second optimal length', zh: '15–45 秒最佳时长' },
              { icon: '🔗', en: 'Optional affiliate link in CTA', zh: '可选联盟链接植入 CTA' },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3 bg-slate-800/40 border border-slate-700/50 rounded-lg px-4 py-3">
                <span className="text-2xl">{f.icon}</span>
                <span className="text-slate-300 text-sm">{zh ? f.zh : f.en}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing / Beta */}
      <section className="py-20">
        <div className="max-w-md mx-auto px-6 text-center">
          <div className="bg-gradient-to-b from-rose-500/10 to-transparent border border-rose-500/30 rounded-2xl p-8">
            <div className="text-rose-400 font-bold text-sm uppercase tracking-widest mb-2">
              {zh ? '公测期间' : 'Beta Period'}
            </div>
            <div className="text-5xl font-bold text-white mb-2">{zh ? '免费' : 'Free'}</div>
            <div className="text-slate-400 mb-6">
              {zh ? '无需信用卡 · 名额有限' : 'No credit card required · Limited slots'}
            </div>
            <Link
              href="/marketing/submit"
              className="block bg-rose-500 hover:bg-rose-600 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {zh ? '立即开始 →' : 'Get Started Free →'}
            </Link>
          </div>
        </div>
      </section>

      {/* Footer link */}
      <div className="border-t border-slate-800 py-6 text-center">
        <p className="text-slate-500 text-sm">
          {zh ? 'MarketingOS 是 ' : 'MarketingOS is a district of '}
          <Link href="/" className="text-rose-400 hover:text-rose-300">X68 新国度</Link>
          {zh ? ' 旗下的智能区。' : '.'}
        </p>
      </div>
    </main>
  )
}
