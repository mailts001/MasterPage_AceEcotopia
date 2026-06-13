'use client'

/**
 * Financial District — Trading Floor / Wall Street
 * Green candlestick towers, scrolling tickers, data streams.
 * Towers pulse on signals. Gold accents on thriving tier.
 */

interface Props {
  healthScore: number
  alertsToday: number
  revenueTier: string
  activeMonitors: number
}

export default function FinancialDistrict({ healthScore, alertsToday, revenueTier, activeMonitors }: Props) {
  const h = healthScore
  const elite = revenueTier === 'elite' || revenueTier === 'thriving'

  const candles = [
    { x: 15,  body: 80,  wick: 20, bull: true },
    { x: 38,  body: 60,  wick: 30, bull: false },
    { x: 58,  body: 120, wick: 25, bull: true },
    { x: 82,  body: 90,  wick: 15, bull: true },
    { x: 104, body: 50,  wick: 35, bull: false },
    { x: 126, body: 140, wick: 20, bull: true },
    { x: 152, body: 100, wick: 18, bull: true },
    { x: 175, body: 70,  wick: 28, bull: false },
    { x: 198, body: 110, wick: 22, bull: true },
    { x: 220, body: 85,  wick: 15, bull: true },
  ]

  return (
    <div className="relative w-full h-48 overflow-hidden rounded-xl">
      {/* Dark trading floor bg */}
      <div className="absolute inset-0"
        style={{ background: 'linear-gradient(180deg, #020d06 0%, #051a0e 60%, #020d06 100%)' }} />

      {/* Grid lines */}
      <svg className="absolute inset-0 w-full h-full opacity-10">
        {[0,1,2,3,4].map(i => (
          <line key={i} x1="0" y1={`${20 + i * 20}%`} x2="100%" y2={`${20 + i * 20}%`}
            stroke="#22c55e" strokeWidth="0.5" strokeDasharray="4 8" />
        ))}
      </svg>

      {/* Scrolling ticker tape */}
      <div className="absolute top-2 left-0 right-0 overflow-hidden h-5">
        <div className="flex gap-6 text-xs font-mono animate-[scroll_20s_linear_infinite] whitespace-nowrap"
          style={{ animation: 'marquee 20s linear infinite' }}>
          {['AAPL +2.3%', 'TSLA +5.1%', '9988 -1.2%', 'SPY +0.8%', 'QQQ +1.4%',
            'NVDA +3.7%', '0700 +0.5%', 'MSFT +1.9%', 'BABA -0.8%', 'META +2.1%'].map((t, i) => (
            <span key={i} className={t.includes('-') ? 'text-red-400' : 'text-green-400'}>{t}</span>
          ))}
        </div>
      </div>

      {/* Candlestick towers */}
      <svg className="absolute bottom-6 left-0 w-full" height="180" viewBox="0 0 240 180" preserveAspectRatio="xMidYMax meet">
        {candles.map((c, i) => {
          const bodyH = (c.body * (0.3 + h * 0.7))
          const wickH = c.wick
          const y = 175 - bodyH
          const color = c.bull ? '#22c55e' : '#ef4444'
          const goldColor = elite ? '#f59e0b' : color

          return (
            <g key={i}>
              {/* Wick */}
              <line x1={c.x + 8} y1={y - wickH} x2={c.x + 8} y2={y}
                stroke={goldColor} strokeWidth="1.5" opacity="0.7" />
              {/* Body */}
              <rect x={c.x} y={y} width={16} height={bodyH} rx="1"
                fill={`${color}22`} stroke={goldColor} strokeWidth="1">
                <animate attributeName="opacity"
                  values={`0.7;1;0.7`} dur={`${2 + i * 0.3}s`}
                  repeatCount="indefinite" />
              </rect>
              {/* Glow on active */}
              {alertsToday > i * 2 && (
                <rect x={c.x - 1} y={y - 1} width={18} height={bodyH + 2} rx="1"
                  fill="none" stroke={goldColor} strokeWidth="0.5" opacity="0.4">
                  <animate attributeName="opacity" values="0;0.6;0" dur="1.5s"
                    begin={`${i * 0.2}s`} repeatCount="indefinite" />
                </rect>
              )}
            </g>
          )
        })}

        {/* Ground */}
        <line x1="0" y1="176" x2="240" y2="176" stroke="#166534" strokeWidth="0.5" opacity="0.5" />
      </svg>

      {/* Data stream lines */}
      <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none">
        <line x1="0" y1="60%" x2="100%" y2="40%" stroke="#22c55e" strokeWidth="0.5">
          <animate attributeName="stroke-dashoffset" values="0;-100" dur="3s" repeatCount="indefinite" />
        </line>
      </svg>

      <div className="absolute bottom-0 left-0 right-0 h-8"
        style={{ background: 'linear-gradient(0deg, #0a0e1a, transparent)' }} />

      <div className="absolute top-8 right-2 text-right">
        <div className="text-xs text-green-400 font-mono">{activeMonitors} signals</div>
        <div className="text-xs text-green-300/60">{alertsToday} fired today</div>
      </div>

      <style>{`
        @keyframes marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }
      `}</style>
    </div>
  )
}
