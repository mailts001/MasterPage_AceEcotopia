'use client'

/**
 * CareerGenome District — DNA Helix / Trajectory Map
 * Indigo/violet theme, rotating double-helix strand,
 * trajectory path nodes, scanning interview pulse.
 */

interface Props {
  healthScore: number
  alertsToday: number
  revenueTier: string
  activeMonitors: number
}

export default function CareerGenomeDistrict({ healthScore, alertsToday, revenueTier, activeMonitors }: Props) {
  const h = healthScore
  const thriving = revenueTier === 'elite' || revenueTier === 'thriving'

  // Helix rungs (10 genome dimensions)
  const RUNGS = Array.from({ length: 10 }, (_, i) => i)

  // Trajectory path nodes (career path simulation)
  const NODES = [
    { cx: 30,  cy: 130 },
    { cx: 75,  cy: 95  },
    { cx: 120, cy: 110 },
    { cx: 165, cy: 70  },
    { cx: 210, cy: 50  },
  ]

  return (
    <div className="relative w-full h-48 overflow-hidden rounded-xl">
      {/* Deep indigo background */}
      <div className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at 50% 40%, #1e1b4b 0%, #11102b 55%, #08070f 100%)' }} />

      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 240 160" preserveAspectRatio="xMidYMid meet">

        {/* DNA double helix — two sine strands */}
        <g opacity={Math.max(0.4, h)}>
          {RUNGS.map((i) => {
            const y = 18 + i * 13
            const xa = 95 + Math.sin(i * 0.9) * 18
            const xb = 95 - Math.sin(i * 0.9) * 18
            return (
              <g key={i}>
                <line x1={xa} y1={y} x2={xb} y2={y}
                  stroke={thriving ? '#a5b4fc' : '#818cf8'} strokeWidth="0.6" opacity="0.4" />
                <circle cx={xa} cy={y} r="2.2" fill={thriving ? '#c4b5fd' : '#818cf8'} opacity="0.8">
                  <animate attributeName="cx" values={`${xa};${xb};${xa}`} dur="6s" begin={`${i * 0.3}s`} repeatCount="indefinite" />
                </circle>
                <circle cx={xb} cy={y} r="2.2" fill={thriving ? '#818cf8' : '#6366f1'} opacity="0.8">
                  <animate attributeName="cx" values={`${xb};${xa};${xb}`} dur="6s" begin={`${i * 0.3}s`} repeatCount="indefinite" />
                </circle>
              </g>
            )
          })}
        </g>

        {/* Trajectory simulator path — bottom right */}
        <g opacity="0.7">
          <path d={`M ${NODES.map(n => `${n.cx} ${n.cy}`).join(' L ')}`}
            stroke={thriving ? '#a78bfa' : '#8b5cf6'} strokeWidth="1" fill="none"
            strokeDasharray="3 5">
            <animate attributeName="stroke-dashoffset" values="0;-80" dur="5s" repeatCount="indefinite" />
          </path>
          {NODES.map((n, i) => (
            <circle key={i} cx={n.cx} cy={n.cy} r={i === NODES.length - 1 ? 4 : 2.5}
              fill={i === NODES.length - 1 ? '#c4b5fd' : '#6366f1'}
              opacity="0.85">
              <animate attributeName="opacity" values="0.5;1;0.5"
                dur={`${2 + i * 0.4}s`} repeatCount="indefinite" />
            </circle>
          ))}
        </g>

        {/* Interview scan pulse — top right corner ring */}
        <circle cx="195" cy="35" r="14" fill="none"
          stroke={thriving ? '#c4b5fd' : '#a5b4fc'} strokeWidth="1" opacity="0.5">
          <animate attributeName="r" values="10;18;10" dur="3.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.6;0.1;0.6" dur="3.5s" repeatCount="indefinite" />
        </circle>
        <circle cx="195" cy="35" r="4" fill={thriving ? '#e0e7ff' : '#c4b5fd'} opacity="0.8" />

        {/* Label */}
        <text x="95" y="148" textAnchor="middle"
          fontSize="5.5" fill="#a5b4fc" opacity="0.5"
          fontFamily="monospace" letterSpacing="2">
          MAPPING GENOME
        </text>
      </svg>

      {/* Ground fade */}
      <div className="absolute bottom-0 left-0 right-0 h-10"
        style={{ background: 'linear-gradient(0deg, #0a0e1a, transparent)' }} />

      <div className="absolute top-2 right-2 text-right">
        <div className="text-xs text-indigo-400 font-mono">{activeMonitors} genomes mapped</div>
        <div className="text-xs text-indigo-300/60">{alertsToday} hiring signals today</div>
      </div>
    </div>
  )
}
