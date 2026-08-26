'use client'

/**
 * DeepQi District — TCM + Astrology Wellness Companion
 * Warm amber/jade palette, animated meridian pathways,
 * floating qi nodes, slow BaZi wheel rotation.
 */

interface Props {
  healthScore: number
  alertsToday: number
  revenueTier: string
  activeMonitors: number
}

export default function DeepQiDistrict({ healthScore, alertsToday, revenueTier, activeMonitors }: Props) {
  const thriving = revenueTier === 'elite' || revenueTier === 'thriving'
  const ringOpacity = Math.max(0.3, healthScore)

  const primary   = thriving ? '#f59e0b' : '#d97706'  // amber
  const secondary = thriving ? '#6ee7b7' : '#34d399'  // jade green
  const glow      = thriving ? '#fde68a' : '#fbbf24'  // warm glow

  // Meridian pathway points — two crossing arcs through body
  const meridian1 = 'M 40,140 Q 80,60 120,80 Q 160,100 200,40'
  const meridian2 = 'M 30,50  Q 70,100 120,80 Q 170,60 210,130'

  // Qi nodes along meridians
  const QI_NODES = [
    { cx: 120, cy: 80,  r: 7, delay: 0   },  // dan tian centre
    { cx: 80,  cy: 100, r: 4, delay: 0.6 },
    { cx: 160, cy: 65,  r: 4, delay: 1.2 },
    { cx: 55,  cy: 125, r: 3, delay: 1.8 },
    { cx: 190, cy: 95,  r: 3, delay: 0.9 },
    { cx: 100, cy: 45,  r: 3, delay: 2.4 },
    { cx: 148, cy: 115, r: 3, delay: 1.5 },
  ]

  // BaZi pillar bars (year/month/day/hour)
  const PILLARS = [
    { x: 42,  h: 22, delay: 0   },
    { x: 66,  h: 30, delay: 0.4 },
    { x: 90,  h: 18, delay: 0.8 },
    { x: 114, h: 26, delay: 1.2 },
  ]

  return (
    <div className="relative w-full h-48 overflow-hidden rounded-xl">
      {/* Deep midnight-earth background */}
      <div className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at 40% 55%, #1c0f02 0%, #0f0a03 55%, #080604 100%)' }} />

      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 240 160" preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="dq-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor={glow}    stopOpacity="0.9" />
            <stop offset="60%"  stopColor={primary}  stopOpacity="0.4" />
            <stop offset="100%" stopColor={primary}  stopOpacity="0"   />
          </radialGradient>
          {/* Meridian dash animation */}
          <filter id="dq-blur">
            <feGaussianBlur stdDeviation="1.2" />
          </filter>
        </defs>

        {/* Outer ambient glow */}
        <ellipse cx="120" cy="80" rx="90" ry="60"
          fill="none" stroke={primary} strokeWidth="0.4" opacity={ringOpacity * 0.25}>
          <animate attributeName="rx" values="80;100;80" dur="6s" repeatCount="indefinite" />
          <animate attributeName="ry" values="52;68;52" dur="6s" repeatCount="indefinite" />
        </ellipse>

        {/* Meridian path 1 */}
        <path d={meridian1}
          fill="none" stroke={secondary} strokeWidth="1"
          strokeDasharray="4 6" opacity="0.45">
          <animate attributeName="stroke-dashoffset"
            values="0;-50" dur="4s" repeatCount="indefinite" />
        </path>

        {/* Meridian path 2 */}
        <path d={meridian2}
          fill="none" stroke={primary} strokeWidth="1"
          strokeDasharray="3 7" opacity="0.35">
          <animate attributeName="stroke-dashoffset"
            values="0;-60" dur="5.5s" repeatCount="indefinite" />
        </path>

        {/* BaZi pillar bars — bottom left, four pillars */}
        {PILLARS.map((p, i) => (
          <g key={i}>
            <rect x={p.x} y={145 - p.h} width="16" height={p.h} rx="2"
              fill={secondary} opacity="0.18">
              <animate attributeName="height"
                values={`${p.h * 0.6};${p.h};${p.h * 0.6}`}
                dur={`${2.5 + i * 0.4}s`} begin={`${p.delay}s`} repeatCount="indefinite" />
              <animate attributeName="y"
                values={`${145 - p.h * 0.6};${145 - p.h};${145 - p.h * 0.6}`}
                dur={`${2.5 + i * 0.4}s`} begin={`${p.delay}s`} repeatCount="indefinite" />
            </rect>
            <text x={p.x + 8} y="152" textAnchor="middle"
              fontSize="4.5" fill={secondary} opacity="0.4" fontFamily="serif">
              {['年', '月', '日', '時'][i]}
            </text>
          </g>
        ))}

        {/* Rotating BaZi hexagram ring (right side) */}
        {[0,1,2,3,4,5,6,7].map((i) => {
          const angle  = (i / 8) * Math.PI * 2
          const rx = 22, ry = 22
          const cx = 195 + Math.cos(angle) * rx
          const cy = 78  + Math.sin(angle) * ry
          return (
            <circle key={i} cx={cx} cy={cy} r="2.5"
              fill={i % 2 === 0 ? primary : secondary}
              opacity="0.45">
              <animateTransform attributeName="transform" type="rotate"
                values={`0 195 78;360 195 78`}
                dur="12s" repeatCount="indefinite" />
            </circle>
          )
        })}
        <circle cx="195" cy="78" r="10"
          fill="none" stroke={primary} strokeWidth="0.8" opacity="0.3">
          <animateTransform attributeName="transform" type="rotate"
            values="0 195 78;-360 195 78" dur="20s" repeatCount="indefinite" />
        </circle>
        <text x="195" y="81" textAnchor="middle"
          fontSize="5.5" fill={glow} opacity="0.55" fontFamily="serif">
          ☯
        </text>

        {/* Dan tian — central qi core */}
        <circle cx="120" cy="80" r="16"
          fill="url(#dq-core)" opacity={ringOpacity * 0.6}>
          <animate attributeName="r" values="12;20;12" dur="7s" repeatCount="indefinite" />
          <animate attributeName="opacity"
            values={`${ringOpacity * 0.4};${ringOpacity * 0.85};${ringOpacity * 0.4}`}
            dur="7s" repeatCount="indefinite" />
        </circle>
        <circle cx="120" cy="80" r="5"
          fill={glow} opacity="0.75">
          <animate attributeName="r" values="3;7;3" dur="7s" repeatCount="indefinite" />
        </circle>

        {/* Qi nodes */}
        {QI_NODES.map((n, i) => (
          <circle key={i} cx={n.cx} cy={n.cy} r={n.r}
            fill={i % 2 === 0 ? primary : secondary}
            opacity="0.55"
            filter={i === 0 ? 'url(#dq-blur)' : undefined}>
            <animate attributeName="opacity"
              values="0.25;0.75;0.25"
              dur={`${2.5 + i * 0.4}s`} begin={`${n.delay}s`}
              repeatCount="indefinite" />
            <animate attributeName="r"
              values={`${n.r * 0.7};${n.r * 1.4};${n.r * 0.7}`}
              dur={`${2.5 + i * 0.4}s`} begin={`${n.delay}s`}
              repeatCount="indefinite" />
          </circle>
        ))}

        {/* Centre label */}
        <text x="120" y="84" textAnchor="middle"
          fontSize="5.5" fill={glow} opacity="0.45"
          fontFamily="Georgia, serif" letterSpacing="1.5">
          氣
        </text>

        {/* Sessions indicator top-left */}
        <text x="14" y="20" fontSize="5" fill={primary} opacity="0.5" fontFamily="monospace">
          {activeMonitors} sessions
        </text>
      </svg>

      {/* Ground fade */}
      <div className="absolute bottom-0 left-0 right-0 h-10"
        style={{ background: 'linear-gradient(0deg, #0a0e1a, transparent)' }} />

      <div className="absolute top-2 right-2 text-right">
        <div className="text-xs font-mono" style={{ color: primary }}>{alertsToday} consultations</div>
        <div className="text-xs" style={{ color: secondary, opacity: 0.6 }}>TCM · BaZi · Qi</div>
      </div>
    </div>
  )
}
