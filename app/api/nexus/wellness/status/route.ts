import { NextResponse } from 'next/server'

const SERENITY = process.env.SERENITY_URL || 'http://5.223.72.120:8080'

export async function GET() {
  try {
    const [monitorRes, playlistRes] = await Promise.all([
      fetch(`${SERENITY}/api/monitor`,  { next: { revalidate: 60 } }),
      fetch(`${SERENITY}/api/playlist`, { next: { revalidate: 60 } }),
    ])

    const monitor  = monitorRes.ok  ? await monitorRes.json()  : {}
    const playlist = playlistRes.ok ? await playlistRes.json() : {}

    return NextResponse.json({
      active_listeners: monitor.active_listeners ?? 0,
      unique_today:     monitor.unique_today ?? 0,
      status:           monitor.status ?? 'unknown',
      tracks:           playlist.tracks ?? [],
      total_tracks:     playlist.total_tracks ?? 0,
      channel:          playlist.channel ?? 'default',
    })
  } catch (e) {
    return NextResponse.json({
      active_listeners: 0, unique_today: 0, status: 'error',
      tracks: [], total_tracks: 0, channel: 'default', error: String(e),
    })
  }
}
