import { NextRequest, NextResponse } from 'next/server'

const ADMIN_SECRET = process.env.ADMIN_SECRET ?? ''
const GROQ_API_KEY = process.env.GROQ_API_KEY ?? ''

// LLM just picks thematic flavour — structural richness is always built in code
const LAYOUT_SYSTEM = `/no_think You design game map themes. Output ONLY a JSON object.
Floor GIDs: 27=stone-road 28=wood-floor 29=carpet 38=dark-stone 40=light-marble
Room names: use evocative names like "Merchant Hall", "Shadow Vault", "Grand Bazaar", "Alchemist Den"
Rules: vary floor GIDs across rooms, no two rooms same floor.`

interface Room  { x:number; y:number; w:number; h:number; floor?:number; name?:string }
interface Point { x:number; y:number; name?:string }

interface LayoutSpec {
  floor_default?: number
  rooms?: Room[]        // 4 corner buildings (positions auto-clamped)
  pillars?: Point[]     // extra decorative pillars beyond built-in ones
  spawners?: Point[]    // extra spawners beyond built-in ones
  boss_room?: boolean   // include a walled boss chamber
  maze?: boolean        // include a maze wing
}

// ─────────────────────────────────────────────────────────────────────────────
// Core map builder — structural layout always present, LLM flavours it
// ─────────────────────────────────────────────────────────────────────────────
function buildTMJ(spec: LayoutSpec) {
  const W = 32, H = 32
  const ground     = new Array(W * H).fill(spec.floor_default ?? 27)
  const walls      = new Array(W * H).fill(0)
  const decor      = new Array(W * H).fill(0)
  const spawnerL   = new Array(W * H).fill(0)
  const collisions = new Array(W * H).fill(0)

  const idx  = (x: number, y: number) => y * W + x
  const safe = (x: number, y: number) => x >= 0 && x < W && y >= 0 && y < H

  const WALL = 51, COLL = 100

  function fillG(x1:number,y1:number,x2:number,y2:number,gid:number) {
    for(let y=Math.max(0,y1);y<=Math.min(H-1,y2);y++)
      for(let x=Math.max(0,x1);x<=Math.min(W-1,x2);x++) ground[idx(x,y)]=gid
  }
  function fillW(x1:number,y1:number,x2:number,y2:number) {
    for(let y=Math.max(0,y1);y<=Math.min(H-1,y2);y++)
      for(let x=Math.max(0,x1);x<=Math.min(W-1,x2);x++){walls[idx(x,y)]=WALL;collisions[idx(x,y)]=COLL}
  }
  function clearW(x:number,y:number){if(safe(x,y)){walls[idx(x,y)]=0;collisions[idx(x,y)]=0}}

  // ── 1. Outer border ────────────────────────────────────────────────────────
  fillW(0,0,W-1,0); fillW(0,H-1,W-1,H-1)
  fillW(0,0,0,H-1); fillW(W-1,0,W-1,H-1)

  // ── 2. Road network ────────────────────────────────────────────────────────
  // Vertical roads: cols 9-10 (west) and 21-22 (east)
  // Horizontal roads: rows 9-10 (north) and 21-22 (south)
  // Already stone (floor_default=27), just mark centrally

  // ── 3. Water canal ─────────────────────────────────────────────────────────
  // Horizontal canal rows 14-15, cols 1-8 (west) and 23-30 (east) — impassable
  fillG(1,14,8,15,38);  for(let x=1;x<=8;x++) for(let y=14;y<=15;y++) collisions[idx(x,y)]=COLL
  fillG(23,14,30,15,38); for(let x=23;x<=30;x++) for(let y=14;y<=15;y++) collisions[idx(x,y)]=COLL

  // ── 4. Bridges over canal ─────────────────────────────────────────────────
  // West bridge: cols 9-10, rows 14-15 (wood, passable)
  fillG(9,14,10,15,28);  clearW(9,14);clearW(10,14);clearW(9,15);clearW(10,15)
  // East bridge: cols 21-22, rows 14-15
  fillG(21,14,22,15,28); clearW(21,14);clearW(22,14);clearW(21,15);clearW(22,15)
  // Bridge railings (visual walls on canal edge, not blocking bridge)
  walls[idx(9,13)]=WALL; walls[idx(10,13)]=WALL
  walls[idx(9,16)]=WALL; walls[idx(10,16)]=WALL
  walls[idx(21,13)]=WALL; walls[idx(22,13)]=WALL
  walls[idx(21,16)]=WALL; walls[idx(22,16)]=WALL

  // ── 5. Tunnel passage ─────────────────────────────────────────────────────
  // Dark archway on west side: cols 1-7, rows 14-15 (dark floor, passable)
  // Already set to water, now make cols 1-6 passable tunnel instead
  for(let x=1;x<=6;x++) for(let y=14;y<=15;y++) {
    ground[idx(x,y)]=38; collisions[idx(x,y)]=0  // passable dark floor
  }
  // Arch walls: row 13 and row 16, cols 1-6 (visual gateway)
  for(let x=1;x<=6;x++){
    walls[idx(x,13)]=WALL; collisions[idx(x,13)]=COLL
    walls[idx(x,16)]=WALL; collisions[idx(x,16)]=COLL
  }
  // Reopen tunnel mouth at cols 7-8 (connects tunnel to main road)
  clearW(7,13); clearW(7,16); clearW(8,13); clearW(8,16)

  // ── 6. Central plaza ──────────────────────────────────────────────────────
  fillG(11,11,20,20,40)
  // Plaza pillar corners
  for(const [px,py] of [[11,11],[20,11],[11,20],[20,20]] as [number,number][]) {
    decor[idx(px,py)]=84; collisions[idx(px,py)]=COLL
  }
  // Plaza edge pillars (mid-sides)
  for(const [px,py] of [[15,11],[11,15],[20,15],[15,20]] as [number,number][]) {
    decor[idx(px,py)]=84; collisions[idx(px,py)]=COLL
  }

  // ── 7. Corner buildings from LLM spec ──────────────────────────────────────
  const defaultRooms: Room[] = [
    {x:1,y:1,w:8,h:8,floor:29,name:'Market'},
    {x:23,y:1,w:8,h:8,floor:28,name:'Tavern'},
    {x:1,y:23,w:8,h:8,floor:29,name:'Guild Hall'},
    {x:23,y:23,w:8,h:8,floor:38,name:'Shadow Vault'},
  ]
  const rooms = (spec.rooms && spec.rooms.length >= 4) ? spec.rooms : defaultRooms
  for(const room of rooms.slice(0,4)) {
    const x2=Math.min(room.x+room.w-1,W-2), y2=Math.min(room.y+room.h-1,H-2)
    fillG(room.x,room.y,x2,y2,room.floor??29)
    // Walls
    fillW(room.x,room.y,x2,room.y)
    fillW(room.x,y2,x2,y2)
    fillW(room.x,room.y,room.x,y2)
    fillW(x2,room.y,x2,y2)
    // Door at south centre
    const dx=room.x+Math.floor((x2-room.x)/2)
    clearW(dx,y2); clearW(dx+1,y2)
  }

  // ── 8. Boss room (optional) ────────────────────────────────────────────────
  if(spec.boss_room) {
    // Large walled chamber, centre-south, GID 38 dark floor
    fillG(12,23,19,29,38)
    fillW(12,23,19,23); fillW(12,29,19,29)
    fillW(12,23,12,29); fillW(19,23,19,29)
    clearW(15,23); clearW(16,23)  // entrance at north wall
    // Boss pillar quad
    for(const [px,py] of [[14,25],[17,25],[14,28],[17,28]] as [number,number][]) {
      decor[idx(px,py)]=84; collisions[idx(px,py)]=COLL
    }
    spawnerL[idx(15,26)]=102; spawnerL[idx(16,26)]=102
  }

  // ── 9. Maze wing (optional) ────────────────────────────────────────────────
  if(spec.maze) {
    // East wing maze: cols 23-30, rows 1-12, dark floor with wall corridors
    fillG(23,1,30,12,38)
    // Horizontal maze walls
    fillW(23,3,28,3); clearW(26,3)
    fillW(25,5,30,5); clearW(27,5)
    fillW(23,7,28,7); clearW(24,7)
    fillW(25,9,30,9); clearW(29,9)
    fillW(23,11,28,11); clearW(25,11)
  }

  // ── 10. Default spawners ──────────────────────────────────────────────────
  const defaultSpawns:Point[] = [
    {x:15,y:15},{x:16,y:15},{x:15,y:16},{x:16,y:16},  // plaza centre
    {x:5,y:5},{x:26,y:5},{x:5,y:26},{x:26,y:26},       // building interiors
    {x:10,y:14},{x:23,y:14},                            // bridge approach
  ]
  for(const s of [...defaultSpawns,...(spec.spawners??[])]) {
    if(safe(s.x,s.y)&&!walls[idx(s.x,s.y)]&&!collisions[idx(s.x,s.y)])
      spawnerL[idx(s.x,s.y)]=102
  }

  // ── 11. Extra pillars from LLM ────────────────────────────────────────────
  for(const p of spec.pillars??[]) {
    if(safe(p.x,p.y)&&!walls[idx(p.x,p.y)]) { decor[idx(p.x,p.y)]=84; collisions[idx(p.x,p.y)]=COLL }
  }

  // ── 12. Road-junction pillar markers ─────────────────────────────────────
  for(const [px,py] of [[8,8],[23,8],[8,23],[23,23]] as [number,number][]) {
    if(!walls[idx(px,py)]) { decor[idx(px,py)]=84; collisions[idx(px,py)]=COLL }
  }

  // ── Tileset (inline, TOSIOS-compatible) ───────────────────────────────────
  const tileset = {
    columns:11,firstgid:1,image:'dungeon.png',imageheight:176,imagewidth:176,
    margin:0,name:'dungeon',spacing:0,tilecount:121,tileheight:16,tilewidth:16,
    tiles:[
      {animation:[{duration:200,tileid:0},{duration:200,tileid:1},{duration:200,tileid:2},{duration:200,tileid:3}],id:0},
      {animation:[{duration:200,tileid:4},{duration:200,tileid:5},{duration:200,tileid:6},{duration:200,tileid:7}],id:4},
      {animation:[{duration:200,tileid:8},{duration:200,tileid:9},{duration:200,tileid:10},{duration:200,tileid:11}],id:8},
      {animation:[{duration:200,tileid:12},{duration:200,tileid:13},{duration:200,tileid:14},{duration:200,tileid:15}],id:12},
      {animation:[{duration:200,tileid:16},{duration:200,tileid:17},{duration:200,tileid:18},{duration:200,tileid:19}],id:16},
      {id:99,type:'full'},{id:100,type:'half'},
    ],
  }

  const mkLayer = (name:string,data:number[]) =>
    ({data,height:H,width:W,name,opacity:1,type:'tilelayer',visible:true,x:0,y:0})

  return {
    width:W,height:H,tilewidth:16,tileheight:16,
    orientation:'orthogonal',renderorder:'right-down',
    infinite:false,version:'1.10',type:'map',tiledversion:'1.10.1',
    nextlayerid:6,nextobjectid:1,tilesets:[tileset],
    layers:[
      mkLayer('ground',ground),mkLayer('walls',walls),
      mkLayer('decor',decor),mkLayer('spawners',spawnerL),
      mkLayer('collisions',collisions),
    ],
  }
}

function toAscii(mapData: ReturnType<typeof buildTMJ>): string {
  const W = 32
  const lyr: Record<string,number[]> = {}
  for(const l of mapData.layers) if('data' in l) lyr[l.name]=l.data as number[]
  let out = ''
  for(let y=0;y<32;y++){
    let row=''
    for(let x=0;x<32;x++){
      const i=y*W+x
      const w=lyr.walls?.[i]??0,d=lyr.decor?.[i]??0,s=lyr.spawners?.[i]??0,g=lyr.ground?.[i]??0
      if(w) row+='█'
      else if(d===84) row+='P'
      else if(d===94) row+='+'
      else if(s) row+='S'
      else if(g===40) row+='░'
      else if(g===29) row+='·'
      else if(g===38) row+='▪'
      else if(g===28) row+='-'
      else row+=' '
    }
    out+=row+'\n'
  }
  return out
}

export async function POST(req: NextRequest) {
  if(req.headers.get('x-admin-secret')!==ADMIN_SECRET)
    return NextResponse.json({error:'Unauthorized'},{status:401})

  const {prompt,theme,features}=await req.json()
  const hasBoss    = features?.includes('boss_room')
  const hasMaze    = features?.includes('maze')

  const userPrompt = `Town map concept: "${prompt}" (theme: ${theme})
Pick 4 evocative room names and floor GIDs (27/28/29/38/40) that fit the concept. Each room different floor.
Return ONLY this JSON:
{"floor_default":27,"rooms":[{"x":1,"y":1,"w":8,"h":8,"floor":29,"name":"Market Hall"},{"x":23,"y":1,"w":8,"h":8,"floor":28,"name":"Tavern"},{"x":1,"y":23,"w":8,"h":8,"floor":40,"name":"Guild Hall"},{"x":23,"y":23,"w":8,"h":8,"floor":38,"name":"Shadow Vault"}],"pillars":[{"x":15,"y":8},{"x":15,"y":23}]${hasBoss?`,"boss_room":true`:''}${hasMaze?`,"maze":true`:''}}`

  if(!GROQ_API_KEY)
    return NextResponse.json({error:'GROQ_API_KEY not set on server'},{status:500})

  const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions',{
    method:'POST',
    headers:{'Authorization':`Bearer ${GROQ_API_KEY}`,'Content-Type':'application/json'},
    body:JSON.stringify({
      model:'qwen/qwen3.8-27b',
      messages:[
        {role:'system',content:LAYOUT_SYSTEM},
        {role:'user',content:userPrompt},
      ],
      max_tokens:600,
      temperature:0.7,
    }),
  })

  if(!groqRes.ok){
    const err=await groqRes.text()
    return NextResponse.json({error:`Groq error: ${err}`},{status:500})
  }

  const groqData=await groqRes.json()
  let raw=groqData.choices?.[0]?.message?.content?.trim()??''
  const rawPreview=raw.slice(0,400)

  // Strip thinking tags and fences
  raw=raw.replace(/<think>[\s\S]*?<\/think>/gi,'').trim()
  const fenceMatch=raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  if(fenceMatch) raw=fenceMatch[1].trim()

  // Depth-tracking extractor — largest block with floor_default
  function extractJsonBlocks(text:string):string[]{
    const blocks:string[]=[]; let depth=0,start=-1
    for(let i=0;i<text.length;i++){
      if(text[i]==='{'){if(depth===0)start=i;depth++}
      else if(text[i]==='}'){depth--;if(depth===0&&start>=0){blocks.push(text.slice(start,i+1));start=-1}}
    }
    return blocks
  }
  const blocks=extractJsonBlocks(raw).filter(b=>b.includes('floor_default')&&!b.includes('...'))
  if(blocks.length>0) raw=blocks.reduce((a,b)=>a.length>=b.length?a:b)

  let spec: LayoutSpec
  try {
    spec=JSON.parse(raw)
  } catch {
    // Repair truncated JSON
    let fixed=raw.replace(/,?\s*"[^"]*$/,'').replace(/,\s*$/,'').replace(/,\s*([\]\}])/g,'$1')
    const stack:string[]=[]; let inStr=false,escape=false
    for(const ch of fixed){
      if(escape){escape=false;continue}
      if(ch==='\\'&&inStr){escape=true;continue}
      if(ch==='"'){inStr=!inStr;continue}
      if(!inStr){
        if(ch==='{')stack.push('}')
        else if(ch==='[')stack.push(']')
        else if(ch==='}'||ch===']')stack.pop()
      }
    }
    fixed+=stack.reverse().join('')
    try { spec=JSON.parse(fixed) }
    catch {
      // Fall back to default spec — structural map still builds fine
      console.warn('[arena/generate] LLM parse failed, using defaults. Raw:',rawPreview)
      spec={}
    }
  }

  // Always inject feature flags from UI checkboxes
  if(hasBoss) spec.boss_room=true
  if(hasMaze) spec.maze=true

  const mapData=buildTMJ(spec)
  const preview=toAscii(mapData)

  return NextResponse.json({preview,mapJson:mapData})
}
