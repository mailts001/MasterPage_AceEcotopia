'use client'

import { createContext, useState, useEffect, ReactNode } from 'react'
import { Locale } from '@/lib/i18n'

interface LocaleContextType {
  locale: Locale
  setLocale: (l: Locale) => void
}

export const LocaleContext = createContext<LocaleContextType>({
  locale: 'en',
  setLocale: () => {},
})

function detectLocale(): Locale {
  // 1. Check localStorage preference
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('x68_locale')
    if (saved === 'en' || saved === 'zh') return saved
  }
  // 2. Auto-detect from browser language
  if (typeof navigator !== 'undefined') {
    const lang = navigator.language || ''
    if (lang.startsWith('zh')) return 'zh'
  }
  return 'en'
}

export default function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en')

  // Detect on mount (client-only)
  useEffect(() => {
    setLocaleState(detectLocale())
  }, [])

  function setLocale(l: Locale) {
    setLocaleState(l)
    localStorage.setItem('x68_locale', l)
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      {children}
    </LocaleContext.Provider>
  )
}
