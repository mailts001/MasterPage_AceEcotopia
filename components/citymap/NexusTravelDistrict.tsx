'use client'

/**
 * NexusTravel District — Cosmic Airport / Star Port
 * Purple nebula sky, flight arcs between destination nodes,
 * planes animate along paths scaled by activity.
 */

interface Props {
  healthScore: number
  alertsToday: number
  revenueTier: string
  activeMonitors: number
}

const DESTINATIONS = [
  { cx: 30,  cy: 120, label: 'SIN' },
  { cx: 90,  cy: 60,  label: 'NRT' },
  { cx: 150, cy: 90,  label: 'LHR' },
  { cx: 210, cy: 50,  label: 'JFK' },
  { cx: 70,  cy: 150, label: 'SYD' },
  { cx: 180, cy: 140, label: 'DXB' },
]

const ROUTES = [
  { from: 0, to: 1 },
  { from: 0, to: 2 },
  { from: 0, to: 3 },
  { from: 0, to: 5 },
  { from: 4, to: 1 },
  { from: 2, to: 3 },
]

export default function NexusTravelDistrict({ healthScore, alertsToday, revenueTier, activeMonitors }: Props) {
  const h = healthScore
  const activeRoutes = Math.max(2, Math.round(ROUTES.length * h))
  const elite = revenueTier === 'elite' || revenueTier === 'thriving'

  return (
    <div className="relative w-full h-48 overflow-hidden rounded-xl">
      {/* Cosmic purple sky */}
      <div className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at 50% 30%, #1e1040 0%, #0d0820 60%, #080510 100%)' }} />

      {/* Star field */}
      <svg className="absolute inset-0 w-full h-full opacity-60">
        {Array.from({ length: 40 }).map((_, i) => (
          <circle key={i}
            cx={`${(i * 37 + 13) % 100}%`} cy={`${(i * 53 + 7) % 80}%`}
            r={i % 5 === 0 ? 1.2 : 0.6}
            fill="white" opacity={0.3 + (i % 3) * 0.2}>
            <animate attributeName="opacity"
              values={`${0.2 + (i % 3) * 0.2};0.9;${0.2 + (i % 3) * 0.2}`}
              dur={`${2 + (i % 4)}s`} begin={`${i * 0.1}s`} repeatCount="indefinite" />
          </circle>
        ))}
      </svg>

      {/* Terminal arc at bottom */}
      <svg className="absolute bottom-4 left-1/2 -translate-x-1/2" width="220" height="30" viewBox="0 0 220 30">
        <path d="M 10 28 Q 110 0 210 28"
          stroke={elite ? '#c084fc' : '#7c3aed'} strokeWidth="2" fill="none" opacity="0.8" />
        <path d="M 30 28 Q 110 5 190 28"
          stroke="#a855f7" strokeWidth="1" fill="none" opacity="0.4" />
      </svg>

      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 240 192" preserveAspectRatio="xMidYMid meet">
        {/* Route arcs */}
        {ROUTES.slice(0, activeRoutes).map((r, i) => {
          const from = DESTINATIONS[r.from]
          const to = DESTINATIONS[r.to]
          const mx = (from.cx + to.cx) / 2
          const my = Math.min(from.cy, to.cy) - 30 - h * 20

          return (
            <g key={i}>
              <path d={`M ${from.cx} ${from.cy} Q ${mx} ${my} ${to.cx} ${to.cy}`}
                stroke="#a855f7" strokeWidth="0.8" fill="none" opacity="0.35"
                strokeDasharray="4 6">
                <animate attributeName="stroke-dashoffset" values="0;-100"
                  dur={`${4 + i}s`} repeatCount="indefinite" />
              </path>

              {/* Plane dot travelling the arc */}
              <circle r="2.5" fill={elite ? '#e879f9' : '#c084fc'} opacity="0.9">
                <animateMotion
                  path={`M ${from.cx} ${from.cy} Q ${mx} ${my} ${to.cx} ${to.cy}`}
                  dur={`${5 + i * 1.5}s`} begin={`${i * 0.8}s`}
                  repeatCount="indefinite" />
              </circle>
            </g>
          )
        })}

        {/* Destination nodes */}
        {DESTINATIONS.map((d, i) => (
          <g key={i}>
            <circle cx={d.cx} cy={d.cy} r={i === 0 ? 7 : 4}
              fill={i === 0 ? '#7c3aed' : '#4c1d95'}
              stroke={elite ? '#e879f9' : '#a855f7'} strokeWidth="1">
              <animate attributeName="r"
                values={`${i === 0 ? 7 : 4};${i === 0 ? 9 : 5};${i === 0 ? 7 : 4}`}
                dur={`${2 + i * 0.5}s`} repeatCount="indefinite" />
            </circle>
            <text x={d.cx} y={d.cy + (i === 0 ? 18 : 14)}
              textAnchor="middle" fontSize="6" fill="#c084fc" opacity="0.8"
              fontFamily="monospace">{d.label}</text>
          </g>
        ))}
      </svg>

      <div className="absolute bottom-0 left-0 right-0 h-8"
        style={{ background: 'linear-gradient(0deg, #0a0e1a, transparent)' }} />

      <div className="absolute top-2 right-2 text-right">
        <div className="text-xs text-purple-400 font-mono">{activeMonitors} routes</div>
        <div className="text-xs text-purple-300/60">{alertsToday} deals today</div>
      </div>
    </div>
  )
}
