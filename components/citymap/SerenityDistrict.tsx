'use client'

/**
 * SerenityOS District — Zen Garden + Breathing Pulse
 * Emerald/teal, slow breathing ring, floating event dots,
 * ambient sound-wave ripples.
 */

interface Props {
  healthScore: number
  alertsToday: number
  revenueTier: string
  activeMonitors: number
}

export default function SerenityDistrict({ healthScore, alertsToday, revenueTier, activeMonitors }: Props) {
  const h = healthScore
  const thriving = revenueTier === 'elite' || revenueTier === 'thriving'
  const ringOpacity = Math.max(0.3, h)
  const eventDots = Math.min(8, Math.max(2, alertsToday))

  // Floating event dots at random-ish positions
  const DOTS = [
    { cx: 55,  cy: 55,  r: 3, delay: 0   },
    { cx: 185, cy: 45,  r: 4, delay: 0.8 },
    { cx: 130, cy: 30,  r: 3, delay: 1.6 },
    { cx: 210, cy: 90,  r: 3, delay: 0.4 },
    { cx: 30,  cy: 100, r: 4, delay: 1.2 },
    { cx: 160, cy: 120, r: 3, delay: 2.0 },
    { cx: 80,  cy: 130, r: 3, delay: 0.6 },
    { cx: 220, cy: 130, r: 4, delay: 1.4 },
  ].slice(0, eventDots)

  return (
    <div className="relative w-full h-48 overflow-hidden rounded-xl">
      {/* Deep zen background */}
      <div className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at 50% 50%, #022c22 0%, #041a12 55%, #030d09 100%)' }} />

      {/* Ripple rings — breathing pulse */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 240 160" preserveAspectRatio="xMidYMid meet">

        {/* Ambient ripple rings from centre */}
        {[1, 2, 3].map((n) => (
          <circle key={n} cx="120" cy="80" r={n * 28}
            fill="none"
            stroke={thriving ? '#34d399' : '#10b981'}
            strokeWidth="0.6"
            opacity={ringOpacity * (0.4 / n)}>
            <animate attributeName="r"
              values={`${n * 20};${n * 36};${n * 20}`}
              dur={`${4 + n * 1.5}s`} repeatCount="indefinite" />
            <animate attributeName="opacity"
              values={`${0.5 / n};0;${0.5 / n}`}
              dur={`${4 + n * 1.5}s`} repeatCount="indefinite" />
          </circle>
        ))}

        {/* Central breathing circle */}
        <circle cx="120" cy="80" r="18"
          fill="none"
          stroke={thriving ? '#6ee7b7' : '#34d399'}
          strokeWidth="1.5"
          opacity="0.7">
          <animate attributeName="r" values="14;22;14"
            dur="8s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.4;0.9;0.4"
            dur="8s" repeatCount="indefinite" />
        </circle>

        {/* Inner glow dot */}
        <circle cx="120" cy="80" r="6"
          fill={thriving ? '#6ee7b7' : '#34d399'}
          opacity="0.6">
          <animate attributeName="r" values="4;8;4"
            dur="8s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.3;0.8;0.3"
            dur="8s" repeatCount="indefinite" />
        </circle>

        {/* Sound-wave bars (left of centre) */}
        {[-3,-2,-1,0,1,2,3].map((i, idx) => {
          const x = 70 + idx * 8
          const maxH = 6 + Math.abs(i) * 3
          return (
            <rect key={i} x={x - 1.5} y={80 - maxH / 2} width="3" height={maxH}
              rx="1.5"
              fill={thriving ? '#6ee7b7' : '#10b981'}
              opacity="0.5">
              <animate attributeName="height"
                values={`${maxH * 0.3};${maxH};${maxH * 0.3}`}
                dur={`${1.2 + idx * 0.15}s`} repeatCount="indefinite" />
              <animate attributeName="y"
                values={`${80 - maxH * 0.15};${80 - maxH / 2};${80 - maxH * 0.15}`}
                dur={`${1.2 + idx * 0.15}s`} repeatCount="indefinite" />
            </rect>
          )
        })}

        {/* Sound-wave bars (right of centre) */}
        {[-3,-2,-1,0,1,2,3].map((i, idx) => {
          const x = 162 + idx * 8
          const maxH = 6 + Math.abs(i) * 3
          return (
            <rect key={i} x={x - 1.5} y={80 - maxH / 2} width="3" height={maxH}
              rx="1.5"
              fill={thriving ? '#6ee7b7' : '#10b981'}
              opacity="0.5">
              <animate attributeName="height"
                values={`${maxH * 0.3};${maxH};${maxH * 0.3}`}
                dur={`${1.4 + idx * 0.15}s`} repeatCount="indefinite" />
              <animate attributeName="y"
                values={`${80 - maxH * 0.15};${80 - maxH / 2};${80 - maxH * 0.15}`}
                dur={`${1.4 + idx * 0.15}s`} repeatCount="indefinite" />
            </rect>
          )
        })}

        {/* Floating event dots */}
        {DOTS.map((d, i) => (
          <circle key={i} cx={d.cx} cy={d.cy} r={d.r}
            fill={thriving ? '#6ee7b7' : '#34d399'}
            opacity="0.65">
            <animate attributeName="cy"
              values={`${d.cy};${d.cy - 8};${d.cy}`}
              dur={`${3 + i * 0.5}s`} begin={`${d.delay}s`}
              repeatCount="indefinite" />
            <animate attributeName="opacity"
              values="0.3;0.8;0.3"
              dur={`${3 + i * 0.5}s`} begin={`${d.delay}s`}
              repeatCount="indefinite" />
          </circle>
        ))}

        {/* Zen label */}
        <text x="120" y="84" textAnchor="middle"
          fontSize="6" fill="#6ee7b7" opacity="0.5"
          fontFamily="Georgia, serif" letterSpacing="2">
          breathe
        </text>
      </svg>

      {/* Ground fade */}
      <div className="absolute bottom-0 left-0 right-0 h-10"
        style={{ background: 'linear-gradient(0deg, #0a0e1a, transparent)' }} />

      <div className="absolute top-2 right-2 text-right">
        <div className="text-xs text-emerald-400 font-mono">{activeMonitors} citizens</div>
        <div className="text-xs text-emerald-300/60">{alertsToday} events live</div>
      </div>
    </div>
  )
}
