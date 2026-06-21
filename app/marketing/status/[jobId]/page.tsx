'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useLocale } from '@/hooks/useLocale'

type JobStatus = 'pending' | 'queued' | 'running' | 'done' | 'failed' | 'rejected'

type Job = {
  id: string
  product_name: string
  platform: string
  status: JobStatus
  video_url: string | null
  video_url_zh: string | null
  created_at: string
  completed_at: string | null
  estimated_duration_seconds: number | null
}

const STATUS_CONFIG: Record<JobStatus, { icon: string; color: string; en: string; zh: string; pulse?: boolean }> = {
  pending:  { icon: '⏳', color: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10', en: 'Waiting for review', zh: '等待审核中', pulse: false },
  queued:   { icon: '🟡', color: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10', en: 'Approved! In production queue', zh: '已批准！等待制作', pulse: false },
  running:  { icon: '🔵', color: 'text-blue-400 border-blue-500/30 bg-blue-500/10',   en: 'Rendering your videos...', zh: '正在渲染您的视频…', pulse: true },
  done:     { icon: '✅', color: 'text-green-400 border-green-500/30 bg-green-500/10', en: 'Videos ready!', zh: '视频已完成！', pulse: false },
  failed:   { icon: '❌', color: 'text-red-400 border-red-500/30 bg-red-500/10',       en: 'Something went wrong — please resubmit', zh: '出现错误，请重新提交', pulse: false },
  rejected: { icon: '❌', color: 'text-red-400 border-red-500/30 bg-red-500/10',       en: 'Request not approved — contact us', zh: '申请未获批准，请联系我们', pulse: false },
}

const PLATFORM_LABELS: Record<string, string> = {
  TT: 'TikTok', IG: 'Instagram Reels', YT: 'YouTube Shorts', LI: 'LinkedIn',
}

export default function JobStatusPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const { locale } = useLocale()
  const zh = locale === 'zh'
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  async function fetchJob() {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('marketing_jobs')
      .select('id, product_name, platform, status, video_url, video_url_zh, created_at, completed_at, estimated_duration_seconds')
      .eq('id', jobId)
      .single()

    if (error || !data) {
      setNotFound(true)
    } else {
      setJob(data as Job)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchJob()
  }, [jobId])

  // Auto-refresh every 30s while job is active
  useEffect(() => {
    if (!job) return
    if (['done', 'failed', 'rejected'].includes(job.status)) return
    const interval = setInterval(fetchJob, 30000)
    return () => clearInterval(interval)
  }, [job?.status])

  return (
    <main className="min-h-screen bg-[#080C18] text-white">
      {/* Nav */}
      <div className="border-b border-slate-800 px-6 py-3 flex items-center gap-3">
        <Link href="/marketing" className="text-slate-400 hover:text-white text-sm transition-colors">
          ← MarketingOS
        </Link>
        <span className="text-slate-700">/</span>
        <span className="text-rose-400 text-sm font-semibold">
          {zh ? '视频状态' : 'Job Status'}
        </span>
      </div>

      <div className="max-w-xl mx-auto px-6 py-16">
        <h1 className="text-2xl font-bold mb-2 text-center">
          {zh ? '视频制作状态' : 'Video Job Status'}
        </h1>
        <p className="text-slate-500 text-sm text-center mb-10 font-mono break-all">
          {jobId}
        </p>

        {loading && (
          <div className="text-center text-slate-400 py-20">
            <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            {zh ? '正在查询…' : 'Looking up your job…'}
          </div>
        )}

        {notFound && (
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-8 text-center">
            <div className="text-4xl mb-4">🔍</div>
            <h2 className="font-bold text-lg mb-2">{zh ? '未找到该任务' : 'Job not found'}</h2>
            <p className="text-slate-400 text-sm mb-6">
              {zh ? '请检查您的任务 ID 是否正确。' : 'Please check that your job ID is correct.'}
            </p>
            <Link href="/marketing/submit" className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-2 rounded-lg text-sm font-semibold transition-colors">
              {zh ? '提交新产品' : 'Submit a new product'}
            </Link>
          </div>
        )}

        {job && (() => {
          const cfg = STATUS_CONFIG[job.status]
          return (
            <div className="space-y-6">
              {/* Status card */}
              <div className={`border rounded-xl p-6 text-center ${cfg.color}`}>
                <div className={`text-4xl mb-3 ${cfg.pulse ? 'animate-pulse' : ''}`}>{cfg.icon}</div>
                <div className="font-bold text-lg">{zh ? cfg.zh : cfg.en}</div>
                {job.status === 'running' && (
                  <p className="text-sm mt-2 opacity-75">
                    {zh ? '页面每 30 秒自动刷新' : 'Page auto-refreshes every 30 seconds'}
                  </p>
                )}
              </div>

              {/* Job details */}
              <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">{zh ? '产品' : 'Product'}</span>
                  <span className="text-white font-medium">{job.product_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">{zh ? '平台' : 'Platform'}</span>
                  <span className="text-white">{PLATFORM_LABELS[job.platform] ?? job.platform}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">{zh ? '提交时间' : 'Submitted'}</span>
                  <span className="text-white">{new Date(job.created_at).toLocaleString('en-SG')}</span>
                </div>
                {job.completed_at && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">{zh ? '完成时间' : 'Completed'}</span>
                    <span className="text-white">{new Date(job.completed_at).toLocaleString('en-SG')}</span>
                  </div>
                )}
                {job.estimated_duration_seconds && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">{zh ? '视频时长' : 'Duration'}</span>
                    <span className="text-white">{job.estimated_duration_seconds}s</span>
                  </div>
                )}
              </div>

              {/* Download buttons — only when done */}
              {job.status === 'done' && (
                <div className="space-y-3">
                  {job.video_url && (
                    <a
                      href={job.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-colors w-full"
                    >
                      🇬🇧 {zh ? '下载英文视频' : 'Download EN Video'}
                    </a>
                  )}
                  {job.video_url_zh && (
                    <a
                      href={job.video_url_zh}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold py-3 rounded-xl transition-colors w-full"
                    >
                      🇨🇳 {zh ? '下载中文视频' : 'Download Chinese Video'}
                    </a>
                  )}
                  <p className="text-slate-500 text-xs text-center">
                    {zh ? '下载链接 7 天内有效' : 'Download links expire in 7 days'}
                  </p>
                </div>
              )}

              {/* CTA */}
              <div className="text-center pt-2">
                <Link href="/marketing/submit" className="text-rose-400 hover:text-rose-300 text-sm transition-colors">
                  {zh ? '+ 提交另一个产品' : '+ Submit another product'}
                </Link>
              </div>
            </div>
          )
        })()}
      </div>
    </main>
  )
}
