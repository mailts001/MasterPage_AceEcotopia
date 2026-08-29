#!/usr/bin/env python3
"""
Tilemap Generation Agent — X68 AceEcotopia
==========================================
Path B: text prompt → .tmj layout + AI tile PNGs → assembled tileset → deploy to VPS

Usage:
  python3 tilemap_agent.py \
    --prompt "boutique fashion district, marble floors, warm pink brand" \
    --campaign-id <uuid> \
    --theme boutique \
    --features bridge tunnel portals

  # With merchant photo reference:
  python3 tilemap_agent.py --prompt "..." --photo shop.jpg --campaign-id ...

  # Preview only (no deploy):
  python3 tilemap_agent.py --prompt "..." --preview-only

Requirements:
  pip3 install anthropic replicate paramiko pillow requests

  Set env vars:
    ANTHROPIC_API_KEY=...
    REPLICATE_API_TOKEN=...   (free tier: replicate.com)
    SUPABASE_URL=...
    SUPABASE_SERVICE_KEY=...
    VPS_HOST=204.168.221.101
    VPS_KEY=~/.ssh/hetzner_trading
"""

import os, sys, json, argparse, base64, tempfile, time, shutil
from pathlib import Path

# ── Dependencies (graceful import errors) ───────────────────────────────────

try:
    import anthropic
    HAS_ANTHROPIC = True
except ImportError:
    HAS_ANTHROPIC = False

try:
    from groq import Groq
    HAS_GROQ = True
except ImportError:
    HAS_GROQ = False

if not HAS_ANTHROPIC and not HAS_GROQ:
    print("ERROR: pip3 install groq   (free)  OR  pip3 install anthropic  (paid)")
    sys.exit(1)

try:
    from PIL import Image
except ImportError:
    print("ERROR: pip3 install pillow"); sys.exit(1)

try:
    import requests
except ImportError:
    print("ERROR: pip3 install requests"); sys.exit(1)

# Optional — only needed for VPS deploy
try:
    import paramiko
    HAS_PARAMIKO = True
except ImportError:
    HAS_PARAMIKO = False

try:
    import replicate
    HAS_REPLICATE = True
except ImportError:
    HAS_REPLICATE = False

# ── Config ───────────────────────────────────────────────────────────────────

VPS_HOST    = os.environ.get('VPS_HOST', '204.168.221.101')
VPS_USER    = os.environ.get('VPS_USER', 'root')
VPS_KEY     = os.path.expanduser(os.environ.get('VPS_KEY', '~/.ssh/hetzner_trading'))
GAME_ROOT   = '/root/x68-game'
MAPS_DIR    = f'{GAME_ROOT}/packages/common/src/maps'
ASSETS_DIR  = f'{GAME_ROOT}/packages/client/src/game/assets/images/maps'

SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_KEY', '')

COLS, ROWS  = 11, 11
TILE_SIZE   = 32
SHEET_W     = COLS * TILE_SIZE   # 352
SHEET_H     = ROWS * TILE_SIZE   # 352

# GID reference (1-indexed, matches dungeon.png grid)
TILE_GIDS = {
    'floor_stone':  27,
    'floor_wood':   28,
    'floor_carpet': 29,
    'floor_dark':   38,
    'floor_mid':    39,
    'floor_light':  40,
    'wall_full':    100,
    'wall_h':       23,
    'wall_v':       26,
    'decor_pillar': 84,
    'decor_crate':  85,
    'decor_portal': 94,
    'spawner':      102,
    'collision':    100,
    'overhead':     28,  # bridge/tunnel overhead tiles
}

# ── Step 1: Generate .tmj map layout via Claude ──────────────────────────────

LAYOUT_SYSTEM = """Game map layout designer. Output ONLY a compact JSON layout spec, no markdown.
GIDs: 27=stone,28=wood,29=carpet,38=dark,40=light,100=wall,84=pillar,94=portal,102=spawner.
Describe a 32x32 map using rectangles and point lists — NOT full 1024-int arrays."""

LAYOUT_SCHEMA = """{
  "floor_default": 27,
  "rooms": [{"x":1,"y":1,"w":8,"h":8,"floor":29,"name":"shop1"}],
  "walls": [{"x":0,"y":0,"w":32,"h":1}],
  "pillars": [{"x":5,"y":5},{"x":10,"y":10}],
  "spawners": [{"x":3,"y":3},{"x":15,"y":15}],
  "portals": [{"x":16,"y":1,"name":"north"},{"x":16,"y":30,"name":"south"}],
  "bridge": {"row_start":9,"row_end":11,"col_start":12,"col_end":20},
  "tunnel": {"col_start":14,"col_end":17,"row_start":20,"row_end":24},
  "plaza": {"x":12,"y":12,"w":8,"h":8,"floor":40}
}"""

def _build_tmj_from_layout(spec: dict, features: list) -> dict:
    """Expand compact layout spec into full 32x32 .tmj JSON."""
    W, H = 32, 32
    ground   = [spec.get('floor_default', 27)] * (W * H)
    walls    = [0] * (W * H)
    decor    = [0] * (W * H)
    overhead = [0] * (W * H)
    spawners = [0] * (W * H)
    collisions = [0] * (W * H)

    def idx(x, y): return y * W + x
    def fill_rect(arr, x, y, w, h, gid):
        for ry in range(max(0,y), min(H, y+h)):
            for rx in range(max(0,x), min(W, x+w)):
                arr[idx(rx, ry)] = gid

    # Outer border walls
    for x in range(W):
        walls[idx(x, 0)] = walls[idx(x, H-1)] = 100
        collisions[idx(x, 0)] = collisions[idx(x, H-1)] = 100
    for y in range(H):
        walls[idx(0, y)] = walls[idx(W-1, y)] = 100
        collisions[idx(0, y)] = collisions[idx(W-1, y)] = 100

    # Plaza
    plaza = spec.get('plaza')
    if plaza:
        fill_rect(ground, plaza['x'], plaza['y'], plaza['w'], plaza['h'], plaza.get('floor', 40))

    # Rooms
    for room in spec.get('rooms', []):
        fill_rect(ground, room['x'], room['y'], room['w'], room['h'], room.get('floor', 29))
        # Room walls (perimeter)
        for rx in range(room['x'], room['x']+room['w']):
            walls[idx(rx, room['y'])] = 100; collisions[idx(rx, room['y'])] = 100
            walls[idx(rx, room['y']+room['h']-1)] = 100; collisions[idx(rx, room['y']+room['h']-1)] = 100
        for ry in range(room['y'], room['y']+room['h']):
            walls[idx(room['x'], ry)] = 100; collisions[idx(room['x'], ry)] = 100
            walls[idx(room['x']+room['w']-1, ry)] = 100; collisions[idx(room['x']+room['w']-1, ry)] = 100
        # Door opening in bottom wall center
        door_x = room['x'] + room['w'] // 2
        door_y = room['y'] + room['h'] - 1
        walls[idx(door_x, door_y)] = 0; collisions[idx(door_x, door_y)] = 0

    # Extra wall rects
    for wr in spec.get('walls', []):
        fill_rect(walls, wr['x'], wr['y'], wr['w'], wr['h'], 100)
        fill_rect(collisions, wr['x'], wr['y'], wr['w'], wr['h'], 100)

    # Pillars
    for p in spec.get('pillars', []):
        decor[idx(p['x'], p['y'])] = 84
        collisions[idx(p['x'], p['y'])] = 100

    # Spawners
    for s in spec.get('spawners', []):
        spawners[idx(s['x'], s['y'])] = 102

    # Portals in decor
    portal_objects = []
    for po in spec.get('portals', []):
        decor[idx(po['x'], po['y'])] = 94
        portal_objects.append({"name": po.get('name','portal'), "x": po['x']*32, "y": po['y']*32, "width":32,"height":32,"type":"portal"})

    # Bridge
    bridge = spec.get('bridge')
    if bridge and 'bridge' in features:
        rs, re = bridge.get('row_start',9), bridge.get('row_end',11)
        cs, ce = bridge.get('col_start',12), bridge.get('col_end',20)
        fill_rect(ground, cs, rs, ce-cs, re-rs, 28)
        for ry in range(rs, re):
            for rx in range(cs+2, ce-2):
                overhead[idx(rx, ry)] = 28

    # Tunnel
    tunnel = spec.get('tunnel')
    if tunnel and 'tunnel' in features:
        cs, ce = tunnel.get('col_start',14), tunnel.get('col_end',18)
        rs, re = tunnel.get('row_start',20), tunnel.get('row_end',25)
        fill_rect(ground, cs, rs, ce-cs, re-rs, 38)
        fill_rect(overhead, cs, rs, ce-cs, re-rs, 100)

    layers = [
        {"name":"ground","type":"tilelayer","data":ground,"width":W,"height":H,"x":0,"y":0,"opacity":1,"visible":True},
        {"name":"walls","type":"tilelayer","data":walls,"width":W,"height":H,"x":0,"y":0,"opacity":1,"visible":True},
        {"name":"decor","type":"tilelayer","data":decor,"width":W,"height":H,"x":0,"y":0,"opacity":1,"visible":True},
        {"name":"overhead","type":"tilelayer","data":overhead,"width":W,"height":H,"x":0,"y":0,"opacity":1,"visible":True},
        {"name":"spawners","type":"tilelayer","data":spawners,"width":W,"height":H,"x":0,"y":0,"opacity":1,"visible":True},
        {"name":"collisions","type":"tilelayer","data":collisions,"width":W,"height":H,"x":0,"y":0,"opacity":1,"visible":True},
    ]
    if portal_objects:
        layers.append({"name":"portals","type":"objectgroup","objects":portal_objects,"x":0,"y":0,"opacity":1,"visible":True})

    return {
        "width": W, "height": H, "tilewidth": 32, "tileheight": 32,
        "orientation": "orthogonal", "renderorder": "right-down",
        "tilesets": [{"firstgid":1,"source":"dungeon.tsj"}],
        "layers": layers,
        "version": "1.10", "type": "map",
        "infinite": False, "nextlayerid": len(layers)+1, "nextobjectid": 1
    }

def generate_map_layout(prompt: str, features: list, photo_b64: str | None, theme: str) -> dict:
    feature_desc = ', '.join(features) if features else 'open arena'
    has_bridge  = 'bridge'  in features
    has_tunnel  = 'tunnel'  in features
    has_portals = 'portals' in features

    user_prompt = f"""Design a 32x32 game map layout for: {prompt} (theme: {theme}, features: {feature_desc})

Return ONLY a JSON object matching this schema exactly:
{LAYOUT_SCHEMA}

Requirements:
- plaza centered around x=12,y=12 size 8x8 floor=40
- 2 shop rooms in corners, floor=29
- 6+ spawners in open areas (not on walls)
- pillars scattered for cover (6-10)
{"- bridge: row_start/end around rows 9-11, col_start/end cols 12-20" if has_bridge else ""}
{"- tunnel: col_start/end cols 14-17, row_start/end rows 20-24" if has_tunnel else ""}
{"- portals: north(x=16,y=1), south(x=16,y=30), east(x=30,y=16), west(x=1,y=16)" if has_portals else ""}
- floor_default should match theme vibe (27=stone,28=wood,29=carpet,38=dark,40=light)
- ONLY use GIDs from this list: 27,28,29,38,40,84,94,100. Do NOT use any other GID values."""

    raw = None

    # Priority: Groq (free) → Anthropic (paid) → Google Gemini (free)
    if HAS_GROQ and os.environ.get('GROQ_API_KEY'):
        print("\n[1/4] Generating map layout via Groq (free)...")
        client = Groq(api_key=os.environ['GROQ_API_KEY'])
        response = client.chat.completions.create(
            model="qwen/qwen3.8-27b",
            messages=[
                {"role": "system", "content": LAYOUT_SYSTEM},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=800,
            temperature=0.3,
        )
        raw = response.choices[0].message.content.strip()

    elif HAS_ANTHROPIC and os.environ.get('ANTHROPIC_API_KEY'):
        print("\n[1/4] Generating map layout via Claude (paid)...")
        client = anthropic.Anthropic(api_key=os.environ['ANTHROPIC_API_KEY'])
        messages = [{"role": "user", "content": []}]
        if photo_b64:
            messages[0]["content"].append({
                "type": "image",
                "source": {"type": "base64", "media_type": "image/jpeg", "data": photo_b64}
            })
            messages[0]["content"].append({"type": "text", "text": f"Use this photo as style reference. {user_prompt}"})
        else:
            messages[0]["content"].append({"type": "text", "text": user_prompt})
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=800,
            system=LAYOUT_SYSTEM,
            messages=messages,
        )
        raw = response.content[0].text.strip()

    elif os.environ.get('GEMINI_API_KEY'):
        print("\n[1/4] Generating map layout via Gemini (free)...")
        r = requests.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={os.environ['GEMINI_API_KEY']}",
            json={"contents": [{"parts": [{"text": LAYOUT_SYSTEM + "\n\n" + user_prompt}]}]},
            timeout=60,
        )
        raw = r.json()['candidates'][0]['content']['parts'][0]['text'].strip()

    else:
        print("ERROR: Set one of: GROQ_API_KEY (free), ANTHROPIC_API_KEY, or GEMINI_API_KEY")
        sys.exit(1)

    # Strip thinking tags (qwen/deepseek models)
    import re
    raw = re.sub(r'<think>.*?</think>', '', raw, flags=re.DOTALL).strip()

    # Strip markdown fences
    if '```' in raw:
        m = re.search(r'```(?:json)?\s*([\s\S]*?)```', raw)
        if m:
            raw = m.group(1).strip()

    # Extract first JSON object if there's surrounding text
    m = re.search(r'\{[\s\S]*\}', raw)
    if m:
        raw = m.group(0)

    spec = json.loads(raw)
    map_data = _build_tmj_from_layout(spec, features)

    print(f"  ✓ Map generated: 32x32 tiles")
    print(f"  ✓ Layers: {[l['name'] for l in map_data['layers']]}")
    return map_data

# ── Step 2: Generate tile PNGs via Replicate (Stable Diffusion) ──────────────

def build_tile_prompts(prompt: str, theme: str, used_gids: set) -> dict[int, str]:
    """Build image generation prompts for each unique GID used in the map."""
    vibe = prompt[:80]
    style = "top-down 2D game tile, 32x32 pixels, pixel art, flat colors, no background"

    base_prompts = {
        27: f"{style}, stone floor tile, {vibe} theme, subtle texture",
        28: f"{style}, wooden plank floor or bridge plank, {vibe} colors",
        29: f"{style}, carpet floor tile, {vibe} interior style",
        38: f"{style}, dark damp stone floor, tunnel interior, {vibe} palette",
        39: f"{style}, mid-tone floor transition tile, {vibe} style",
        40: f"{style}, highlighted decorative floor, plaza center, {vibe} brand colors",
        23: f"{style}, horizontal wall top edge, stone or material matching {vibe}",
        26: f"{style}, vertical wall side edge, stone or material matching {vibe}",
        84: f"{style}, decorative pillar or column seen from above, circular, {vibe} style",
        85: f"{style}, storage crate or display box, top-down view, {vibe} brand",
        88: f"{style}, barrel or decorative container, top-down, {vibe}",
        94: f"{style}, glowing portal vortex, magical gateway, {vibe} brand colors, neon glow",
        79: f"{style}, small signboard or label, {vibe} branding",
        100: f"{style}, solid stone wall block, thick border, top-down, {vibe} material",
    }
    return {gid: prompt for gid, prompt in base_prompts.items() if gid in used_gids}

def generate_tile_replicate(prompt: str, gid: int, output_dir: Path) -> Path | None:
    """Generate one 32x32 tile PNG via Replicate API (free tier)."""
    if not HAS_REPLICATE:
        return None
    try:
        output = replicate.run(
            "stability-ai/stable-diffusion:ac732df83cea7fff18b8472768c88ad041fa750d67ae3e1b8a2a8a0be1aba1d9",
            input={
                "prompt": prompt,
                "negative_prompt": "blurry, 3d render, photorealistic, text, watermark, gradient background",
                "width": 512, "height": 512,
                "num_inference_steps": 20,
                "guidance_scale": 7.5,
            }
        )
        img_url = output[0] if isinstance(output, list) else str(output)
        r = requests.get(img_url, timeout=30)

        # Save full-size then resize to 32x32
        tmp = output_dir / f"tile_{gid:03d}_full.png"
        tmp.write_bytes(r.content)
        img = Image.open(tmp).convert("RGBA").resize((TILE_SIZE, TILE_SIZE), Image.LANCZOS)
        out_path = output_dir / f"tile_{gid:03d}.png"
        img.save(out_path)
        tmp.unlink()
        return out_path
    except Exception as e:
        print(f"    ⚠ Replicate failed for gid {gid}: {e}")
        return None

def generate_tile_dalle(prompt: str, gid: int, output_dir: Path) -> Path | None:
    """Fallback: generate tile via DALL-E 3 (uses Anthropic key placeholder)."""
    # Note: DALL-E requires OpenAI key — skipped if not available
    return None

def generate_tiles(map_data: dict, prompt: str, theme: str, override_dir: Path | None, output_dir: Path) -> None:
    print("\n[2/4] Generating tile PNGs...")

    # Collect all unique non-zero GIDs used across tile layers
    used_gids = set()
    for layer in map_data.get('layers', []):
        if layer.get('type') == 'tilelayer' and layer['name'] not in ('spawners',):
            used_gids.update(gid for gid in layer.get('data', []) if gid > 0 and gid != 102)

    print(f"  Unique GIDs in map: {sorted(used_gids)}")
    tile_prompts = build_tile_prompts(prompt, theme, used_gids)

    for gid, tile_prompt in tile_prompts.items():
        out_path = output_dir / f"tile_{gid:03d}.png"

        # Check for manual override first (Path A tiles drop here)
        if override_dir:
            override = override_dir / f"tile_{gid:03d}.png"
            if override.exists():
                shutil.copy(override, out_path)
                print(f"  ✓ gid {gid:3d} → manual override")
                continue

        if HAS_REPLICATE and os.environ.get('REPLICATE_API_TOKEN'):
            result = generate_tile_replicate(tile_prompt, gid, output_dir)
            if result:
                print(f"  ✓ gid {gid:3d} → AI generated (Replicate)")
                continue

        # Final fallback: solid color placeholder
        color = {
            27: (80, 70, 60, 255),    # stone grey
            28: (120, 80, 40, 255),   # wood brown
            29: (100, 60, 80, 255),   # carpet purple
            38: (40, 40, 50, 255),    # dark tunnel
            40: (180, 160, 100, 255), # light plaza
            94: (0, 200, 255, 255),   # cyan portal
            84: (120, 120, 140, 255), # grey pillar
            100: (50, 45, 55, 255),   # wall
        }.get(gid, (100, 100, 100, 255))
        img = Image.new("RGBA", (TILE_SIZE, TILE_SIZE), color)
        img.save(out_path)
        print(f"  ○ gid {gid:3d} → color placeholder (set REPLICATE_API_TOKEN for AI tiles)")

# ── Step 3: Assemble tileset sheet ───────────────────────────────────────────

PLACEHOLDER_COLORS = {
    1:  (60,50,45,255), 2:  (65,55,50,255), 3:  (70,60,55,255),
    4:  (75,65,60,255), 5:  (80,70,65,255), 6:  (85,75,70,255),
    7:  (90,80,75,255), 8:  (95,85,80,255), 9:  (100,90,85,255),
    10: (105,95,90,255),11: (110,100,95,255),12: (115,105,100,255),
    13: (120,110,105,255),14:(60,80,60,255),15: (65,85,65,255),
    16: (70,90,70,255),17: (75,95,75,255),18: (80,100,80,255),
    19: (85,105,85,255),20: (90,110,90,255),21: (95,115,95,255),
    22: (60,60,80,255),23: (65,65,85,255),24: (70,70,90,255),
    25: (75,75,95,255),26: (80,80,100,255),
    27: (80,70,60,255),    # stone floor
    28: (120,80,40,255),   # wood floor
    29: (100,60,80,255),   # carpet
    30: (90,70,50,255),31: (85,65,45,255),32: (80,60,40,255),
    33: (75,55,35,255),34: (70,50,30,255),35: (65,45,25,255),
    36: (60,40,20,255),37: (55,35,15,255),
    38: (40,40,50,255),    # dark tunnel
    39: (50,50,60,255),    # mid floor
    40: (180,160,100,255), # light plaza
    41: (170,150,90,255),42: (160,140,80,255),43: (150,130,70,255),
    44: (140,120,60,255),45: (130,110,50,255),46: (120,100,40,255),
    47: (110,90,30,255),48: (100,80,20,255),49: (90,70,10,255),
    50: (80,60,0,255),51: (70,50,0,255),52: (60,40,0,255),
    53: (50,30,0,255),54: (40,20,0,255),55: (30,10,0,255),
    56: (20,0,0,255),57: (10,0,0,255),58: (0,0,0,255),
    59: (10,10,10,255),60: (20,20,20,255),61: (30,30,30,255),
    62: (40,40,40,255),63: (50,50,50,255),64: (60,60,60,255),
    65: (70,70,70,255),66: (80,80,80,255),67: (90,90,90,255),
    68: (100,100,100,255),69: (110,110,110,255),70: (120,120,120,255),
    71: (130,130,130,255),72: (140,140,140,255),73: (150,150,150,255),
    74: (160,160,160,255),75: (170,170,170,255),76: (180,180,180,255),
    77: (190,190,190,255),78: (200,200,200,255),79: (60,80,100,255),
    80: (70,90,110,255),81: (80,100,120,255),82: (90,110,130,255),
    83: (100,120,140,255),
    84: (120,120,140,255),  # pillar
    85: (110,90,70,255),86: (100,80,60,255),87: (90,70,50,255),
    88: (80,60,40,255),89: (70,50,30,255),90: (60,40,20,255),
    91: (50,30,10,255),92: (40,20,0,255),93: (30,10,0,255),
    94: (0,200,255,255),    # portal
    95: (0,180,230,255),96: (0,160,210,255),97: (0,140,190,255),
    98: (0,120,170,255),99: (0,100,150,255),
    100: (50,45,55,255),    # wall
    101: (55,50,60,255),
    102: (255,200,0,255),   # spawner
    103: (240,180,0,255),104: (220,160,0,255),105: (200,140,0,255),
    106: (180,120,0,255),107: (160,100,0,255),108: (140,80,0,255),
    109: (120,60,0,255),110: (100,40,0,255),111: (80,20,0,255),
    112: (60,0,0,255),113: (40,0,0,255),114: (20,0,0,255),
    115: (0,0,20,255),116: (0,0,40,255),117: (0,0,60,255),
    118: (0,0,80,255),119: (0,0,100,255),120: (0,0,120,255),
    121: (0,0,140,255),
}

def _make_placeholder(gid: int) -> Image.Image:
    color = PLACEHOLDER_COLORS.get(gid, (80,80,80,255))
    img = Image.new("RGBA", (TILE_SIZE, TILE_SIZE), color)
    # draw a subtle grid line to distinguish tiles
    from PIL import ImageDraw
    draw = ImageDraw.Draw(img)
    draw.rectangle([0,0,TILE_SIZE-1,TILE_SIZE-1], outline=(0,0,0,60))
    return img

def assemble_tileset(tiles_dir: Path, output_path: Path) -> None:
    print("\n[3/4] Assembling tileset sheet...")
    # Dark neutral background for unused slots
    sheet = Image.new("RGBA", (SHEET_W, SHEET_H), (30, 28, 35, 255))

    placed = 0
    for gid in range(1, COLS * ROWS + 1):
        candidates = [
            tiles_dir / f"tile_{gid:03d}.png",
            tiles_dir / f"tile_{gid}.png",
        ]
        tile_file = next((p for p in candidates if p.exists()), None)
        col = (gid - 1) % COLS
        row = (gid - 1) // COLS
        x, y = col * TILE_SIZE, row * TILE_SIZE

        if tile_file:
            tile = Image.open(tile_file).convert("RGBA").resize((TILE_SIZE, TILE_SIZE), Image.LANCZOS)
            sheet.paste(tile, (x, y))
            placed += 1
        # else: leave dark background — Tiled will show empty dark tile for unused slots

    sheet.save(output_path)
    print(f"  ✓ Sheet assembled: {output_path.name} ({SHEET_W}×{SHEET_H}px, {placed} tiles placed at correct GID positions)")

def write_tsj(output_dir: Path, png_name: str) -> Path:
    """Write a Tiled tileset sidecar .tsj file (named dungeon.tsj, referenced by the map)."""
    tsj = {
        "columns": COLS,
        "image": png_name,  # relative path — both files in same dir
        "imageheight": SHEET_H,
        "imagewidth": SHEET_W,
        "margin": 0,
        "name": png_name.replace('.png',''),
        "spacing": 0,
        "tilecount": COLS * ROWS,
        "tiledversion": "1.10.1",
        "tileheight": TILE_SIZE,
        "tilewidth": TILE_SIZE,
        "type": "tileset",
        "version": "1.10"
    }
    tsj_path = output_dir / "dungeon.tsj"
    with open(tsj_path, 'w') as f:
        json.dump(tsj, f, indent=2)
    print(f"  ✓ Tileset sidecar: dungeon.tsj")
    return tsj_path

# ── Step 4: Deploy to VPS ─────────────────────────────────────────────────────

def deploy_to_vps(map_json: dict, tileset_png: Path, theme: str, map_name: str, campaign_id: str | None) -> None:
    print("\n[4/4] Deploying to VPS...")

    if not HAS_PARAMIKO:
        print("  ⚠ paramiko not installed — skipping VPS deploy")
        print("  Manual deploy:")
        print(f"    scp {tileset_png} root@{VPS_HOST}:{ASSETS_DIR}/dungeon_{theme}.png")
        return

    # 1. Write map JSON to temp file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        json.dump(map_json, f, indent=2)
        map_tmp = f.name

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VPS_HOST, username=VPS_USER, key_filename=VPS_KEY, timeout=15)
    sftp = ssh.open_sftp()

    # 2. Upload tileset PNG
    remote_png = f"{ASSETS_DIR}/dungeon_{theme}.png"
    sftp.put(str(tileset_png), remote_png)
    print(f"  ✓ Uploaded tileset: dungeon_{theme}.png")

    # 3. Upload map JSON
    remote_map = f"{MAPS_DIR}/{map_name}.json"
    sftp.put(map_tmp, remote_map)
    print(f"  ✓ Uploaded map: {map_name}.json")

    sftp.close()

    # 4. Register map in Maps.List index
    register_cmd = f"""python3 -c "
with open('{MAPS_DIR}/index.ts') as f: c = f.read()
if '{map_name}' not in c:
    c = c.replace(\"import gigantic\", \"import {map_name} from './{map_name}.json';\\nimport gigantic\")
    c = c.replace('    gigantic,', '    {map_name},\\n    gigantic,')
    with open('{MAPS_DIR}/index.ts', 'w') as f: f.write(c)
    print('Map registered')
else:
    print('Already registered')
" """
    _, stdout, _ = ssh.exec_command(register_cmd)
    print(f"  ✓ {stdout.read().decode().strip()}")

    # 5. Rebuild and restart
    print("  Building game (this takes ~3 min)...")
    _, stdout, _ = ssh.exec_command(
        f"cd {GAME_ROOT} && yarn build > /tmp/build_{theme}.log 2>&1 && systemctl restart colyseus_game && echo DONE"
    )
    # Don't wait for build — it's long. User checks manually.
    print(f"  ✓ Build started in background. Check: ssh root@{VPS_HOST} \"tail -2 /tmp/build_{theme}.log\"")

    ssh.close()
    os.unlink(map_tmp)

    # 6. Update Supabase campaign map_theme
    if campaign_id and SUPABASE_URL and SUPABASE_KEY:
        r = requests.patch(
            f"{SUPABASE_URL}/rest/v1/campaigns?id=eq.{campaign_id}",
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "Content-Type": "application/json",
                "Prefer": "return=minimal",
            },
            json={"map_theme": theme},
            timeout=10,
        )
        if r.ok:
            print(f"  ✓ Campaign map_theme updated to '{theme}' in Supabase")
        else:
            print(f"  ⚠ Supabase update failed: {r.status_code}")

# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description='Tilemap Generation Agent')
    parser.add_argument('--prompt',       required=True, help='District/merchant description')
    parser.add_argument('--theme',        default='default', help='Theme name (used as map file name prefix)')
    parser.add_argument('--features',     nargs='+', default=['portals'],
                        choices=['bridge', 'tunnel', 'portals', 'boss_room', 'maze'],
                        help='Map features to include')
    parser.add_argument('--photo',        help='Optional merchant photo path (jpg/png)')
    parser.add_argument('--override-dir', help='Directory with manual tile PNGs (tile_027.png etc) to override AI tiles')
    parser.add_argument('--campaign-id',  help='Supabase campaign UUID to update map_theme')
    parser.add_argument('--preview-only', action='store_true', help='Generate files locally, skip VPS deploy')
    parser.add_argument('--out-dir',      default='/tmp/tilemap_agent', help='Output directory')
    args = parser.parse_args()

    map_name  = f"district_{args.theme}"
    out_dir   = Path(args.out_dir) / args.theme
    tiles_dir = out_dir / "tiles"
    out_dir.mkdir(parents=True, exist_ok=True)
    tiles_dir.mkdir(exist_ok=True)

    override_dir = Path(args.override_dir) if args.override_dir else None

    print(f"\n{'═'*55}")
    print(f"  Tilemap Agent — {args.theme}")
    print(f"  Prompt: {args.prompt[:60]}...")
    print(f"  Features: {args.features}")
    print(f"{'═'*55}")

    # Load photo if provided
    photo_b64 = None
    if args.photo and Path(args.photo).exists():
        with open(args.photo, 'rb') as f:
            photo_b64 = base64.b64encode(f.read()).decode()
        print(f"  Photo: {args.photo}")

    # Step 1: Map layout
    map_json = generate_map_layout(args.prompt, args.features, photo_b64, args.theme)
    map_out = out_dir / f"{map_name}.json"
    with open(map_out, 'w') as f:
        json.dump(map_json, f, indent=2)
    print(f"  → Saved: {map_out}")

    # Step 2: Tile PNGs
    generate_tiles(map_json, args.prompt, args.theme, override_dir, tiles_dir)

    # Step 3: Assemble sheet + write .tsj sidecar for Tiled
    tileset_out = out_dir / f"dungeon_{args.theme}.png"
    assemble_tileset(tiles_dir, tileset_out)
    write_tsj(out_dir, tileset_out.name)

    # Step 4: Deploy
    if not args.preview_only:
        deploy_to_vps(map_json, tileset_out, args.theme, map_name, args.campaign_id)
    else:
        print(f"\n[4/4] Preview only — files saved to {out_dir}")
        print(f"  Map:     {map_out}")
        print(f"  Tileset: {tileset_out}")
        print(f"\n  To deploy manually:")
        print(f"    scp {tileset_out} root@{VPS_HOST}:{ASSETS_DIR}/dungeon_{args.theme}.png")
        print(f"    scp {map_out} root@{VPS_HOST}:{MAPS_DIR}/{map_name}.json")

    print(f"\n{'═'*55}")
    print(f"  ✓ Done! Arena theme '{args.theme}' ready.")
    print(f"{'═'*55}\n")

if __name__ == '__main__':
    main()
