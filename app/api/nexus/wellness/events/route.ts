import { NextResponse } from 'next/server'

const SERENITY = process.env.SERENITY_URL || 'http://5.223.72.120:8080'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const limit = searchParams.get('limit') || '20'
  const cat   = searchParams.get('cat')   || ''

  try {
    const url = `${SERENITY}/api/events/upcoming?limit=${limit}${cat ? `&cat=${cat}` : ''}`
    const res = await fetch(url, { next: { revalidate: 1800 } }) // cache 30 min
    if (!res.ok) throw new Error(`upstream ${res.status}`)
    const data = await res.json()
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ count: 0, events: [], error: String(e) })
  }
}
