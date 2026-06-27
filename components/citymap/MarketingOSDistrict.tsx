'use client'

/**
 * MarketingOS District — Video Studio
 * Rose/pink theme, animated film-strip ticker, waveform bars,
 * flying video frame dots, upload progress arc.
 */

interface Props {
  healthScore: number
  alertsToday: number
  revenueTier: string
  activeMonitors: number
}

export default function MarketingOSDistrict({ healthScore, alertsToday, revenueTier, activeMonitors }: Props) {
  const h = healthScore
  const thriving = revenueTier === 'elite' || revenueTier === 'thriving'
  const ringOpacity = Math.max(0.3, h)

  // Flying video frame dots (represent jobs in flight)
  const FRAMES = [
    { cx: 40,  cy: 50,  delay: 0   },
    { cx: 80,  cy: 30,  delay: 0.7 },
    { cx: 150, cy: 45,  delay: 1.4 },
    { cx: 200, cy: 60,  delay: 0.3 },
    { cx: 60,  cy: 110, delay: 1.1 },
    { cx: 175, cy: 100, delay: 1.8 },
  ].slice(0, Math.min(6, Math.max(2, alertsToday + 2)))

  // Waveform bar heights (audio wave feel)
  const BARS = [4, 8, 14, 20, 14, 8, 4, 10, 18, 10, 6, 12, 20, 12, 6]

  return (
    <div className="relative w-full h-48 overflow-hidden rounded-xl">
      {/* Deep rose-dark background */}
      <div className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at 50% 40%, #2d0a14 0%, #1a040c 55%, #0d0208 100%)' }} />

      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 240 160" preserveAspectRatio="xMidYMid meet">

        {/* Outer upload-progress arc */}
        {[1, 2].map(n => (
          <circle key={n} cx="120" cy="80" r={n * 32}
            fill="none"
            stroke={thriving ? '#fb7185' : '#f43f5e'}
            strokeWidth="0.5"
            opacity={ringOpacity * (0.25 / n)}>
            <animate attributeName="r"
              values={`${n * 24};${n * 40};${n * 24}`}
              dur={`${5 + n * 2}s`} repeatCount="indefinite" />
            <animate attributeName="opacity"
              values={`${0.4 / n};0;${0.4 / n}`}
              dur={`${5 + n * 2}s`} repeatCount="indefinite" />
          </circle>
        ))}

        {/* Central play button */}
        <circle cx="120" cy="80" r="20"
          fill={thriving ? '#f43f5e22' : '#f43f5e18'}
          stroke={thriving ? '#fb7185' : '#f43f5e'}
          strokeWidth="1.2"
          opacity="0.85">
          <animate attributeName="r" values="18;22;18"
            dur="3s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.6;1;0.6"
            dur="3s" repeatCount="indefinite" />
        </circle>
        {/* Triangle play icon */}
        <polygon points="115,73 115,87 128,80"
          fill={thriving ? '#fb7185' : '#f43f5e'}
          opacity="0.9">
          <animate attributeName="opacity" values="0.6;1;0.6"
            dur="3s" repeatCount="indefinite" />
        </polygon>

        {/* Waveform bars — left side */}
        {BARS.slice(0, 7).map((h, idx) => {
          const x = 30 + idx * 7
          return (
            <rect key={idx} x={x - 1.5} y={80 - h / 2} width="3" height={h}
              rx="1.5"
              fill={thriving ? '#fb7185' : '#f43f5e'}
              opacity="0.45">
              <animate attributeName="height"
                values={`${h * 0.3};${h};${h * 0.3}`}
                dur={`${0.9 + idx * 0.12}s`} repeatCount="indefinite" />
              <animate attributeName="y"
                values={`${80 - h * 0.15};${80 - h / 2};${80 - h * 0.15}`}
                dur={`${0.9 + idx * 0.12}s`} repeatCount="indefinite" />
            </rect>
          )
        })}

        {/* Waveform bars — right side */}
        {BARS.slice(8).map((h, idx) => {
          const x = 155 + idx * 7
          return (
            <rect key={idx} x={x - 1.5} y={80 - h / 2} width="3" height={h}
              rx="1.5"
              fill={thriving ? '#fb7185' : '#f43f5e'}
              opacity="0.45">
              <animate attributeName="height"
                values={`${h * 0.3};${h};${h * 0.3}`}
                dur={`${1.1 + idx * 0.12}s`} repeatCount="indefinite" />
              <animate attributeName="y"
                values={`${80 - h * 0.15};${80 - h / 2};${80 - h * 0.15}`}
                dur={`${1.1 + idx * 0.12}s`} repeatCount="indefinite" />
            </rect>
          )
        })}

        {/* Film-strip dots top edge */}
        {[20, 45, 70, 95, 120, 145, 170, 195, 220].map((x, i) => (
          <rect key={i} x={x - 3} y="6" width="6" height="4" rx="1"
            fill={thriving ? '#fb7185' : '#f43f5e'}
            opacity="0.3">
            <animate attributeName="opacity"
              values="0.15;0.5;0.15"
              dur={`${2 + i * 0.2}s`} repeatCount="indefinite" />
          </rect>
        ))}

        {/* Film-strip dots bottom edge */}
        {[20, 45, 70, 95, 120, 145, 170, 195, 220].map((x, i) => (
          <rect key={i} x={x - 3} y="150" width="6" height="4" rx="1"
            fill={thriving ? '#fb7185' : '#f43f5e'}
            opacity="0.3">
            <animate attributeName="opacity"
              values="0.15;0.5;0.15"
              dur={`${2.3 + i * 0.2}s`} repeatCount="indefinite" />
          </rect>
        ))}

        {/* Flying video frame dots (jobs in flight) */}
        {FRAMES.map((f, i) => (
          <g key={i}>
            <rect x={f.cx - 5} y={f.cy - 4} width="10" height="8"
              rx="1.5"
              fill="none"
              stroke={thriving ? '#fb7185' : '#f43f5e'}
              strokeWidth="0.8"
              opacity="0.5">
              <animate attributeName="cy" attributeType="XML"
                values={`${f.cy};${f.cy - 12};${f.cy}`}
                dur={`${2.5 + i * 0.4}s`} begin={`${f.delay}s`}
                repeatCount="indefinite" />
              <animate attributeName="opacity"
                values="0.2;0.7;0.2"
                dur={`${2.5 + i * 0.4}s`} begin={`${f.delay}s`}
                repeatCount="indefinite" />
            </rect>
          </g>
        ))}

        {/* Label */}
        <text x="120" y="113" textAnchor="middle"
          fontSize="5.5" fill="#fb7185" opacity="0.45"
          fontFamily="monospace" letterSpacing="2">
          GENERATING
        </text>
      </svg>

      {/* Ground fade */}
      <div className="absolute bottom-0 left-0 right-0 h-10"
        style={{ background: 'linear-gradient(0deg, #0a0e1a, transparent)' }} />

      <div className="absolute top-2 right-2 text-right">
        <div className="text-xs text-rose-400 font-mono">{activeMonitors} merchants</div>
        <div className="text-xs text-rose-300/60">{alertsToday} videos today</div>
      </div>
    </div>
  )
}
