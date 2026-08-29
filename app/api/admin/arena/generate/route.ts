import { NextRequest, NextResponse } from 'next/server'

const ADMIN_SECRET = process.env.ADMIN_SECRET ?? ''
const GROQ_API_KEY = process.env.GROQ_API_KEY ?? ''

const LAYOUT_SYSTEM = `Game map layout designer. Output ONLY a compact JSON object, no markdown, no explanation.
GIDs available: 27=stone,28=wood,29=carpet,38=dark,40=light,100=wall,84=pillar,94=portal,102=spawner.
Describe a 32x32 map using rectangles and points. Do NOT output 1024-element arrays.`

interface Room  { x:number; y:number; w:number; h:number; floor?:number; name?:string }
interface Point { x:number; y:number; name?:string }
interface Rect  { x:number; y:number; w:number; h:number }
interface Span  { row_start:number; row_end:number; col_start:number; col_end:number }
interface TSpan { col_start:number; col_end:number; row_start:number; row_end:number }

interface LayoutSpec {
  floor_default?: number
  plaza?: { x:number; y:number; w:number; h:number; floor?:number }
  rooms?: Room[]
  walls?: Rect[]
  pillars?: Point[]
  spawners?: Point[]
  portals?: Point[]
  bridge?: Span
  tunnel?: TSpan
}

function buildTMJ(spec: LayoutSpec, features: string[]) {
  const W = 32, H = 32
  const ground     = new Array(W * H).fill(spec.floor_default ?? 27)
  const walls      = new Array(W * H).fill(0)
  const decor      = new Array(W * H).fill(0)
  const overhead   = new Array(W * H).fill(0)
  const spawners   = new Array(W * H).fill(0)
  const collisions = new Array(W * H).fill(0)

  const idx = (x: number, y: number) => y * W + x
  function fillRect(arr: number[], x: number, y: number, w: number, h: number, gid: number) {
    for (let ry = Math.max(0,y); ry < Math.min(H, y+h); ry++)
      for (let rx = Math.max(0,x); rx < Math.min(W, x+w); rx++)
        arr[idx(rx, ry)] = gid
  }

  // Outer border walls
  for (let x = 0; x < W; x++) {
    walls[idx(x,0)] = walls[idx(x,H-1)] = 100
    collisions[idx(x,0)] = collisions[idx(x,H-1)] = 100
  }
  for (let y = 0; y < H; y++) {
    walls[idx(0,y)] = walls[idx(W-1,y)] = 100
    collisions[idx(0,y)] = collisions[idx(W-1,y)] = 100
  }

  // Plaza
  if (spec.plaza) {
    const p = spec.plaza
    fillRect(ground, p.x, p.y, p.w, p.h, p.floor ?? 40)
  }

  // Rooms
  for (const room of spec.rooms ?? []) {
    fillRect(ground, room.x, room.y, room.w, room.h, room.floor ?? 29)
    for (let rx = room.x; rx < room.x + room.w; rx++) {
      walls[idx(rx, room.y)] = 100; collisions[idx(rx, room.y)] = 100
      walls[idx(rx, room.y+room.h-1)] = 100; collisions[idx(rx, room.y+room.h-1)] = 100
    }
    for (let ry = room.y; ry < room.y + room.h; ry++) {
      walls[idx(room.x, ry)] = 100; collisions[idx(room.x, ry)] = 100
      walls[idx(room.x+room.w-1, ry)] = 100; collisions[idx(room.x+room.w-1, ry)] = 100
    }
    // Door opening
    const dx = room.x + Math.floor(room.w / 2)
    const dy = room.y + room.h - 1
    walls[idx(dx, dy)] = 0; collisions[idx(dx, dy)] = 0
  }

  // Extra wall rects
  for (const wr of spec.walls ?? []) fillRect(walls, wr.x, wr.y, wr.w, wr.h, 100)

  // Pillars
  for (const p of spec.pillars ?? []) {
    decor[idx(p.x, p.y)] = 84
    collisions[idx(p.x, p.y)] = 100
  }

  // Spawners
  for (const s of spec.spawners ?? []) spawners[idx(s.x, s.y)] = 102

  // Portals
  const portalObjects: object[] = []
  for (const po of spec.portals ?? []) {
    decor[idx(po.x, po.y)] = 94
    portalObjects.push({ name: po.name ?? 'portal', x: po.x*32, y: po.y*32, width:32, height:32, type:'portal' })
  }

  // Bridge
  if (spec.bridge && features.includes('bridge')) {
    const { row_start:rs, row_end:re, col_start:cs, col_end:ce } = spec.bridge
    fillRect(ground, cs, rs, ce-cs, re-rs, 28)
    for (let ry = rs; ry < re; ry++)
      for (let rx = cs+2; rx < ce-2; rx++)
        overhead[idx(rx, ry)] = 28
  }

  // Tunnel
  if (spec.tunnel && features.includes('tunnel')) {
    const { col_start:cs, col_end:ce, row_start:rs, row_end:re } = spec.tunnel
    fillRect(ground, cs, rs, ce-cs, re-rs, 38)
    fillRect(overhead, cs, rs, ce-cs, re-rs, 100)
  }

  const layers = [
    { name:'ground',     type:'tilelayer', data:ground,     width:W, height:H, x:0, y:0, opacity:1, visible:true },
    { name:'walls',      type:'tilelayer', data:walls,      width:W, height:H, x:0, y:0, opacity:1, visible:true },
    { name:'decor',      type:'tilelayer', data:decor,      width:W, height:H, x:0, y:0, opacity:1, visible:true },
    { name:'overhead',   type:'tilelayer', data:overhead,   width:W, height:H, x:0, y:0, opacity:1, visible:true },
    { name:'spawners',   type:'tilelayer', data:spawners,   width:W, height:H, x:0, y:0, opacity:1, visible:true },
    { name:'collisions', type:'tilelayer', data:collisions, width:W, height:H, x:0, y:0, opacity:1, visible:true },
    ...(portalObjects.length ? [{ name:'portals', type:'objectgroup', objects:portalObjects, x:0, y:0, opacity:1, visible:true }] : []),
  ]

  return { width:W, height:H, tilewidth:32, tileheight:32, orientation:'orthogonal', renderorder:'right-down',
    tilesets:[{firstgid:1, source:'dungeon.tsj'}], layers, version:'1.10', type:'map', infinite:false }
}

function toAscii(mapData: ReturnType<typeof buildTMJ>): string {
  const W = 32
  const lyr: Record<string,number[]> = {}
  for (const l of mapData.layers) if ('data' in l) lyr[l.name] = l.data as number[]
  let out = ''
  for (let y = 0; y < 32; y++) {
    let row = ''
    for (let x = 0; x < 32; x++) {
      const i = y * W + x
      const w = lyr.walls?.[i] ?? 0
      const d = lyr.decor?.[i] ?? 0
      const s = lyr.spawners?.[i] ?? 0
      const oh = lyr.overhead?.[i] ?? 0
      const g = lyr.ground?.[i] ?? 0
      if (w)        row += '█'
      else if (d === 84) row += 'P'
      else if (d === 94) row += '+'
      else if (s)   row += 'S'
      else if (oh)  row += '▄'
      else if (g === 40) row += '░'
      else if (g === 29) row += '·'
      else if (g === 38) row += '▪'
      else if (g === 28) row += '-'
      else row += ' '
    }
    out += row + '\n'
  }
  return out
}

export async function POST(req: NextRequest) {
  if (req.headers.get('x-admin-secret') !== ADMIN_SECRET)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { prompt, theme, features } = await req.json()

  const hasBridge  = features?.includes('bridge')
  const hasTunnel  = features?.includes('tunnel')
  const hasPortals = features?.includes('portals')

  const userPrompt = `Design a 32x32 game map for: ${prompt} (theme: ${theme}, features: ${(features??[]).join(', ')})

Return ONLY a JSON object:
{
  "floor_default": 29,
  "plaza": {"x":12,"y":12,"w":8,"h":8,"floor":40},
  "rooms": [{"x":1,"y":1,"w":8,"h":8,"floor":29},{"x":22,"y":22,"w":8,"h":8,"floor":29}],
  "pillars": [{"x":5,"y":5},{"x":10,"y":8},{"x":20,"y":5},{"x":25,"y":8},{"x":5,"y":22},{"x":26,"y":22}],
  "spawners": [{"x":8,"y":16},{"x":16,"y":8},{"x":24,"y":16},{"x":16,"y":24},{"x":12,"y":12},{"x":20,"y":20}]${hasPortals ? `,\n  "portals": [{"x":16,"y":1,"name":"north"},{"x":16,"y":30,"name":"south"},{"x":30,"y":16,"name":"east"},{"x":1,"y":16,"name":"west"}]` : ''}${hasBridge ? `,\n  "bridge": {"row_start":9,"row_end":12,"col_start":12,"col_end":20}` : ''}${hasTunnel ? `,\n  "tunnel": {"col_start":14,"col_end":18,"row_start":20,"row_end":25}` : ''}
}

Rules: floor_default matches theme (27=stone,28=wood,29=carpet,38=dark,40=light). Only use GIDs 27,28,29,38,40,84,94,100. 6+ spawners in open floor. 6+ pillars for cover.`

  if (!GROQ_API_KEY) {
    return NextResponse.json({ error: 'GROQ_API_KEY not set on server' }, { status: 500 })
  }

  const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'qwen/qwen3.8-27b',
      messages: [
        { role: 'system', content: LAYOUT_SYSTEM },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 1500,
      temperature: 0.3,
    }),
  })

  if (!groqRes.ok) {
    const err = await groqRes.text()
    return NextResponse.json({ error: `Groq error: ${err}` }, { status: 500 })
  }

  const groqData = await groqRes.json()
  let raw = groqData.choices?.[0]?.message?.content?.trim() ?? ''

  // Strip thinking tags and markdown fences
  raw = raw.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch) raw = fenceMatch[1].trim()
  const objMatch = raw.match(/\{[\s\S]*\}/)
  if (objMatch) raw = objMatch[0]

  let spec: LayoutSpec
  try {
    spec = JSON.parse(raw)
  } catch {
    // Try to close truncated JSON by counting braces/brackets
    let fixed = raw
    const opens = (fixed.match(/\[|\{/g) ?? []).length
    const closes = (fixed.match(/\]|\}/g) ?? []).length
    const diff = opens - closes
    // strip trailing comma then close
    fixed = fixed.replace(/,\s*$/, '')
    for (let i = 0; i < diff; i++) fixed += (fixed.includes('[') ? ']' : '}')
    try {
      spec = JSON.parse(fixed)
    } catch {
      return NextResponse.json({ error: `Invalid JSON from LLM: ${raw.slice(0, 300)}` }, { status: 500 })
    }
  }

  const mapData = buildTMJ(spec, features ?? [])
  const preview = toAscii(mapData)

  return NextResponse.json({ preview, mapJson: mapData })
}
