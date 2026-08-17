'use client'
import { useState, useEffect, useCallback } from 'react'

// ── Section registry ───────────────────────────────────────────────────────────
type SegmentKey = 'macro' | 'watchlist' | 'portfolio'
const SEG_LABEL: Record<SegmentKey, string> = {
  macro:     '🌐 Macro Outlook',
  watchlist: '⭐ Watchlist Signals',
  portfolio: '📐 GoalBasedPortfolio',
}

interface SectionDef { id: string; seg: SegmentKey; label: string; desc: string }
const ALL_SECTIONS: SectionDef[] = [
  { id: 'macro_snapshot', seg: 'macro',     label: 'Market Snapshot',      desc: 'Regime, top movers, AI narrative'              },
  { id: 'macro_news',     seg: 'macro',     label: 'Market News',           desc: 'Latest financial headlines'                    },
  { id: 'macro_pmi',      seg: 'macro',     label: 'PMI Heatmap',           desc: 'Global PMI by country'                         },
  { id: 'macro_calendar', seg: 'macro',     label: 'Economic Calendar',     desc: 'Upcoming high-impact events'                   },
  { id: 'wl_signals',     seg: 'watchlist', label: 'Watchlist Signals',     desc: 'Signal table with perf metrics'                },
  { id: 'wl_fundamentals',seg: 'watchlist', label: 'Fundamentals Summary',  desc: 'EPS, dividend, ROE per holding'                },
  { id: 'pt_holdings',    seg: 'portfolio', label: 'Holdings Allocation',   desc: 'Position weights and asset categories'         },
  { id: 'pt_projections', seg: 'portfolio', label: 'Return Projections',    desc: 'Est Return, YTD Return, Bear / Bull scenarios' },
  { id: 'pt_compare',     seg: 'portfolio', label: 'Portfolio Comparison',  desc: 'GoalBased vs Balanced side-by-side'            },
]

// ── Externally provided data interfaces ───────────────────────────────────────
export interface WatchlistHolding {
  ticker: string; name?: string; price?: number; signal: string
  '1y'?: number; '6m'?: number; '3m'?: number; '5d'?: number; overnight?: number
  eps_ttm?: number; eps_forward?: number; eps_growth_yoy?: number
  dividend_yield?: number; roe?: number; vol_ann?: number; sharpe_1y?: number
}
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
  defaultSegments?: SegmentKey[]          // pre-checked segments
  // Passthrough data (avoids re-fetch when already loaded)
  watchlistData?:   WatchlistHolding[]
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
function fmtAge(ts: number) {
  const diff = Date.now() / 1000 - ts
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`
  return `${Math.round(diff / 86400)}d ago`
}

const CAT_COLOR: Record<string, string> = {
  equity: '#3b82f6', fixed_income: '#22c55e', fx: '#eab308',
  commodities: '#f97316', private_equity: '#a855f7',
  thematic: '#06b6d4', cash: '#94a3b8', philanthropy: '#ec4899',
}

// ── Report HTML builder ────────────────────────────────────────────────────────
function buildReport(selected: Set<string>, data: {
  snapshot?: any; news?: any[]; pmi?: any[]; calendar?: any[]
  watchlist?: WatchlistHolding[]
  holdings?: PortfolioHolding[]; clientHoldings?: PortfolioHolding[]
  proj?: PortfolioProjections; cProj?: PortfolioProjections; clientName?: string
}) {
  const { snapshot, news, pmi, calendar, watchlist, holdings, clientHoldings, proj, cProj, clientName } = data
  const date = new Date().toLocaleDateString('en-SG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const css = `
    * { box-sizing: border-box; margin: 0; padding: 0 }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1e293b; background: #fff; padding: 32px; max-width: 900px; margin: auto }
    h1 { font-size: 22px; font-weight: 700; color: #0f172a; margin-bottom: 4px }
    .subtitle { font-size: 11px; color: #64748b; margin-bottom: 28px }
    h2 { font-size: 14px; font-weight: 700; color: #1e293b; margin: 24px 0 10px; padding-bottom: 6px; border-bottom: 2px solid #e2e8f0 }
    h3 { font-size: 12px; font-weight: 600; color: #334155; margin: 14px 0 6px }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; margin-bottom: 6px }
    .badge-green { background: #dcfce7; color: #166534 }
    .badge-red   { background: #fee2e2; color: #991b1b }
    .badge-amber { background: #fef3c7; color: #92400e }
    .badge-blue  { background: #dbeafe; color: #1e40af }
    .badge-gray  { background: #f1f5f9; color: #475569 }
    table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 8px }
    th { background: #f8fafc; padding: 7px 10px; text-align: left; font-weight: 600; color: #64748b; border-bottom: 1px solid #e2e8f0 }
    td { padding: 7px 10px; border-bottom: 1px solid #f1f5f9; vertical-align: top }
    tr:last-child td { border-bottom: none }
    .right { text-align: right }
    .mono { font-family: 'Courier New', monospace; font-weight: 700 }
    .green { color: #16a34a } .red { color: #dc2626 } .blue { color: #2563eb }
    .amber { color: #d97706 } .purple { color: #7c3aed } .gray { color: #64748b }
    .narrative { font-size: 11px; line-height: 1.7; color: #334155; background: #f8fafc; border-left: 3px solid #3b82f6; padding: 10px 14px; margin: 8px 0; border-radius: 0 6px 6px 0 }
    .narrative p { margin-bottom: 8px } .narrative p:last-child { margin-bottom: 0 }
    .narrative strong { color: #1e40af }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 8px }
    .card-title { font-size: 11px; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px }
    .big-num { font-size: 20px; font-weight: 800; font-family: 'Courier New', monospace }
    .news-item { display: flex; gap: 10px; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #f1f5f9 }
    .news-meta { font-size: 10px; color: #94a3b8; margin-top: 2px }
    .news-headline { font-size: 12px; color: #1e293b; font-weight: 500; line-height: 1.4 }
    .alloc-bar { display: inline-block; height: 10px; border-radius: 3px; vertical-align: middle; margin-right: 6px }
    footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8 }
    @media print { body { padding: 16px } }
  `

  let body = ''

  // ── MACRO SNAPSHOT ───────────────────────────────────────────────────────────
  if (selected.has('macro_snapshot') && snapshot) {
    const regimeColor = (r: string) =>
      r.includes('BULL') ? 'badge-green' : r.includes('BEAR') ? 'badge-red' : 'badge-amber'
    body += `<h2>🌐 Market Snapshot</h2>
    <span class="badge ${regimeColor(snapshot.regime ?? '')}">${snapshot.regime ?? '—'}</span>
    <div class="two-col" style="margin-top:10px">`

    // Top gainers / losers
    if (snapshot.top_gainers?.length || snapshot.top_losers?.length) {
      body += `<div>
        <h3>Top Gainers (1D)</h3>
        <table><thead><tr><th>Ticker</th><th class="right">1D</th><th class="right">YTD</th></tr></thead><tbody>
        ${(snapshot.top_gainers ?? []).slice(0, 5).map((a: any) =>
          `<tr><td class="mono">${a.ticker}</td><td class="right mono green">${pctStr(a.chg_1d)}</td><td class="right mono ${(a.chg_ytd ?? 0) >= 0 ? 'green' : 'red'}">${pctStr(a.chg_ytd)}</td></tr>`
        ).join('')}
        </tbody></table>
      </div>
      <div>
        <h3>Top Losers (1D)</h3>
        <table><thead><tr><th>Ticker</th><th class="right">1D</th><th class="right">YTD</th></tr></thead><tbody>
        ${(snapshot.top_losers ?? []).slice(0, 5).map((a: any) =>
          `<tr><td class="mono">${a.ticker}</td><td class="right mono red">${pctStr(a.chg_1d)}</td><td class="right mono ${(a.chg_ytd ?? 0) >= 0 ? 'green' : 'red'}">${pctStr(a.chg_ytd)}</td></tr>`
        ).join('')}
        </tbody></table>
      </div>`
    }
    body += `</div>`

    // AI narrative
    if (snapshot.narrative) {
      body += `<h3>AI Market Narrative</h3>
      <div class="narrative">${snapshot.narrative
        .split('\n\n').filter(Boolean)
        .map((p: string) => `<p>${p.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/📊|💱|🌍|📅/g, '')}</p>`)
        .join('')}
      </div>`
    }

    // US sectors
    if (snapshot.us_sectors?.all?.length) {
      body += `<h3>US Sector Performance (1D)</h3>
      <table><thead><tr><th>Sector</th><th class="right">1D</th><th class="right">1W</th></tr></thead><tbody>
      ${snapshot.us_sectors.all.slice(0, 8).map((s: any) =>
        `<tr><td>${s.name ?? s.ticker}</td><td class="right mono ${(s.chg_1d ?? 0) >= 0 ? 'green' : 'red'}">${pctStr(s.chg_1d)}</td><td class="right mono ${(s.chg_5d ?? 0) >= 0 ? 'green' : 'red'}">${pctStr(s.chg_5d)}</td></tr>`
      ).join('')}
      </tbody></table>`
    }
  }

  // ── MACRO NEWS ───────────────────────────────────────────────────────────────
  if (selected.has('macro_news') && news?.length) {
    body += `<h2>📰 Market News</h2>`
    news.slice(0, 8).forEach((a: any) => {
      body += `<div class="news-item">
        <div>
          <div class="news-headline">${a.headline ?? ''}</div>
          <div class="news-meta">${a.source ?? ''} · ${a.dt ? fmtAge(a.dt) : ''} · ${a.category ?? ''}</div>
          ${a.summary ? `<div style="font-size:11px;color:#64748b;margin-top:3px">${a.summary}</div>` : ''}
        </div>
      </div>`
    })
  }

  // ── PMI HEATMAP ──────────────────────────────────────────────────────────────
  if (selected.has('macro_pmi') && pmi?.length) {
    body += `<h2>📊 PMI Heatmap</h2>
    <table><thead><tr><th>Country</th><th class="right">Manufacturing</th><th class="right">Services</th><th class="right">Composite</th></tr></thead><tbody>
    ${pmi.slice(0, 12).map((r: any) => {
      const mfg = r.manufacturing ?? r.mfg
      const svc = r.services ?? r.svc
      const cmp = r.composite ?? r.comp
      const col = (v?: number) => v == null ? '' : v >= 52 ? 'green' : v >= 50 ? 'amber' : 'red'
      return `<tr><td>${r.country ?? r.region ?? '—'}</td>
        <td class="right mono ${col(mfg)}">${mfg ?? '—'}</td>
        <td class="right mono ${col(svc)}">${svc ?? '—'}</td>
        <td class="right mono ${col(cmp)}">${cmp ?? '—'}</td>
      </tr>`
    }).join('')}
    </tbody></table>
    <div style="font-size:10px;color:#94a3b8;margin-top:4px">PMI: &gt;52 = expansion (green) · 50–52 = marginal growth (amber) · &lt;50 = contraction (red)</div>`
  }

  // ── ECONOMIC CALENDAR ────────────────────────────────────────────────────────
  if (selected.has('macro_calendar') && calendar?.length) {
    body += `<h2>📅 Economic Calendar</h2>
    <table><thead><tr><th>Date</th><th>Event</th><th>Country</th><th class="right">Impact</th><th class="right">Actual</th><th class="right">Forecast</th></tr></thead><tbody>
    ${calendar.slice(0, 12).map((e: any) =>
      `<tr><td>${e.date ?? ''}</td><td>${e.event ?? ''}</td><td>${e.country ?? ''}</td>
      <td class="right"><span class="badge badge-${e.impact === 'High' ? 'red' : e.impact === 'Medium' ? 'amber' : 'gray'}" style="font-size:9px">${e.impact ?? ''}</span></td>
      <td class="right mono">${e.actual ?? '—'}</td><td class="right mono gray">${e.forecast ?? '—'}</td></tr>`
    ).join('')}
    </tbody></table>`
  }

  // ── WATCHLIST SIGNALS ────────────────────────────────────────────────────────
  if (selected.has('wl_signals') && watchlist?.length) {
    const sigColor: Record<string, string> = {
      BUY: 'green', SQUEEZE: 'purple', WATCH: 'amber', NEUTRAL: 'gray', SELL: 'red'
    }
    body += `<h2>⭐ Watchlist Signals</h2>
    <table><thead><tr>
      <th>Ticker</th><th>Signal</th>
      <th class="right">Price</th><th class="right">1D</th><th class="right">5D</th><th class="right">3M</th><th class="right">1Y</th>
      <th class="right">Vol σ</th><th class="right">Sharpe 1Y</th>
    </tr></thead><tbody>
    ${watchlist.map(h =>
      `<tr>
        <td class="mono">${h.ticker}</td>
        <td><span class="badge badge-${sigColor[h.signal] ?? 'gray'}" style="font-size:9px">${h.signal}</span></td>
        <td class="right">${h.price != null ? `$${h.price.toFixed(2)}` : '—'}</td>
        <td class="right mono ${(h.overnight ?? 0) >= 0 ? 'green' : 'red'}">${pctStr(h.overnight)}</td>
        <td class="right mono ${(h['5d'] ?? 0) >= 0 ? 'green' : 'red'}">${pctStr(h['5d'])}</td>
        <td class="right mono ${(h['3m'] ?? 0) >= 0 ? 'green' : 'red'}">${pctStr(h['3m'])}</td>
        <td class="right mono ${(h['1y'] ?? 0) >= 0 ? 'green' : 'red'}">${pctStr(h['1y'])}</td>
        <td class="right mono amber">${h.vol_ann != null ? `${h.vol_ann.toFixed(1)}%` : '—'}</td>
        <td class="right mono">${h.sharpe_1y != null ? h.sharpe_1y.toFixed(2) : '—'}</td>
      </tr>`
    ).join('')}
    </tbody></table>`
  }

  // ── WATCHLIST FUNDAMENTALS ───────────────────────────────────────────────────
  if (selected.has('wl_fundamentals') && watchlist?.length) {
    body += `<h2>⭐ Watchlist Fundamentals</h2>
    <table><thead><tr>
      <th>Ticker</th><th class="right">EPS TTM</th><th class="right">Fwd EPS</th><th class="right">EPS Growth</th><th class="right">Div Yield</th><th class="right">ROE</th>
    </tr></thead><tbody>
    ${watchlist.map(h =>
      `<tr>
        <td class="mono">${h.ticker}${h.name && h.name !== h.ticker ? `<div style="font-size:9px;color:#94a3b8">${h.name}</div>` : ''}</td>
        <td class="right mono">${h.eps_ttm != null ? `$${h.eps_ttm.toFixed(2)}` : '—'}</td>
        <td class="right mono">${h.eps_forward != null ? `$${h.eps_forward.toFixed(2)}` : '—'}</td>
        <td class="right mono ${(h.eps_growth_yoy ?? 0) >= 0 ? 'green' : 'red'}">${pctStr(h.eps_growth_yoy, 0)}</td>
        <td class="right mono ${h.dividend_yield ? 'amber' : 'gray'}">${h.dividend_yield ? `${h.dividend_yield.toFixed(1)}%` : '—'}</td>
        <td class="right mono ${h.roe != null ? (h.roe >= 15 ? 'green' : h.roe >= 0 ? 'amber' : 'red') : 'gray'}">${h.roe != null ? `${h.roe.toFixed(1)}%` : '—'}</td>
      </tr>`
    ).join('')}
    </tbody></table>`
  }

  // ── PORTFOLIO HOLDINGS ───────────────────────────────────────────────────────
  const allH = (holdings ?? []).length > 0 || (clientHoldings ?? []).length > 0
  if (selected.has('pt_holdings') && allH) {
    const renderHoldings = (h: PortfolioHolding[], label: string) => {
      if (!h.length) return ''
      const total = h.reduce((s, x) => s + x.pct, 0) || 1
      return `<h3>${label}</h3>
      <table><thead><tr><th>Ticker</th><th>Name</th><th>Category</th><th class="right">Weight</th><th class="right">Est Return p.a.</th></tr></thead><tbody>
      ${h.map(x => {
        const w = (x.pct / total * 100)
        const barColor = CAT_COLOR[x.category] ?? '#94a3b8'
        return `<tr>
          <td class="mono">${x.ticker}${x.isCustom ? ' <span style="font-size:9px;color:#f59e0b">custom</span>' : ''}</td>
          <td style="color:#64748b">${x.name}</td>
          <td>${x.category.replace(/_/g, ' ')}</td>
          <td class="right">
            <span class="alloc-bar" style="width:${Math.round(w * 2)}px;background:${barColor}"></span>${w.toFixed(1)}%
          </td>
          <td class="right mono ${x.managerReturn >= 0 ? 'blue' : 'red'}">${pctStr(x.managerReturn)}</td>
        </tr>`
      }).join('')}
      </tbody></table>`
    }
    body += `<h2>📐 Holdings Allocation</h2>`
    body += renderHoldings(holdings ?? [], 'GoalBasedPortfolio')
    if (clientHoldings?.length) body += renderHoldings(clientHoldings, 'Balanced Portfolio')
  }

  // ── PORTFOLIO PROJECTIONS ─────────────────────────────────────────────────────
  if (selected.has('pt_projections') && (proj || cProj)) {
    body += `<h2>📐 Return Projections</h2>
    <table><thead><tr><th>Scenario</th><th class="right">GoalBasedPortfolio</th>${cProj ? '<th class="right">Balanced Portfolio</th>' : ''}</tr></thead><tbody>`
    const rows = [
      { label: 'Est Return (manager)',   m: proj?.managerBlended,      c: cProj?.managerBlended,      cls: 'blue'   },
      { label: 'YTD Return (live)',      m: proj?.aceBlended,           c: cProj?.aceBlended,          cls: 'green'  },
      { label: 'Bear case (−50% base)', m: (proj?.aceBlended ?? 0) * 0.5,  c: (cProj?.aceBlended ?? 0) * 0.5,  cls: 'red'    },
      { label: 'Bull case (×1.6 base)', m: (proj?.aceBlended ?? 0) * 1.6,  c: (cProj?.aceBlended ?? 0) * 1.6,  cls: 'green'  },
    ]
    rows.forEach(r => {
      body += `<tr><td>${r.label}</td>
        <td class="right mono ${r.cls}">${proj ? pctStr(r.m) : '—'}</td>
        ${cProj ? `<td class="right mono ${r.cls}">${pctStr(r.c)}</td>` : ''}
      </tr>`
    })
    body += `<tr style="border-top:1px solid #e2e8f0"><td>Portfolio Volatility (σ)</td>
      <td class="right mono amber">${proj ? `${proj.portfolioVol.toFixed(1)}%` : '—'}</td>
      ${cProj ? `<td class="right mono amber">${cProj.portfolioVol.toFixed(1)}%</td>` : ''}
    </tr>
    <tr><td>Sharpe — YTD Return</td>
      <td class="right mono">${proj ? proj.sharpeAce.toFixed(2) : '—'}</td>
      ${cProj ? `<td class="right mono">${cProj.sharpeAce.toFixed(2)}</td>` : ''}
    </tr>
    <tr><td>Sharpe — Est Return</td>
      <td class="right mono">${proj ? proj.sharpeManager.toFixed(2) : '—'}</td>
      ${cProj ? `<td class="right mono">${cProj.sharpeManager.toFixed(2)}</td>` : ''}
    </tr>
    </tbody></table>`
  }

  // ── PORTFOLIO COMPARE ─────────────────────────────────────────────────────────
  if (selected.has('pt_compare') && (holdings?.length && clientHoldings?.length && proj && cProj)) {
    const allCats = [...new Set([...(holdings ?? []), ...(clientHoldings ?? [])].map(h => h.category))]
    const mTotal = holdings!.reduce((s, h) => s + h.pct, 0) || 1
    const cTotal = clientHoldings!.reduce((s, h) => s + h.pct, 0) || 1
    body += `<h2>⚖️ Portfolio Comparison</h2>
    <table><thead><tr><th>Asset Class</th><th class="right">GoalBased %</th><th class="right">Balanced % ${clientName ? `(${clientName})` : ''}</th><th class="right">Gap</th></tr></thead><tbody>
    ${allCats.map(cat => {
      const mP = holdings!.filter(h => h.category === cat).reduce((s, h) => s + h.pct / mTotal * 100, 0)
      const cP = clientHoldings!.filter(h => h.category === cat).reduce((s, h) => s + h.pct / cTotal * 100, 0)
      const delta = cP - mP
      return `<tr>
        <td>${cat.replace(/_/g, ' ')}</td>
        <td class="right mono blue">${mP.toFixed(1)}%</td>
        <td class="right mono">${cP.toFixed(1)}%</td>
        <td class="right mono ${delta >= 0 ? 'green' : 'red'}">${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%</td>
      </tr>`
    }).join('')}
    </tbody></table>`
  }

  const reportedSections = ALL_SECTIONS.filter(s => selected.has(s.id)).map(s => s.label).join(', ')

  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1" />
<title>X68 Financial Report · ${date}</title>
<style>${css}</style>
</head><body>
<h1>X68 Financial District — Report</h1>
<div class="subtitle">${date} · Sections: ${reportedSections} · All figures are indicative estimates only, not investment advice.</div>
${body}
<footer>Generated by X68 Financial District · AceEcotopia · ${date} · Not investment advice.</footer>
<script>window.onload = () => window.print()</script>
</body></html>`
}

// ── Modal component ────────────────────────────────────────────────────────────
export default function FinancialPrintModal({
  onClose, defaultSegments,
  watchlistData, holdings, clientHoldings, proj, cProj, clientName,
}: Props) {
  // Section selection — pre-check defaultSegments
  const initSelected = () => {
    const s = new Set<string>()
    ALL_SECTIONS.forEach(sec => {
      if (!defaultSegments || defaultSegments.includes(sec.seg)) s.add(sec.id)
    })
    return s
  }
  const [selected, setSelected] = useState<Set<string>>(initSelected)
  const [generating, setGenerating] = useState(false)
  const [fetchStatus, setFetchStatus] = useState<Record<string, 'idle' | 'loading' | 'done' | 'error'>>({})

  // Live data fetched by this modal
  const [snapshot,  setSnapshot]  = useState<any>(null)
  const [news,      setNews]      = useState<any[]>([])
  const [pmi,       setPmi]       = useState<any[]>([])
  const [calendar,  setCalendar]  = useState<any[]>([])
  const [wlSignals, setWlSignals] = useState<WatchlistHolding[]>(watchlistData ?? [])
  const [wlFunds,   setWlFunds]   = useState<WatchlistHolding[]>([])

  const needsMacro = ['macro_snapshot','macro_news','macro_pmi','macro_calendar'].some(id => selected.has(id))
  const needsWl    = ['wl_signals','wl_fundamentals'].some(id => selected.has(id))

  // Pre-fetch when modal opens so generate is fast
  useEffect(() => {
    if (needsMacro && !snapshot) {
      setFetchStatus(s => ({ ...s, macro: 'loading' }))
      Promise.all([
        fetch('/api/nexus/macro/market-snapshot').then(r => r.json()).catch(() => null),
        fetch('/api/nexus/macro/news').then(r => r.json()).catch(() => []),
        fetch('/api/nexus/macro/pmi').then(r => r.json()).catch(() => []),
        fetch('/api/nexus/macro/calendar').then(r => r.json()).catch(() => []),
      ]).then(([snap, n, p, cal]) => {
        if (snap) setSnapshot(snap)
        setNews(Array.isArray(n) ? n : n?.news ?? [])
        setPmi(Array.isArray(p) ? p : p?.rows ?? [])
        setCalendar(Array.isArray(cal) ? cal : cal?.events ?? [])
        setFetchStatus(s => ({ ...s, macro: 'done' }))
      }).catch(() => setFetchStatus(s => ({ ...s, macro: 'error' })))
    }
  }, [needsMacro])

  useEffect(() => {
    if (needsWl && !watchlistData?.length) {
      setFetchStatus(s => ({ ...s, wl: 'loading' }))
      fetch('/api/citizen/watchlist/performance').then(r => r.json())
        .then(d => { setWlSignals(d.tickers ?? []); setFetchStatus(s => ({ ...s, wl: 'done' })) })
        .catch(() => setFetchStatus(s => ({ ...s, wl: 'error' })))

      fetch('/api/citizen/watchlist/fundamentals').then(r => r.json())
        .then(d => setWlFunds(d.tickers ?? []))
        .catch(() => {})
    }
  }, [needsWl])

  function toggle(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function toggleSegment(seg: SegmentKey) {
    const segSections = ALL_SECTIONS.filter(s => s.seg === seg)
    const allOn = segSections.every(s => selected.has(s.id))
    setSelected(prev => {
      const n = new Set(prev)
      segSections.forEach(s => allOn ? n.delete(s.id) : n.add(s.id))
      return n
    })
  }

  function generate() {
    if (!selected.size) return
    setGenerating(true)
    // Merge fundamentals into wlSignals for the report
    const mergedWl: WatchlistHolding[] = wlSignals.map(h => {
      const f = wlFunds.find((x: any) => x.ticker === h.ticker) as any
      return f ? { ...h, eps_ttm: f.eps_ttm, eps_forward: f.eps_forward, eps_growth_yoy: f.eps_growth_yoy, dividend_yield: f.dividend_yield, roe: f.roe } : h
    })
    try {
      const html = buildReport(selected, { snapshot, news, pmi, calendar, watchlist: mergedWl, holdings, clientHoldings, proj, cProj, clientName })
      const w = window.open('', '_blank')
      if (w) { w.document.write(html); w.document.close() }
    } finally {
      setGenerating(false)
    }
  }

  const segGroups = (['macro', 'watchlist', 'portfolio'] as SegmentKey[]).map(seg => ({
    seg, sections: ALL_SECTIONS.filter(s => s.seg === seg),
    allOn: ALL_SECTIONS.filter(s => s.seg === seg).every(s => selected.has(s.id)),
    anyOn: ALL_SECTIONS.filter(s => s.seg === seg).some(s => selected.has(s.id)),
  }))

  const isLoading = Object.values(fetchStatus).some(v => v === 'loading')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#0d1220] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <div>
            <div className="text-sm font-bold text-white">🖨 Build Report</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Select sections to include · opens print dialog in new tab</div>
          </div>
          <button onClick={onClose} className="text-slate-600 hover:text-white transition text-lg leading-none">✕</button>
        </div>

        {/* Section selector */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {segGroups.map(({ seg, sections, allOn, anyOn }) => (
            <div key={seg}>
              {/* Segment header + select-all toggle */}
              <button onClick={() => toggleSegment(seg)}
                className="w-full flex items-center justify-between mb-2 group">
                <span className="text-[11px] font-semibold text-slate-300 group-hover:text-white transition">
                  {SEG_LABEL[seg]}
                </span>
                <span className={`text-[9px] px-2 py-0.5 rounded border transition ${allOn ? 'border-cyan-500/50 text-cyan-400 bg-cyan-500/10' : anyOn ? 'border-white/15 text-slate-500' : 'border-white/10 text-slate-700'}`}>
                  {allOn ? 'Deselect all' : 'Select all'}
                </span>
              </button>

              {/* Fetch status */}
              {seg === 'macro' && fetchStatus.macro === 'loading' && (
                <div className="text-[9px] text-slate-600 animate-pulse mb-1">Fetching macro data…</div>
              )}
              {seg === 'watchlist' && fetchStatus.wl === 'loading' && (
                <div className="text-[9px] text-slate-600 animate-pulse mb-1">Fetching watchlist data…</div>
              )}

              <div className="space-y-1.5">
                {sections.map(sec => {
                  const on = selected.has(sec.id)
                  return (
                    <label key={sec.id}
                      className={`flex items-start gap-3 cursor-pointer rounded-lg border px-3 py-2.5 transition ${on ? 'border-cyan-500/30 bg-cyan-500/6' : 'border-white/6 bg-white/2 hover:bg-white/4'}`}>
                      <input type="checkbox" checked={on} onChange={() => toggle(sec.id)}
                        className="mt-0.5 shrink-0 accent-cyan-400" />
                      <div>
                        <div className={`text-[11px] font-medium ${on ? 'text-white' : 'text-slate-400'}`}>{sec.label}</div>
                        <div className="text-[9px] text-slate-600">{sec.desc}</div>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/8 flex items-center gap-3">
          <div className="flex-1 text-[10px] text-slate-600">
            {selected.size} section{selected.size !== 1 ? 's' : ''} selected
            {isLoading && <span className="ml-2 animate-pulse">· fetching data…</span>}
          </div>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs text-slate-500 hover:text-white border border-white/10 hover:border-white/20 transition">
            Cancel
          </button>
          <button onClick={generate}
            disabled={!selected.size || generating}
            className="px-5 py-2 rounded-lg text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-black transition disabled:opacity-40 flex items-center gap-1.5">
            {generating ? <span className="animate-spin">⟳</span> : '🖨'}
            {generating ? 'Generating…' : 'Generate & Print'}
          </button>
        </div>
      </div>
    </div>
  )
}
