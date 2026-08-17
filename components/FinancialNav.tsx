'use client'
// Shared top nav bar for all Financial District segment pages
// Layout: ← Financial District · Go to: [pills] | Dark/Light · Print · Refresh

interface Props {
  active: 'macro' | 'watchlist' | 'portfolio'
  bgLight?: boolean
  onMacroOpen?: () => void       // if provided, Macro pill is a button not a link
  onPrint?: () => void
  onRefresh?: () => void
  refreshing?: boolean
  onThemeToggle?: () => void
  children?: React.ReactNode     // right-side extras (e.g. badge)
}

const PILLS = [
  { key: 'macro',     label: '🌐 Macro',     href: '/citizen/dashboard/financial',                  color: 'emerald' },
  { key: 'watchlist', label: '⭐ Watchlist',  href: '/citizen/dashboard/financial/watchlist',        color: 'cyan'    },
  { key: 'portfolio', label: '📐 Portfolio',  href: '/citizen/dashboard/financial/portfolio-builder',color: 'amber'   },
] as const

type PillColor = 'emerald' | 'cyan' | 'amber'
const PILL_CLS: Record<PillColor, string> = {
  emerald: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  cyan:    'border-cyan-500/40 bg-cyan-500/10 text-cyan-300',
  amber:   'border-amber-500/40 bg-amber-500/10 text-amber-300',
}
const PILL_IDLE = 'border-white/10 bg-white/3 text-slate-400 hover:border-white/20 hover:text-slate-200'

export default function FinancialNav({
  active, bgLight, onMacroOpen, onPrint, onRefresh, refreshing, onThemeToggle, children,
}: Props) {
  const light = bgLight ?? false

  const navBase = `sticky top-0 z-10 backdrop-blur border-b px-4 py-2.5 flex items-center gap-2 flex-wrap transition-colors`
  const navCls  = light
    ? `${navBase} border-slate-300 bg-slate-100/95 text-slate-700`
    : `${navBase} border-white/10 bg-[#0A0E1A]/95 text-white`

  const btnBase = `text-[11px] border rounded-lg px-2.5 py-1 transition`
  const btnCls  = light
    ? `${btnBase} border-slate-300 text-slate-600 hover:text-slate-900`
    : `${btnBase} border-white/15 text-slate-400 hover:text-white hover:border-white/30`

  return (
    <nav className={navCls}>
      {/* Back */}
      <a href="/citizen/dashboard/financial"
        className={`text-[11px] whitespace-nowrap ${light?'text-slate-500 hover:text-slate-800':'text-slate-500 hover:text-white'}`}>
        ← Financial District
      </a>
      <span className={light?'text-slate-300':'text-white/15'}>·</span>
      <span className={`text-[10px] ${light?'text-slate-400':'text-slate-600'}`}>Go to:</span>

      {/* Segment pills */}
      {PILLS.map(p => {
        const isActive = p.key === active
        const pillCls = isActive ? PILL_CLS[p.color] : PILL_IDLE
        const base = `inline-flex items-center gap-1 px-2.5 py-0.5 rounded border text-[10px] font-medium transition whitespace-nowrap ${pillCls}`

        if (p.key === 'macro' && onMacroOpen) {
          return (
            <button key={p.key} onClick={onMacroOpen} className={base}>{p.label}</button>
          )
        }
        return (
          <a key={p.key} href={p.href} className={base}>{p.label}</a>
        )
      })}

      {/* Spacer + right-side controls */}
      <span className="flex-1" />

      {children}

      {onThemeToggle && (
        <button onClick={onThemeToggle} className={btnCls}>
          {light ? '🌙 Dark' : '☀ Light'}
        </button>
      )}

      {onPrint && (
        <button onClick={onPrint} className={`${btnCls} flex items-center gap-1`}>
          🖨 Print
        </button>
      )}

      {onRefresh && (
        <button onClick={onRefresh} disabled={refreshing} className={`${btnCls} disabled:opacity-40`}>
          {refreshing ? '…' : '↻ Refresh'}
        </button>
      )}
    </nav>
  )
}
