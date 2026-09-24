'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

const GAME_URL = 'https://aceconology.duckdns.org:8444/nonya/'
const WS_URL   = 'wss://aceconology.duckdns.org:8444/nonya-ws'

// World bounds for mini-map normalization
const WORLD_W = 4000   // approximate world x range visible
const WORLD_H = 400    // world y: 640–1040 mapped to canvas height
const WORLD_Y_MIN = 640

const PLAYER_COLORS = ['#f43f5e','#fb923c','#facc15','#4ade80','#38bdf8','#a78bfa','#f472b6','#34d399']

interface Player { id: string; name: string; x: number; y: number; score: number }

export default function MarketingPlayPage() {
  const router   = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wsRef    = useRef<WebSocket | null>(null)
  const playersRef = useRef<Player[]>([])
  const [online, setOnline]     = useState(0)
  const [playerName, setName]   = useState('')
  const [launching, setLaunch]  = useState(false)
  const [tick, setTick]         = useState(0)

  // Prefetch game files while user browses lobby — so "Enter District" loads instantly
  useEffect(() => {
    const urls = [
      'https://aceconology.duckdns.org:8444/nonya/index.wasm',
      'https://aceconology.duckdns.org:8444/nonya/index.pck',
    ]
    urls.forEach(url => {
      const link = document.createElement('link')
      link.rel = 'prefetch'
      link.href = url
      link.as = 'fetch'
      link.crossOrigin = 'anonymous'
      document.head.appendChild(link)
    })
  }, [])

  // Ambient ticker
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 120)
    return () => clearInterval(id)
  }, [])

  // WebSocket spectate connection — receive-only (no join message sent)
  useEffect(() => {
    function connect() {
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data)
          if (msg.type === 'state') {
            playersRef.current = msg.players as Player[]
            setOnline(msg.players.length)
          }
        } catch {}
      }
      ws.onclose = () => setTimeout(connect, 4000)
      ws.onerror = () => ws.close()
    }
    connect()
    return () => { wsRef.current?.close() }
  }, [])

  // Canvas render loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    if (!ctx) return
    let raf: number
    let camX = 0   // camera offset, drifts toward average player x

    function draw() {
      const W = canvas!.width
      const H = canvas!.height
      const players = playersRef.current

      // Drift camera toward centroid
      if (players.length > 0) {
        const avgX = players.reduce((s, p) => s + p.x, 0) / players.length
        const targetCamX = Math.max(0, avgX - WORLD_W / 2)
        camX += (targetCamX - camX) * 0.02
      }

      // Background
      ctx.fillStyle = '#07090f'
      ctx.fillRect(0, 0, W, H)

      // Faint grid
      ctx.strokeStyle = 'rgba(244,63,94,0.07)'
      ctx.lineWidth = 1
      const gridStep = W / 8
      for (let x = 0; x < W; x += gridStep) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke()
      }
      for (let y = 0; y < H; y += H / 4) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
      }

      // Ground line
      const groundY = H * 0.78
      ctx.strokeStyle = 'rgba(244,63,94,0.25)'
      ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(W, groundY); ctx.stroke()

      // District label
      ctx.fillStyle = 'rgba(244,63,94,0.12)'
      ctx.font = 'bold 11px Orbitron, monospace'
      ctx.letterSpacing = '0.15em'
      ctx.textAlign = 'left'
      ctx.fillText('NONYA STREET DISTRICT', 12, 18)

      // Draw players
      players.forEach((p, i) => {
        const color = PLAYER_COLORS[i % PLAYER_COLORS.length]
        // Map world coords to canvas
        const cx = ((p.x - camX) / WORLD_W) * W
        const cy = groundY - ((p.y - WORLD_Y_MIN) / WORLD_H) * (groundY * 0.6) - 10

        if (cx < -20 || cx > W + 20) return  // off canvas

        // Glow ring
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 18)
        grad.addColorStop(0, color + 'aa')
        grad.addColorStop(1, color + '00')
        ctx.fillStyle = grad
        ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2); ctx.fill()

        // Player dot
        ctx.fillStyle = color
        ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2); ctx.fill()

        // Shadow line to ground
        ctx.strokeStyle = color + '44'
        ctx.lineWidth = 1
        ctx.setLineDash([2, 3])
        ctx.beginPath(); ctx.moveTo(cx, cy + 6); ctx.lineTo(cx, groundY); ctx.stroke()
        ctx.setLineDash([])

        // Name badge
        ctx.font = '700 11px Rajdhani, sans-serif'
        ctx.textAlign = 'center'
        const label = p.name.length > 12 ? p.name.slice(0, 11) + '…' : p.name
        const lw = ctx.measureText(label).width
        ctx.fillStyle = 'rgba(7,9,15,0.82)'
        ctx.beginPath()
        ctx.roundRect(cx - lw/2 - 5, cy - 32, lw + 10, 16, 4)
        ctx.fill()
        ctx.fillStyle = color
        ctx.fillText(label, cx, cy - 20)

        // Score
        ctx.font = '10px Rajdhani, sans-serif'
        ctx.fillStyle = 'rgba(255,255,255,0.45)'
        ctx.fillText(p.score + 'pt', cx, cy - 8)
      })

      // Empty state
      if (players.length === 0) {
        ctx.textAlign = 'center'
        ctx.fillStyle = 'rgba(244,63,94,0.3)'
        ctx.font = '12px Rajdhani, sans-serif'
        ctx.fillText('WAITING FOR PLAYERS…', W / 2, H / 2)
      }

      raf = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(raf)
  }, [])

  function handlePlay() {
    const name = playerName.trim() || 'Traveller'
    window.open(GAME_URL + '#name=' + encodeURIComponent(name), '_blank', 'noopener')
    setLaunch(true)
    setTimeout(() => setLaunch(false), 2500)
  }

  const foods = ['🍱','🥟','🍜','🧆','🍮']
  const foodLabels = ['Nasi Lemak $4.50','Kueh Lapis $2.80','Laksa Bowl $6.00','Otah Otah $1.50','Chendol Cup $3.20']

  return (
    <div className="fixed inset-0 bg-[#07090f] text-white flex flex-col overflow-hidden">

      {/* Scrolling food ticker */}
      <div className="shrink-0 h-7 bg-rose-500/5 border-b border-rose-500/10 flex items-center overflow-hidden">
        <div
          className="flex gap-10 text-[10px] font-mono whitespace-nowrap text-rose-400"
          style={{ transform: `translateX(-${(tick * 0.55) % 360}px)`, transition: 'transform 0.12s linear' }}
        >
          {[...foodLabels,...foodLabels,...foodLabels].map((f,i) => (
            <span key={i}>{foods[i % foods.length]} {f}</span>
          ))}
        </div>
      </div>

      {/* Nav */}
      <nav className="shrink-0 flex items-center justify-between px-5 py-2 border-b border-white/5">
        <button onClick={() => router.back()} className="text-slate-500 hover:text-white text-xs transition">
          ← Marketing
        </button>
        <span className="text-[10px] text-rose-500/60 font-mono tracking-widest uppercase">
          Marketing District · Live
        </span>
        <span className="text-[10px] text-slate-700">Nonya Street Challenges</span>
      </nav>

      {/* Live game canvas — takes all remaining space above the join panel */}
      <div className="relative flex-1 min-h-0">
        <canvas
          ref={canvasRef}
          className="w-full h-full block"
          width={900}
          height={400}
          style={{ imageRendering: 'pixelated' }}
        />

        {/* Live badge */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/70 border border-rose-500/30 rounded-full px-3 py-1 text-[10px] tracking-widest">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse inline-block" />
          <span className="text-rose-400 font-bold">LIVE</span>
          <span className="text-green-400 font-bold">{online}</span>
          <span className="text-slate-500">players in district</span>
        </div>
      </div>

      {/* Join panel — fixed at bottom, mirrors nexus embed spectate overlay */}
      <div className="shrink-0 border-t border-rose-500/20 bg-gradient-to-t from-black to-[#07090f] px-5 py-5">
        <div className="max-w-sm mx-auto flex flex-col items-center gap-3">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">
            Enter your name to play
          </p>
          <div className="flex gap-2 items-center w-full">
            <input
              type="text"
              maxLength={20}
              placeholder="Traveller"
              value={playerName}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handlePlay()}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-rose-500/60 transition-all"
            />
            <button
              onClick={handlePlay}
              disabled={launching}
              className="shrink-0 bg-gradient-to-r from-rose-500 to-pink-400 text-white font-bold text-sm px-5 py-2.5 rounded-lg hover:shadow-[0_0_24px_rgba(244,63,94,0.5)] transition-all disabled:opacity-60 whitespace-nowrap"
            >
              {launching ? 'Opening…' : 'Enter District →'}
            </button>
          </div>
          <p className="text-[10px] text-slate-700">
            Multiplayer · Math challenge · Peranakan culture
          </p>
        </div>
      </div>

    </div>
  )
}
