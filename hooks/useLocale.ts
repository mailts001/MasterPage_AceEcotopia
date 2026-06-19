'use client'

import { useContext } from 'react'
import { LocaleContext } from '@/components/LocaleProvider'
import { strings, StringKey } from '@/lib/i18n'

export function useLocale() {
  const { locale, setLocale } = useContext(LocaleContext)

  function t(key: StringKey): string {
    return strings[key][locale]
  }

  return { locale, setLocale, t }
}
