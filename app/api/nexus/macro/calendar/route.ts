import { NextResponse } from 'next/server'

const VPS = process.env.ACEECONOMY_URL || 'http://204.168.221.101:8505'
const KEY = process.env.NEXUS_API_KEY  || 'x68-nexus-internal-2024'

export const revalidate = 3600 // cache 1 hour — calendar events don't change intraday

export async function GET() {
  try {
    const res = await fetch(`${VPS}/api/nexus/macro/calendar`, {
      headers: { 'x-nexus-key': KEY },
    })
    if (!res.ok) throw new Error(`upstream ${res.status}`)
    return NextResponse.json(await res.json())
  } catch (e) {
    return NextResponse.json({ events: [], total: 0, error: String(e) })
  }
}
