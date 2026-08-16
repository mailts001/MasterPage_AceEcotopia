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
// Annualised volatility (σ) benchmarks per asset class — long-run historical
const VOL: Record<string, number> = {
  equity:         16.0,  // MSCI World ~15-17% ann. vol
  fixed_income:    5.5,  // Bloomberg Agg ~5-6%
  fx:              8.0,  // DXY / cross-currency pairs
  commodities:    18.0,  // Bloomberg Commodity ~17-20%
  private_equity: 20.0,  // Higher est. due to illiquidity premium & leverage
  philanthropy:    0.0,  // Non-financial
  thematic:       28.0,  // ARK-type thematic: high dispersion
  cash:            0.5,  // Near-zero
}

const RISK_FREE_RATE = 4.3  // US 10-yr yield indicative (Aug 2026)

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

// Sector/industry labels per ticker — used for DNA sector composition breakdown
const TICKER_SECTOR: Record<string, string> = {
  SPY: 'US Broad Market', QQQ: 'US Tech / Growth', IWM: 'US Small Cap',
  VTI: 'US Total Market', VEA: 'Developed Markets Intl', VWO: 'Emerging Markets',
  EEM: 'Emerging Markets', GLD: 'Gold / Precious Metals', SLV: 'Silver',
  GDX: 'Gold Miners', TLT: 'Long Duration Treasuries', AGG: 'US Aggregate Bonds',
  BND: 'Total Bond Market', LQD: 'Corporate Bonds', HYG: 'High Yield Bonds',
  SHY: 'Short Duration Treasuries', BNDX: 'Intl Bonds', EMB: 'EM Bonds',
  USO: 'Crude Oil', DBC: 'Commodities Broad', DBA: 'Agriculture',
  XLK: 'Technology', XLF: 'Financials', XLV: 'Healthcare',
  XLE: 'Energy', XLI: 'Industrials', XLY: 'Consumer Discretionary',
  XLP: 'Consumer Staples', XLU: 'Utilities', XLRE: 'Real Estate',
  XLC: 'Communication Services', XLB: 'Materials',
  NVDA: 'Semiconductors', AAPL: 'Large Cap Tech', MSFT: 'Large Cap Tech',
  AMZN: 'E-Commerce / Cloud', GOOGL: 'Digital Advertising / AI',
  META: 'Social Media / AI', TSLA: 'EV / Clean Energy',
  JPM: 'US Mega-Cap Banking', BAC: 'US Banking', GS: 'Investment Banking',
  HSBA: 'Global Banking', '0005.HK': 'HK Banking', '0941.HK': 'China Telecom',
  '2330.TW': 'Semiconductors (TSMC)', ASML: 'Semiconductor Equipment',
  BTC: 'Crypto — Bitcoin', ETH: 'Crypto — Ethereum',
  VNQ: 'US REITs', REM: 'Mortgage REITs',
  'TBILL-USD-3M': 'Cash / US T-Bill', 'TBILL-USD-6M': 'Cash / US T-Bill',
  'TBILL-SGD-6M': 'Cash / SGD T-Bill', 'MMF-USD': 'Cash / Money Market',
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
  portfolioVol: number          // weighted-avg annualised volatility %
  sharpeAce: number             // (aceBlended − rfr) / vol
  sharpeManager: number         // (managerBlended − rfr) / vol
  sharpeConservative: number    // (conservativeBlended − rfr) / vol
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

  let managerBlended = 0, aceBlended = 0, conservativeBlended = 0, portfolioVol = 0
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

    // Weighted-average volatility (simplified — assumes zero cross-correlations;
    // true portfolio vol would be lower due to diversification)
    portfolioVol += w * (VOL[h.category] ?? 15)
  }

  const sharpeAce          = portfolioVol > 0 ? (aceBlended - RISK_FREE_RATE) / portfolioVol : 0
  const sharpeManager      = portfolioVol > 0 ? (managerBlended - RISK_FREE_RATE) / portfolioVol : 0
  const sharpeConservative = portfolioVol > 0 ? (conservativeBlended - RISK_FREE_RATE) / portfolioVol : 0

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

  return { managerBlended, aceBlended, conservativeBlended, portfolioVol, sharpeAce, sharpeManager, sharpeConservative, riskFlags, aceBasis }
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
  const [tab, setTab]                   = useState<'build' | 'client' | 'dna' | 'compare'>('build')
  const [savedSessions, setSavedSessions] = useState<Record<string, unknown>>({})
  const [saveMsg, setSaveMsg]           = useState('')
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
  const [bgLight, setBgLight]           = useState(false)
  useEffect(() => {
    const val = localStorage.getItem('ace_fin_light') === '1'
    setBgLight(val)
    document.documentElement.classList.toggle('ace-light', val)
  }, [])
  const applyTheme = (next: boolean) => {
    setBgLight(next)
    localStorage.setItem('ace_fin_light', next ? '1' : '0')
    document.documentElement.classList.toggle('ace-light', next)
  }
  const [dnaTimeframe, setDnaTimeframe] = useState<'ytd'|'1y'|'6m'|'3m'|'5d'|'overnight'>('ytd')
  const [dnaSide, setDnaSide]           = useState<'manager'|'client'>('manager')
  const [dnaPerf, setDnaPerf]           = useState<Record<string, number>>({})
  const [dnaLoading, setDnaLoading]     = useState(false)
  const [customOpen, setCustomOpen]     = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  // localStorage session persistence
  useEffect(() => {
    try {
      const raw = localStorage.getItem('portbuilder_sessions_v1')
      if (raw) setSavedSessions(JSON.parse(raw))
    } catch { /* ignore */ }
  }, [])

  function saveSession() {
    if (!clientProfile.name.trim()) { setSaveMsg('Set a client name first.'); return }
    const key = clientProfile.name.trim()
    const sessions = { ...savedSessions, [key]: { holdings, clientHoldings, clientProfile, savedAt: new Date().toISOString() } }
    setSavedSessions(sessions)
    try { localStorage.setItem('portbuilder_sessions_v1', JSON.stringify(sessions)) } catch { /* ignore */ }
    setSaveMsg(`Saved "${key}"`)
    setTimeout(() => setSaveMsg(''), 3000)
  }

  function loadSession(key: string) {
    const s = savedSessions[key] as { holdings: Holding[]; clientHoldings: Holding[]; clientProfile: ClientProfile }
    if (!s) return
    setHoldings(s.holdings ?? [])
    setClientHoldings(s.clientHoldings ?? [])
    setClientProfile(s.clientProfile ?? clientProfile)
    setSaveMsg(`Loaded "${key}"`)
    setTimeout(() => setSaveMsg(''), 3000)
  }

  function deleteSession(key: string) {
    const sessions = { ...savedSessions }
    delete sessions[key]
    setSavedSessions(sessions)
    try { localStorage.setItem('portbuilder_sessions_v1', JSON.stringify(sessions)) } catch { /* ignore */ }
  }

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
    setCustomTicker(''); setCustomName(''); setCustomOpen(false)
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

  function handlePrintDNA() {
    const activeH = (dnaSide === 'client' && clientHoldings.length > 0) ? clientHoldings : holdings
    const activeP = dnaSide === 'client' ? cProj : proj
    const activeLabel = dnaSide === 'client' ? 'Balanced Profile' : 'PortfolioPlus'
    const tfLabel = ({ overnight: '1D', '5d': '1W', '3m': '3M', '6m': '6M', '1y': '1Y', ytd: 'YTD' } as Record<string,string>)[dnaTimeframe] ?? dnaTimeframe
    const t2 = activeH.reduce((s, h) => s + h.pct, 0) || 100
    const blended = activeH.reduce((sum, h) => { const r = dnaPerf[h.ticker]; return r != null ? sum + (h.pct / t2) * r : sum }, 0)
    const hasPerf = activeH.some(h => dnaPerf[h.ticker] != null)

    const secMap: Record<string, { tickers: string[]; weight: number; perfSum: number; wSum: number }> = {}
    activeH.forEach(h => {
      const sec = TICKER_SECTOR[h.ticker] ?? CATEGORY_LABELS[h.category] ?? h.category
      if (!secMap[sec]) secMap[sec] = { tickers: [], weight: 0, perfSum: 0, wSum: 0 }
      secMap[sec].tickers.push(h.ticker)
      secMap[sec].weight += h.pct / t2 * 100
      const r = dnaPerf[h.ticker]; if (r != null) { secMap[sec].perfSum += r * (h.pct / t2); secMap[sec].wSum += h.pct / t2 }
    })
    const sectors = Object.entries(secMap).sort(([,a],[,b]) => b.weight - a.weight)

    // ── SVG: horizontal allocation bars ──────────────────────────────────────
    const BAR_COLORS: Record<string,string> = {
      equity:'#3b82f6', fixed_income:'#22c55e', fx:'#eab308',
      commodities:'#f97316', private_equity:'#a855f7', thematic:'#06b6d4', cash:'#94a3b8',
    }
    const barH = 24, barGap = 4, barLabelW = 60, barAreaW = 340
    const allocationSvgH = activeH.length * (barH + barGap)
    const allocationSvg = `<svg width="520" height="${allocationSvgH}" xmlns="http://www.w3.org/2000/svg">
      ${activeH.map((h, i) => {
        const w2 = Math.round((h.pct / t2) * barAreaW)
        const y = i * (barH + barGap)
        const r = dnaPerf[h.ticker]
        const perfTxt = r != null ? `${r >= 0 ? '+' : ''}${r.toFixed(1)}%` : ''
        const perfCol = r != null ? (r >= 0 ? '#16a34a' : '#dc2626') : '#999'
        return `<text x="0" y="${y + barH/2 + 4}" font-size="11" font-family="monospace" fill="#111" font-weight="bold">${h.ticker}</text>
        <rect x="${barLabelW}" y="${y+2}" width="${w2}" height="${barH-4}" fill="${BAR_COLORS[h.category] ?? '#94a3b8'}" rx="3"/>
        <text x="${barLabelW + w2 + 5}" y="${y + barH/2 + 4}" font-size="11" font-family="Arial" fill="#555">${(h.pct/t2*100).toFixed(1)}%</text>
        <text x="${barLabelW + barAreaW + 20}" y="${y + barH/2 + 4}" font-size="11" font-family="monospace" fill="${perfCol}" font-weight="bold">${perfTxt}</text>`
      }).join('')}
    </svg>`

    // ── SVG: donut chart for sector weights ──────────────────────────────────
    const PIE_COLORS = ['#3b82f6','#22c55e','#f97316','#a855f7','#eab308','#06b6d4','#ec4899','#94a3b8','#84cc16','#f43f5e']
    const cx = 100, cy = 100, r1 = 80, r2 = 50
    let angle = -90
    const piePaths = sectors.map(([sec, g], i) => {
      const sweep = (g.weight / 100) * 360
      const startA = angle; const endA = angle + sweep
      angle = endA
      const toRad = (a: number) => a * Math.PI / 180
      const sx = cx + r1 * Math.cos(toRad(startA)); const sy = cy + r1 * Math.sin(toRad(startA))
      const ex = cx + r1 * Math.cos(toRad(endA));   const ey = cy + r1 * Math.sin(toRad(endA))
      const ix = cx + r2 * Math.cos(toRad(endA));   const iy = cy + r2 * Math.sin(toRad(endA))
      const jx = cx + r2 * Math.cos(toRad(startA)); const jy = cy + r2 * Math.sin(toRad(startA))
      const large = sweep > 180 ? 1 : 0
      return `<path d="M${sx},${sy} A${r1},${r1} 0 ${large} 1 ${ex},${ey} L${ix},${iy} A${r2},${r2} 0 ${large} 0 ${jx},${jy} Z" fill="${PIE_COLORS[i % PIE_COLORS.length]}" stroke="#fff" stroke-width="1.5"/>`
    })
    const legend = sectors.map(([sec, g], i) =>
      `<rect x="215" y="${12 + i * 18}" width="12" height="12" fill="${PIE_COLORS[i % PIE_COLORS.length]}" rx="2"/>
       <text x="232" y="${22 + i * 18}" font-size="10" font-family="Arial" fill="#111">${sec} (${g.weight.toFixed(0)}%)</text>`
    ).join('')
    const donutSvg = `<svg width="520" height="${Math.max(210, 30 + sectors.length * 18)}" xmlns="http://www.w3.org/2000/svg">
      ${piePaths.join('')}
      <circle cx="${cx}" cy="${cy}" r="${r2 - 2}" fill="white"/>
      <text x="${cx}" y="${cy - 6}" text-anchor="middle" font-size="9" fill="#666" font-family="Arial">Portfolio</text>
      <text x="${cx}" y="${cy + 10}" text-anchor="middle" font-size="11" fill="#111" font-weight="bold" font-family="Arial">Sectors</text>
      ${legend}
    </svg>`

    // ── SVG: scenario bar chart ───────────────────────────────────────────────
    const scenarios = [
      { label: 'Manager Est.', val: activeP.managerBlended, col: '#3b82f6' },
      { label: 'Live Market', val: activeP.aceBlended, col: '#06b6d4' },
      { label: 'Conservative', val: activeP.conservativeBlended, col: '#94a3b8' },
      { label: 'Bear Case', val: activeP.aceBlended * 0.5, col: '#ef4444' },
      { label: 'Bull Case', val: activeP.aceBlended * 1.6, col: '#22c55e' },
    ]
    const maxAbs = Math.max(...scenarios.map(s => Math.abs(s.val)), 1)
    const scenSvgH = scenarios.length * 32 + 30
    const scLabelW = 90, scAreaW = 280, scMidX = scLabelW + scAreaW / 2
    const scenSvg = `<svg width="520" height="${scenSvgH}" xmlns="http://www.w3.org/2000/svg">
      <line x1="${scMidX}" y1="0" x2="${scMidX}" y2="${scenSvgH - 20}" stroke="#ddd" stroke-width="1"/>
      <text x="${scMidX}" y="${scenSvgH - 6}" text-anchor="middle" font-size="9" fill="#999" font-family="Arial">0%</text>
      ${scenarios.map((s, i) => {
        const y = 8 + i * 32
        const barW = Math.abs(s.val) / maxAbs * (scAreaW / 2 - 4)
        const positive = s.val >= 0
        const bx = positive ? scMidX : scMidX - barW
        return `<text x="${scLabelW - 5}" y="${y + 16}" text-anchor="end" font-size="10" font-family="Arial" fill="#333">${s.label}</text>
          <rect x="${bx}" y="${y + 4}" width="${barW}" height="20" fill="${s.col}" rx="3" opacity="0.85"/>
          <text x="${positive ? scMidX + barW + 4 : scMidX - barW - 4}" y="${y + 17}" text-anchor="${positive ? 'start' : 'end'}" font-size="10" font-family="monospace" fill="${s.val >= 0 ? '#16a34a' : '#dc2626'}" font-weight="bold">${s.val >= 0 ? '+' : ''}${s.val.toFixed(1)}%</text>`
      }).join('')}
    </svg>`

    const html = `<!DOCTYPE html><html><head><title>${activeLabel} — PortDNA Report</title>
<style>
  body{font-family:Arial,sans-serif;color:#111;background:#fff;margin:0;padding:36px 40px;font-size:12px}
  .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #0A0E1A;padding-bottom:12px;margin-bottom:4px}
  .header h1{font-size:24px;font-weight:800;margin:0;color:#0A0E1A}
  .header .badge{background:#0A0E1A;color:#00D4FF;font-size:10px;font-weight:700;padding:4px 10px;border-radius:20px;margin-top:4px;display:inline-block}
  .subtitle{color:#666;font-size:11px;margin:8px 0 20px}
  h2{font-size:13px;font-weight:700;margin:20px 0 8px;color:#0A0E1A;border-bottom:1px solid #e2e8f0;padding-bottom:4px;text-transform:uppercase;letter-spacing:.04em}
  table{width:100%;border-collapse:collapse;margin-bottom:12px;font-size:11px}
  th{text-align:left;padding:5px 8px;border-bottom:2px solid #0A0E1A;font-size:10px;background:#f8fafc;text-transform:uppercase;letter-spacing:.03em}
  td{padding:5px 8px;border-bottom:1px solid #f0f0f0;vertical-align:middle}
  .right{text-align:right}
  .bold{font-weight:700}
  .green{color:#16a34a}
  .red{color:#dc2626}
  .metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px}
  .metric{border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;background:#f8fafc}
  .metric-label{color:#64748b;font-size:9px;text-transform:uppercase;letter-spacing:.06em;font-weight:600}
  .metric-value{font-size:22px;font-weight:800;margin-top:3px;color:#0A0E1A}
  .two-col{display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:start}
  .disclaimer{font-size:9px;color:#888;border-top:1px solid #e2e8f0;margin-top:20px;padding-top:10px;line-height:1.7}
  @media print{body{padding:16px 20px}@page{margin:1cm;size:A4}h2{page-break-before:auto}}
  svg{display:block;max-width:100%}
</style></head><body>

  <div class="header">
    <div>
      <h1>${activeLabel}</h1>
      <div class="badge">PortDNA Client Report</div>
    </div>
    <div style="text-align:right;color:#666;font-size:10px">
      <div style="font-weight:700;font-size:13px;color:#111">${new Date().toLocaleDateString('en-SG', { day:'numeric', month:'long', year:'numeric' })}</div>
      <div>For professional discussion only</div>
      <div>Market regime: <strong>${intel?.regime ?? '—'}</strong> · VIX ${intel?.vix?.toFixed(0) ?? '—'}</div>
    </div>
  </div>
  <p class="subtitle">Prepared by X68 Financial District · ${activeH.length} holdings · All projections are indicative estimates only</p>

  <h2>Portfolio Overview</h2>
  <div class="metrics">
    <div class="metric">
      <div class="metric-label">Holdings</div>
      <div class="metric-value">${activeH.length}</div>
    </div>
    <div class="metric">
      <div class="metric-label">Return · ${tfLabel}</div>
      <div class="metric-value" style="color:${hasPerf ? (blended >= 0 ? '#16a34a' : '#dc2626') : '#94a3b8'}">${hasPerf ? (blended >= 0 ? '+' : '') + blended.toFixed(1) + '%' : '—'}</div>
    </div>
    <div class="metric">
      <div class="metric-label">Est. Volatility (σ)</div>
      <div class="metric-value">${activeP.portfolioVol.toFixed(1)}%</div>
    </div>
    <div class="metric">
      <div class="metric-label">Sharpe Ratio</div>
      <div class="metric-value">${activeP.sharpeAce.toFixed(2)}</div>
    </div>
    <div class="metric">
      <div class="metric-label">Market Regime</div>
      <div class="metric-value" style="font-size:15px">${intel?.regime ?? '—'}</div>
    </div>
    <div class="metric">
      <div class="metric-label">Manager Est. p.a.</div>
      <div class="metric-value" style="color:#3b82f6">${activeP.managerBlended >= 0 ? '+' : ''}${activeP.managerBlended.toFixed(1)}%</div>
    </div>
  </div>

  <h2>Asset Allocation · ${tfLabel} Performance</h2>
  ${allocationSvg}
  <table style="margin-top:8px">
    <thead><tr><th>Ticker</th><th>Name</th><th>Sector / Industry</th><th class="right">Weight %</th><th class="right">${tfLabel} Return</th></tr></thead>
    <tbody>${activeH.map(h => {
      const r = dnaPerf[h.ticker]
      const sec = TICKER_SECTOR[h.ticker] ?? CATEGORY_LABELS[h.category] ?? h.category
      const cls = r == null ? '' : r >= 0 ? 'green' : 'red'
      return `<tr><td class="bold" style="font-family:monospace">${h.ticker}</td><td>${h.name}</td><td style="color:#555;font-size:10px">${sec}</td><td class="right bold">${(h.pct/t2*100).toFixed(1)}%</td><td class="right bold ${cls}">${r != null ? (r>=0?'+':'')+r.toFixed(1)+'%' : '—'}</td></tr>`
    }).join('')}</tbody>
  </table>

  <div class="two-col">
    <div>
      <h2>Sector / Industry Breakdown</h2>
      ${donutSvg}
    </div>
    <div>
      <h2>Return Scenarios (Annual)</h2>
      ${scenSvg}
      <table style="margin-top:8px">
        <thead><tr><th>Scenario</th><th class="right">Est. p.a.</th></tr></thead>
        <tbody>
          <tr><td>Manager Estimate</td><td class="right bold" style="color:#3b82f6">${activeP.managerBlended>=0?'+':''}${activeP.managerBlended.toFixed(1)}%</td></tr>
          <tr><td>Live Market (${tfLabel} annualised)</td><td class="right bold">${activeP.aceBlended>=0?'+':''}${activeP.aceBlended.toFixed(1)}%</td></tr>
          <tr><td>Conservative Benchmark</td><td class="right bold" style="color:#94a3b8">${activeP.conservativeBlended>=0?'+':''}${activeP.conservativeBlended.toFixed(1)}%</td></tr>
          <tr><td>Bear Case (−50% base)</td><td class="right bold red">${(activeP.aceBlended*0.5>=0?'+':'')}${(activeP.aceBlended*0.5).toFixed(1)}%</td></tr>
          <tr><td>Bull Case (×1.6 base)</td><td class="right bold green">+${(activeP.aceBlended*1.6).toFixed(1)}%</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <h2>Sector Performance · ${tfLabel}</h2>
  <table>
    <thead><tr><th>Sector / Industry</th><th>Tickers</th><th class="right">Weight</th><th class="right">Blended ${tfLabel}</th></tr></thead>
    <tbody>${sectors.map(([sec, g]) => {
      const perf = g.wSum > 0 ? g.perfSum / g.wSum : null
      const cls = perf == null ? '' : perf >= 0 ? 'green' : 'red'
      return `<tr><td class="bold">${sec}</td><td style="color:#555;font-size:10px">${g.tickers.join(', ')}</td><td class="right">${g.weight.toFixed(0)}%</td><td class="right bold ${cls}">${perf != null ? (perf>=0?'+':'')+perf.toFixed(1)+'%' : '—'}</td></tr>`
    }).join('')}</tbody>
  </table>

  ${activeP.riskFlags.length > 0 ? `<h2>Risk Considerations</h2><ul style="font-size:11px;padding-left:18px">${activeP.riskFlags.map(f=>`<li style="margin-bottom:4px">${f.message}</li>`).join('')}</ul>` : ''}

  <p class="disclaimer"><strong>Important Disclaimer:</strong> This PortDNA Client Report is prepared by X68 Financial District for illustrative and professional discussion purposes only. It does not constitute financial advice, an investment recommendation, or a solicitation to buy or sell any security. All return projections and scenario estimates carry significant uncertainty and are not a guarantee of future performance. Past performance is not indicative of future results. Sector classifications, benchmark assumptions, and risk metrics used are indicative. Clients and their advisers should conduct independent due diligence and seek advice from a licensed financial professional before making investment decisions. Live market data as of ${new Date().toLocaleDateString('en-SG')}. Regime: ${intel?.regime ?? 'UNKNOWN'} · Regime multiplier ×${regimeMult(intel?.regime ?? 'UNKNOWN').toFixed(2)}.</p>
</body></html>`

    const w = window.open('', '_blank')
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 600) }
  }

  // Fetch multi-period performance for PortDNA timeframe view
  const fetchDnaPerf = useCallback(async (tickers: string[], period: string) => {
    if (tickers.length === 0) return
    setDnaLoading(true)
    try {
      const map: Record<string, number> = {}

      if (period === 'ytd') {
        // Prefer intel feed for YTD (faster, no extra API call)
        if (intel) {
          intel.asset_classes.forEach(a => { if (a.chg_ytd != null) map[a.ticker] = a.chg_ytd })
          intel.sectors?.forEach(s => { if ((s as AssetClass).chg_ytd != null) map[s.ticker] = (s as AssetClass).chg_ytd })
        }
        // Fetch from VPS for tickers not in intel (use 1y as proxy)
        const missing = tickers.filter(t => map[t] == null)
        if (missing.length > 0) {
          const r = await fetch('/api/nexus/financial/perf-periods', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tickers: missing }),
          }).catch(() => null)
          if (r?.ok) {
            const d = await r.json()
            ;(d.tickers ?? []).forEach((t: Record<string, unknown>) => {
              const v = t['1y']  // use 1y as YTD proxy for unlisted tickers
              if (typeof v === 'number') map[t.ticker as string] = v
            })
          }
        }
        setDnaPerf(map)
        return
      }

      const fieldMap: Record<string, string> = { '1y': '1y', '6m': '6m', '3m': '3m', '5d': '5d', overnight: 'overnight' }
      const field = fieldMap[period] ?? '1y'
      const r = await fetch('/api/nexus/financial/perf-periods', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickers }),
      }).catch(() => null)
      if (r?.ok) {
        const d = await r.json()
        ;(d.tickers ?? []).forEach((t: Record<string, unknown>) => {
          const v = t[field]
          if (typeof v === 'number') map[t.ticker as string] = v
        })
        setDnaPerf(map)
      }
    } finally {
      setDnaLoading(false)
    }
  }, [intel])

  useEffect(() => {
    const tickers = holdings.map(h => h.ticker)
    fetchDnaPerf(tickers, dnaTimeframe)
  }, [dnaTimeframe, holdings, fetchDnaPerf])

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
              {/* Bar chart */}
              <svg width="520" height={Math.max(40, ph.length * 28)} style={{ display: 'block', marginBottom: 16 }}>
                {ph.map((h, i) => {
                  const BAR_COLORS: Record<string, string> = {
                    equity: '#3b82f6', fixed_income: '#22c55e', fx: '#eab308',
                    commodities: '#f97316', private_equity: '#a855f7', philanthropy: '#ec4899',
                    thematic: '#06b6d4', cash: '#94a3b8',
                  }
                  const barW = Math.round((h.pct / 100) * 380)
                  const y = i * 28
                  return (
                    <g key={h.id}>
                      <text x={0} y={y + 14} style={{ fontSize: 10, fontFamily: 'monospace', dominantBaseline: 'middle' }}>{h.ticker}</text>
                      <rect x={52} y={y + 4} width={barW} height={18} fill={BAR_COLORS[h.category] ?? '#94a3b8'} rx={3} />
                      <text x={52 + barW + 5} y={y + 14} style={{ fontSize: 10, fontFamily: 'sans-serif', dominantBaseline: 'middle' }}>{h.pct.toFixed(1)}%</text>
                    </g>
                  )
                })}
              </svg>
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
              <h2 style={{ fontSize: 14, marginBottom: 8 }}>Projected Annual Returns &amp; Risk Metrics</h2>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 20 }}>
                <thead><tr style={{ borderBottom: '1px solid #ccc' }}>
                  <th style={{ textAlign: 'left', padding: '4px 8px' }}>Metric</th>
                  <th style={{ textAlign: 'right', padding: '4px 8px' }}>Value</th>
                  <th style={{ textAlign: 'left', padding: '4px 8px', color: '#666' }}>Notes</th>
                </tr></thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #eee' }}><td style={{ padding: '4px 8px' }}>Manager Projection</td><td style={{ padding: '4px 8px', fontWeight: 'bold', textAlign: 'right' }}>{pp.managerBlended >= 0 ? '+' : ''}{pp.managerBlended.toFixed(1)}% p.a.</td><td style={{ padding: '4px 8px', color: '#666', fontSize: 10 }}>Weighted avg of manager-inputted expected returns</td></tr>
                  <tr style={{ borderBottom: '1px solid #eee' }}><td style={{ padding: '4px 8px' }}>Market-Driven (Live Data)</td><td style={{ padding: '4px 8px', fontWeight: 'bold', textAlign: 'right' }}>{pp.aceBlended >= 0 ? '+' : ''}{pp.aceBlended.toFixed(1)}% p.a.</td><td style={{ padding: '4px 8px', color: '#666', fontSize: 10 }}>Live YTD annualised × regime multiplier</td></tr>
                  <tr style={{ borderBottom: '1px solid #eee' }}><td style={{ padding: '4px 8px' }}>Conservative Benchmark</td><td style={{ padding: '4px 8px', fontWeight: 'bold', textAlign: 'right' }}>{pp.conservativeBlended >= 0 ? '+' : ''}{pp.conservativeBlended.toFixed(1)}% p.a.</td><td style={{ padding: '4px 8px', color: '#666', fontSize: 10 }}>Long-run asset class averages</td></tr>
                  <tr style={{ borderBottom: '1px solid #eee' }}><td style={{ padding: '4px 8px' }}>Bear Case (−50% base)</td><td style={{ padding: '4px 8px', fontWeight: 'bold', textAlign: 'right' }}>{(pp.aceBlended * 0.5) >= 0 ? '+' : ''}{(pp.aceBlended * 0.5).toFixed(1)}% p.a.</td><td style={{ padding: '4px 8px', color: '#666', fontSize: 10 }}>Live data base compressed by 50%</td></tr>
                  <tr style={{ borderBottom: '1px solid #eee' }}><td style={{ padding: '4px 8px' }}>Bull Case (×1.6 base)</td><td style={{ padding: '4px 8px', fontWeight: 'bold', textAlign: 'right' }}>{(pp.aceBlended * 1.6) >= 0 ? '+' : ''}{(pp.aceBlended * 1.6).toFixed(1)}% p.a.</td><td style={{ padding: '4px 8px', color: '#666', fontSize: 10 }}>Live data base ×1.6</td></tr>
                  <tr style={{ borderBottom: '1px solid #eee', background: '#fafafa' }}><td style={{ padding: '4px 8px', fontWeight: 'bold' }}>Portfolio Volatility (σ)</td><td style={{ padding: '4px 8px', fontWeight: 'bold', textAlign: 'right' }}>{pp.portfolioVol.toFixed(1)}%</td><td style={{ padding: '4px 8px', color: '#666', fontSize: 10 }}>Weighted-avg annualised σ (upper bound — no cross-correlations)</td></tr>
                  <tr style={{ borderBottom: '1px solid #eee', background: '#fafafa' }}><td style={{ padding: '4px 8px', fontWeight: 'bold' }}>Sharpe Ratio (Market-Driven)</td><td style={{ padding: '4px 8px', fontWeight: 'bold', textAlign: 'right' }}>{pp.sharpeAce.toFixed(2)}</td><td style={{ padding: '4px 8px', color: '#666', fontSize: 10 }}>(AceEconomy − {RISK_FREE_RATE}% RFR) ÷ σ · &gt;1 strong · 0.5–1 acceptable</td></tr>
                  <tr style={{ borderBottom: '1px solid #eee', background: '#fafafa' }}><td style={{ padding: '4px 8px', fontWeight: 'bold' }}>Sharpe Ratio (Manager est.)</td><td style={{ padding: '4px 8px', fontWeight: 'bold', textAlign: 'right' }}>{pp.sharpeManager.toFixed(2)}</td><td style={{ padding: '4px 8px', color: '#666', fontSize: 10 }}>(Manager est. − {RISK_FREE_RATE}% RFR) ÷ σ</td></tr>
                </tbody>
              </table>
              {pp.riskFlags.length > 0 && <>
                <h2 style={{ fontSize: 14, marginBottom: 8 }}>Risk Considerations</h2>
                <ul style={{ fontSize: 12, paddingLeft: 20, marginBottom: 20 }}>{pp.riskFlags.map((f, i) => <li key={i} style={{ marginBottom: 4 }}>{f.message}</li>)}</ul>
              </>}
              <h2 style={{ fontSize: 14, marginBottom: 8 }}>Projection Basis</h2>
              <p style={{ fontSize: 11 }}><strong>Manager Projection:</strong> Weighted average of manager-inputted expected returns per position.</p>
              <p style={{ fontSize: 11 }}><strong>Market-Driven (Live Data):</strong> Where live YTD data is available (via AceEconomy VPS), returns are annualised and adjusted by regime multiplier ({intel?.regime ?? 'UNKNOWN'}, ×{regimeMult(intel?.regime ?? 'UNKNOWN').toFixed(1)}). Where live data is unavailable, long-run benchmark assumptions are used.</p>
              <p style={{ fontSize: 11 }}><strong>Conservative Benchmark:</strong> Long-run asset class averages — Equity 7% (MSCI World 20yr), Fixed Income 3.5% (Bloomberg Agg 20yr), Commodities 4% (Bloomberg Commodity 20yr), Private Equity 10% (Cambridge Associates), FX 0%.</p>
              <p style={{ fontSize: 11, color: '#666', marginTop: 20, borderTop: '1px solid #ccc', paddingTop: 12 }}>
                <strong>Disclaimer:</strong> This portfolio allocation is generated for illustrative and discussion purposes only. It does not constitute financial advice, an investment recommendation, or a solicitation to buy or sell any security. Past performance and historical benchmark returns are not indicative of future results. All projections involve significant uncertainty. Investors should conduct their own due diligence and consult a licensed financial adviser before making any investment decisions. Market conditions as of {new Date().toLocaleDateString('en-SG')}.
              </p>
            </div>
          )
        })()}
      </div>

      {/* Screen UI */}
      <div className={`min-h-screen transition-colors duration-300 ${bgLight ? 'bg-slate-100 text-slate-900' : 'bg-[#0A0E1A] text-white'}`}>
        <nav className={`border-b px-4 py-3 flex items-center gap-3 sticky top-0 backdrop-blur z-10 transition-colors ${bgLight ? 'border-slate-300 bg-slate-100/95 text-slate-700' : 'border-white/10 bg-[#0A0E1A]/95 text-white'}`}>
          <Link href="/citizen/dashboard/financial" className={`text-sm ${bgLight ? 'text-slate-500 hover:text-slate-800' : 'text-slate-500 hover:text-white'}`}>← Financial District</Link>
          <span className={bgLight ? 'text-slate-300' : 'text-white/20'}>/</span>
          <span className={`text-sm font-semibold ${bgLight ? 'text-slate-900' : 'text-white'}`}>Build PortfolioPlus</span>
          <span className="ml-auto text-[10px] text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">Trial — open to all Citizens</span>
          <button type="button" onClick={() => applyTheme(!bgLight)}
            title="Toggle light / dark background"
            className={`text-[11px] border rounded-lg px-2.5 py-1 transition ml-2 ${bgLight ? 'border-slate-300 text-slate-600 hover:text-slate-900' : 'border-white/20 text-slate-400 hover:text-white'}`}>
            {bgLight ? '🌙 Dark' : '☀ Light'}
          </button>
        </nav>

        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          <div>
            <h1 className={`text-xl font-bold ${bgLight ? 'text-slate-900' : 'text-white'}`}>Build PortfolioPlus</h1>
            <p className={`text-[11px] mt-1 ${bgLight ? 'text-slate-500' : 'text-slate-500'}`}>Build, compare and share asset allocations with projected returns grounded in live AceEconomy market data.</p>
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

          {/* Save / Load session bar */}
          <div className="flex items-center gap-2">
            <button onClick={saveSession}
              className="text-[10px] px-3 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 transition">
              💾 Save Session
            </button>
            {Object.keys(savedSessions).length > 0 && (
              <div className="relative group">
                <button className="text-[10px] px-3 py-1.5 rounded-lg border border-white/15 text-slate-400 hover:text-white transition">
                  📂 Load ({Object.keys(savedSessions).length})
                </button>
                <div className="absolute left-0 top-full mt-1 z-20 hidden group-hover:block bg-[#0f1628] border border-white/15 rounded-xl shadow-xl min-w-[200px] py-1">
                  {Object.keys(savedSessions).map(k => (
                    <div key={k} className="flex items-center gap-2 px-3 py-2 hover:bg-white/5">
                      <button onClick={() => loadSession(k)} className="flex-1 text-left text-[10px] text-white">{k}</button>
                      <button onClick={() => deleteSession(k)} className="text-[9px] text-red-500 hover:text-red-400 shrink-0">✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {saveMsg && <span className="text-[10px] text-green-400">{saveMsg}</span>}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-white/5 rounded-lg p-1">
            {([['build', '📐 Build PortfolioPlus'], ['client', '⚖️ Balanced Profile'], ['dna', '🧬 PortDNA'], ['compare', '⚖️ Compare & Share']] as const).map(([t, label]) => (
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
                <div>
                  <button type="button" onClick={() => setCustomOpen(o => !o)}
                    className="text-[10px] text-red-400 cursor-pointer hover:text-red-300 flex items-center gap-1">
                    <span className={`transition-transform inline-block ${customOpen ? 'rotate-90' : ''}`}>▶</span>
                    Add custom / unlisted asset
                  </button>
                  {customOpen && (
                    <div className="mt-2 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input value={customTicker} onChange={e => setCustomTicker(e.target.value.toUpperCase())} placeholder="Ticker / code"
                          className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500/50 font-mono uppercase" />
                        <input value={customName} onChange={e => setCustomName(e.target.value)} placeholder="Asset name"
                          className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500/50" />
                        <select value={customCat} onChange={e => setCustomCat(e.target.value)}
                          className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none">
                          {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                        <button onClick={addCustom}
                          disabled={!customTicker.trim() || !customName.trim()}
                          className="bg-cyan-500/15 hover:bg-cyan-500/30 border border-cyan-500/30 rounded-lg px-3 py-1.5 text-xs text-cyan-300 transition disabled:opacity-40">
                          + Add &amp; Save to List
                        </button>
                      </div>
                      <p className="text-[9px] text-slate-700">Custom assets use benchmark return assumptions — no live data available. Added immediately to portfolio.</p>
                    </div>
                  )}
                </div>
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
                          {h.isCustom && <span className="text-[9px] text-amber-500 border border-amber-500/30 px-1 rounded">custom</span>}
                          <button onClick={() => removeHolding(h.id)} className="text-slate-700 hover:text-red-400 transition ml-1">✕</button>
                        </div>

                        {/* Live price performance strip */}
                        {live ? (
                          <div className="grid grid-cols-4 gap-1 text-center text-[9px]">
                            {[
                              { label: '1D', val: live.chg_1d },
                              { label: '5D', val: live.chg_5d },
                              { label: '1M', val: live.chg_1m },
                              { label: 'YTD', val: live.chg_ytd },
                            ].map(({ label, val }) => (
                              <div key={label} className="rounded border border-white/8 bg-white/3 px-1 py-1">
                                <div className="text-slate-600">{label}</div>
                                <div className={`font-mono font-bold ${val >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  {val >= 0 ? '+' : ''}{val.toFixed(1)}%
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[9px] text-slate-700 italic">No live price data — using benchmark assumptions</div>
                        )}

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
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-semibold text-white">Projected Portfolio Returns</div>
                        <details className="relative group">
                          <summary className="text-[9px] text-slate-600 hover:text-slate-400 cursor-pointer list-none">▶ What do these mean?</summary>
                          <div className="absolute right-0 top-5 z-20 w-72 rounded-xl border border-white/10 bg-[#0d1220] p-3.5 shadow-xl text-[9px] text-slate-400 space-y-2 leading-relaxed">
                            <p><strong className="text-purple-300">Manager Projection</strong> — the weighted average of the expected-return % you entered per position. Reflects your own view of each holding.</p>
                            <p><strong className="text-green-400">Live Performance</strong> — uses live YTD price data from the AceEconomy VPS feed, annualised over {new Date().getMonth() + 1} months, then adjusted by the current market regime multiplier. Falls back to long-run benchmarks for tickers without live data.</p>
                            <p><strong className="text-slate-300">Conservative Benchmark</strong> — long-run historical averages per asset class (Equity 7%, Bonds 3.5%, Commodities 4%, PE 10%, Cash 4%, FX 0%).</p>
                            <p><strong className="text-amber-300">Volatility (σ)</strong> — weighted-average annualised standard deviation by asset class. This is an <em>upper bound</em> — actual portfolio vol is lower because diversification across uncorrelated assets reduces risk.</p>
                            <p><strong className="text-yellow-300">Sharpe Ratio</strong> — (return − 4.3% risk-free rate) ÷ volatility. Measures return per unit of risk. Above 1 = strong, 0.5–1 = acceptable, below 0.5 = the return doesn&apos;t adequately compensate for the risk taken.</p>
                          </div>
                        </details>
                      </div>
                      <div className="flex gap-3">
                        <ProjCard label="Manager Projection" ret={proj.managerBlended} color="text-purple-300"
                          desc="Weighted avg of your per-position expected returns" />
                        <ProjCard label="Live Performance" ret={proj.aceBlended} color={proj.aceBlended >= 0 ? 'text-green-400' : 'text-red-400'}
                          desc={`Live YTD annualised × regime multiplier (${intel?.regime ?? '?'}, ×${regimeMult(intel?.regime ?? '').toFixed(1)})`} />
                        <ProjCard label="Conservative Benchmark" ret={proj.conservativeBlended} color="text-slate-300"
                          desc="Long-run asset class averages (MSCI World, Bloomberg Agg, etc.)" />
                      </div>

                      {/* Vol + Sharpe */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-amber-500/15 bg-amber-500/5 p-3 text-center">
                          <div className="text-[9px] font-mono text-slate-500 uppercase tracking-wider mb-1">Portfolio Volatility (σ)</div>
                          <div className="text-xl font-bold font-mono text-amber-300">{proj.portfolioVol.toFixed(1)}%</div>
                          <div className="text-[9px] text-slate-600 mt-1">weighted-avg ann. est. (upper bound)</div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/3 p-3 text-center">
                          <div className="text-[9px] font-mono text-slate-500 uppercase tracking-wider mb-1">Sharpe Ratio (Market-Driven)</div>
                          <div className={`text-xl font-bold font-mono ${proj.sharpeAce >= 1 ? 'text-green-400' : proj.sharpeAce >= 0.5 ? 'text-yellow-300' : proj.sharpeAce >= 0 ? 'text-amber-400' : 'text-red-400'}`}>
                            {proj.sharpeAce.toFixed(2)}
                          </div>
                          <div className="text-[9px] text-slate-600 mt-1">
                            {proj.sharpeAce >= 1 ? '✓ Strong risk-adjusted return' : proj.sharpeAce >= 0.5 ? 'Acceptable' : proj.sharpeAce >= 0 ? 'Weak — return barely covers risk' : 'Return below risk-free rate'}
                          </div>
                        </div>
                      </div>

                      {/* Risk flags */}
                      {proj.riskFlags.length > 0 && (
                        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="text-[10px] font-mono text-amber-400 uppercase tracking-wider">
                              {proj.riskFlags.length} Risk Consideration{proj.riskFlags.length > 1 ? 's' : ''} Detected
                            </div>
                            <button onClick={() => setTab('compare')} className="text-[9px] text-cyan-400 hover:underline">→ See full comparison</button>
                          </div>
                          {proj.riskFlags.map((f, i) => (
                            <div key={i} className="flex items-start gap-2 text-[11px] text-slate-300">
                              <span className={f.level === 'warn' ? 'text-red-400' : 'text-amber-400'}>
                                {f.level === 'warn' ? '⚠' : '◈'}
                              </span>
                              <div>
                                <div>{f.message}</div>
                                <div className="text-[9px] text-slate-600 mt-0.5">
                                  {f.message.includes('Concentration') || f.message.includes('equity') ? 'Review allocation weights above — consider spreading across more asset classes.' :
                                   f.message.includes('TLT') ? 'Reduce TLT weighting or pair with short-duration bonds to balance interest-rate risk.' :
                                   f.message.includes('VIX') ? 'High VIX increases short-term volatility. Consider adding fixed income or cash as a buffer.' :
                                   f.message.includes('FX') ? 'Consider hedging currency exposure or reducing FX allocation.' :
                                   f.message.includes('regime') || f.message.includes('Bear') ? 'AceEconomy has applied a regime discount. Check the PortDNA tab for per-holding drawdown risk.' :
                                   f.message.includes('breadth') ? 'Narrow market breadth suggests the rally is not broadly supported — concentration risk is higher.' :
                                   'Review your portfolio allocation and consider rebalancing.'}
                                </div>
                              </div>
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
                            <div className="text-slate-400 font-semibold mb-2">Per-position Live Performance Basis</div>
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

              {/* How assets are selected */}
              <details className="rounded-xl border border-white/10 bg-white/3">
                <summary className="px-4 py-3 text-xs font-semibold text-white cursor-pointer list-none flex items-center justify-between hover:bg-white/3 rounded-xl transition">
                  <span>ℹ How are Balanced Portfolio assets selected?</span>
                  <span className="text-slate-600 text-[10px]">▶ expand</span>
                </summary>
                <div className="px-4 pb-4 pt-1 space-y-3 text-[10px] text-slate-400 leading-relaxed">
                  <p><strong className="text-slate-300">Step 1 — Risk-to-allocation framework.</strong> Your risk score (1–5) maps to a starting allocation across 8 asset classes. Conservative (1–2): mostly cash + bonds + low-equity. Moderate (3): balanced equity/bonds. Aggressive (4–5): equity + thematic heavy, minimal cash.</p>
                  <p><strong className="text-slate-300">Step 2 — Target-return nudge.</strong> The algorithm compares the starting framework&apos;s conservative benchmark return against your target return. If the gap is &gt;0.5%, equity and fixed-income weights are nudged — more equity for higher targets, more bonds for lower. Capped at ±15% adjustment per category to avoid extreme concentration.</p>
                  <p><strong className="text-slate-300">Step 3 — Asset proxy mapping.</strong> Each resulting category weight is mapped to a representative ETF from the catalog (e.g. Equity → SPY, Bonds → TLT, Gold → GLD). This is a starting point — you can replace any proxy with any specific asset from the catalog or add unlisted assets in the Build PortfolioPlus tab.</p>
                  <p><strong className="text-slate-300">Dynamic adjustments.</strong> The allocation is recalculated each time you change the risk score or target return. If you manually adjust sliders after generating, those overrides persist until you click &ldquo;Generate&rdquo; again. There is no automatic rebalancing — all changes are intentional and yours to control.</p>
                  <p><strong className="text-slate-300">What it does NOT do.</strong> It does not use live market prices or AI signals to select assets — it uses a deterministic framework based on your inputs. For signal-driven selection, use the Watchlist Signals page to identify candidates, then add them manually in Build PortfolioPlus.</p>
                  <p className="text-slate-600 border-t border-white/5 pt-2">Balanced Profile is a starting framework for structured client conversations — not a financial plan. Always validate with the client&apos;s full circumstances and consult a licensed adviser before implementing.</p>
                </div>
              </details>

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
                      <div className="flex items-center justify-between">
                        <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Portfolio Projections</div>
                        <details className="relative group">
                          <summary className="text-[9px] text-slate-600 hover:text-slate-400 cursor-pointer list-none">▶ What do these mean?</summary>
                          <div className="absolute right-0 top-5 z-20 w-72 rounded-xl border border-white/10 bg-[#0d1220] p-3.5 shadow-xl text-[9px] text-slate-400 space-y-2 leading-relaxed">
                            <p><strong className="text-slate-300">Conservative Benchmark</strong> — long-run asset class averages independent of current market conditions. A realistic floor for what a diversified portfolio might return over time.</p>
                            <p><strong className="text-green-400">Live Performance</strong> — live YTD returns from AceEconomy, annualised over {new Date().getMonth() + 1} months and adjusted for the current market regime (×{regimeMult(intel?.regime ?? '').toFixed(1)}). More responsive to current momentum than the conservative benchmark.</p>
                            <p><strong className="text-amber-300">Volatility (σ)</strong> — weighted-average annualised std dev by asset class. Upper bound — actual portfolio vol is lower due to diversification. Lower σ = smoother ride for the client.</p>
                            <p><strong className="text-yellow-300">Sharpe Ratio</strong> — return per unit of risk. Above 1 is considered strong. Below 0.5 means the client is not being adequately rewarded for the volatility they&apos;re taking on — consider rebalancing toward higher-quality or lower-vol assets.</p>
                          </div>
                        </details>
                      </div>
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
                          <div className="text-[9px] font-mono text-slate-500 uppercase tracking-wider mb-1">Live Performance</div>
                          <div className={`text-xl font-bold font-mono ${cProj.aceBlended >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {cProj.aceBlended >= 0 ? '+' : ''}{cProj.aceBlended.toFixed(1)}%
                          </div>
                          <div className="text-[9px] text-slate-600 mt-1">est. annual return</div>
                          <div className="text-[9px] text-slate-600 mt-2 leading-snug text-left">
                            Live YTD data from AceEconomy VPS. Regime: {intel?.regime ?? '—'} ×{regimeMult(intel?.regime ?? '').toFixed(1)}.
                          </div>
                        </div>
                      </div>

                      {/* Vol + Sharpe for client portfolio */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-amber-500/15 bg-amber-500/5 p-3 text-center">
                          <div className="text-[9px] font-mono text-slate-500 uppercase tracking-wider mb-1">Portfolio Volatility (σ)</div>
                          <div className="text-xl font-bold font-mono text-amber-300">{cProj.portfolioVol.toFixed(1)}%</div>
                          <div className="text-[9px] text-slate-600 mt-1">weighted-avg ann. est. (upper bound)</div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/3 p-3 text-center">
                          <div className="text-[9px] font-mono text-slate-500 uppercase tracking-wider mb-1">Sharpe Ratio (Market-Driven)</div>
                          <div className={`text-xl font-bold font-mono ${cProj.sharpeAce >= 1 ? 'text-green-400' : cProj.sharpeAce >= 0.5 ? 'text-yellow-300' : cProj.sharpeAce >= 0 ? 'text-amber-400' : 'text-red-400'}`}>
                            {cProj.sharpeAce.toFixed(2)}
                          </div>
                          <div className="text-[9px] text-slate-600 mt-1">
                            {cProj.sharpeAce >= 1 ? '✓ Strong risk-adjusted return' : cProj.sharpeAce >= 0.5 ? 'Acceptable' : cProj.sharpeAce >= 0 ? 'Weak — return barely covers risk' : 'Return below risk-free rate'}
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
                        <div className="flex items-center justify-between">
                          <div className="text-[10px] font-mono text-amber-400 uppercase tracking-wider">
                            {cProj.riskFlags.length} Risk Note{cProj.riskFlags.length > 1 ? 's' : ''}
                          </div>
                          <button onClick={() => setTab('compare')} className="text-[9px] text-cyan-400 hover:underline">→ Compare & Share for full detail</button>
                        </div>
                        {cProj.riskFlags.map((f, i) => (
                          <div key={i} className="text-[11px] text-slate-300 flex items-start gap-2">
                            <span className={f.level === 'warn' ? 'text-red-400' : 'text-amber-400'}>{f.level === 'warn' ? '⚠' : '◈'}</span>
                            <div>
                              <div>{f.message}</div>
                              <div className="text-[9px] text-slate-600 mt-0.5">
                                {f.message.includes('Concentration') || f.message.includes('equity') ? 'Review the allocation mix — consider adding bonds or alternatives to lower concentration.' :
                                 f.message.includes('TLT') ? 'Large TLT position carries interest-rate sensitivity — consider shorter-duration fixed income.' :
                                 f.message.includes('VIX') ? 'High VIX = elevated short-term volatility. A cash or bond buffer may smooth drawdowns.' :
                                 f.message.includes('FX') ? 'Currency exposure is unhedged — consider reducing FX weighting for risk-averse clients.' :
                                 f.message.includes('regime') || f.message.includes('Bear') ? 'Regime discount applied — switch to PortDNA tab to see per-holding historical drawdowns.' :
                                 f.message.includes('breadth') ? 'Narrow rally — higher risk of reversal. Wider diversification helps.' :
                                 'Adjust the client allocation and re-check projections.'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          )}

          {/* ── TAB 4: COMPARE & SHARE ── */}
          {tab === 'compare' && (
            <div className="space-y-6">
              {(holdings.length === 0 || clientHoldings.length === 0) && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-[11px] text-amber-300">
                  Complete both the Build Portfolio and Client Profile tabs first to compare.
                </div>
              )}

              {holdings.length > 0 && clientHoldings.length > 0 && (() => {
                const mTotal2 = totalPct(holdings) || 1
                const cTotal2 = totalPct(clientHoldings) || 1
                const allCats = Array.from(new Set([
                  ...holdings.map(h => h.category),
                  ...clientHoldings.map(h => h.category),
                ]))
                const catData = allCats.map(cat => {
                  const mPct = holdings.filter(h => h.category === cat).reduce((s, h) => s + (h.pct / mTotal2) * 100, 0)
                  const cPct = clientHoldings.filter(h => h.category === cat).reduce((s, h) => s + (h.pct / cTotal2) * 100, 0)
                  return { cat, mPct, cPct, delta: cPct - mPct }
                }).sort((a, b) => b.mPct - a.mPct)

                const ROW_H = 32
                const SVG_W = 520
                const SVG_H = catData.length * ROW_H + 48
                const LABEL_W = 80
                const BAR_AREA = SVG_W - LABEL_W - 60
                const CAT_COLORS: Record<string, string> = {
                  equity:'#3b82f6', fixed_income:'#10b981', fx:'#f59e0b',
                  commodities:'#f97316', private_equity:'#a855f7',
                  philanthropy:'#ec4899', thematic:'#06b6d4', cash:'#64748b',
                }
                const CAT_SHORT: Record<string, string> = {
                  equity:'Equity', fixed_income:'Bonds', fx:'FX',
                  commodities:'Commod.', private_equity:'PE', philanthropy:'Impact',
                  thematic:'Thematic', cash:'Cash',
                }

                return (
                  <>
                    {/* SVG Allocation Complement Chart */}
                    <div className="rounded-xl border border-white/10 bg-white/3 p-4 space-y-2">
                      <div className="text-xs font-semibold text-white">How the Two Portfolios Complement Each Other</div>
                      <p className="text-[10px] text-slate-500 leading-relaxed">
                        PortfolioPlus (manager-constructed, active strategy) is shown on the left. Balanced Portfolio (risk-profile driven, systematic) on the right. Where they diverge by asset class, one covers the other&apos;s gaps — together they create broader diversification than either alone.
                      </p>
                      <div className="flex items-center gap-4 text-[9px] text-slate-500">
                        <span className="flex items-center gap-1"><span className="inline-block w-6 h-2 rounded" style={{ background: '#818cf8' }} /> PortfolioPlus</span>
                        <span className="flex items-center gap-1"><span className="inline-block w-6 h-2 rounded" style={{ background: '#22d3ee' }} /> Balanced Portfolio ({clientProfile.name || 'Risk-Adjusted'})</span>
                      </div>
                      <svg width={SVG_W} height={SVG_H} viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full overflow-visible">
                        {/* Header labels */}
                        <text x={LABEL_W} y={14} fill="#818cf8" fontSize={8} fontFamily="monospace">PortfolioPlus</text>
                        <text x={LABEL_W + BAR_AREA / 2} y={14} textAnchor="middle" fill="#475569" fontSize={8} fontFamily="monospace">0%</text>
                        <text x={LABEL_W + BAR_AREA} y={14} textAnchor="end" fill="#22d3ee" fontSize={8} fontFamily="monospace">Balanced Portfolio</text>
                        {catData.map(({ cat, mPct, cPct }, i) => {
                          const y = i * ROW_H + 22
                          const mid = LABEL_W + BAR_AREA / 2
                          const scale = BAR_AREA / 2 / 100
                          const mW = mPct * scale
                          const cW = cPct * scale
                          const cc = CAT_COLORS[cat] ?? '#64748b'
                          return (
                            <g key={cat}>
                              {/* category label */}
                              <text x={LABEL_W - 6} y={y + 10} textAnchor="end" fill="#94a3b8" fontSize={9} fontFamily="monospace">
                                {CAT_SHORT[cat] ?? cat}
                              </text>
                              {/* PortfolioPlus bar — grows left from centre */}
                              <rect x={mid - mW} y={y} width={mW} height={12} rx={2} fill="#818cf8" fillOpacity={0.7} />
                              {/* Balanced Portfolio bar — grows right from centre */}
                              <rect x={mid} y={y} width={cW} height={12} rx={2} fill={cc} fillOpacity={0.55} />
                              {/* Category dot */}
                              <circle cx={mid} cy={y + 6} r={3} fill={cc} />
                              {/* Percentage labels */}
                              {mPct > 2 && <text x={mid - mW - 3} y={y + 9} textAnchor="end" fill="#818cf8" fontSize={7} fontFamily="monospace">{mPct.toFixed(0)}%</text>}
                              {cPct > 2 && <text x={mid + cW + 3} y={y + 9} fill="#22d3ee" fontSize={7} fontFamily="monospace">{cPct.toFixed(0)}%</text>}
                            </g>
                          )
                        })}
                        {/* Centre line */}
                        <line x1={LABEL_W + BAR_AREA / 2} y1={18} x2={LABEL_W + BAR_AREA / 2} y2={SVG_H - 4}
                          stroke="rgba(255,255,255,0.08)" strokeWidth={1} strokeDasharray="3 3" />
                      </svg>
                    </div>

                    {/* Bear / Base / Bull scenario comparison table */}
                    <div className="rounded-xl border border-white/10 bg-white/3 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-semibold text-white">Projected Return Scenarios</div>
                        <details className="relative group">
                          <summary className="text-[9px] text-slate-600 hover:text-slate-400 cursor-pointer list-none">▶ Glossary</summary>
                          <div className="absolute right-0 top-5 z-20 w-80 rounded-xl border border-white/10 bg-[#0d1220] p-3.5 shadow-xl text-[9px] text-slate-400 space-y-2 leading-relaxed">
                            <p><strong className="text-purple-300">Manager estimate</strong> — the weighted average of expected-return % you set per position in the Build Portfolio tab. Pure manager judgement.</p>
                            <p><strong className="text-green-400">AceEconomy (live)</strong> — live YTD price performance for each holding from the AceEconomy VPS, annualised over {new Date().getMonth() + 1} months, then multiplied by a regime factor (×{regimeMult(intel?.regime ?? '').toFixed(2)} for {intel?.regime ?? '?'}). Reflects current market momentum rather than historical averages.</p>
                            <p><strong className="text-slate-300">Conservative benchmark</strong> — long-run historical averages by asset class (Equity 7%, Bonds 3.5%, PE 10%, Commodities 4%, Cash 4%, FX 0%). A realistic floor; ignores current momentum.</p>
                            <p><strong className="text-red-400">Bear case (−50% base)</strong> — the AceEconomy base estimate compressed by 50%. Models a scenario where momentum stalls and markets underperform trend — e.g. a slowing economy, earnings disappointments, or tightening financial conditions. Not a crash scenario; just a return drag.</p>
                            <p><strong className="text-cyan-300">Bull case (×1.6 base)</strong> — the AceEconomy base multiplied by 1.6. Models a strong outperformance scenario — broad economic expansion, earnings beats, falling rates, or a risk-on market environment.</p>
                            <p><strong className="text-amber-300">Volatility (σ)</strong> — weighted-average annualised std dev by asset class. Upper bound; actual portfolio vol is lower due to cross-asset diversification. A lower σ means smoother returns for the client.</p>
                            <p><strong className="text-yellow-300">Sharpe Ratio</strong> — (return − {RISK_FREE_RATE}% risk-free rate) ÷ σ. How much return you earn per unit of risk. Above 1 = strong. 0.5–1 = acceptable. Below 0.5 = the return does not adequately compensate for volatility. Negative = return below the risk-free rate.</p>
                            <p className="text-slate-600">All return figures are annualised estimates for discussion only. Not investment advice.</p>
                          </div>
                        </details>
                      </div>

                      {/* AceEconomy explanation */}
                      <div className="rounded-lg border border-cyan-500/15 bg-cyan-500/5 px-3 py-2 text-[10px] text-slate-400 leading-relaxed">
                        <span className="text-cyan-400 font-semibold">Why do figures sometimes converge at the same %?</span>{' '}
                        When holdings have no live AceEconomy price data (e.g. unlisted assets, FX proxies, private equity), all three estimates fall back to the same long-run benchmark (Equity 7%, Bonds 3.5%, etc.) — so Manager, AceEconomy, and Conservative temporarily align. Add more SPY/QQQ/GLD-type holdings with live data to see differentiation. Each portfolio&apos;s AceEconomy figure also reflects its own unique mix — different assets and weights naturally produce different results.
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-[11px]">
                          <thead>
                            <tr className="border-b border-white/8">
                              <th className="text-left text-slate-500 font-normal py-1.5 pr-3">Scenario</th>
                              <th className="text-right text-indigo-300 font-semibold py-1.5 px-3">PortfolioPlus</th>
                              <th className="text-right text-cyan-300 font-semibold py-1.5 px-3">Balanced Portfolio</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {(() => {
                              // SPY live YTD from AceEconomy intel feed
                              const spyLive = intel?.asset_classes?.find(a => a.ticker === 'SPY')
                              const spyYtdAnn = spyLive?.chg_ytd != null ? annualise(spyLive.chg_ytd) : null
                              const spyVol = 16.0  // SPY historical ann. vol ~15-17%
                              const spySharpe = spyYtdAnn != null ? (spyYtdAnn - RISK_FREE_RATE) / spyVol : null

                              const rows: { label: string; mVal: number; cVal: number; note: string; highlight?: boolean }[] = [
                                { label: 'Manager estimate',       mVal: proj.managerBlended,       cVal: cProj.managerBlended,       note: 'Weighted avg of manager-inputted expected returns'      },
                                { label: 'AceEconomy (live)',      mVal: proj.aceBlended,           cVal: cProj.aceBlended,           note: 'Live YTD annualised × regime multiplier per holding'    },
                                { label: 'Conservative benchmark', mVal: proj.conservativeBlended,  cVal: cProj.conservativeBlended,  note: 'Long-run asset class averages (no live data)'           },
                                { label: 'Bear case (−50% base)',  mVal: proj.aceBlended * 0.5,     cVal: cProj.aceBlended * 0.5,     note: 'Live data base compressed by 50% — return drag scenario' },
                                { label: 'Bull case (×1.6 base)',  mVal: proj.aceBlended * 1.6,     cVal: cProj.aceBlended * 1.6,     note: 'Live data base ×1.6 — strong outperformance scenario'  },
                              ]
                              return (
                                <>
                                  {rows.map(({ label, mVal, cVal, note }) => (
                                    <tr key={label} className="hover:bg-white/3 transition">
                                      <td className="py-2 pr-3">
                                        <div className="text-slate-300">{label}</div>
                                        <div className="text-[9px] text-slate-600">{note}</div>
                                      </td>
                                      <td className={`py-2 px-3 text-right font-mono font-bold ${mVal >= 0 ? 'text-indigo-300' : 'text-red-400'}`}>
                                        {mVal >= 0 ? '+' : ''}{mVal.toFixed(1)}%
                                      </td>
                                      <td className={`py-2 px-3 text-right font-mono font-bold ${cVal >= 0 ? 'text-cyan-300' : 'text-red-400'}`}>
                                        {cVal >= 0 ? '+' : ''}{cVal.toFixed(1)}%
                                      </td>
                                    </tr>
                                  ))}

                                  {/* SPY passive benchmark separator + row */}
                                  <tr><td colSpan={3} className="pt-1 pb-0"><div className="border-t border-white/8" /></td></tr>
                                  <tr className="hover:bg-white/3 transition bg-white/2">
                                    <td className="py-2 pr-3">
                                      <div className="flex items-center gap-1.5 text-slate-300">
                                        <span className="text-[9px] bg-orange-500/15 text-orange-300 px-1.5 py-0.5 rounded font-mono">SPY</span>
                                        S&amp;P 500 passive benchmark
                                        {spySharpe != null && <span className="text-[9px] text-slate-600 ml-2">Sharpe {spySharpe.toFixed(2)}</span>}
                                      </div>
                                      <div className="text-[9px] text-slate-600">
                                        {spyYtdAnn != null
                                          ? `Live YTD ${spyLive!.chg_ytd >= 0 ? '+' : ''}${spyLive!.chg_ytd.toFixed(1)}% annualised to ${spyYtdAnn.toFixed(1)}% · σ ~${spyVol}% — are both portfolios beating the index?`
                                          : 'SPY YTD data unavailable from AceEconomy feed'}
                                      </div>
                                    </td>
                                    <td className={`py-2 px-3 text-right font-mono font-bold ${spyYtdAnn != null && proj.aceBlended > (spyYtdAnn ?? 0) ? 'text-green-400' : 'text-orange-300'}`}>
                                      {spyYtdAnn != null
                                        ? <>{spyYtdAnn >= 0 ? '+' : ''}{spyYtdAnn.toFixed(1)}% <span className="text-[9px] font-normal text-slate-600">{proj.aceBlended > (spyYtdAnn ?? 0) ? '▲ ahead' : '▼ behind'}</span></>
                                        : <span className="text-slate-600">—</span>}
                                    </td>
                                    <td className={`py-2 px-3 text-right font-mono font-bold ${spyYtdAnn != null && cProj.aceBlended > (spyYtdAnn ?? 0) ? 'text-green-400' : 'text-orange-300'}`}>
                                      {spyYtdAnn != null
                                        ? <>{spyYtdAnn >= 0 ? '+' : ''}{spyYtdAnn.toFixed(1)}% <span className="text-[9px] font-normal text-slate-600">{cProj.aceBlended > (spyYtdAnn ?? 0) ? '▲ ahead' : '▼ behind'}</span></>
                                        : <span className="text-slate-600">—</span>}
                                    </td>
                                  </tr>
                                </>
                              )
                            })()}

                            {/* Separator row */}
                            <tr><td colSpan={3} className="pt-1 pb-0"><div className="border-t border-white/8" /></td></tr>

                            {/* Volatility row */}
                            <tr className="hover:bg-white/3 transition">
                              <td className="py-2 pr-3">
                                <div className="text-slate-300">Portfolio volatility (σ)</div>
                                <div className="text-[9px] text-slate-600">Weighted-avg annualised std dev by asset class · upper bound</div>
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-amber-300">{proj.portfolioVol.toFixed(1)}%</td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-amber-300">{cProj.portfolioVol.toFixed(1)}%</td>
                            </tr>

                            {/* Sharpe rows */}
                            {([
                              { label: 'Sharpe — Live Perf.',    mVal: proj.sharpeAce,          cVal: cProj.sharpeAce,          note: `(Live return − ${RISK_FREE_RATE}% RFR) ÷ σ` },
                              { label: 'Sharpe — Manager est.',  mVal: proj.sharpeManager,      cVal: cProj.sharpeManager,      note: `(Manager est. − ${RISK_FREE_RATE}% RFR) ÷ σ` },
                              { label: 'Sharpe — Conservative',  mVal: proj.sharpeConservative, cVal: cProj.sharpeConservative, note: `(Conservative − ${RISK_FREE_RATE}% RFR) ÷ σ` },
                            ] as const).map(({ label, mVal, cVal, note }) => {
                              const sharpeColor = (v: number) => v >= 1 ? 'text-green-400' : v >= 0.5 ? 'text-yellow-300' : v >= 0 ? 'text-amber-400' : 'text-red-400'
                              return (
                                <tr key={label} className="hover:bg-white/3 transition">
                                  <td className="py-2 pr-3">
                                    <div className="text-slate-300">{label}</div>
                                    <div className="text-[9px] text-slate-600">{note} · &gt;1 = strong · 0.5–1 = acceptable · &lt;0.5 = weak</div>
                                  </td>
                                  <td className={`py-2 px-3 text-right font-mono font-bold ${sharpeColor(mVal)}`}>{mVal.toFixed(2)}</td>
                                  <td className={`py-2 px-3 text-right font-mono font-bold ${sharpeColor(cVal)}`}>{cVal.toFixed(2)}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                      <p className="text-[9px] text-slate-700">Bear/Bull cases are scenario modifiers on the AceEconomy base estimate, not historical drawdown figures. Volatility is a weighted-average upper-bound estimate — true portfolio vol is lower due to diversification. Sharpe uses {RISK_FREE_RATE}% risk-free rate (US 10-yr indicative). For worst-case drawdown by asset, see PortDNA.</p>
                    </div>

                    {/* Side-by-side detail cards */}
                    <div className="grid grid-cols-2 gap-3">
                      {([
                        { label: 'PortfolioPlus', holdings: holdings, proj, side: 'manager' as const },
                        { label: `Balanced Portfolio${clientProfile.name ? ` — ${clientProfile.name}` : ''}`, holdings: clientHoldings, proj: cProj, side: 'client' as const },
                      ]).map(({ label, holdings: h, proj: p, side }) => (
                        <div key={side} className={`rounded-xl border p-4 space-y-3 ${confirmed === side ? 'border-cyan-500/50 bg-cyan-500/5' : 'border-white/10 bg-white/3'}`}>
                          <div className="text-xs font-semibold text-white">{label}</div>
                          <div className="space-y-1.5 max-h-40 overflow-y-auto">
                            {h.map(x => (
                              <div key={x.id} className="flex items-center justify-between text-[10px]">
                                <span className="font-mono text-slate-300">{x.ticker}</span>
                                <div className="flex items-center gap-1.5">
                                  <div className="w-12 bg-white/8 rounded-full h-1">
                                    <div className="h-1 rounded-full bg-cyan-500" style={{ width: `${Math.min(x.pct, 100)}%` }} />
                                  </div>
                                  <span className="font-mono text-white font-bold w-7 text-right">{x.pct.toFixed(0)}%</span>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="border-t border-white/8 pt-2 space-y-1 text-[10px]">
                            <div className="flex justify-between"><span className="text-slate-500">Manager est.</span><span className="text-purple-300 font-mono">{p.managerBlended >= 0 ? '+' : ''}{p.managerBlended.toFixed(1)}%</span></div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">AceEconomy <span className="text-slate-700">(this portfolio)</span></span>
                              <span className={`font-mono ${p.aceBlended >= 0 ? 'text-green-400' : 'text-red-400'}`}>{p.aceBlended >= 0 ? '+' : ''}{p.aceBlended.toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between"><span className="text-slate-500">Conservative</span><span className="text-slate-300 font-mono">{p.conservativeBlended >= 0 ? '+' : ''}{p.conservativeBlended.toFixed(1)}%</span></div>
                            <div className="flex justify-between border-t border-white/5 pt-1"><span className="text-slate-500">Volatility (σ)</span><span className="text-amber-300 font-mono">{p.portfolioVol.toFixed(1)}%</span></div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Sharpe (AceEconomy)</span>
                              <span className={`font-mono font-bold ${p.sharpeAce >= 1 ? 'text-green-400' : p.sharpeAce >= 0.5 ? 'text-yellow-300' : p.sharpeAce >= 0 ? 'text-amber-400' : 'text-red-400'}`}>
                                {p.sharpeAce.toFixed(2)}
                              </span>
                            </div>
                          </div>
                          {p.riskFlags.length > 0 && (
                            <details className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2">
                              <summary className="text-[9px] text-amber-400 cursor-pointer list-none flex items-center justify-between">
                                <span>⚠ {p.riskFlags.length} risk flag{p.riskFlags.length > 1 ? 's' : ''}</span>
                                <span className="text-slate-600">▶ expand</span>
                              </summary>
                              <div className="mt-2 space-y-1.5">
                                {p.riskFlags.map((f, i) => (
                                  <div key={i} className="text-[9px] text-slate-400 flex items-start gap-1.5">
                                    <span className={f.level === 'warn' ? 'text-red-400 shrink-0' : 'text-amber-400 shrink-0'}>{f.level === 'warn' ? '⚠' : '◈'}</span>
                                    <div>
                                      <div className="text-slate-300">{f.message}</div>
                                      <div className="text-slate-600 mt-0.5">
                                        {f.message.includes('Concentration') || f.message.includes('equity') ? <>Adjust weights in <button onClick={() => setTab(side === 'manager' ? 'build' : 'client')} className="text-cyan-400 underline">{side === 'manager' ? 'Build Portfolio' : 'Client Profile'}</button> tab.</> :
                                         f.message.includes('TLT') ? 'Reduce TLT or add shorter-duration bonds.' :
                                         f.message.includes('VIX') ? 'Consider adding cash/bonds as a volatility buffer.' :
                                         f.message.includes('FX') ? 'Consider hedging or reducing FX exposure.' :
                                         f.message.includes('breadth') ? 'Narrow market rally — diversify further.' :
                                         f.message.includes('regime') || f.message.includes('Bear') ? <><button onClick={() => setTab('dna')} className="text-cyan-400 underline">PortDNA tab</button> shows per-holding drawdown risk.</> :
                                         'Review allocation and rebalance.'}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </details>
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
                              QR code is <strong className="text-cyan-300">live</strong> — it encodes a unique URL on this platform.
                              When scanned, clients see a read-only view of their confirmed portfolio allocation — no login required.
                              Works instantly on any Vercel deployment.
                            </p>
                            {qrUrl && (() => {
                              const ph = confirmed === 'manager' ? holdings : clientHoldings
                              const label = confirmed === 'manager' ? 'Manager Portfolio' : `${clientProfile.name || 'Client'} Risk-Adjusted Portfolio`
                              const payload = { label, date: new Date().toLocaleDateString('en-SG'), holdings: ph.map(x => ({ ticker: x.ticker, name: x.name, pct: x.pct })) }
                              const base64 = typeof window !== 'undefined' ? btoa(JSON.stringify(payload)) : ''
                              const url = typeof window !== 'undefined' ? `${window.location.origin}/portfolio-view?d=${base64}` : ''
                              return url ? (
                                <p className="text-[9px] text-slate-600 break-all leading-snug">
                                  <span className="text-slate-500">Link: </span>{url.slice(0, 80)}{url.length > 80 ? '…' : ''}
                                </p>
                              ) : null
                            })()}
                            <p className="text-[10px] text-slate-500">Generate a PDF for a formal record including the allocation chart, return scenarios, and disclaimer.</p>
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
                )
              })()}

              {/* Disclaimer */}
              <div className="rounded-lg border border-white/8 bg-white/3 px-4 py-3 text-[9px] text-slate-600 leading-relaxed">
                <strong className="text-slate-500">Disclaimer:</strong> All projections are illustrative estimates for discussion purposes only. They do not constitute financial advice or an investment recommendation. Past performance is not indicative of future results. Market conditions as of {new Date().toLocaleDateString('en-SG')}.
              </div>
            </div>
          )}

          {/* ── TAB 3: PORTDNA ── */}
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
              ) : (() => {
                const TIMEFRAMES: { key: typeof dnaTimeframe; label: string }[] = [
                  { key: 'overnight', label: '1D' },
                  { key: '5d',        label: '1W' },
                  { key: '3m',        label: '3M' },
                  { key: '6m',        label: '6M' },
                  { key: '1y',        label: '1Y' },
                  { key: 'ytd',       label: 'YTD' },
                ]

                const toWheel = (hs: Holding[]) => hs.map(h => ({
                  ...h,
                  liveYtd: dnaPerf[h.ticker] ?? ((): number | undefined => {
                    const lm: Record<string, AssetClass> = {}
                    intel?.asset_classes?.forEach(a => { lm[a.ticker] = a })
                    intel?.sectors?.forEach(s => { lm[s.ticker] = s as unknown as AssetClass })
                    return lm[h.ticker]?.chg_ytd ?? undefined
                  })(),
                  benchmarkReturn: BENCHMARK[h.category]?.ret ?? 5,
                }))
                return (
                  <>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <h2 className="text-sm font-bold text-white">PortDNA</h2>
                        <p className="text-[10px] text-slate-500">Semicircle · ring size = allocation · colour = performance · hover / click for projections & drawdown</p>
                      </div>
                      {/* Timeframe selector */}
                      <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
                        {TIMEFRAMES.map(({ key, label }) => (
                          <button key={key} onClick={() => setDnaTimeframe(key)}
                            disabled={dnaLoading}
                            className={`text-[10px] px-2.5 py-1 rounded-md font-mono transition ${
                              dnaTimeframe === key ? 'bg-cyan-500/25 text-cyan-300' : 'text-slate-500 hover:text-white'
                            }`}>
                            {label}
                          </button>
                        ))}
                        {dnaLoading && <span className="text-[9px] text-slate-600 ml-1">…</span>}
                      </div>
                    </div>
                    {/* Portfolio snapshot — always visible, no layout jump */}
                    {(() => {
                      const activeH = (dnaSide === 'client' && clientHoldings.length > 0) ? clientHoldings : holdings
                      const activeLabel = dnaSide === 'client' ? 'Balanced Profile' : 'PortfolioPlus'
                      const t2 = totalPct(activeH) || 1
                      const tfLabel = { overnight: '1D', '5d': '1W', '3m': '3M', '6m': '6M', '1y': '1Y', ytd: 'YTD' }[dnaTimeframe]
                      const hasSomePerf = activeH.some(h => dnaPerf[h.ticker] != null)
                      const periodBlended = hasSomePerf
                        ? activeH.reduce((sum, h) => { const ret = dnaPerf[h.ticker]; return ret != null ? sum + (h.pct / t2) * ret : sum }, 0)
                        : null

                      // Sector composition: group by real sector name, compute weight + blended period perf
                      const secGroups: Record<string, { tickers: string[]; weight: number; perfSum: number; perfCount: number }> = {}
                      activeH.forEach(h => {
                        const sec = TICKER_SECTOR[h.ticker] ?? CATEGORY_LABELS[h.category] ?? h.category
                        if (!secGroups[sec]) secGroups[sec] = { tickers: [], weight: 0, perfSum: 0, perfCount: 0 }
                        secGroups[sec].tickers.push(h.ticker)
                        secGroups[sec].weight += h.pct / t2 * 100
                        const ret = dnaPerf[h.ticker]
                        if (ret != null) { secGroups[sec].perfSum += ret * (h.pct / t2); secGroups[sec].perfCount++ }
                      })
                      const sectorSummary = Object.entries(secGroups)
                        .sort(([, a], [, b]) => b.weight - a.weight)
                        .map(([sec, g]) => ({
                          label: sec,
                          weight: g.weight,
                          perf: g.perfCount > 0 ? g.perfSum / (g.weight / 100) : null,
                          tickers: g.tickers,
                        }))

                      return (
                        <div className="rounded-xl border border-white/10 bg-white/3 p-4 space-y-3">
                          {/* Period return row */}
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">{activeLabel} return · {tfLabel}</div>
                              <div className="text-[8px] text-slate-700">Weighted actual price change</div>
                            </div>
                            {dnaLoading ? (
                              <div className="text-[10px] text-slate-600 animate-pulse">loading…</div>
                            ) : periodBlended != null ? (
                              <div className={`text-xl font-bold font-mono ${periodBlended >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {periodBlended >= 0 ? '+' : ''}{periodBlended.toFixed(1)}%
                              </div>
                            ) : (
                              <div className="text-[10px] text-slate-700">—</div>
                            )}
                          </div>

                          {/* Per-asset chips — always present */}
                          <div className="flex flex-wrap gap-1.5 min-h-[28px]">
                            {activeH.map(h => {
                              const ret = dnaPerf[h.ticker]
                              return (
                                <div key={h.ticker} className="flex items-center gap-1 rounded border border-white/10 bg-white/4 px-2 py-1 text-[10px]">
                                  <span className="font-mono font-bold text-white">{h.ticker}</span>
                                  <span className="text-slate-600 text-[9px]">{h.pct}%</span>
                                  {dnaLoading ? <span className="text-slate-700 text-[9px]">…</span>
                                    : ret != null
                                      ? <span className={`font-mono ${ret >= 0 ? 'text-green-400' : 'text-red-400'}`}>{ret >= 0 ? '+' : ''}{ret.toFixed(1)}%</span>
                                      : <span className="text-slate-700 text-[9px]">—</span>}
                                </div>
                              )
                            })}
                          </div>

                          {/* Sector/industry composition — always visible */}
                          <div className="border-t border-white/8 pt-2 space-y-1.5">
                            <div className="text-[9px] font-mono text-slate-600 uppercase tracking-wider">Sector / Industry breakdown · {tfLabel}</div>
                            {sectorSummary.map((s, i) => (
                              <div key={i} className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="text-[9px] text-slate-400 truncate">{s.label}</span>
                                  <span className="text-[8px] text-slate-600 shrink-0">({s.tickers.join(', ')})</span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="text-[9px] font-mono text-slate-500">{s.weight.toFixed(0)}%</span>
                                  {s.perf != null && !dnaLoading && (
                                    <span className={`text-[9px] font-mono font-bold ${s.perf >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                      {s.perf >= 0 ? '+' : ''}{s.perf.toFixed(1)}%
                                    </span>
                                  )}
                                  {dnaLoading && <span className="text-[8px] text-slate-700">…</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })()}

                    <PortfolioDNAWheel
                      holdings={toWheel(holdings)}
                      clientHoldings={clientHoldings.length > 0 ? toWheel(clientHoldings) : undefined}
                      regime={intel?.regime ?? 'UNKNOWN'}
                      vix={intel?.vix ?? null}
                      commentary={intel?.commentary ?? ''}
                      portfolioVol={proj.portfolioVol}
                      sharpeAce={proj.sharpeAce}
                      clientPortfolioVol={clientHoldings.length > 0 ? cProj.portfolioVol : undefined}
                      clientSharpeAce={clientHoldings.length > 0 ? cProj.sharpeAce : undefined}
                      dnaPerf={dnaPerf}
                      dnaTimeframe={dnaTimeframe}
                      dnaSide={dnaSide}
                      onSideChange={setDnaSide}
                    />

                    {/* DNA Print CTA */}
                    <div className="rounded-xl border border-white/10 bg-white/3 p-4 space-y-2">
                      <div className="text-[10px] text-slate-500">Generate a professional PDF report with full allocation breakdown, sector composition, period performance, and return projections — ready to send directly to clients.</div>
                      <button type="button" onClick={handlePrintDNA}
                        className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs py-2.5 rounded-lg transition flex items-center justify-center gap-2">
                        <span>🖨</span> Print PortDNA Client Report
                      </button>
                      <p className="text-[9px] text-slate-600 text-center">Opens a formatted report in a new tab · Save as PDF from print dialog</p>
                    </div>
                  </>
                )
              })()}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
