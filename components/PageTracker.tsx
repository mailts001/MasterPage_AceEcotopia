'use client'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export default function PageTracker() {
  const pathname = usePathname()

  useEffect(() => {
    // Fire-and-forget — silent fail is fine
    fetch('/api/nexus/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: pathname }),
    }).catch(() => {})
  }, [pathname])

  return null
}
