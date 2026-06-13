'use client'

/**
 * E-commerce District — Night Market + Warehouse Grid
 * Amber/orange, packages flowing between market nodes,
 * stalls light up on deal signals.
 */

interface Props {
  healthScore: number
  alertsToday: number
  revenueTier: string
  activeMonitors: number
}

const NODES = [
  { x: 30,  y: 80,  label: 'Shopee',  size: 12 },
  { x: 100, y: 50,  label: 'Lazada',  size: 10 },
  { x: 170, y: 75,  label: 'Amazon',  size: 12 },
  { x: 65,  y: 130, label: 'TikTok',  size: 8  },
  { x: 135, y: 140, label: 'Carousell', size: 8 },
  { x: 210, y: 120, label: 'eBay',    size: 8  },
]

const FLOWS = [
  { from: 0, to: 1, dur: 3 },
  { from: 1, to: 2, dur: 4 },
  { from: 0, to: 3, dur: 2.5 },
  { from: 2, to: 5, dur: 3.5 },
  { from: 3, to: 4, dur: 2 },
  { from: 4, to: 2, dur: 4 },
]

export default function EcommerceDistrict({ healthScore, alertsToday, revenueTier, activeMonitors }: Props) {
  const h = healthScore
  const litStalls = Math.round(alertsToday * 0.8)
  const activeFlows = Math.max(2, Math.round(FLOWS.length * h))
  const elite = revenueTier === 'elite' || revenueTier === 'thriving'

  return (
    <div className="relative w-full h-48 overflow-hidden rounded-xl">
      {/* Night market bg */}
      <div className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at 50% 80%, #1c0d00 0%, #0d0800 60%, #080500 100%)' }} />

      {/* Ground grid */}
      <svg className="absolute inset-0 w-full h-full opacity-15">
        {[0,1,2,3].map(i => (
          <line key={`h${i}`} x1="0" y1={`${30 + i * 20}%`} x2="100%" y2={`${30 + i * 20}%`}
            stroke="#f59e0b" strokeWidth="0.5" />
        ))}
        {[0,1,2,3,4,5].map(i => (
          <line key={`v${i}`} x1={`${10 + i * 18}%`} y1="20%" x2={`${10 + i * 18}%`} y2="100%"
            stroke="#f59e0b" strokeWidth="0.5" />
        ))}
      </svg>

      {/* Market stalls row */}
      <svg className="absolute bottom-8 left-0 w-full" height="60" viewBox="0 0 240 60">
        {Array.from({ length: 10 }).map((_, i) => {
          const isLit = i < litStalls
          return (
            <g key={i}>
              <rect x={i * 24 + 2} y={20} width={20} height={35} rx="1"
                fill={isLit ? '#78350f' : '#1c0d00'}
                stroke={isLit ? '#f59e0b' : '#451a03'} strokeWidth="0.8" />
              {/* Awning */}
              <path d={`M ${i * 24 + 1} 20 L ${i * 24 + 12} 12 L ${i * 24 + 23} 20`}
                fill={isLit ? '#b45309' : '#292524'} stroke="none" />
              {/* Lantern */}
              {isLit && (
                <circle cx={i * 24 + 12} cy={8} r={3} fill="#fbbf24" opacity="0.9">
                  <animate attributeName="opacity" values="0.6;1;0.6"
                    dur={`${1.5 + i * 0.2}s`} repeatCount="indefinite" />
                </circle>
              )}
            </g>
          )
        })}
      </svg>

      {/* Package flow network */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 240 160" preserveAspectRatio="xMidYMid meet">
        {/* Connections */}
        {FLOWS.slice(0, activeFlows).map((f, i) => {
          const from = NODES[f.from]
          const to = NODES[f.to]
          return (
            <line key={i}
              x1={from.x} y1={from.y} x2={to.x} y2={to.y}
              stroke="#f59e0b" strokeWidth="0.8" opacity="0.25"
              strokeDasharray="3 5">
              <animate attributeName="stroke-dashoffset" values="0;-80"
                dur={`${f.dur}s`} repeatCount="indefinite" />
            </line>
          )
        })}

        {/* Package dots */}
        {FLOWS.slice(0, activeFlows).map((f, i) => {
          const from = NODES[f.from]
          const to = NODES[f.to]
          return (
            <rect key={i} width="5" height="5" rx="1"
              fill={elite ? '#fbbf24' : '#f59e0b'} opacity="0.9">
              <animateMotion
                path={`M ${from.x} ${from.y} L ${to.x} ${to.y}`}
                dur={`${f.dur}s`} begin={`${i * 0.6}s`}
                repeatCount="indefinite" />
            </rect>
          )
        })}

        {/* Market nodes */}
        {NODES.map((n, i) => (
          <g key={i}>
            <circle cx={n.x} cy={n.y} r={n.size}
              fill="#1c0d00" stroke={elite ? '#fbbf24' : '#d97706'} strokeWidth="1.5">
              <animate attributeName="stroke-opacity"
                values="0.5;1;0.5" dur={`${2 + i * 0.4}s`} repeatCount="indefinite" />
            </circle>
            <text x={n.x} y={n.y + 3} textAnchor="middle"
              fontSize="5" fill="#fbbf24" opacity="0.9" fontFamily="monospace">
              {n.label.slice(0, 3)}
            </text>
          </g>
        ))}
      </svg>

      <div className="absolute bottom-0 left-0 right-0 h-8"
        style={{ background: 'linear-gradient(0deg, #0a0e1a, transparent)' }} />

      <div className="absolute top-2 right-2 text-right">
        <div className="text-xs text-amber-400 font-mono">{activeMonitors} monitors</div>
        <div className="text-xs text-amber-300/60">{alertsToday} gaps found</div>
      </div>
    </div>
  )
}
