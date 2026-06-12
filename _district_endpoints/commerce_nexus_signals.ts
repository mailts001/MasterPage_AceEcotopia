/**
 * ADD TO eCommerce Next.js project on trading VPS:
 * Path: /root/ai-commerce-os/frontend/app/api/nexus/signals/route.ts
 *
 * READ-ONLY aggregate counts only — no product data, no orders, no prices.
 * Add NEXUS_API_KEY to your .env.local on that server.
 *
 * IMPORTANT: This runs on the trading VPS frontend port only.
 * Never expose trading bot data from this endpoint.
 */

import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

const NEXUS_KEY = process.env.NEXUS_API_KEY || ''

export async function GET(req: Request) {
  const key = req.headers.get('x-nexus-key')
  if (!key || key !== NEXUS_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [alertsToday, activeMonitors, lastSignalAt] = await Promise.all([
    getAlertsToday(),
    getActiveMonitors(),
    getLastSignalAt(),
  ])

  return NextResponse.json({
    district: 'commerce',
    alerts_today: alertsToday,
    active_monitors: activeMonitors,   // active arbitrage monitors
    signals_today: alertsToday,
    last_signal_at: lastSignalAt,
    status: 'live',
  })
}

// ---------------------------------------------------------------
// Adapt these to your actual data source (DB, log files, etc.)
// ---------------------------------------------------------------

async function getAlertsToday(): Promise<number> {
  try {
    // If you log deal alerts to a file, count today's entries
    const logPath = path.join(process.cwd(), '..', 'logs', 'deals.log')
    const content = await fs.readFile(logPath, 'utf8')
    const today = new Date().toISOString().slice(0, 10)
    return content.split('\n').filter(l => l.includes(today)).length
  } catch {
    return 0
  }
}

async function getActiveMonitors(): Promise<number> {
  try {
    // Count active product monitors from state file if exists
    const statePath = path.join(process.cwd(), '..', 'data', 'monitors.json')
    const content = await fs.readFile(statePath, 'utf8')
    const state = JSON.parse(content)
    return Array.isArray(state) ? state.filter((m: any) => m.active).length : 0
  } catch {
    return 0
  }
}

async function getLastSignalAt(): Promise<string | null> {
  try {
    const logPath = path.join(process.cwd(), '..', 'logs', 'deals.log')
    const content = await fs.readFile(logPath, 'utf8')
    const lines = content.trim().split('\n').filter(Boolean)
    return lines.length > 0 ? lines[lines.length - 1].slice(0, 19) : null
  } catch {
    return null
  }
}
