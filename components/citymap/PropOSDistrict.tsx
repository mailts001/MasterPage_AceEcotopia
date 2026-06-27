'use client'

/**
 * PropOS District — Singapore Skyline
 * Steel blue towers that grow with health_score.
 * Windows light up based on alerts_today.
 * Marina Bay arc glows on thriving/elite tier.
 */

interface Props {
  citizens: number
  healthScore: number   // 0–1
  alertsToday: number
  revenueTier: string
  activeMonitors: number
}

export default function PropOSDistrict({ healthScore, alertsToday, revenueTier, activeMonitors, citizens }: Props) {
  const h = healthScore
  const lit = Math.min(alertsToday, 20)
  const elite = revenueTier === 'elite' || revenueTier === 'thriving'

  // Tower heights scale with health
  const towers = [
    { x: 20,  w: 18, baseH: 60,  maxH: 140, delay: 0 },
    { x: 46,  w: 24, baseH: 80,  maxH: 200, delay: 0.1 },
    { x: 78,  w: 14, baseH: 50,  maxH: 120, delay: 0.2 },
    { x: 100, w: 30, baseH: 100, maxH: 220, delay: 0 },   // MBS-style
    { x: 138, w: 16, baseH: 70,  maxH: 160, delay: 0.15 },
    { x: 162, w: 20, baseH: 55,  maxH: 130, delay: 0.05 },
    { x: 190, w: 12, baseH: 40,  maxH: 90,  delay: 0.3 },
    { x: 210, w: 22, baseH: 65,  maxH: 150, delay: 0.1 },
  ]

  return (
    <div className="relative w-full h-48 overflow-hidden rounded-xl">
      {/* Sky gradient */}
      <div className="absolute inset-0"
        style={{ background: 'linear-gradient(180deg, #0a1628 0%, #0d2040 50%, #0a1628 100%)' }} />

      {/* Water reflection */}
      <div className="absolute bottom-0 left-0 right-0 h-12 opacity-30"
        style={{ background: 'linear-gradient(180deg, transparent, #1e40af33)' }} />

      {/* Marina Bay arc */}
      {elite && (
        <svg className="absolute bottom-10 left-1/2 -translate-x-1/2" width="180" height="40" viewBox="0 0 180 40">
          <path d="M 0 40 Q 90 0 180 40" stroke="#60a5fa" strokeWidth="1.5" fill="none" opacity="0.6">
            <animate attributeName="opacity" values="0.3;0.8;0.3" dur="3s" repeatCount="indefinite" />
          </path>
        </svg>
      )}

      <svg className="absolute bottom-8 left-0 w-full" height="220" viewBox="0 0 240 220" preserveAspectRatio="xMidYMax meet">
        {towers.map((t, i) => {
          const towerH = t.baseH + (t.maxH - t.baseH) * h
          const y = 220 - towerH
          const windowRows = Math.floor(towerH / 12)
          const windowCols = Math.floor(t.w / 7)
          const litWindows = Math.round((lit / 20) * windowRows * windowCols)

          return (
            <g key={i}>
              {/* Tower body */}
              <rect x={t.x} y={y} width={t.w} height={towerH}
                fill={`rgba(15,30,70,${0.7 + h * 0.3})`}
                stroke="#1e40af" strokeWidth="0.5" rx="1" />

              {/* Windows */}
              {Array.from({ length: windowRows }).map((_, row) =>
                Array.from({ length: windowCols }).map((_, col) => {
                  const idx = row * windowCols + col
                  const isLit = idx < litWindows
                  return (
                    <rect key={`${row}-${col}`}
                      x={t.x + 3 + col * 7} y={y + 6 + row * 12}
                      width={4} height={5} rx="0.5"
                      fill={isLit ? '#93c5fd' : '#1e3a5f'}
                      opacity={isLit ? 0.9 : 0.3}>
                      {isLit && (
                        <animate attributeName="opacity"
                          values="0.7;1;0.7" dur={`${1.5 + Math.random() * 2}s`}
                          begin={`${t.delay + Math.random()}s`}
                          repeatCount="indefinite" />
                      )}
                    </rect>
                  )
                })
              )}

              {/* Rooftop antenna on tallest */}
              {i === 3 && (
                <line x1={t.x + t.w / 2} y1={y} x2={t.x + t.w / 2} y2={y - 15}
                  stroke="#60a5fa" strokeWidth="1.5" />
              )}
            </g>
          )
        })}

        {/* Ground line */}
        <line x1="0" y1="218" x2="240" y2="218" stroke="#1e40af" strokeWidth="1" opacity="0.5" />
      </svg>

      {/* Reflection blur */}
      <div className="absolute bottom-0 left-0 right-0 h-10"
        style={{ background: 'linear-gradient(0deg, #0a0e1a, transparent)' }} />

      {/* Stats overlay */}
      <div className="absolute top-2 right-2 text-right">
        <div className="text-xs text-blue-400 font-mono">{citizens} citizens</div>
        <div className="text-xs text-blue-400 font-mono">{activeMonitors} monitored</div>
        <div className="text-xs text-blue-300/60">{alertsToday} alerts today</div>
      </div>
    </div>
  )
}
