import { NextRequest, NextResponse } from 'next/server'

const ADMIN_SECRET = process.env.ADMIN_SECRET ?? ''
const GROQ_API_KEY = process.env.GROQ_API_KEY ?? ''

const LAYOUT_SYSTEM = `/no_think Game map designer. Output ONLY a JSON object, no prose, no markdown.
GIDs: 27=stone 28=wood 29=carpet 38=dark 40=light 84=pillar 94=portal 102=spawner
Rules: 4 rooms in quadrants, 8+ spawners on open floor, 6+ pillars, mix 3+ floor GIDs.`

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

  const WALL_GID = 51  // dark stone wall tile (visual)
  const COLL_GID = 100 // collision marker (hidden in-game, shown in debug)

  // Outer border walls
  for (let x = 0; x < W; x++) {
    walls[idx(x,0)] = walls[idx(x,H-1)] = WALL_GID
    collisions[idx(x,0)] = collisions[idx(x,H-1)] = COLL_GID
  }
  for (let y = 0; y < H; y++) {
    walls[idx(0,y)] = walls[idx(W-1,y)] = WALL_GID
    collisions[idx(0,y)] = collisions[idx(W-1,y)] = COLL_GID
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
      walls[idx(rx, room.y)] = WALL_GID; collisions[idx(rx, room.y)] = COLL_GID
      walls[idx(rx, room.y+room.h-1)] = WALL_GID; collisions[idx(rx, room.y+room.h-1)] = COLL_GID
    }
    for (let ry = room.y; ry < room.y + room.h; ry++) {
      walls[idx(room.x, ry)] = WALL_GID; collisions[idx(room.x, ry)] = COLL_GID
      walls[idx(room.x+room.w-1, ry)] = WALL_GID; collisions[idx(room.x+room.w-1, ry)] = COLL_GID
    }
    // Door opening
    const dx = room.x + Math.floor(room.w / 2)
    const dy = room.y + room.h - 1
    walls[idx(dx, dy)] = 0; collisions[idx(dx, dy)] = 0
  }

  // Extra wall rects
  for (const wr of spec.walls ?? []) { fillRect(walls, wr.x, wr.y, wr.w, wr.h, WALL_GID); fillRect(collisions, wr.x, wr.y, wr.w, wr.h, COLL_GID) }

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
    { name:'spawners',   type:'tilelayer', data:spawners,   width:W, height:H, x:0, y:0, opacity:1, visible:true },
    { name:'collisions', type:'tilelayer', data:collisions, width:W, height:H, x:0, y:0, opacity:1, visible:true },
  ]

  // Inline tileset matching TOSIOS small.json format exactly (16px tiles, 176x176 dungeon.png)
  const inlineTileset = {
    columns: 11, firstgid: 1, image: 'dungeon.png', imageheight: 176, imagewidth: 176,
    margin: 0, name: 'dungeon', spacing: 0, tilecount: 121, tileheight: 16, tilewidth: 16,
    tiles: [
      { animation: [{duration:200,tileid:0},{duration:200,tileid:1},{duration:200,tileid:2},{duration:200,tileid:3}], id:0 },
      { animation: [{duration:200,tileid:4},{duration:200,tileid:5},{duration:200,tileid:6},{duration:200,tileid:7}], id:4 },
      { animation: [{duration:200,tileid:8},{duration:200,tileid:9},{duration:200,tileid:10},{duration:200,tileid:11}], id:8 },
      { animation: [{duration:200,tileid:12},{duration:200,tileid:13},{duration:200,tileid:14},{duration:200,tileid:15}], id:12 },
      { animation: [{duration:200,tileid:16},{duration:200,tileid:17},{duration:200,tileid:18},{duration:200,tileid:19}], id:16 },
      { id:99, type:'full' }, { id:100, type:'half' },
    ],
  }

  return { width:W, height:H, tilewidth:16, tileheight:16, orientation:'orthogonal', renderorder:'right-down',
    tilesets:[inlineTileset], layers, version:'1.10', type:'map', infinite:false,
    nextlayerid: layers.length + 1, nextobjectid: 1, tiledversion:'1.10.1' }
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

  const userPrompt = `Map concept: "${prompt}" theme:${theme}${hasBridge ? ' bridge:yes' : ''}${hasTunnel ? ' tunnel:yes' : ''}${hasPortals ? ' portals:yes' : ''}
Return ONLY this JSON with values changed to fit the concept:
{"floor_default":27,"plaza":{"x":12,"y":12,"w":9,"h":9,"floor":40},"rooms":[{"x":1,"y":1,"w":8,"h":8,"floor":29},{"x":22,"y":1,"w":8,"h":8,"floor":28},{"x":1,"y":22,"w":8,"h":8,"floor":29},{"x":22,"y":22,"w":8,"h":8,"floor":38}],"pillars":[{"x":12,"y":12},{"x":19,"y":12},{"x":12,"y":19},{"x":19,"y":19},{"x":5,"y":11},{"x":26,"y":11},{"x":5,"y":20},{"x":26,"y":20}],"spawners":[{"x":16,"y":16},{"x":14,"y":14},{"x":18,"y":14},{"x":14,"y":18},{"x":18,"y":18},{"x":8,"y":5},{"x":24,"y":5},{"x":8,"y":26}]${hasPortals ? `,"portals":[{"x":16,"y":1,"name":"north"},{"x":16,"y":30,"name":"south"},{"x":30,"y":16,"name":"east"},{"x":1,"y":16,"name":"west"}]` : ''}${hasBridge ? `,"bridge":{"row_start":14,"row_end":17,"col_start":10,"col_end":22}` : ''}${hasTunnel ? `,"tunnel":{"col_start":5,"col_end":9,"row_start":18,"row_end":24}` : ''}}`

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
      max_tokens: 2048,
      temperature: 0.2,
    }),
  })

  if (!groqRes.ok) {
    const err = await groqRes.text()
    return NextResponse.json({ error: `Groq error: ${err}` }, { status: 500 })
  }

  const groqData = await groqRes.json()
  const choice = groqData.choices?.[0]
  let raw = choice?.message?.content?.trim() ?? ''
  const truncated = choice?.finish_reason === 'length'

  // Strip thinking tags and markdown fences
  raw = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch) raw = fenceMatch[1].trim()

  // Depth-tracking extractor: find every top-level {...} block, pick largest with floor_default
  function extractJsonBlocks(text: string): string[] {
    const blocks: string[] = []
    let depth = 0, start = -1
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '{') { if (depth === 0) start = i; depth++ }
      else if (text[i] === '}') { depth--; if (depth === 0 && start >= 0) { blocks.push(text.slice(start, i + 1)); start = -1 } }
    }
    return blocks
  }
  const blocks = extractJsonBlocks(raw).filter(b => b.includes('floor_default') && !b.includes('...'))
  if (blocks.length > 0) raw = blocks.reduce((a, b) => a.length >= b.length ? a : b)

  const rawPreview = raw.slice(0, 400)

  let spec: LayoutSpec
  try {
    spec = JSON.parse(raw)
  } catch {
    // 1. Strip back to last complete JSON value (handles truncated strings/keys)
    let fixed = raw
    fixed = fixed.replace(/,?\s*"[^"]*$/, '')      // drop trailing incomplete string
    fixed = fixed.replace(/,?\s*\w+\s*:\s*[^,\}\]]*$/, '') // drop trailing incomplete kv
    fixed = fixed.replace(/,\s*$/, '')              // drop trailing comma
    fixed = fixed.replace(/,\s*([\]\}])/g, '$1')   // drop comma-before-close

    // 2. Close unclosed brackets in correct order using a stack
    const stack: string[] = []
    let inStr = false, escape = false
    for (const ch of fixed) {
      if (escape) { escape = false; continue }
      if (ch === '\\' && inStr) { escape = true; continue }
      if (ch === '"') { inStr = !inStr; continue }
      if (!inStr) {
        if (ch === '{') stack.push('}')
        else if (ch === '[') stack.push(']')
        else if (ch === '}' || ch === ']') stack.pop()
      }
    }
    fixed += stack.reverse().join('')

    try {
      spec = JSON.parse(fixed)
    } catch {
      return NextResponse.json({ error: `Invalid JSON from LLM: ${rawPreview}` }, { status: 500 })
    }
  }

  const mapData = buildTMJ(spec, features ?? [])
  if (truncated) console.warn('[arena/generate] LLM output was truncated (finish_reason=length) — map may be missing spawners/portals')
  const preview = toAscii(mapData)

  return NextResponse.json({ preview, mapJson: mapData })
}
