import { NextResponse } from 'next/server'

const VPS = process.env.ACEECONOMY_URL || 'http://204.168.221.101:8505'
const KEY = process.env.NEXUS_API_KEY  || 'x68-nexus-internal-2024'

export const revalidate = 86400 // cache 24 hours — PMI updated monthly

export async function GET() {
  try {
    const res = await fetch(`${VPS}/api/nexus/macro/pmi`, {
      headers: { 'x-nexus-key': KEY },
    })
    if (!res.ok) throw new Error(`upstream ${res.status}`)
    return NextResponse.json(await res.json())
  } catch (e) {
    return NextResponse.json({ countries: [], months: [], error: String(e) })
  }
}
