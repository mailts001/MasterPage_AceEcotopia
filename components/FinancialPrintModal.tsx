'use client'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

// ── Section registry ────────────────────────────────────────────────────────────
type SegmentKey = 'macro' | 'watchlist' | 'portfolio'
const SEG_LABEL: Record<SegmentKey, string> = {
  macro:     '🌐 Macro Outlook',
  watchlist: '⭐ Watchlist Signals',
  portfolio: '📐 GoalBasedPortfolio',
}

interface SectionDef { id: string; seg: SegmentKey; label: string; desc: string }
const ALL_SECTIONS: SectionDef[] = [
  { id: 'macro_snapshot',  seg: 'macro',     label: 'Market Snapshot',      desc: 'Regime, top movers, AI narrative'              },
  { id: 'macro_news',      seg: 'macro',     label: 'Market News',           desc: 'Latest financial headlines'                    },
  { id: 'macro_pmi',       seg: 'macro',     label: 'PMI Heatmap',           desc: 'Global PMI by country'                         },
  { id: 'macro_calendar',  seg: 'macro',     label: 'Economic Calendar',     desc: 'Upcoming high-impact events'                   },
  { id: 'wl_signals',      seg: 'watchlist', label: 'Watchlist Signals',     desc: 'Signal table with perf metrics'                },
  { id: 'wl_fundamentals', seg: 'watchlist', label: 'Fundamentals Summary',  desc: 'EPS, dividend, ROE per holding'                },
  { id: 'wl_perf_chart',   seg: 'watchlist', label: 'Watchlist % Change Chart', desc: 'Bar chart comparing ticker returns across periods' },
  { id: 'wl_chart',        seg: 'watchlist', label: 'Sector Performance',    desc: 'Dot chart of SPDR sector ETF 3M returns'      },
  { id: 'pt_holdings',     seg: 'portfolio', label: 'Holdings Allocation',   desc: 'Position weights with pie chart'               },
  { id: 'pt_projections',  seg: 'portfolio', label: 'Return Projections',    desc: 'Est Return, YTD Return, Bear / Bull scenarios' },
  { id: 'pt_compare',      seg: 'portfolio', label: 'Portfolio Comparison',  desc: 'Side-by-side GoalBased vs Balanced'            },
  { id: 'pt_complement',   seg: 'portfolio', label: 'Complement Chart',      desc: '"How the Two Portfolios Complement Each Other"' },
]

// ── External data interfaces ────────────────────────────────────────────────────
export interface WatchlistHolding {
  ticker: string; name?: string; price?: number; signal: string
  '1y'?: number; '6m'?: number; '3m'?: number; '5d'?: number; overnight?: number
  eps_ttm?: number; eps_forward?: number; eps_growth_yoy?: number
  dividend_yield?: number; roe?: number; vol_ann?: number; sharpe_1y?: number
}
export interface SectorReturn { ticker: string; ret: number }
export interface PortfolioHolding {
  id: string; ticker: string; name: string; category: string
  pct: number; managerReturn: number; isCustom?: boolean
}
export interface PortfolioProjections {
  managerBlended: number; aceBlended: number; conservativeBlended: number
  portfolioVol: number; sharpeAce: number; sharpeManager: number
}

interface Props {
  onClose: () => void
  defaultSegments?: SegmentKey[]
  watchlistData?:   WatchlistHolding[]
  sectorReturns?:   SectorReturn[]      // pre-loaded from watchlist page cards view
  holdings?:        PortfolioHolding[]
  clientHoldings?:  PortfolioHolding[]
  proj?:            PortfolioProjections
  cProj?:           PortfolioProjections
  clientName?:      string
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function pctStr(v?: number | null, d = 1) {
  if (v == null) return '—'
  return `${v >= 0 ? '+' : ''}${v.toFixed(d)}%`
}
function fmtTs(ts?: number) {
  if (!ts) return ''
  const diff = Date.now() / 1000 - ts
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`
  return `${Math.round(diff / 86400)}d ago`
}

const CAT_COLORS: Record<string, string> = {
  equity: '#3b82f6', fixed_income: '#22c55e', fx: '#eab308',
  commodities: '#f97316', private_equity: '#a855f7',
  thematic: '#06b6d4', cash: '#94a3b8', philanthropy: '#ec4899',
}

// ── SVG Watchlist performance grouped bar chart ───────────────────────────────
function buildWatchlistPerfChart(tickers: WatchlistHolding[]): string {
  if (!tickers.length) return ''
  const PERIODS = [
    { key: 'overnight' as const, label: '1D' },
    { key: '5d'        as const, label: '5D' },
    { key: '3m'        as const, label: '3M' },
    { key: '1y'        as const, label: '1Y' },
  ]
  // Find global min/max for scaling
  let gMin = 0, gMax = 0
  tickers.forEach(h => PERIODS.forEach(p => {
    const v = h[p.key] ?? 0
    if (v < gMin) gMin = v
    if (v > gMax) gMax = v
  }))
  const range = (gMax - gMin) || 1
  const zeroY = gMax / range  // 0–1 fraction from top

  const W = 560, padL = 55, padR = 20, padT = 20, padB = 35
  const chartW = W - padL - padR
  const chartH = 120
  const H = padT + chartH + padB

  const barGroup = chartW / tickers.length
  const barW = Math.min(barGroup * 0.8, 40)
  const subW = barW / PERIODS.length

  const COLORS = ['#3b82f6','#06b6d4','#22c55e','#f59e0b']
  const zeroLineY = padT + zeroY * chartH

  let bars = ''
  tickers.forEach((h, i) => {
    const gx = padL + i * barGroup + (barGroup - barW) / 2
    PERIODS.forEach((p, j) => {
      const v = h[p.key] ?? 0
      const barH = Math.abs(v / range) * chartH
      const barY = v >= 0 ? zeroLineY - barH : zeroLineY
      bars += `<rect x="${(gx + j * subW).toFixed(1)}" y="${barY.toFixed(1)}" width="${(subW - 1).toFixed(1)}" height="${barH.toFixed(1)}" fill="${COLORS[j]}" opacity="0.8" rx="1"/>`
    })
    // x-axis label
    const cx = gx + barW / 2
    bars += `<text x="${cx.toFixed(1)}" y="${(H - padB + 13).toFixed(1)}" text-anchor="middle" font-size="8" fill="#475569" font-family="monospace">${h.ticker}</text>`
  })

  // Legend
  let legend = PERIODS.map((p, j) =>
    `<rect x="${padL + j * 70}" y="${H - 10}" width="8" height="8" fill="${COLORS[j]}" rx="1"/>
     <text x="${padL + j * 70 + 11}" y="${H - 2}" font-size="8" fill="#64748b">${p.label}</text>`
  ).join('')

  // Y axis ticks
  const yTicks = [-20, -10, 0, 10, 20].filter(v => v >= gMin - 5 && v <= gMax + 5)
  let yAxis = ''
  yTicks.forEach(v => {
    const y = padT + ((gMax - v) / range) * chartH
    if (y >= padT && y <= padT + chartH) {
      yAxis += `<line x1="${padL - 3}" y1="${y.toFixed(1)}" x2="${padL + chartW}" y2="${y.toFixed(1)}" stroke="#e2e8f0" stroke-width="0.5"/>`
      yAxis += `<text x="${padL - 5}" y="${(y + 3).toFixed(1)}" text-anchor="end" font-size="7" fill="#94a3b8">${v}%</text>`
    }
  })

  return `<svg viewBox="0 0 ${W} ${H + 20}" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:${W}px;height:auto;display:block;margin:8px 0">
    <text x="${W/2}" y="12" text-anchor="middle" font-size="11" font-weight="600" fill="#1e293b">Watchlist % Return by Period</text>
    ${yAxis}
    <line x1="${padL}" y1="${zeroLineY.toFixed(1)}" x2="${padL + chartW}" y2="${zeroLineY.toFixed(1)}" stroke="#94a3b8" stroke-width="1"/>
    ${bars}
    ${legend}
  </svg>`
}

// ── SVG Line chart from price-history rebased series ─────────────────────────
function buildLineChart(history: any): string {
  if (!history?.series) return ''
  const series = history.series as Record<string, {dates: string[]; rebased: number[]}>
  const tickers = Object.keys(series).filter(k => series[k]?.rebased?.length > 1)
  if (!tickers.length) return ''

  // Find date union (use first ticker's dates as x-axis)
  const dates = series[tickers[0]].dates
  const n = dates.length

  let gMin = 0, gMax = 0
  tickers.forEach(t => series[t].rebased.forEach(v => { if (v < gMin) gMin = v; if (v > gMax) gMax = v }))
  const range = (gMax - gMin) || 1

  const W = 560, padL = 42, padR = 20, padT = 20, padB = 40, chartH = 130
  const H = padT + chartH + padB
  const chartW = W - padL - padR

  const COLORS = ['#3b82f6','#06b6d4','#22c55e','#f59e0b','#ef4444','#a855f7','#ec4899','#84cc16','#14b8a6','#f97316']
  const zeroY = padT + (gMax / range) * chartH

  // Build polylines
  let lines = ''
  tickers.forEach((t, ti) => {
    const pts = series[t].rebased.map((v, i) => {
      const x = padL + (i / Math.max(n - 1, 1)) * chartW
      const y = padT + ((gMax - v) / range) * chartH
      return `${x.toFixed(1)},${y.toFixed(1)}`
    }).join(' ')
    lines += `<polyline points="${pts}" fill="none" stroke="${COLORS[ti % COLORS.length]}" stroke-width="1.5" stroke-linejoin="round"/>`
    // Label at end
    const lastV = series[t].rebased[series[t].rebased.length - 1]
    const lastX = padL + chartW + 2
    const lastY = padT + ((gMax - lastV) / range) * chartH
    lines += `<text x="${lastX}" y="${(lastY + 3).toFixed(1)}" font-size="8" fill="${COLORS[ti % COLORS.length]}" font-family="monospace" font-weight="700">${t}</text>`
  })

  // Y-axis ticks
  let yAxis = ''
  const tickVals = [-20, -10, 0, 10, 20, 30].filter(v => v >= gMin - 5 && v <= gMax + 5)
  tickVals.forEach(v => {
    const y = padT + ((gMax - v) / range) * chartH
    yAxis += `<line x1="${padL - 3}" y1="${y.toFixed(1)}" x2="${padL + chartW}" y2="${y.toFixed(1)}" stroke="#e2e8f0" stroke-width="0.5"/>`
    yAxis += `<text x="${padL - 5}" y="${(y + 3).toFixed(1)}" text-anchor="end" font-size="7" fill="#94a3b8">${v >= 0 ? '+' : ''}${v}%</text>`
  })

  // Zero line
  yAxis += `<line x1="${padL}" y1="${zeroY.toFixed(1)}" x2="${padL + chartW}" y2="${zeroY.toFixed(1)}" stroke="#94a3b8" stroke-width="1" stroke-dasharray="3,2"/>`

  // X-axis date labels (show ~5 evenly spaced)
  let xLabels = ''
  const xStep = Math.max(1, Math.floor(n / 5))
  for (let i = 0; i < n; i += xStep) {
    const x = padL + (i / Math.max(n - 1, 1)) * chartW
    const d = dates[i]?.slice(5) ?? ''  // MM-DD
    xLabels += `<text x="${x.toFixed(1)}" y="${H - padB + 14}" text-anchor="middle" font-size="7" fill="#94a3b8">${d}</text>`
  }

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:${W}px;height:auto;display:block;margin:8px 0">
    <text x="${W/2}" y="12" text-anchor="middle" font-size="11" font-weight="600" fill="#1e293b">Watchlist % Change (Rebased, 1M)</text>
    ${yAxis}
    ${lines}
    ${xLabels}
  </svg>`
}

// ── SVG Pie Chart (inline, no dependencies) ───────────────────────────────────
function buildPieChart(slices: { label: string; pct: number; color: string }[], title: string): string {
  const total = slices.reduce((s, x) => s + x.pct, 0) || 1
  const norm  = slices.map(s => ({ ...s, frac: s.pct / total }))
  const cx = 90, cy = 90, r = 80, W = 380, H = 200

  let paths = ''
  let angle = -Math.PI / 2
  norm.forEach(s => {
    const sweep = s.frac * 2 * Math.PI
    const x1 = cx + r * Math.cos(angle)
    const y1 = cy + r * Math.sin(angle)
    const x2 = cx + r * Math.cos(angle + sweep)
    const y2 = cy + r * Math.sin(angle + sweep)
    const large = sweep > Math.PI ? 1 : 0
    paths += `<path d="M${cx},${cy} L${x1.toFixed(1)},${y1.toFixed(1)} A${r},${r} 0 ${large},1 ${x2.toFixed(1)},${y2.toFixed(1)} Z" fill="${s.color}" stroke="#fff" stroke-width="1.5"/>`
    angle += sweep
  })

  // Legend
  let legend = ''
  norm.forEach((s, i) => {
    const y = 12 + i * 18
    legend += `<rect x="195" y="${y - 9}" width="12" height="12" rx="2" fill="${s.color}"/>
      <text x="212" y="${y}" font-size="10" fill="#334155">${s.label.replace(/_/g, ' ')} <tspan font-weight="bold">${(s.frac * 100).toFixed(1)}%</tspan></text>`
  })

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:${W}px;height:auto;display:block;margin:8px 0">
    <text x="${cx}" y="-8" text-anchor="middle" font-size="11" font-weight="600" fill="#1e293b">${title}</text>
    ${paths}
    <text x="${cx}" y="${cy + 4}" text-anchor="middle" font-size="10" fill="#64748b">Alloc %</text>
    ${legend}
  </svg>`
}

// ── SVG Dot Chart for sector ETF returns ─────────────────────────────────────
function buildSectorDotChart(sectors: { ticker: string; ret: number }[]): string {
  const sorted = [...sectors].sort((a, b) => b.ret - a.ret)
  const W = 500, rowH = 22, padL = 50, padR = 20, padT = 24, barW = W - padL - padR - 60
  const H = padT + sorted.length * rowH + 20
  const vals = sorted.map(s => s.ret)
  const min = Math.min(...vals, 0), max = Math.max(...vals, 0)
  const range = max - min || 1
  const zeroX = padL + ((-min) / range) * barW

  let rows = ''
  sorted.forEach((s, i) => {
    const y = padT + i * rowH
    const x = padL + ((s.ret - min) / range) * barW
    const color = s.ret >= 0 ? '#16a34a' : '#dc2626'
    const cx_ = Math.min(x, zeroX), barLen = Math.abs(x - zeroX)
    rows += `
      <text x="${padL - 4}" y="${y + 7}" text-anchor="end" font-size="9" fill="#64748b" font-family="monospace">${s.ticker}</text>
      <rect x="${cx_}" y="${y - 2}" width="${barLen}" height="12" rx="2" fill="${color}" opacity="0.25"/>
      <circle cx="${x}" cy="${y + 4}" r="5" fill="${color}"/>
      <text x="${x + (s.ret >= 0 ? 8 : -8)}" y="${y + 8}" font-size="9" fill="${color}" text-anchor="${s.ret >= 0 ? 'start' : 'end'}" font-family="monospace" font-weight="700">${pctStr(s.ret)}</text>`
  })

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:${W}px;height:auto;display:block;margin:8px 0">
    <text x="${W/2}" y="14" text-anchor="middle" font-size="11" font-weight="600" fill="#1e293b">Sector ETF Period Return</text>
    <line x1="${zeroX}" y1="${padT - 4}" x2="${zeroX}" y2="${H - 8}" stroke="#94a3b8" stroke-width="1" stroke-dasharray="3,3"/>
    ${rows}
  </svg>`
}

// ── SVG complement butterfly chart ───────────────────────────────────────────
function buildComplementChart(
  mgr: PortfolioHolding[], cli: PortfolioHolding[]
): string {
  const cats = [...new Set([...mgr, ...cli].map(h => h.category))]
  const mTotal = mgr.reduce((s, h) => s + h.pct, 0) || 1
  const cTotal = cli.reduce((s, h) => s + h.pct, 0) || 1
  const rows = cats.map(cat => ({
    cat,
    mPct: mgr.filter(h => h.category === cat).reduce((s, h) => s + h.pct / mTotal * 100, 0),
    cPct: cli.filter(h => h.category === cat).reduce((s, h) => s + h.pct / cTotal * 100, 0),
    color: CAT_COLORS[cat] ?? '#94a3b8',
  }))

  const W = 500, rowH = 24, padT = 30, padB = 10
  const H = padT + rows.length * rowH + padB
  const midX = 250, halfBar = 100

  let svgRows = ''
  rows.forEach((r, i) => {
    const y = padT + i * rowH
    const mW = (r.mPct / 100) * halfBar
    const cW = (r.cPct / 100) * halfBar
    svgRows += `
      <text x="${midX - 4}" y="${y + 10}" text-anchor="end" font-size="9" fill="#334155">${r.cat.replace(/_/g,' ')}</text>
      <rect x="${midX - mW}" y="${y}" width="${mW}" height="14" rx="2" fill="#818cf8" opacity="0.7"/>
      <rect x="${midX}" y="${y}" width="${cW}" height="14" rx="2" fill="#34d399" opacity="0.7"/>
      <text x="${midX - mW - 3}" y="${y + 10}" text-anchor="end" font-size="8" fill="#818cf8" font-family="monospace">${r.mPct.toFixed(0)}%</text>
      <text x="${midX + cW + 3}" y="${y + 10}" text-anchor="start" font-size="8" fill="#16a34a" font-family="monospace">${r.cPct.toFixed(0)}%</text>`
  })

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:${W}px;height:auto;display:block;margin:8px 0">
    <text x="10" y="16" font-size="9" fill="#818cf8" font-weight="600">◀ GoalBasedPortfolio</text>
    <text x="${W - 10}" y="16" text-anchor="end" font-size="9" fill="#16a34a" font-weight="600">Balanced Portfolio ▶</text>
    <line x1="${midX}" y1="22" x2="${midX}" y2="${H - padB}" stroke="#cbd5e1" stroke-width="1"/>
    ${svgRows}
  </svg>`
}

// ── HTML report builder ────────────────────────────────────────────────────────
function buildReport(selected: Set<string>, recipientName: string, data: {
  snapshot?: any; news?: any[]; pmi?: any; calendar?: any[]
  watchlist?: WatchlistHolding[]; sectorReturns?: { ticker: string; ret: number }[]
  lineHistory?: any
  holdings?: PortfolioHolding[]; clientHoldings?: PortfolioHolding[]
  proj?: PortfolioProjections; cProj?: PortfolioProjections; clientName?: string
}) {
  const { snapshot, news, pmi, calendar, watchlist, sectorReturns, lineHistory,
          holdings, clientHoldings, proj, cProj, clientName } = data
  const date = new Date().toLocaleDateString('en-SG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const css = `
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1e293b;background:#fff;padding:32px;max-width:900px;margin:auto}
    h1{font-size:22px;font-weight:700;color:#0f172a;margin-bottom:4px}
    .subtitle{font-size:11px;color:#64748b;margin-bottom:28px}
    h2{font-size:14px;font-weight:700;color:#1e293b;margin:28px 0 10px;padding-bottom:6px;border-bottom:2px solid #e2e8f0}
    h3{font-size:12px;font-weight:600;color:#334155;margin:14px 0 6px}
    .badge{display:inline-block;padding:2px 9px;border-radius:999px;font-size:10px;font-weight:700}
    .bg{background:#22c55e;color:#fff}.br{background:#ef4444;color:#fff}.ba{background:#f59e0b;color:#fff}.bb{background:#3b82f6;color:#fff}.bgr{background:#f1f5f9;color:#475569}
    table{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:8px}
    th{background:#f8fafc;padding:7px 10px;text-align:left;font-weight:600;color:#64748b;border-bottom:1px solid #e2e8f0}
    td{padding:7px 10px;border-bottom:1px solid #f1f5f9;vertical-align:top}
    tr:last-child td{border-bottom:none}
    .rt{text-align:right}.mono{font-family:'Courier New',monospace;font-weight:700}
    .g{color:#16a34a}.r{color:#dc2626}.b{color:#2563eb}.a{color:#d97706}.pu{color:#7c3aed}.gr{color:#64748b}
    .narrative{font-size:11px;line-height:1.7;color:#334155;background:#f8fafc;border-left:3px solid #3b82f6;padding:10px 14px;margin:8px 0;border-radius:0 6px 6px 0}
    .narrative p{margin-bottom:8px}.narrative p:last-child{margin-bottom:0}
    .narrative strong{color:#1e40af}
    .two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px}
    .news-item{margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid #f1f5f9}
    .news-meta{font-size:10px;color:#94a3b8;margin-top:2px}
    .news-headline{font-size:12px;color:#1e293b;font-weight:500;line-height:1.4}
    footer{margin-top:32px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8}
    @media print{body{padding:16px}}
  `

  let body = ''

  // ── MARKET SNAPSHOT ─────────────────────────────────────────────────────────
  if (selected.has('macro_snapshot') && snapshot) {
    const regCls = (r: string) => r.includes('BULL') ? 'bg' : r.includes('BEAR') ? 'br' : 'ba'
    body += `<h2>🌐 Market Snapshot</h2>
    <span class="badge ${regCls(snapshot.regime ?? '')}">${snapshot.regime ?? '—'}</span>
    <div class="two-col" style="margin-top:10px">`

    if (snapshot.top_gainers?.length || snapshot.top_losers?.length) {
      body += `<div><h3>Top Gainers</h3>
        <table><thead><tr><th>Name</th><th>Ticker</th><th class="rt">1D</th><th class="rt">YTD</th></tr></thead><tbody>
        ${(snapshot.top_gainers ?? []).slice(0,5).map((a: any) =>
          `<tr><td>${a.name??''}</td><td class="mono">${a.symbol??a.ticker??''}</td><td class="rt mono g">${pctStr(a.chg_1d)}</td><td class="rt mono ${(a.chg_ytd??0)>=0?'g':'r'}">${pctStr(a.chg_ytd)}</td></tr>`
        ).join('')}</tbody></table></div>
      <div><h3>Top Losers</h3>
        <table><thead><tr><th>Name</th><th>Ticker</th><th class="rt">1D</th><th class="rt">YTD</th></tr></thead><tbody>
        ${(snapshot.top_losers ?? []).slice(0,5).map((a: any) =>
          `<tr><td>${a.name??''}</td><td class="mono">${a.symbol??a.ticker??''}</td><td class="rt mono r">${pctStr(a.chg_1d)}</td><td class="rt mono ${(a.chg_ytd??0)>=0?'g':'r'}">${pctStr(a.chg_ytd)}</td></tr>`
        ).join('')}</tbody></table></div>`
    }
    body += `</div>`

    if (snapshot.narrative) {
      body += `<h3>AI Market Narrative</h3>
      <div class="narrative">${snapshot.narrative
        .split('\n\n').filter(Boolean)
        .map((p: string) => `<p>${p.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')}</p>`).join('')}
      </div>`
    }

    if (snapshot.us_sectors?.all?.length) {
      body += `<h3>US Sector Performance</h3>
      <table><thead><tr><th>Sector</th><th class="rt">1D</th><th class="rt">1W</th><th class="rt">YTD</th></tr></thead><tbody>
      ${snapshot.us_sectors.all.map((s: any) =>
        `<tr><td>${s.emoji??''} ${s.name??s.symbol??''}</td>
        <td class="rt mono ${(s.chg_1d??0)>=0?'g':'r'}">${pctStr(s.chg_1d)}</td>
        <td class="rt mono ${(s.chg_1w??0)>=0?'g':'r'}">${pctStr(s.chg_1w)}</td>
        <td class="rt mono ${(s.chg_ytd??0)>=0?'g':'r'}">${pctStr(s.chg_ytd)}</td></tr>`
      ).join('')}</tbody></table>`
    }
  }

  // ── NEWS ────────────────────────────────────────────────────────────────────
  if (selected.has('macro_news') && news?.length) {
    body += `<h2>📰 Market News</h2>`
    news.slice(0,8).forEach((a: any) => {
      const ts = a.ts ?? (a.dt ? new Date(a.dt).getTime()/1000 : null)
      body += `<div class="news-item">
        <div class="news-headline">${a.headline??''}</div>
        <div class="news-meta">${a.source??''} · ${ts ? fmtTs(ts) : ''} · ${a.category??''}</div>
        ${a.summary ? `<div style="font-size:11px;color:#64748b;margin-top:3px">${a.summary}</div>` : ''}
      </div>`
    })
  }

  // ── PMI ─────────────────────────────────────────────────────────────────────
  if (selected.has('macro_pmi') && pmi) {
    const mfgRows: any[] = pmi.manufacturing ?? []
    const svcRows: any[] = pmi.services ?? []
    const months: string[] = pmi.months ?? []
    const lastMo = months[months.length - 1]
    const prevMo = months[months.length - 2]

    body += `<h2>🏭 PMI Heatmap</h2>
    <table><thead><tr><th>Country</th><th class="rt">Mfg (latest)</th><th class="rt">Mfg (prev)</th><th class="rt">Svc (latest)</th></tr></thead><tbody>
    ${mfgRows.map((row: any) => {
      const mLast = row.months?.[lastMo]
      const mPrev = row.months?.[prevMo]
      const srow = svcRows.find((s: any) => s.code === row.code)
      const sLast = srow?.months?.[lastMo]
      const col = (v?: number) => v==null?'gr':v>=52?'g':v>=50?'a':'r'
      return `<tr><td>${row.flag??''} ${row.name??row.code}</td>
        <td class="rt mono ${col(mLast)}">${mLast??'—'}</td>
        <td class="rt mono gr">${mPrev??'—'}</td>
        <td class="rt mono ${col(sLast)}">${sLast??'—'}</td>
      </tr>`
    }).join('')}
    </tbody></table>
    <div style="font-size:10px;color:#94a3b8;margin-top:4px">PMI &gt;52 expansion · 50–52 marginal · &lt;50 contraction · Month: ${lastMo}</div>`
  }

  // ── CALENDAR ────────────────────────────────────────────────────────────────
  if (selected.has('macro_calendar') && calendar?.length) {
    body += `<h2>📅 Economic Calendar</h2>
    <table><thead><tr><th>Date</th><th>Event</th><th>Country</th><th class="rt">Impact</th></tr></thead><tbody>
    ${calendar.slice(0,15).map((e: any) => {
      const impCls = e.importance==='HIGH' ? 'br' : e.importance==='MEDIUM' ? 'ba' : 'bgr'
      return `<tr>
        <td>${e.date??''} <span style="font-size:9px;color:#94a3b8">${e.day_of_week??''}</span></td>
        <td>${e.title??e.event??''} ${e.note ? `<div style="font-size:9px;color:#94a3b8">${e.note}</div>` : ''}</td>
        <td>${e.country??''}</td>
        <td class="rt"><span class="badge ${impCls}">${e.importance??''}</span></td>
      </tr>`
    }).join('')}
    </tbody></table>`
  }

  // ── WATCHLIST SIGNALS ───────────────────────────────────────────────────────
  if (selected.has('wl_signals') && !watchlist?.length) {
    body += `<h2>⭐ Watchlist Signals</h2>
    <p style="font-size:11px;color:#94a3b8;padding:8px 0">No watchlist tickers found. Add tickers in the Watchlist Signals page first.</p>`
  }
  if (selected.has('wl_signals') && watchlist?.length) {
    const sigCls: Record<string,string> = { BUY:'bg', SQUEEZE:'pu', WATCH:'ba', NEUTRAL:'bgr', SELL:'br' }
    body += `<h2>⭐ Watchlist Signals</h2>
    <table><thead><tr>
      <th>Ticker</th><th>Signal</th>
      <th class="rt">Price</th><th class="rt">1D</th><th class="rt">5D</th><th class="rt">3M</th><th class="rt">1Y</th>
      <th class="rt">Vol σ</th><th class="rt">Sharpe</th>
    </tr></thead><tbody>
    ${watchlist.map(h => `<tr>
      <td class="mono">${h.ticker}</td>
      <td><span class="badge ${sigCls[h.signal]??'bgr'}" style="font-size:9px">${h.signal}</span></td>
      <td class="rt">${h.price!=null?`$${h.price.toFixed(2)}`:'—'}</td>
      <td class="rt mono ${(h.overnight??0)>=0?'g':'r'}">${pctStr(h.overnight)}</td>
      <td class="rt mono ${(h['5d']??0)>=0?'g':'r'}">${pctStr(h['5d'])}</td>
      <td class="rt mono ${(h['3m']??0)>=0?'g':'r'}">${pctStr(h['3m'])}</td>
      <td class="rt mono ${(h['1y']??0)>=0?'g':'r'}">${pctStr(h['1y'])}</td>
      <td class="rt mono a">${h.vol_ann!=null?`${h.vol_ann.toFixed(1)}%`:'—'}</td>
      <td class="rt mono">${h.sharpe_1y!=null?h.sharpe_1y.toFixed(2):'—'}</td>
    </tr>`).join('')}
    </tbody></table>`
  }

  // ── WATCHLIST PERF CHART ────────────────────────────────────────────────────
  if (selected.has('wl_perf_chart') && watchlist?.length) {
    body += `<h2>⭐ Watchlist % Change Chart</h2>`
    // Line chart (rebased 1M if history available)
    const lc = lineHistory ? buildLineChart(lineHistory) : ''
    if (lc) body += lc
    // Bar chart (multi-period comparison)
    body += buildWatchlistPerfChart(watchlist)
  }

  // ── WATCHLIST FUNDAMENTALS ──────────────────────────────────────────────────
  if (selected.has('wl_fundamentals') && watchlist?.length) {
    const hasFunds = watchlist.some(h => h.eps_ttm != null || h.roe != null)
    if (hasFunds) {
      body += `<h2>⭐ Watchlist Fundamentals</h2>
      <table><thead><tr>
        <th>Ticker</th><th class="rt">EPS TTM</th><th class="rt">Fwd EPS</th><th class="rt">EPS Growth</th><th class="rt">Div Yield</th><th class="rt">ROE</th>
      </tr></thead><tbody>
      ${watchlist.map(h => `<tr>
        <td class="mono">${h.ticker}${h.name&&h.name!==h.ticker?`<div style="font-size:9px;color:#94a3b8">${h.name}</div>`:''}</td>
        <td class="rt mono">${h.eps_ttm!=null?`$${h.eps_ttm.toFixed(2)}`:'—'}</td>
        <td class="rt mono">${h.eps_forward!=null?`$${h.eps_forward.toFixed(2)}`:'—'}</td>
        <td class="rt mono ${(h.eps_growth_yoy??0)>=0?'g':'r'}">${pctStr(h.eps_growth_yoy,0)}</td>
        <td class="rt mono a">${h.dividend_yield?`${h.dividend_yield.toFixed(1)}%`:'—'}</td>
        <td class="rt mono ${h.roe!=null?(h.roe>=15?'g':h.roe>=0?'a':'r'):'gr'}">${h.roe!=null?`${h.roe.toFixed(1)}%`:'—'}</td>
      </tr>`).join('')}
      </tbody></table>`
    } else {
      body += `<h2>⭐ Watchlist Fundamentals</h2>
      <p style="font-size:11px;color:#94a3b8">Fundamentals data not available — ticker-info endpoint requires individual symbol lookups.</p>`
    }
  }

  // ── SECTOR DOT CHART ────────────────────────────────────────────────────────
  if (selected.has('wl_chart') && sectorReturns?.length) {
    body += `<h2>📊 Sector ETF Performance</h2>`
    body += buildSectorDotChart(sectorReturns)
  }

  // ── HOLDINGS ────────────────────────────────────────────────────────────────
  if (selected.has('pt_holdings')) {
    if (!holdings?.length && !clientHoldings?.length) {
      body += `<h2>📐 Holdings Allocation</h2>
      <p style="font-size:11px;color:#94a3b8;padding:8px 0">No portfolio holdings have been built yet. Visit GoalBasedPortfolio to add assets.</p>`
    }
  }
  if (selected.has('pt_holdings') && (holdings?.length || clientHoldings?.length)) {
    const renderHoldings = (h: PortfolioHolding[], label: string) => {
      if (!h.length) return ''
      const total = h.reduce((s, x) => s + x.pct, 0) || 1
      // Build pie slices grouped by category
      const catMap: Record<string, number> = {}
      h.forEach(x => { catMap[x.category] = (catMap[x.category]??0) + x.pct/total*100 })
      const slices = Object.entries(catMap).map(([cat, pct]) => ({
        label: cat, pct, color: CAT_COLORS[cat] ?? '#94a3b8'
      }))

      return `<h3>${label}</h3>
      ${buildPieChart(slices, `${label} — Allocation by Category`)}
      <table><thead><tr><th>Ticker</th><th>Name</th><th>Category</th><th class="rt">Weight</th><th class="rt">Est Return p.a.</th></tr></thead><tbody>
      ${h.map(x => {
        const w = x.pct/total*100
        const bar = `<span style="display:inline-block;width:${Math.min(Math.round(w*2),60)}px;height:8px;border-radius:2px;background:${CAT_COLORS[x.category]??'#94a3b8'};vertical-align:middle;margin-right:4px"></span>`
        return `<tr>
          <td class="mono">${x.ticker}${x.isCustom?' <span style="font-size:9px;color:#f59e0b">custom</span>':''}</td>
          <td style="color:#64748b">${x.name}</td>
          <td>${x.category.replace(/_/g,' ')}</td>
          <td class="rt">${bar}${w.toFixed(1)}%</td>
          <td class="rt mono ${x.managerReturn>=0?'b':'r'}">${pctStr(x.managerReturn)}</td>
        </tr>`
      }).join('')}
      </tbody></table>`
    }
    body += `<h2>📐 Holdings Allocation</h2>`
    body += renderHoldings(holdings??[], 'GoalBasedPortfolio')
    if (clientHoldings?.length) body += renderHoldings(clientHoldings, `Balanced Portfolio${clientName?' — '+clientName:''}`)
  }

  // ── PROJECTIONS ─────────────────────────────────────────────────────────────
  if (selected.has('pt_projections') && !proj && !cProj) {
    body += `<h2>📐 Return Projections</h2>
    <p style="font-size:11px;color:#94a3b8;padding:8px 0">No portfolio data available — add holdings in GoalBasedPortfolio first.</p>`
  }
  if (selected.has('pt_projections') && (proj||cProj)) {
    body += `<h2>📐 Return Projections</h2>
    <table><thead><tr><th>Scenario</th><th class="rt">GoalBasedPortfolio</th>${cProj?'<th class="rt">Balanced Portfolio</th>':''}</tr></thead><tbody>`
    const rows = [
      { label:'Est Return (manager)',    m:proj?.managerBlended,              c:cProj?.managerBlended,              cls:'b' },
      { label:'YTD Return (live)',       m:proj?.aceBlended,                  c:cProj?.aceBlended,                  cls:'g' },
      { label:'Bear case (−50% base)',   m:(proj?.aceBlended??0)*0.5,         c:(cProj?.aceBlended??0)*0.5,         cls:'r' },
      { label:'Bull case (×1.6 base)',   m:(proj?.aceBlended??0)*1.6,         c:(cProj?.aceBlended??0)*1.6,         cls:'g' },
      { label:'Portfolio Volatility σ',  m:proj?.portfolioVol,                c:cProj?.portfolioVol,                cls:'a' },
      { label:'Sharpe — YTD Return',     m:proj?.sharpeAce,                   c:cProj?.sharpeAce,                   cls:'gr' },
      { label:'Sharpe — Est Return',     m:proj?.sharpeManager,               c:cProj?.sharpeManager,               cls:'gr' },
    ]
    rows.forEach(r => {
      body += `<tr><td>${r.label}</td>
        <td class="rt mono ${r.cls}">${proj?pctStr(r.m):'—'}</td>
        ${cProj?`<td class="rt mono ${r.cls}">${pctStr(r.c)}</td>`:''}
      </tr>`
    })
    body += `</tbody></table>`
  }

  // ── PORTFOLIO COMPARE ───────────────────────────────────────────────────────
  if (selected.has('pt_compare') && !(holdings?.length && clientHoldings?.length)) {
    body += `<h2>⚖️ Portfolio Comparison</h2>
    <p style="font-size:11px;color:#94a3b8;padding:8px 0">Comparison requires both GoalBasedPortfolio and Balanced Portfolio to have holdings.</p>`
  }
  if (selected.has('pt_compare') && holdings?.length && clientHoldings?.length) {
    const cats = [...new Set([...holdings, ...clientHoldings].map(h => h.category))]
    const mTot = holdings.reduce((s,h)=>s+h.pct,0)||1
    const cTot = clientHoldings.reduce((s,h)=>s+h.pct,0)||1
    body += `<h2>⚖️ Portfolio Comparison</h2>
    <table><thead><tr><th>Asset Class</th><th class="rt">GoalBased %</th><th class="rt">Balanced %</th><th class="rt">Gap</th></tr></thead><tbody>
    ${cats.map(cat => {
      const mP = holdings.filter(h=>h.category===cat).reduce((s,h)=>s+h.pct/mTot*100,0)
      const cP = clientHoldings.filter(h=>h.category===cat).reduce((s,h)=>s+h.pct/cTot*100,0)
      const delta = cP - mP
      return `<tr><td>${cat.replace(/_/g,' ')}</td>
        <td class="rt mono b">${mP.toFixed(1)}%</td>
        <td class="rt mono">${cP.toFixed(1)}%</td>
        <td class="rt mono ${delta>=0?'g':'r'}">${delta>=0?'+':''}${delta.toFixed(1)}%</td>
      </tr>`
    }).join('')}
    </tbody></table>`
  }

  // ── COMPLEMENT CHART ────────────────────────────────────────────────────────
  if (selected.has('pt_complement') && !(holdings?.length && clientHoldings?.length)) {
    body += `<h2>🔗 How the Two Portfolios Complement Each Other</h2>
    <p style="font-size:11px;color:#94a3b8;padding:8px 0">Requires both portfolios to have holdings.</p>`
  }
  if (selected.has('pt_complement') && holdings?.length && clientHoldings?.length) {
    body += `<h2>🔗 How the Two Portfolios Complement Each Other</h2>
    <p style="font-size:11px;color:#64748b;margin-bottom:8px">Each bar shows asset class weight for GoalBasedPortfolio (left, indigo) vs Balanced Portfolio (right, green). Where one covers the other&apos;s gaps, together they provide broader diversification.</p>`
    body += buildComplementChart(holdings, clientHoldings)
  }

  const sections = ALL_SECTIONS.filter(s => selected.has(s.id)).map(s => s.label).join(', ')
  const forLine  = recipientName.trim() ? `, for ${recipientName.trim()}` : ''
  const titleStr = `Investment Planning Summary Report${forLine}`

  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${titleStr}</title>
<style>${css}</style>
</head><body>
<h1>${titleStr}</h1>
<div class="subtitle">${date} · Sections: ${sections} · All figures are indicative estimates only, not investment advice.</div>
${body}
<footer>Goal Based Investment Planning · X68 AceEcotopia · ${date} · Not investment advice.</footer>
<script>window.onload=()=>window.print()</script>
</body></html>`
}

// ── Modal ───────────────────────────────────────────────────────────────────────
export default function FinancialPrintModal({
  onClose, defaultSegments,
  watchlistData, sectorReturns: sectorReturnsProp,
  holdings, clientHoldings, proj, cProj, clientName,
}: Props) {
  const initSelected = () => {
    const s = new Set<string>()
    ALL_SECTIONS.forEach(sec => {
      if (!defaultSegments || defaultSegments.includes(sec.seg)) s.add(sec.id)
    })
    return s
  }
  const [selected,      setSelected]      = useState<Set<string>>(initSelected)
  const [recipientName, setRecipientName] = useState('')      // "for Xxxx" in title
  const [generating,    setGenerating]    = useState(false)
  const [macroStatus,   setMacroStatus]   = useState<'idle'|'loading'|'done'|'error'>('idle')
  const [wlStatus,      setWlStatus]      = useState<'idle'|'loading'|'done'|'error'>('idle')
  const [sectorStatus,  setSectorStatus]  = useState<'idle'|'loading'|'done'|'error'>('idle')
  const [lineStatus,    setLineStatus]    = useState<'idle'|'loading'|'done'|'error'>('idle')
  const [portStatus,    setPortStatus]    = useState<'idle'|'loading'|'done'|'error'>('idle')

  const [snapshot,      setSnapshot]      = useState<any>(null)
  const [news,          setNews]          = useState<any[]>([])
  const [pmi,           setPmi]           = useState<any>(null)
  const [calendar,      setCalendar]      = useState<any[]>([])
  const [wlSignals,     setWlSignals]     = useState<WatchlistHolding[]>(watchlistData ?? [])
  const [sectorRets,    setSectorRets]    = useState<{ticker:string;ret:number}[]>(sectorReturnsProp ?? [])
  const [lineHistory,   setLineHistory]   = useState<any>(null)
  // Portfolio — from props or localStorage; projections computed here
  const [ptHoldings,    setPtHoldings]    = useState<PortfolioHolding[]>(holdings ?? [])
  const [ptClientH,     setPtClientH]     = useState<PortfolioHolding[]>(clientHoldings ?? [])
  const [ptProj,        setPtProj]        = useState<PortfolioProjections|undefined>(proj)
  const [ptCProj,       setPtCProj]       = useState<PortfolioProjections|undefined>(cProj)
  const [ptClientName,  setPtClientName]  = useState<string|undefined>(clientName)

  const needsMacro  = ['macro_snapshot','macro_news','macro_pmi','macro_calendar'].some(id => selected.has(id))
  const needsWl     = ['wl_signals','wl_fundamentals','wl_perf_chart','wl_chart'].some(id => selected.has(id))
  const needsSector = selected.has('wl_chart') && !sectorReturnsProp?.length
  const needsPort   = ['pt_holdings','pt_projections','pt_compare','pt_complement'].some(id => selected.has(id))

  // Simplified projection computation (no live intel — uses neutral multiplier)
  function computeSimpleProj(h: PortfolioHolding[]): PortfolioProjections | undefined {
    if (!h.length) return undefined
    const RISK_FREE = 4.0
    const VOL: Record<string, number> = {
      equity: 18, fixed_income: 8, fx: 12, commodities: 22,
      private_equity: 25, thematic: 20, cash: 1, philanthropy: 5,
    }
    const total = h.reduce((s, x) => s + x.pct, 0) || 1
    let managerBlended = 0, portfolioVol = 0
    for (const x of h) {
      const w = x.pct / total
      managerBlended += w * x.managerReturn
      portfolioVol   += w * (VOL[x.category] ?? 15)
    }
    const aceBlended          = managerBlended * 0.9
    const conservativeBlended = managerBlended * 0.6
    const sharpeAce     = portfolioVol > 0 ? (aceBlended - RISK_FREE) / portfolioVol : 0
    const sharpeManager = portfolioVol > 0 ? (managerBlended - RISK_FREE) / portfolioVol : 0
    return { managerBlended, aceBlended, conservativeBlended, portfolioVol, sharpeAce, sharpeManager }
  }

  // Load portfolio from localStorage and compute projections when not passed as props
  useEffect(() => {
    if (portStatus !== 'idle') return
    if (!needsPort) return
    setPortStatus('loading')
    try {
      // Use prop-passed holdings first, fall back to localStorage
      let h = holdings ?? [], ch = clientHoldings ?? []
      let cn = clientName
      if (!h.length && !ch.length) {
        const raw = localStorage.getItem('portbuilder_draft_v1')
        if (raw) {
          const d = JSON.parse(raw)
          if (d.holdings?.length)       h  = d.holdings
          if (d.clientHoldings?.length) ch = d.clientHoldings
          if (d.clientProfile?.name)    cn = d.clientProfile.name
        }
      }
      setPtHoldings(h)
      setPtClientH(ch)
      if (cn) { setPtClientName(cn); setRecipientName(prev => prev || cn) }
      // Compute projections if not passed
      if (!proj && h.length)  setPtProj(computeSimpleProj(h))
      if (!cProj && ch.length) setPtCProj(computeSimpleProj(ch))
      setPortStatus('done')
    } catch { setPortStatus('done') }
  }, [needsPort])

  useEffect(() => {
    if (!needsMacro || macroStatus !== 'idle') return
    setMacroStatus('loading')
    Promise.all([
      fetch('/api/nexus/macro/market-snapshot').then(r=>r.json()).catch(()=>null),
      fetch('/api/nexus/macro/news').then(r=>r.json()).catch(()=>({articles:[]})),
      fetch('/api/nexus/macro/pmi').then(r=>r.json()).catch(()=>null),
      fetch('/api/nexus/macro/calendar').then(r=>r.json()).catch(()=>({events:[]})),
    ]).then(([snap, n, p, cal]) => {
      if (snap) setSnapshot(snap)
      setNews(n?.articles ?? n?.news ?? (Array.isArray(n) ? n : []))
      setPmi(p)
      setCalendar(cal?.events ?? (Array.isArray(cal) ? cal : []))
      setMacroStatus('done')
    }).catch(()=>setMacroStatus('error'))
  }, [needsMacro])

  // Fetch watchlist (signals + price history) — run once when signals are loaded
  useEffect(() => {
    if (!needsWl) return
    // Step 1: fetch performance/signals if not pre-supplied
    if (watchlistData?.length) {
      setWlSignals(watchlistData)
      setWlStatus('done')
    } else if (wlStatus === 'idle') {
      setWlStatus('loading')
      fetch('/api/citizen/watchlist/performance').then(r=>r.json())
        .then(d => { setWlSignals(d.tickers ?? []); setWlStatus('done') })
        .catch(()=>setWlStatus('error'))
    }
  }, [needsWl, watchlistData])

  // Step 2: fetch price history after signals are known (so we have ticker list)
  useEffect(() => {
    if (!selected.has('wl_perf_chart') || lineStatus !== 'idle') return
    const syms = wlSignals.map(h => h.ticker).filter(Boolean)
    if (!syms.length) return   // wait until wlSignals is populated
    setLineStatus('loading')
    fetch(`/api/nexus/watchlist/price-history?symbols=${syms.join(',')}&period=1M`)
      .then(r => r.json())
      .then(d => { setLineHistory(d); setLineStatus('done') })
      .catch(() => setLineStatus('error'))
  }, [wlSignals, selected])

  // Fetch sector returns if not pre-supplied by parent
  const SECTOR_ETFS = ['XLK','XLF','XLV','XLY','XLP','XLE','XLI','XLU','XLRE','XLC','XLB']
  useEffect(() => {
    if (sectorReturnsProp?.length) { setSectorRets(sectorReturnsProp); setSectorStatus('done'); return }
    if (!needsSector || sectorStatus !== 'idle') return
    setSectorStatus('loading')
    fetch('/api/nexus/financial/perf-periods', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tickers: SECTOR_ETFS }),
    })
      .then(r => r.json())
      .then((d: any) => {
        const results = (d.tickers ?? []).map((t: any) => ({
          ticker: t.ticker,
          ret: t['3m'] ?? t['5d'] ?? null,
        })).filter((x: any) => x.ret != null)
        setSectorRets(results)
        setSectorStatus('done')
      })
      .catch(() => setSectorStatus('error'))
  }, [needsSector, sectorReturnsProp])

  function toggle(id: string) {
    setSelected(prev => { const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n })
  }
  function toggleSegment(seg: SegmentKey) {
    const secs = ALL_SECTIONS.filter(s => s.seg === seg)
    const allOn = secs.every(s => selected.has(s.id))
    setSelected(prev => { const n=new Set(prev); secs.forEach(s=>allOn?n.delete(s.id):n.add(s.id)); return n })
  }

  function generate() {
    if (!selected.size) return
    setGenerating(true)
    try {
      const html = buildReport(selected, recipientName, {
        snapshot, news, pmi, calendar,
        watchlist: wlSignals, sectorReturns: sectorRets, lineHistory,
        holdings: ptHoldings, clientHoldings: ptClientH,
        proj: ptProj, cProj: ptCProj, clientName: ptClientName,
      })
      const w = window.open('', '_blank')
      if (w) { w.document.write(html); w.document.close() }
    } finally { setGenerating(false) }
  }

  const segGroups = (['macro','watchlist','portfolio'] as SegmentKey[]).map(seg => ({
    seg, sections: ALL_SECTIONS.filter(s=>s.seg===seg),
    allOn: ALL_SECTIONS.filter(s=>s.seg===seg).every(s=>selected.has(s.id)),
  }))

  const isLoading = macroStatus==='loading' || wlStatus==='loading' || sectorStatus==='loading' || lineStatus==='loading' || portStatus==='loading'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#0d1220] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <div>
            <div className="text-sm font-bold text-white">🖨 Build Report</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Select sections · opens print dialog in new tab</div>
          </div>
          <button onClick={onClose} className="text-slate-600 hover:text-white transition text-lg">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {segGroups.map(({ seg, sections, allOn }) => (
            <div key={seg}>
              <button onClick={()=>toggleSegment(seg)}
                className="w-full flex items-center justify-between mb-2 group">
                <span className="text-[11px] font-semibold text-slate-300 group-hover:text-white transition">{SEG_LABEL[seg]}</span>
                <span className={`text-[9px] px-2 py-0.5 rounded border transition ${allOn?'border-cyan-500/50 text-cyan-400 bg-cyan-500/10':'border-white/10 text-slate-700'}`}>
                  {allOn?'Deselect all':'Select all'}
                </span>
              </button>

              {seg==='macro' && macroStatus==='loading' && <div className="text-[9px] text-slate-600 animate-pulse mb-1">Fetching macro data…</div>}
              {seg==='watchlist' && wlStatus==='loading' && <div className="text-[9px] text-slate-600 animate-pulse mb-1">Fetching watchlist data…</div>}
              {seg==='watchlist' && sectorStatus==='loading' && <div className="text-[9px] text-slate-600 animate-pulse mb-1">Fetching sector returns…</div>}
              {seg==='watchlist' && lineStatus==='loading' && <div className="text-[9px] text-slate-600 animate-pulse mb-1">Fetching price history…</div>}
              {seg==='portfolio' && portStatus==='loading' && <div className="text-[9px] text-slate-600 animate-pulse mb-1">Loading portfolio from saved draft…</div>}
              {seg==='portfolio' && portStatus==='done' && ptHoldings.length>0 && !holdings?.length && <div className="text-[9px] text-green-600 mb-1">✓ Loaded {ptHoldings.length} holdings from saved draft</div>}

              <div className="space-y-1.5">
                {sections.map(sec => {
                  const on = selected.has(sec.id)
                  return (
                    <label key={sec.id}
                      className={`flex items-start gap-3 cursor-pointer rounded-lg border px-3 py-2.5 transition ${on?'border-cyan-500/30 bg-cyan-500/6':'border-white/6 bg-white/2 hover:bg-white/4'}`}>
                      <input type="checkbox" checked={on} onChange={()=>toggle(sec.id)} className="mt-0.5 shrink-0 accent-cyan-400"/>
                      <div>
                        <div className={`text-[11px] font-medium ${on?'text-white':'text-slate-400'}`}>{sec.label}</div>
                        <div className="text-[9px] text-slate-600">{sec.desc}</div>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Recipient name + actions */}
        <div className="px-5 pt-3 pb-1 border-t border-white/8">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] text-slate-500 whitespace-nowrap">Prepared for:</span>
            <input
              value={recipientName}
              onChange={e => setRecipientName(e.target.value)}
              placeholder="Client / recipient name (optional)"
              className="flex-1 bg-white/5 border border-white/12 rounded-lg px-3 py-1.5 text-[11px] text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/40"
            />
          </div>
          {recipientName.trim() && (
            <div className="text-[10px] text-cyan-400/80 mb-2">
              Report title: <span className="font-medium">Investment Planning Summary Report, for {recipientName.trim()}</span>
            </div>
          )}
        </div>
        <div className="px-5 pb-4 flex items-center gap-3">
          <div className="flex-1 text-[10px] text-slate-600">
            {selected.size} section{selected.size!==1?'s':''} selected
            {isLoading && <span className="ml-2 animate-pulse">· fetching…</span>}
          </div>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs text-slate-500 hover:text-white border border-white/10 hover:border-white/20 transition">Cancel</button>
          <button onClick={generate} disabled={!selected.size||generating}
            className="px-5 py-2 rounded-lg text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-black transition disabled:opacity-40 flex items-center gap-1.5">
            {generating?<span className="animate-spin">⟳</span>:'🖨'}
            {generating?'Generating…':'Generate & Print'}
          </button>
        </div>
      </div>
    </div>
  )
}
