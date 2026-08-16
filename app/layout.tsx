import type { Metadata } from 'next'
import './globals.css'
import LocaleProvider from '@/components/LocaleProvider'
import PageTracker from '@/components/PageTracker'

export const metadata: Metadata = {
  icons: { icon: '/favicon.svg' },
  title: 'X68 — New Economic Verse',
  description: 'Your personal AI-powered economic ecosystem. Property intelligence, investment signals, travel deals, and commerce — all in one place.',
  keywords: ['AI', 'property intelligence', 'investment', 'travel', 'economic ecosystem'],
  openGraph: {
    title: 'X68',
    description: 'AI Economic Ecosystem — Join as a Citizen',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-[#0A0E1A] text-slate-200 antialiased">
        {/* Runs synchronously before React hydrates — no flash-of-wrong-theme */}
        <script dangerouslySetInnerHTML={{ __html: `try{if(localStorage.getItem('ace_fin_light')==='1'){document.documentElement.classList.add('ace-light')}}catch(e){}` }} />
        <LocaleProvider>
          <PageTracker />
          {children}
        </LocaleProvider>
      </body>
    </html>
  )
}
