import { NextResponse } from 'next/server'

const VPS = process.env.ACEECONOMY_URL || 'http://204.168.221.101:8505'
const KEY = process.env.NEXUS_API_KEY  || 'x68-nexus-internal-2024'

export const dynamic = 'force-dynamic' // always fresh — VPS caches 30 min internally

export async function GET() {
  try {
    const res = await fetch(`${VPS}/api/nexus/macro/news`, {
      headers: { 'x-nexus-key': KEY },
      next: { revalidate: 1800 },
    })
    if (!res.ok) throw new Error(`upstream ${res.status}`)
    return NextResponse.json(await res.json())
  } catch (e) {
    return NextResponse.json({ articles: [], count: 0, error: String(e), generated_at: null })
  }
}
