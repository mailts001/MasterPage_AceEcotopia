'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import QRCode from 'qrcode'
import PortfolioDNAWheel from '@/components/PortfolioDNAWheel'

// ── Types ────────────────────────────────────────────────────────────────────

interface AssetClass { ticker: string; name: string; chg_1d: number; chg_5d: number; chg_1m: number; chg_ytd: number }
interface Sector     { ticker: string; name: string; chg_1d: number; chg_ytd: number }
interface Intel {
  regime: string; regime_score: number; vix: number | null; breadth_pct: number | null
  commentary: string; asset_classes: AssetClass[]; sectors: Sector[]
  promo_mode?: boolean
}

interface Holding {
  id: string; ticker: string; name: string; category: string
  pct: number            // allocation 0–100
  managerReturn: number  // manager's expected annual return %
  isCustom: boolean
}

interface ClientProfile {
  name: string; riskScore: number; targetReturn: number
  portfolioValue: number   // in thousands (e.g. 500 = $500k)
  monthlyIncomePct: number // % of portfolio needed as annual income (e.g. 4 = 4% / yr)
}

// ── Constants ─────────────────────────────────────────────────────────────────

// Documented long-run benchmark assumptions — clearly labelled in UI
const BENCHMARK: Record<string, { ret: number; source: string }> = {
  equity:          { ret: 7.0,  source: 'MSCI World 20-yr avg (Bloomberg)' },
  fixed_income:    { ret: 3.5,  source: 'Bloomberg US Agg 20-yr avg' },
  fx:              { ret: 0.0,  source: 'Currency-neutral assumption' },
  commodities:     { ret: 4.0,  source: 'Bloomberg Commodity Index 20-yr avg' },
  private_equity:  { ret: 10.0, source: 'Cambridge Associates Global PE benchmark' },
  philanthropy:    { ret: 0.0,  source: 'Non-financial (impact) return' },
  thematic:        { ret: 12.0, source: 'ARK Innovation / thematic ETF 5-yr avg (high variance)' },
  // Cash rates are indicative; verify current central bank / MAS rates before use
  cash:            { ret: 4.0,  source: 'US T-Bill / money market indicative rate (verify current rate)' },
}

const CATEGORY_LABELS: Record<string, string> = {
  equity: 'Equity', fixed_income: 'Fixed Income / Bonds',
  fx: 'FX / Currency', commodities: 'Commodities & Alternatives',
  private_equity: 'Private Equity', philanthropy: 'Philanthropy / Impact',
  thematic: 'Thematic / Strategic', cash: 'Cash & Risk-Free',
}

const CATEGORY_ICONS: Record<string, string> = {
  equity: '📈', fixed_income: '🏦', fx: '💱',
  commodities: '🛢', private_equity: '🏛', philanthropy: '🌱',
  thematic: '🚀', cash: '💵',
}

// Indicative risk-free / cash rates — manager should verify before client presentation
// Sources: US Fed Funds, MAS, ECB policy rates (approximate as of mid-2026)
const CASH_RATES: Record<string, { rate: number; label: string; note: string }> = {
  'TBILL-USD-3M':  { rate: 4.3,  label: 'US T-Bill 3-month',         note: 'US Treasury. Verify at treasurydirect.gov' },
  'TBILL-USD-6M':  { rate: 4.2,  label: 'US T-Bill 6-month',         note: 'US Treasury. Verify at treasurydirect.gov' },
  'TBILL-SGD-6M':  { rate: 3.3,  label: 'SGD T-Bill 6-month',        note: 'MAS. Verify at mas.gov.sg/tbills' },
  'MMF-USD':       { rate: 4.1,  label: 'USD Money Market Fund',      note: 'Typical USD prime MMF. Varies by fund' },
  'FD-SGD':        { rate: 2.8,  label: 'SGD Fixed Deposit (12m)',    note: 'Typical Singapore bank FD. Varies by bank' },
  'IBOND-USD':     { rate: 4.3,  label: 'US I-Bond (inflation-linked)', note: 'US Savings Bond. Rate resets every 6 months' },
  'CASH-USD':      { rate: 0.5,  label: 'USD Cash / Demand Deposit',  note: 'Near-zero yield; liquidity buffer only' },
}

// Pre-populated catalog — hasLive=true means ticker exists in AceEconomy intel.asset_classes
const CATALOG: { ticker: string; name: string; category: string; hasLive: boolean }[] = [
  // Equity
  { ticker: 'SPY',  name: 'S&P 500',            category: 'equity',         hasLive: true  },
  { ticker: 'QQQ',  name: 'Nasdaq 100',          category: 'equity',         hasLive: true  },
  { ticker: 'IWM',  name: 'Russell 2000',        category: 'equity',         hasLive: true  },
  { ticker: 'EEM',  name: 'Emerging Markets',    category: 'equity',         hasLive: true  },
  { ticker: 'VEA',  name: 'Developed ex-US',     category: 'equity',         hasLive: false },
  { ticker: 'XLK',  name: 'Tech Sector',         category: 'equity',         hasLive: false },
  { ticker: 'XLV',  name: 'Healthcare Sector',   category: 'equity',         hasLive: false },
  { ticker: 'XLF',  name: 'Financials Sector',   category: 'equity',         hasLive: false },
  { ticker: 'XLI',  name: 'Industrials Sector',  category: 'equity',         hasLive: false },
  // Fixed Income
  { ticker: 'TLT',  name: 'US Treasury 20yr',    category: 'fixed_income',   hasLive: true  },
  { ticker: 'LQD',  name: 'IG Corporate Bonds',  category: 'fixed_income',   hasLive: true  },
  { ticker: 'HYG',  name: 'High Yield Bonds',    category: 'fixed_income',   hasLive: false },
  { ticker: 'TIPS', name: 'Inflation-Protected',  category: 'fixed_income',   hasLive: false },
  { ticker: 'SHY',  name: 'Short Treasury 1-3yr', category: 'fixed_income',  hasLive: false },
  // FX
  { ticker: 'UUP',  name: 'US Dollar (DXY proxy)', category: 'fx',           hasLive: false },
  { ticker: 'FXE',  name: 'Euro',                 category: 'fx',             hasLive: false },
  { ticker: 'FXY',  name: 'Japanese Yen',         category: 'fx',             hasLive: false },
  { ticker: 'SGD',  name: 'Singapore Dollar',     category: 'fx',             hasLive: false },
  // Commodities / Alts
  { ticker: 'GLD',  name: 'Gold',                 category: 'commodities',    hasLive: true  },
  { ticker: 'VNQ',  name: 'US REITs',             category: 'commodities',    hasLive: true  },
  { ticker: 'DJP',  name: 'Bloomberg Commodity',  category: 'commodities',    hasLive: false },
  { ticker: 'USO',  name: 'Crude Oil (WTI proxy)', category: 'commodities',   hasLive: false },
  { ticker: 'SLV',  name: 'Silver',               category: 'commodities',    hasLive: false },
  // Private Equity
  { ticker: 'PSP',  name: 'Listed PE ETF (PSP)',  category: 'private_equity', hasLive: false },
  { ticker: 'PE-DIRECT', name: 'Direct PE / Buyout (unlisted)', category: 'private_equity', hasLive: false },
  // Philanthropy
  { ticker: 'ESG',  name: 'ESG / Impact Fund',         category: 'philanthropy',    hasLive: false },
  { ticker: 'CHARITY', name: 'Charitable Donation',    category: 'philanthropy',    hasLive: false },
  // Cash & Risk-Free (rates indicative — verify before client presentation)
  { ticker: 'TBILL-USD-3M', name: 'US T-Bill 3m (~4.3% indicative)',    category: 'cash', hasLive: false },
  { ticker: 'TBILL-USD-6M', name: 'US T-Bill 6m (~4.2% indicative)',    category: 'cash', hasLive: false },
  { ticker: 'TBILL-SGD-6M', name: 'SGD T-Bill 6m (~3.3% indicative)',   category: 'cash', hasLive: false },
  { ticker: 'MMF-USD',      name: 'USD Money Market Fund (~4.1%)',       category: 'cash', hasLive: false },
  { ticker: 'FD-SGD',       name: 'SGD Fixed Deposit 12m (~2.8%)',       category: 'cash', hasLive: false },
  { ticker: 'IBOND-USD',    name: 'US I-Bond inflation-linked (~4.3%)',  category: 'cash', hasLive: false },
  { ticker: 'CASH-USD',     name: 'USD Cash / Demand Deposit (~0.5%)',   category: 'cash', hasLive: false },
  // Thematic / Strategic
  { ticker: 'BOTZ', name: 'AI & Robotics (BOTZ)',      category: 'thematic',        hasLive: false },
  { ticker: 'AIQ',  name: 'Global AI & Tech (AIQ)',    category: 'thematic',        hasLive: false },
  { ticker: 'ARKK', name: 'ARK Innovation (ARKK)',     category: 'thematic',        hasLive: false },
  { ticker: 'ARKG', name: 'ARK Genomics (ARKG)',       category: 'thematic',        hasLive: false },
  { ticker: 'ICLN', name: 'Clean Energy (ICLN)',       category: 'thematic',        hasLive: false },
  { ticker: 'LIT',  name: 'Lithium & Battery Tech',    category: 'thematic',        hasLive: false },
  { ticker: 'SOXX', name: 'Semiconductors (SOXX)',     category: 'thematic',        hasLive: false },
  { ticker: 'IDRV', name: 'Autonomous & EV (IDRV)',    category: 'thematic',        hasLive: false },
  { ticker: 'UFO',  name: 'Space Exploration (UFO)',   category: 'thematic',        hasLive: false },
  { ticker: 'SKYY', name: 'Cloud Computing (SKYY)',    category: 'thematic',        hasLive: false },
  { ticker: 'FIVG', name: '5G Networks (FIVG)',        category: 'thematic',        hasLive: false },
  { ticker: 'INCO', name: 'India Growth (INCO)',       category: 'thematic',        hasLive: false },
  { ticker: 'ASEA', name: 'ASEAN 40 (ASEA)',           category: 'thematic',        hasLive: false },
  { ticker: 'SPACEX-PRE', name: 'SpaceX (pre-IPO / private)', category: 'thematic', hasLive: false },
  { ticker: 'OPENAI-PRE', name: 'OpenAI (pre-IPO / private)', category: 'thematic', hasLive: false },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2, 9) }

function annualise(ytdPct: number): number {
  const m = new Date().getMonth() + 1
  return m > 0 ? (ytdPct / m) * 12 : ytdPct
}

function regimeMult(regime: string): number {
  if (regime === 'BULL' || regime === 'STRONG_BULL') return 1.1
  if (regime === 'BEAR' || regime === 'STRONG_BEAR') return 0.6
  return 0.9
}

function totalPct(holdings: Holding[]) { return holdings.reduce((s, h) => s + h.pct, 0) }

// ── Projection engine ─────────────────────────────────────────────────────────

interface ProjectionResult {
  managerBlended: number
  aceBlended: number
  conservativeBlended: number
  riskFlags: { level: 'warn' | 'caution'; message: string }[]
  aceBasis: { ticker: string; name: string; ytdAnn: number | null; regimeAdj: number; benchmarkUsed: boolean }[]
}

function computeProjections(holdings: Holding[], intel: Intel | null): ProjectionResult {
  const liveMap: Record<string, AssetClass> = {}
  intel?.asset_classes?.forEach(a => { liveMap[a.ticker] = a })
  intel?.sectors?.forEach(s => { liveMap[s.ticker] = s as unknown as AssetClass })

  const regime = intel?.regime ?? 'UNKNOWN'
  const mult   = regimeMult(regime)
  const total  = totalPct(holdings)

  let managerBlended = 0, aceBlended = 0, conservativeBlended = 0
  const aceBasis: ProjectionResult['aceBasis'] = []

  for (const h of holdings) {
    const w     = total > 0 ? h.pct / total : 0
    const live  = liveMap[h.ticker]
    const bench = BENCHMARK[h.category]?.ret ?? 5

    // Manager
    managerBlended += w * h.managerReturn

    // AceEconomy-driven
    let aceRet: number; let ytdAnn: number | null = null; let benchmarkUsed = false
    if (live?.chg_ytd != null) {
      ytdAnn  = annualise(live.chg_ytd)
      aceRet  = ytdAnn * mult
    } else {
      aceRet       = bench * mult
      benchmarkUsed = true
    }
    aceBlended += w * aceRet
    aceBasis.push({ ticker: h.ticker, name: h.name, ytdAnn, regimeAdj: aceRet, benchmarkUsed })

    // Conservative
    conservativeBlended += w * bench
  }

  // Risk flags
  const riskFlags: ProjectionResult['riskFlags'] = []
  const vix = intel?.vix ?? 0
  if (vix > 25) riskFlags.push({ level: 'warn', message: `VIX ${vix.toFixed(0)} — elevated market fear, volatility may compress returns` })
  if (regime.includes('BEAR')) riskFlags.push({ level: 'warn', message: `Bear regime detected — AceEconomy projection is discounted by ${((1 - mult) * 100).toFixed(0)}%` })
  if (regime === 'UNKNOWN' || regime === 'NEUTRAL') riskFlags.push({ level: 'caution', message: 'Mixed/uncertain regime — projections carry higher forecast error' })

  const maxHolder = holdings.reduce((a, b) => b.pct > a.pct ? b : a, holdings[0])
  if (maxHolder && maxHolder.pct > 40) riskFlags.push({ level: 'caution', message: `Concentration risk: ${maxHolder.ticker} at ${maxHolder.pct}% — consider diversifying` })

  const equityPct = holdings.filter(h => h.category === 'equity').reduce((s, h) => s + h.pct, 0)
  if (equityPct > 80 && total > 0) riskFlags.push({ level: 'caution', message: `High equity weighting (${equityPct.toFixed(0)}%) — drawdown risk in a correction` })

  const tlt = holdings.find(h => h.ticker === 'TLT')
  if (tlt && tlt.pct > 20) riskFlags.push({ level: 'caution', message: 'Large TLT position — significant duration / interest-rate sensitivity' })

  const fxPct = holdings.filter(h => h.category === 'fx').reduce((s, h) => s + h.pct, 0)
  if (fxPct > 20 && total > 0) riskFlags.push({ level: 'caution', message: `FX allocation ${fxPct.toFixed(0)}% — unhedged currency exposure` })

  const breadth = intel?.breadth_pct ?? 50
  if (breadth < 40) riskFlags.push({ level: 'caution', message: `Market breadth weak (${breadth.toFixed(0)}% above 200-day MA) — narrow rally, risk of reversal` })

  return { managerBlended, aceBlended, conservativeBlended, riskFlags, aceBasis }
}

// ── Risk-to-allocation mapping ────────────────────────────────────────────────

function suggestFromRisk(risk: number, targetReturn: number): Record<string, number> {
  // risk 1=conservative … 5=aggressive
  // Returns suggested allocations by category summing to 100
  const r = Math.min(5, Math.max(1, risk))
  const base: Record<string, number> =
    r <= 1.5 ? { equity: 15, fixed_income: 45, cash: 20, commodities: 8,  private_equity: 5, philanthropy: 5,  thematic: 0,  fx: 2 } :
    r <= 2.5 ? { equity: 30, fixed_income: 35, cash: 10, commodities: 10, private_equity: 7, philanthropy: 2,  thematic: 4,  fx: 2 } :
    r <= 3.5 ? { equity: 50, fixed_income: 20, cash: 5,  commodities: 10, private_equity: 5, philanthropy: 0,  thematic: 8,  fx: 2 } :
    r <= 4.5 ? { equity: 60, fixed_income: 8,  cash: 2,  commodities: 10, private_equity: 5, philanthropy: 0,  thematic: 12, fx: 3 } :
               { equity: 65, fixed_income: 5,  cash: 0,  commodities: 8,  private_equity: 7, philanthropy: 0,  thematic: 15, fx: 0 }

  // Nudge equity vs bonds toward targetReturn using conservative benchmark
  const conservativeRet = Object.entries(base).reduce((s, [cat, w]) => s + (BENCHMARK[cat]?.ret ?? 0) * w / 100, 0)
  const gap = targetReturn - conservativeRet
  if (Math.abs(gap) > 0.5) {
    const adj = Math.min(15, Math.abs(gap) * 2)
    if (gap > 0) {
      base.equity   = Math.min(90, base.equity + adj)
      base.fixed_income = Math.max(0, base.fixed_income - adj)
    } else {
      base.fixed_income = Math.min(80, base.fixed_income + adj)
      base.equity    = Math.max(5, base.equity - adj)
    }
  }
  return base
}

// ── ProjectionCard ────────────────────────────────────────────────────────────

function ProjCard({ label, ret, color, desc }: { label: string; ret: number; color: string; desc: string }) {
  return (
    <div className="flex-1 rounded-xl border border-white/10 bg-white/4 p-4 text-center">
      <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2">{label}</div>
      <div className={`text-2xl font-bold font-mono ${color}`}>{ret >= 0 ? '+' : ''}{ret.toFixed(1)}%</div>
      <div className="text-[9px] text-slate-600 mt-1">est. annual return</div>
      <div className="text-[9px] text-slate-500 mt-2 leading-snug">{desc}</div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PortfolioBuilderPage() {
  const [intel, setIntel]               = useState<Intel | null>(null)
  const [intelLoading, setIntelLoading] = useState(true)
  const [tab, setTab]                   = useState<'build' | 'client' | 'compare' | 'dna'>('build')
  const [catFilter, setCatFilter]       = useState<string>('all')
  const [search, setSearch]             = useState('')
  const [holdings, setHoldings]         = useState<Holding[]>([])
  const [clientProfile, setClientProfile] = useState<ClientProfile>({ name: '', riskScore: 3, targetReturn: 7, portfolioValue: 500, monthlyIncomePct: 4 })
  const [clientHoldings, setClientHoldings] = useState<Holding[]>([])
  const [confirmed, setConfirmed]       = useState<'manager' | 'client' | null>(null)
  const [qrUrl, setQrUrl]               = useState<string | null>(null)
  const [basisOpen, setBasisOpen]       = useState(false)
  const [customTicker, setCustomTicker] = useState('')
  const [customName, setCustomName]     = useState('')
  const [customCat, setCustomCat]       = useState('equity')
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/nexus/financial/intel').then(r => r.json()).then(d => {
      setIntel(d)
      setIntelLoading(false)
    }).catch(() => setIntelLoading(false))
  }, [])

  // Add holding from catalog
  function addHolding(ticker: string, name: string, category: string) {
    if (holdings.find(h => h.ticker === ticker)) return
    setHoldings(prev => [...prev, {
      id: uid(), ticker, name, category, pct: 10, managerReturn: BENCHMARK[category]?.ret ?? 5, isCustom: false
    }])
  }

  function addCustom() {
    if (!customTicker.trim() || !customName.trim()) return
    const t = customTicker.trim().toUpperCase()
    if (holdings.find(h => h.ticker === t)) return
    setHoldings(prev => [...prev, {
      id: uid(), ticker: t, name: customName.trim(), category: customCat, pct: 10,
      managerReturn: BENCHMARK[customCat]?.ret ?? 5, isCustom: true
    }])
    setCustomTicker(''); setCustomName('')
  }

  function updateHolding(id: string, field: 'pct' | 'managerReturn', val: number) {
    setHoldings(prev => prev.map(h => h.id === id ? { ...h, [field]: val } : h))
  }

  function removeHolding(id: string) {
    setHoldings(prev => prev.filter(h => h.id !== id))
  }

  // Build client portfolio from risk profile
  function generateClientPortfolio() {
    const suggested = suggestFromRisk(clientProfile.riskScore, clientProfile.targetReturn)
    const clientH: Holding[] = Object.entries(suggested)
      .filter(([, w]) => w > 0)
      .map(([cat, w]) => {
        // Try to map to a real holding from catalog
        const sample = CATALOG.find(c => c.category === cat)
        return {
          id: uid(),
          ticker: sample?.ticker ?? cat.toUpperCase(),
          name: sample?.name ?? CATEGORY_LABELS[cat] ?? cat,
          category: cat, pct: w,
          managerReturn: BENCHMARK[cat]?.ret ?? 5,
          isCustom: false,
        }
      })
    setClientHoldings(clientH)
  }

  function updateClientHolding(id: string, pct: number) {
    setClientHoldings(prev => prev.map(h => h.id === id ? { ...h, pct } : h))
  }

  // Generate QR for the confirmed portfolio
  async function generateQR(h: Holding[], label: string) {
    const payload = {
      label,
      date: new Date().toLocaleDateString('en-SG'),
      holdings: h.map(x => ({ ticker: x.ticker, name: x.name, pct: x.pct })),
    }
    const base64 = btoa(JSON.stringify(payload))
    const url = `${window.location.origin}/portfolio-view?d=${base64}`
    const dataUrl = await QRCode.toDataURL(url, { width: 200, margin: 1 })
    setQrUrl(dataUrl)
  }

  function handleConfirm(side: 'manager' | 'client') {
    setConfirmed(side)
    const h = side === 'manager' ? holdings : clientHoldings
    generateQR(h, side === 'manager' ? 'Manager Portfolio' : 'Client Risk-Adjusted Portfolio')
  }

  function handlePrint() { window.print() }

  const proj  = computeProjections(holdings, intel)
  const cProj = computeProjections(clientHoldings, intel)
  const total = totalPct(holdings)
  const cTotal = totalPct(clientHoldings)

  const filteredCatalog = CATALOG.filter(a =>
    (catFilter === 'all' || a.category === catFilter) &&
    (search === '' || a.ticker.toLowerCase().includes(search.toLowerCase()) || a.name.toLowerCase().includes(search.toLowerCase()))
  )

  const liveMap: Record<string, AssetClass> = {}
  intel?.asset_classes?.forEach(a => { liveMap[a.ticker] = a })

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Print stylesheet */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #portfolio-print { display: block !important; }
          #portfolio-print { color: #000; background: #fff; font-family: sans-serif; padding: 32px; }
        }
        @media screen { #portfolio-print { display: none; } }
      `}</style>

      {/* Hidden print layout */}
      <div id="portfolio-print">
        {confirmed && (() => {
          const ph = confirmed === 'manager' ? holdings : clientHoldings
          const pp = confirmed === 'manager' ? proj : cProj
          const label = confirmed === 'manager' ? 'Manager Portfolio' : 'Client Risk-Adjusted Portfolio'
          return (
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 4 }}>Portfolio Allocation — {label}</h1>
              <p style={{ fontSize: 11, color: '#666', marginBottom: 20 }}>Generated {new Date().toLocaleString('en-SG')} · X68 Financial District · For discussion purposes only.</p>
              <h2 style={{ fontSize: 14, marginBottom: 8 }}>Asset Allocation</h2>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 20 }}>
                <thead><tr style={{ borderBottom: '1px solid #ccc' }}>
                  <th style={{ textAlign: 'left', padding: '4px 8px' }}>Ticker</th>
                  <th style={{ textAlign: 'left', padding: '4px 8px' }}>Name</th>
                  <th style={{ textAlign: 'left', padding: '4px 8px' }}>Category</th>
                  <th style={{ textAlign: 'right', padding: '4px 8px' }}>Allocation %</th>
                </tr></thead>
                <tbody>{ph.map(h => (
                  <tr key={h.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '4px 8px', fontFamily: 'monospace' }}>{h.ticker}</td>
                    <td style={{ padding: '4px 8px' }}>{h.name}</td>
                    <td style={{ padding: '4px 8px' }}>{CATEGORY_LABELS[h.category] ?? h.category}</td>
                    <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 'bold' }}>{h.pct.toFixed(1)}%</td>
                  </tr>
                ))}</tbody>
              </table>
              <h2 style={{ fontSize: 14, marginBottom: 8 }}>Projected Annual Returns</h2>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 20 }}>
                <tbody>
                  <tr><td style={{ padding: '4px 8px' }}>Manager Projection</td><td style={{ padding: '4px 8px', fontWeight: 'bold' }}>{pp.managerBlended >= 0 ? '+' : ''}{pp.managerBlended.toFixed(1)}% p.a.</td></tr>
                  <tr><td style={{ padding: '4px 8px' }}>AceEconomy Market-Driven</td><td style={{ padding: '4px 8px', fontWeight: 'bold' }}>{pp.aceBlended >= 0 ? '+' : ''}{pp.aceBlended.toFixed(1)}% p.a.</td></tr>
                  <tr><td style={{ padding: '4px 8px' }}>Conservative Benchmark</td><td style={{ padding: '4px 8px', fontWeight: 'bold' }}>{pp.conservativeBlended >= 0 ? '+' : ''}{pp.conservativeBlended.toFixed(1)}% p.a.</td></tr>
                </tbody>
              </table>
              {pp.riskFlags.length > 0 && <>
                <h2 style={{ fontSize: 14, marginBottom: 8 }}>Risk Considerations</h2>
                <ul style={{ fontSize: 12, paddingLeft: 20, marginBottom: 20 }}>{pp.riskFlags.map((f, i) => <li key={i} style={{ marginBottom: 4 }}>{f.message}</li>)}</ul>
              </>}
              <h2 style={{ fontSize: 14, marginBottom: 8 }}>Projection Basis</h2>
              <p style={{ fontSize: 11 }}><strong>Manager Projection:</strong> Weighted average of manager-inputted expected returns per position.</p>
              <p style={{ fontSize: 11 }}><strong>AceEconomy Market-Driven:</strong> Where live YTD data is available (via AceEconomy VPS), returns are annualised and adjusted by regime multiplier ({intel?.regime ?? 'UNKNOWN'}, ×{regimeMult(intel?.regime ?? 'UNKNOWN').toFixed(1)}). Where live data is unavailable, long-run benchmark assumptions are used.</p>
              <p style={{ fontSize: 11 }}><strong>Conservative Benchmark:</strong> Long-run asset class averages — Equity 7% (MSCI World 20yr), Fixed Income 3.5% (Bloomberg Agg 20yr), Commodities 4% (Bloomberg Commodity 20yr), Private Equity 10% (Cambridge Associates), FX 0%.</p>
              <p style={{ fontSize: 11, color: '#666', marginTop: 20, borderTop: '1px solid #ccc', paddingTop: 12 }}>
                <strong>Disclaimer:</strong> This portfolio allocation is generated for illustrative and discussion purposes only. It does not constitute financial advice, an investment recommendation, or a solicitation to buy or sell any security. Past performance and historical benchmark returns are not indicative of future results. All projections involve significant uncertainty. Investors should conduct their own due diligence and consult a licensed financial adviser before making any investment decisions. Market conditions as of {new Date().toLocaleDateString('en-SG')}.
              </p>
            </div>
          )
        })()}
      </div>

      {/* Screen UI */}
      <div className="min-h-screen bg-[#0A0E1A] text-white">
        <nav className="border-b border-white/10 px-4 py-3 flex items-center gap-3 sticky top-0 bg-[#0A0E1A]/95 backdrop-blur z-10">
          <Link href="/citizen/dashboard/financial" className="text-slate-500 hover:text-white text-sm">← Financial District</Link>
          <span className="text-white/20">/</span>
          <span className="text-sm font-semibold text-white">Portfolio Builder</span>
          <span className="ml-auto text-[10px] text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">Trial — open to all Citizens</span>
        </nav>

        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          <div>
            <h1 className="text-xl font-bold text-white">Portfolio Allocation Builder</h1>
            <p className="text-[11px] text-slate-500 mt-1">Build, compare and share asset allocations with projected returns grounded in live AceEconomy market data.</p>
          </div>

          {intelLoading && <div className="h-10 rounded-lg bg-white/5 animate-pulse" />}
          {intel && (
            <div className="rounded-lg border border-white/10 bg-white/3 px-4 py-2 flex items-center gap-3 text-[11px]">
              <span className={`w-2 h-2 rounded-full ${intel.regime.includes('BULL') ? 'bg-green-400' : intel.regime.includes('BEAR') ? 'bg-red-400' : 'bg-amber-400'}`} />
              <span className="text-slate-400">Market regime: <span className="text-white font-medium">{intel.regime}</span></span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400">VIX: <span className="text-white font-mono">{intel.vix?.toFixed(0) ?? '—'}</span></span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400">{intel.asset_classes?.length ?? 0} live assets loaded</span>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 bg-white/5 rounded-lg p-1">
            {([['build', '📐 Build Portfolio'], ['client', '👤 Client Profile'], ['compare', '⚖️ Compare & Share'], ['dna', '🧬 DNA Wheel']] as const).map(([t, label]) => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 text-xs py-2 rounded-md font-medium transition ${tab === t ? 'bg-white/15 text-white' : 'text-slate-500 hover:text-white'}`}>
                {label}
              </button>
            ))}
          </div>

          {/* ── TAB 1: BUILD PORTFOLIO ── */}
          {tab === 'build' && (
            <div className="space-y-6">
              {/* Asset picker */}
              <div className="rounded-xl border border-white/10 bg-white/3 p-4 space-y-3">
                <div className="text-xs font-semibold text-white mb-1">Add assets to your portfolio</div>
                <div className="flex gap-2">
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ticker or name…"
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500/50" />
                </div>
                <div className="flex gap-1 flex-wrap">
                  {['all', ...Object.keys(CATEGORY_LABELS)].map(c => (
                    <button key={c} onClick={() => setCatFilter(c)}
                      className={`text-[10px] px-2.5 py-1 rounded-full border transition ${catFilter === c ? 'border-cyan-500/50 bg-cyan-500/20 text-cyan-300' : 'border-white/10 text-slate-500 hover:text-white'}`}>
                      {c === 'all' ? 'All' : CATEGORY_ICONS[c] + ' ' + CATEGORY_LABELS[c]}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                  {filteredCatalog.map(a => {
                    const live = liveMap[a.ticker]
                    const added = holdings.some(h => h.ticker === a.ticker)
                    return (
                      <button key={a.ticker} onClick={() => addHolding(a.ticker, a.name, a.category)}
                        disabled={added}
                        className={`text-left rounded-lg border px-3 py-2 transition ${added ? 'border-white/5 bg-white/3 opacity-40 cursor-not-allowed' : 'border-white/10 bg-white/5 hover:border-cyan-500/40 hover:bg-cyan-500/5'}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono font-semibold text-white">{a.ticker}</span>
                          {live ? (
                            <span className={`text-[9px] font-mono ${live.chg_ytd >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {live.chg_ytd >= 0 ? '+' : ''}{live.chg_ytd.toFixed(1)}% YTD
                            </span>
                          ) : (
                            <span className="text-[9px] text-slate-700">benchmark</span>
                          )}
                        </div>
                        <div className="text-[9px] text-slate-500 truncate">{a.name}</div>
                      </button>
                    )
                  })}
                </div>

                {/* Custom asset */}
                <details className="group">
                  <summary className="text-[10px] text-slate-500 cursor-pointer hover:text-white list-none flex items-center gap-1">
                    <span className="group-open:rotate-90 transition-transform inline-block">▶</span> Add custom / unlisted asset
                  </summary>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <input value={customTicker} onChange={e => setCustomTicker(e.target.value)} placeholder="Ticker / code"
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500/50 font-mono uppercase" />
                    <input value={customName} onChange={e => setCustomName(e.target.value)} placeholder="Asset name"
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500/50" />
                    <select value={customCat} onChange={e => setCustomCat(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none">
                      {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                    <button onClick={addCustom} className="bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5 text-xs text-white transition">
                      + Add Custom
                    </button>
                  </div>
                  <p className="text-[9px] text-slate-700 mt-1">Custom assets use benchmark return assumptions — no live data available.</p>
                </details>
              </div>

              {/* Holdings table */}
              {holdings.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-white">Portfolio ({holdings.length} positions)</div>
                    <div className={`text-xs font-mono font-bold ${Math.abs(total - 100) < 0.5 ? 'text-green-400' : 'text-amber-400'}`}>
                      {total.toFixed(1)}% / 100%
                    </div>
                  </div>

                  {holdings.map(h => {
                    const live = liveMap[h.ticker]
                    return (
                      <div key={h.id} className="rounded-xl border border-white/10 bg-white/3 p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px]">{CATEGORY_ICONS[h.category] ?? '•'}</span>
                          <span className="text-xs font-mono font-bold text-white">{h.ticker}</span>
                          <span className="text-[10px] text-slate-500 truncate flex-1">{h.name}</span>
                          {live ? (
                            <span className={`text-[9px] font-mono ${live.chg_ytd >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              YTD {live.chg_ytd >= 0 ? '+' : ''}{live.chg_ytd.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-[9px] text-slate-700">no live data</span>
                          )}
                          {h.isCustom && <span className="text-[9px] text-amber-500 border border-amber-500/30 px-1 rounded">custom</span>}
                          <button onClick={() => removeHolding(h.id)} className="text-slate-700 hover:text-red-400 transition ml-1">✕</button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[9px] text-slate-600 block mb-1">Allocation: <span className="text-white font-mono">{h.pct}%</span></label>
                            <input type="range" min={0} max={100} step={1} value={h.pct}
                              onChange={e => updateHolding(h.id, 'pct', +e.target.value)}
                              className="w-full accent-cyan-500" />
                          </div>
                          <div>
                            <label className="text-[9px] text-slate-600 block mb-1">My expected return: <span className="text-white font-mono">{h.managerReturn.toFixed(1)}% p.a.</span></label>
                            <input type="range" min={-20} max={50} step={0.5} value={h.managerReturn}
                              onChange={e => updateHolding(h.id, 'managerReturn', +e.target.value)}
                              className="w-full accent-purple-500" />
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {/* 3 Projections */}
                  {total > 0 && (
                    <div className="space-y-4 pt-2">
                      <div className="text-xs font-semibold text-white">Projected Portfolio Returns</div>
                      <div className="flex gap-3">
                        <ProjCard label="Manager Projection" ret={proj.managerBlended} color="text-purple-300"
                          desc="Weighted avg of your per-position expected returns" />
                        <ProjCard label="AceEconomy Driven" ret={proj.aceBlended} color={proj.aceBlended >= 0 ? 'text-green-400' : 'text-red-400'}
                          desc={`Live YTD annualised × regime multiplier (${intel?.regime ?? '?'}, ×${regimeMult(intel?.regime ?? '').toFixed(1)})`} />
                        <ProjCard label="Conservative Benchmark" ret={proj.conservativeBlended} color="text-slate-300"
                          desc="Long-run asset class averages (MSCI World, Bloomberg Agg, etc.)" />
                      </div>

                      {/* Risk flags */}
                      {proj.riskFlags.length > 0 && (
                        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
                          <div className="text-[10px] font-mono text-amber-400 uppercase tracking-wider">Risk Considerations</div>
                          {proj.riskFlags.map((f, i) => (
                            <div key={i} className="flex items-start gap-2 text-[11px] text-slate-300">
                              <span className={f.level === 'warn' ? 'text-red-400' : 'text-amber-400'}>
                                {f.level === 'warn' ? '⚠' : '◈'}
                              </span>
                              {f.message}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Summary */}
                      {intel && (
                        <div className="rounded-xl border border-white/8 bg-white/3 p-4 space-y-2">
                          <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Projection Summary</div>
                          <p className="text-[11px] text-slate-300 leading-relaxed">
                            Under the current <strong className="text-white">{intel.regime}</strong> regime (score {intel.regime_score}/10),
                            your {holdings.length}-position portfolio is projected to return between{' '}
                            <strong className={proj.conservativeBlended >= 0 ? 'text-green-400' : 'text-red-400'}>{proj.conservativeBlended >= 0 ? '+' : ''}{proj.conservativeBlended.toFixed(1)}%</strong>{' '}
                            (conservative benchmark) and{' '}
                            <strong className="text-purple-300">{proj.managerBlended >= 0 ? '+' : ''}{proj.managerBlended.toFixed(1)}%</strong>{' '}
                            (manager estimate) annually. The AceEconomy market-driven estimate of{' '}
                            <strong className={proj.aceBlended >= 0 ? 'text-green-400' : 'text-red-400'}>{proj.aceBlended >= 0 ? '+' : ''}{proj.aceBlended.toFixed(1)}%</strong>{' '}
                            reflects current YTD momentum discounted for regime uncertainty.
                            {proj.riskFlags.length > 0 ? ' Key risk concerns are highlighted above.' : ' No major concentration or regime risks detected.'}
                          </p>
                        </div>
                      )}

                      {/* Expandable basis */}
                      <button onClick={() => setBasisOpen(o => !o)}
                        className="w-full flex items-center justify-between rounded-lg border border-white/8 bg-white/3 px-4 py-2.5 text-[11px] text-slate-400 hover:text-white transition">
                        <span>📖 Detailed projection basis & assumptions</span>
                        <span>{basisOpen ? '▲' : '▼'}</span>
                      </button>
                      {basisOpen && (
                        <div className="rounded-xl border border-white/8 bg-white/3 p-4 space-y-4 text-[10px]">
                          <div>
                            <div className="text-slate-400 font-semibold mb-2">Per-position AceEconomy basis</div>
                            <table className="w-full">
                              <thead>
                                <tr className="text-slate-600">
                                  <th className="text-left pb-1 font-normal">Ticker</th>
                                  <th className="text-right pb-1 font-normal">YTD</th>
                                  <th className="text-right pb-1 font-normal">Ann. YTD</th>
                                  <th className="text-right pb-1 font-normal">Regime adj.</th>
                                  <th className="text-right pb-1 font-normal">Source</th>
                                </tr>
                              </thead>
                              <tbody>
                                {proj.aceBasis.map(b => (
                                  <tr key={b.ticker} className="border-t border-white/5">
                                    <td className="py-1 font-mono text-white">{b.ticker}</td>
                                    <td className="py-1 text-right font-mono text-slate-400">
                                      {b.ytdAnn != null ? `${(b.ytdAnn / regimeMult(intel?.regime ?? '') ).toFixed(1)}%` : '—'}
                                    </td>
                                    <td className="py-1 text-right font-mono text-slate-400">
                                      {b.ytdAnn != null ? `${b.ytdAnn.toFixed(1)}%` : '—'}
                                    </td>
                                    <td className={`py-1 text-right font-mono font-semibold ${b.regimeAdj >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                      {b.regimeAdj >= 0 ? '+' : ''}{b.regimeAdj.toFixed(1)}%
                                    </td>
                                    <td className="py-1 text-right text-slate-600">
                                      {b.benchmarkUsed ? BENCHMARK[holdings.find(h => h.ticker === b.ticker)?.category ?? '']?.source ?? 'Benchmark' : 'AceEconomy live'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div className="space-y-1 text-slate-500">
                            <div className="text-slate-400 font-semibold">Conservative benchmark sources</div>
                            {Object.entries(BENCHMARK).map(([cat, b]) => (
                              <div key={cat}><strong className="text-slate-400">{CATEGORY_LABELS[cat] ?? cat}</strong>: {b.ret}% — {b.source}</div>
                            ))}
                          </div>
                          <p className="text-slate-600 leading-relaxed">
                            AceEconomy projections annualise YTD data ({new Date().toLocaleString('en-SG', { month: 'long' })}, month {new Date().getMonth() + 1} of 12)
                            then apply a regime multiplier of ×{regimeMult(intel?.regime ?? '').toFixed(2)} based on the current {intel?.regime ?? 'UNKNOWN'} regime.
                            These are forward-looking estimates, not guarantees. All projections assume current conditions persist — they do not model regime changes, black swan events, or liquidity crises.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {holdings.length === 0 && (
                <div className="py-12 text-center text-slate-600 text-sm">Select assets above to start building your portfolio</div>
              )}
            </div>
          )}

          {/* ── TAB 2: CLIENT PROFILE ── */}
          {tab === 'client' && (
            <div className="space-y-6">
              {/* Input form */}
              <div className="rounded-xl border border-white/10 bg-white/3 p-5 space-y-4">
                <div className="text-xs font-semibold text-white">Client Information & Risk Parameters</div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Client Name</label>
                    <input value={clientProfile.name} onChange={e => setClientProfile(p => ({ ...p, name: e.target.value }))}
                      placeholder="e.g. Mr Tan Wei Liang"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">
                      Portfolio Value (SGD $000)
                    </label>
                    <input type="number" min={10} max={100000} step={50}
                      value={clientProfile.portfolioValue}
                      onChange={e => setClientProfile(p => ({ ...p, portfolioValue: +e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50" />
                  </div>
                </div>

                {/* Monthly income need */}
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">
                    Monthly Income Needed:{' '}
                    <span className="text-white font-semibold">
                      {clientProfile.monthlyIncomePct}% p.a. = ~${Math.round(clientProfile.portfolioValue * 1000 * clientProfile.monthlyIncomePct / 100 / 12).toLocaleString()}/month
                    </span>
                  </label>
                  <input type="range" min={0} max={12} step={0.5} value={clientProfile.monthlyIncomePct}
                    onChange={e => setClientProfile(p => ({ ...p, monthlyIncomePct: +e.target.value }))}
                    className="w-full accent-amber-500" />
                  <div className="flex justify-between text-[9px] text-slate-600 mt-1">
                    <span>No income need (0%)</span><span>4% (typical withdrawal)</span><span>12%</span>
                  </div>
                  {clientProfile.monthlyIncomePct > clientProfile.targetReturn && (
                    <p className="text-[9px] text-red-400 mt-1">
                      ⚠ Income need ({clientProfile.monthlyIncomePct}%) exceeds target return ({clientProfile.targetReturn}%) — capital drawdown likely
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">
                    Risk Tolerance: <span className="text-white font-semibold">{
                      clientProfile.riskScore <= 1.5 ? 'Very Conservative' :
                      clientProfile.riskScore <= 2.5 ? 'Conservative' :
                      clientProfile.riskScore <= 3.5 ? 'Moderate' :
                      clientProfile.riskScore <= 4.5 ? 'Aggressive' : 'Very Aggressive'
                    } ({clientProfile.riskScore}/5)</span>
                  </label>
                  <input type="range" min={1} max={5} step={0.5} value={clientProfile.riskScore}
                    onChange={e => setClientProfile(p => ({ ...p, riskScore: +e.target.value }))}
                    className="w-full accent-cyan-500" />
                  <div className="flex justify-between text-[9px] text-slate-600 mt-1">
                    <span>Very Conservative</span><span>Moderate</span><span>Very Aggressive</span>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">
                    Target Annual Return: <span className="text-white font-semibold">{clientProfile.targetReturn}% p.a.</span>
                  </label>
                  <input type="range" min={0} max={25} step={0.5} value={clientProfile.targetReturn}
                    onChange={e => setClientProfile(p => ({ ...p, targetReturn: +e.target.value }))}
                    className="w-full accent-purple-500" />
                  <div className="flex justify-between text-[9px] text-slate-600 mt-1">
                    <span>0%</span><span>12.5%</span><span>25%</span>
                  </div>
                </div>

                {/* What this button actually does */}
                <div className="rounded-lg border border-white/8 bg-white/3 px-3 py-2.5 text-[10px] text-slate-500 leading-relaxed">
                  <strong className="text-slate-400">How this works:</strong> Clicking generate maps the risk score (1–5) to a starting allocation framework (conservative = more cash + bonds; aggressive = more equity + thematic), then automatically nudges equity vs fixed-income weight to close the gap between the starting benchmark return and your target return. Cash allocation is preserved as a liquidity buffer sized to the risk score. You can then manually adjust the sliders below.
                </div>

                <button onClick={generateClientPortfolio}
                  className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-sm py-2.5 rounded-lg transition">
                  Generate Risk-Adjusted Portfolio
                </button>
              </div>

              {clientHoldings.length > 0 && (() => {
                const cTotal = totalPct(clientHoldings)
                const annualIncome = clientProfile.portfolioValue * 1000 * clientProfile.monthlyIncomePct / 100
                const monthlyIncome = annualIncome / 12
                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-white">Suggested Allocation — {clientProfile.name || 'Client'}</div>
                      <div className={`text-xs font-mono font-bold ${Math.abs(cTotal - 100) < 0.5 ? 'text-green-400' : 'text-amber-400'}`}>
                        {cTotal.toFixed(1)}% / 100%
                      </div>
                    </div>

                    {/* Income summary */}
                    {clientProfile.monthlyIncomePct > 0 && (
                      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-2.5 flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Monthly income target</span>
                        <div className="text-right">
                          <span className="text-amber-300 font-bold">${Math.round(monthlyIncome).toLocaleString()}/mo</span>
                          <span className="text-slate-600 ml-2">({clientProfile.monthlyIncomePct}% of ${(clientProfile.portfolioValue).toLocaleString()}k)</span>
                        </div>
                      </div>
                    )}

                    {/* Editable allocation sliders */}
                    <div className="space-y-2">
                      {clientHoldings.filter(h => h.pct > 0).map(h => (
                        <div key={h.id} className="rounded-xl border border-white/8 bg-white/3 px-3 py-2.5 space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{CATEGORY_ICONS[h.category]}</span>
                            <span className="text-xs font-mono font-bold text-white">{h.ticker}</span>
                            <span className="text-[9px] text-slate-500 flex-1 truncate">{h.name}</span>
                            <span className="text-[10px] font-bold text-cyan-300">{h.pct.toFixed(0)}%</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input type="range" min={0} max={80} step={1} value={h.pct}
                              onChange={e => updateClientHolding(h.id, +e.target.value)}
                              className="flex-1 accent-cyan-500" />
                            <span className="text-[9px] text-slate-600 shrink-0 w-24 text-right">
                              bench {BENCHMARK[h.category]?.ret ?? 0}% · {BENCHMARK[h.category]?.source?.split('(')[0].trim()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Projections with named benchmark sources */}
                    <div className="space-y-2">
                      <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Portfolio Projections</div>
                      <div className="flex gap-3">
                        <div className="flex-1 rounded-xl border border-white/10 bg-white/4 p-3 text-center">
                          <div className="text-[9px] font-mono text-slate-500 uppercase tracking-wider mb-1">Conservative Benchmark</div>
                          <div className="text-xl font-bold font-mono text-slate-300">
                            {cProj.conservativeBlended >= 0 ? '+' : ''}{cProj.conservativeBlended.toFixed(1)}%
                          </div>
                          <div className="text-[9px] text-slate-600 mt-1">est. annual return</div>
                          <div className="mt-2 space-y-0.5 text-left">
                            {clientHoldings.filter(h => h.pct > 0).map(h => (
                              <div key={h.id} className="text-[8px] text-slate-700 truncate">
                                {h.ticker}: {BENCHMARK[h.category]?.ret ?? 0}% — {BENCHMARK[h.category]?.source}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex-1 rounded-xl border border-white/10 bg-white/4 p-3 text-center">
                          <div className="text-[9px] font-mono text-slate-500 uppercase tracking-wider mb-1">AceEconomy Driven</div>
                          <div className={`text-xl font-bold font-mono ${cProj.aceBlended >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {cProj.aceBlended >= 0 ? '+' : ''}{cProj.aceBlended.toFixed(1)}%
                          </div>
                          <div className="text-[9px] text-slate-600 mt-1">est. annual return</div>
                          <div className="text-[9px] text-slate-600 mt-2 leading-snug text-left">
                            Live YTD data from AceEconomy VPS (no fabricated figures). Where live data unavailable, falls back to documented benchmark. Regime: {intel?.regime ?? '—'} ×{regimeMult(intel?.regime ?? '').toFixed(1)}.
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Income check against projected return */}
                    {clientProfile.monthlyIncomePct > 0 && (
                      <div className={`rounded-lg border px-4 py-3 text-[11px] ${
                        cProj.conservativeBlended >= clientProfile.monthlyIncomePct
                          ? 'border-green-500/25 bg-green-500/5 text-green-300'
                          : 'border-amber-500/25 bg-amber-500/5 text-amber-300'
                      }`}>
                        {cProj.conservativeBlended >= clientProfile.monthlyIncomePct
                          ? `✓ Conservative benchmark (${cProj.conservativeBlended.toFixed(1)}%) covers the ${clientProfile.monthlyIncomePct}% income need — capital preserved in a typical year.`
                          : `◈ Conservative benchmark (${cProj.conservativeBlended.toFixed(1)}%) falls short of the ${clientProfile.monthlyIncomePct}% income need by ${(clientProfile.monthlyIncomePct - cProj.conservativeBlended).toFixed(1)}% — some capital drawdown in low-return years.`
                        }
                      </div>
                    )}

                    {cProj.riskFlags.length > 0 && (
                      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 space-y-1.5">
                        <div className="text-[10px] font-mono text-amber-400 uppercase tracking-wider">Risk Notes</div>
                        {cProj.riskFlags.map((f, i) => (
                          <div key={i} className="text-[11px] text-slate-300 flex items-start gap-2">
                            <span className="text-amber-400">◈</span>{f.message}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          )}

          {/* ── TAB 3: COMPARE & SHARE ── */}
          {tab === 'compare' && (
            <div className="space-y-6">
              {(holdings.length === 0 || clientHoldings.length === 0) && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-[11px] text-amber-300">
                  Complete both the Portfolio Builder and Client Profile tabs first to compare.
                </div>
              )}

              {holdings.length > 0 && clientHoldings.length > 0 && (
                <>
                  {/* Side-by-side */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Manager Portfolio', holdings: holdings, proj, side: 'manager' as const },
                      { label: `${clientProfile.name || 'Client'} Profile`, holdings: clientHoldings, proj: cProj, side: 'client' as const },
                    ].map(({ label, holdings: h, proj: p, side }) => (
                      <div key={side} className={`rounded-xl border p-4 space-y-3 ${confirmed === side ? 'border-cyan-500/50 bg-cyan-500/5' : 'border-white/10 bg-white/3'}`}>
                        <div className="text-xs font-semibold text-white">{label}</div>
                        <div className="space-y-1.5">
                          {h.map(x => (
                            <div key={x.id} className="flex items-center justify-between text-[10px]">
                              <span className="font-mono text-slate-300">{x.ticker}</span>
                              <span className="font-mono text-white font-bold">{x.pct.toFixed(0)}%</span>
                            </div>
                          ))}
                        </div>
                        <div className="border-t border-white/8 pt-2 space-y-1 text-[10px]">
                          <div className="flex justify-between"><span className="text-slate-500">Manager est.</span><span className="text-purple-300 font-mono">{p.managerBlended >= 0 ? '+' : ''}{p.managerBlended.toFixed(1)}%</span></div>
                          <div className="flex justify-between"><span className="text-slate-500">AceEconomy</span><span className={`font-mono ${p.aceBlended >= 0 ? 'text-green-400' : 'text-red-400'}`}>{p.aceBlended >= 0 ? '+' : ''}{p.aceBlended.toFixed(1)}%</span></div>
                          <div className="flex justify-between"><span className="text-slate-500">Conservative</span><span className="text-slate-300 font-mono">{p.conservativeBlended >= 0 ? '+' : ''}{p.conservativeBlended.toFixed(1)}%</span></div>
                        </div>
                        {p.riskFlags.length > 0 && (
                          <div className="text-[9px] text-amber-400">{p.riskFlags.length} risk flag{p.riskFlags.length > 1 ? 's' : ''}</div>
                        )}
                        <button onClick={() => handleConfirm(side)}
                          className={`w-full py-2 rounded-lg text-xs font-bold transition ${confirmed === side ? 'bg-cyan-500 text-black' : 'bg-white/10 hover:bg-white/20 text-white'}`}>
                          {confirmed === side ? '✓ Confirmed' : 'Confirm this Portfolio'}
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* QR + PDF */}
                  {confirmed && (
                    <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/5 p-5 space-y-4">
                      <div className="text-xs font-semibold text-white">
                        Confirmed: {confirmed === 'manager' ? 'Manager Portfolio' : `${clientProfile.name || 'Client'} Risk-Adjusted Portfolio`}
                      </div>
                      <div className="flex gap-6 items-start">
                        {qrUrl && (
                          <div className="shrink-0 space-y-1">
                            <img src={qrUrl} alt="Portfolio QR" className="rounded-lg bg-white p-1 w-32 h-32" />
                            <p className="text-[9px] text-slate-600 text-center">Scan to share</p>
                          </div>
                        )}
                        <div className="flex-1 space-y-2">
                          <p className="text-[11px] text-slate-400 leading-relaxed">
                            QR code encodes the confirmed portfolio allocation. Client can scan to view a summary of their holdings.
                            Generate a PDF for a formal record including full assumptions and disclaimer.
                          </p>
                          <button onClick={handlePrint}
                            className="w-full bg-white text-black font-bold text-xs py-2.5 rounded-lg hover:bg-gray-100 transition">
                            🖨 Download / Print PDF
                          </button>
                          <p className="text-[9px] text-slate-600 text-center">Opens browser print dialog — save as PDF</p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Disclaimer */}
              <div className="rounded-lg border border-white/8 bg-white/3 px-4 py-3 text-[9px] text-slate-600 leading-relaxed">
                <strong className="text-slate-500">Disclaimer:</strong> All projections are illustrative estimates for discussion purposes only. They do not constitute financial advice or an investment recommendation. Past performance is not indicative of future results. Market conditions as of {new Date().toLocaleDateString('en-SG')}.
              </div>
            </div>
          )}

          {/* ── TAB 4: DNA WHEEL ── */}
          {tab === 'dna' && (
            <div className="space-y-4">
              {holdings.length === 0 ? (
                <div className="rounded-xl border border-white/8 bg-white/3 py-16 text-center">
                  <div className="text-2xl mb-3">🧬</div>
                  <p className="text-slate-500 text-sm">Build your portfolio in the Build Portfolio tab first.</p>
                  <button onClick={() => setTab('build')} className="mt-4 text-xs text-cyan-400 hover:underline">
                    → Go to Build Portfolio
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-white">Portfolio DNA Wheel</h2>
                      <p className="text-[10px] text-slate-500">Concentric rings ordered largest→innermost · Ring size = allocation · Colour = YTD performance</p>
                    </div>
                    <span className="text-[9px] text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">SVG · Phase 1</span>
                  </div>
                  <PortfolioDNAWheel
                    holdings={holdings.map(h => ({
                      ...h,
                      liveYtd: (() => {
                        const lm: Record<string, AssetClass> = {}
                        intel?.asset_classes?.forEach(a => { lm[a.ticker] = a })
                        intel?.sectors?.forEach(s => { lm[s.ticker] = s as unknown as AssetClass })
                        return lm[h.ticker]?.chg_ytd ?? undefined
                      })(),
                      benchmarkReturn: BENCHMARK[h.category]?.ret ?? 5,
                    }))}
                    regime={intel?.regime ?? 'UNKNOWN'}
                    vix={intel?.vix ?? null}
                    commentary={intel?.commentary ?? ''}
                  />
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
