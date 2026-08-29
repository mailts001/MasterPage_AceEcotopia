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
except ImportError:
    print("ERROR: pip3 install anthropic"); sys.exit(1)

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

MAP_SYSTEM = """You are a game map designer. Generate a valid Tiled JSON map (.tmj format) for the X68 AceEcotopia game engine.

Rules:
- Map must be exactly 32x32 tiles
- Tile size: 32px per tile
- 6 required layers: ground, walls, decor, overhead, spawners, collisions
- 1 optional objects layer: portals
- All layer data arrays must have exactly 1024 values (32*32)
- GID 0 = empty tile
- Ground tiles: 27=stone, 28=wood, 29=carpet, 38=dark, 39=mid, 40=light
- Wall/collision tile: 100
- Decor tiles: 84=pillar, 85=crate, 88=barrel, 94=portal_glow, 79=sign
- Spawner tile: 102
- Tileset image: dungeon.png (11x11 grid, 32px tiles, 121 total)
- Outer border must always be walls (gid=100) with collisions
- Spawner tiles go in open floor areas
- Overhead layer (bridge spans, tunnel ceilings) renders ABOVE the player sprite
- Portal objects layer lists named portals at map edge positions

Output ONLY the raw JSON object, no markdown, no explanation."""

def generate_map_layout(prompt: str, features: list, photo_b64: str | None, theme: str) -> dict:
    print("\n[1/4] Generating map layout via Claude...")

    client = anthropic.Anthropic(api_key=os.environ['ANTHROPIC_API_KEY'])

    feature_desc = ', '.join(features) if features else 'open arena'
    user_prompt = f"""Create a 32x32 tile game map for this district:

Merchant/District vibe: {prompt}
Theme: {theme}
Features to include: {feature_desc}

Map requirements:
- Central plaza or gathering area with highlight floor (gid=40)
- 2-3 shop rooms in corners (carpet floor gid=29, walled off with door openings)
- Scattered pillar obstacles (gid=84) for gameplay cover
- 7+ spawner positions (gid=102) in open areas
{"- Overhead bridge: wooden path (gid=28) on ground layer at rows 9-11, with overhead tiles (gid=28) at center span cols 12-20 creating under-bridge space" if "bridge" in features else ""}
{"- Tunnel section: dark floor (gid=38) with overhead tiles (gid=100) creating tunnel ceiling illusion, 4-wide corridor" if "tunnel" in features else ""}
{"- 4 portal positions: north (row 1), south (row 30), east (col 30), west (col 1) — use gid=94 in decor layer" if "portals" in features else ""}

Output the complete valid .tmj JSON now."""

    messages = [{"role": "user", "content": []}]

    if photo_b64:
        messages[0]["content"].append({
            "type": "image",
            "source": {"type": "base64", "media_type": "image/jpeg", "data": photo_b64}
        })
        messages[0]["content"].append({
            "type": "text",
            "text": f"Use this merchant photo as reference for the visual style and layout. {user_prompt}"
        })
    else:
        messages[0]["content"].append({"type": "text", "text": user_prompt})

    response = client.messages.create(
        model="claude-opus-4-8",
        max_tokens=8000,
        system=MAP_SYSTEM,
        messages=messages,
    )

    raw = response.content[0].text.strip()
    # Strip markdown fences if Claude added them
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1].rsplit("```", 1)[0].strip()

    map_data = json.loads(raw)

    # Validate basic structure
    assert map_data.get('width') == 32 and map_data.get('height') == 32, "Map must be 32x32"
    layer_names = [l['name'] for l in map_data.get('layers', [])]
    for required in ['ground', 'walls', 'collisions', 'spawners']:
        assert required in layer_names, f"Missing layer: {required}"

    print(f"  ✓ Map generated: {map_data['width']}x{map_data['height']} tiles")
    print(f"  ✓ Layers: {layer_names}")
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

def assemble_tileset(tiles_dir: Path, output_path: Path) -> None:
    print("\n[3/4] Assembling tileset sheet...")
    sheet = Image.new("RGBA", (SHEET_W, SHEET_H), (0, 0, 0, 0))

    placed = 0
    for gid in range(1, COLS * ROWS + 1):
        candidates = [
            tiles_dir / f"tile_{gid:03d}.png",
            tiles_dir / f"tile_{gid}.png",
        ]
        tile_file = next((p for p in candidates if p.exists()), None)
        row = (gid - 1) // COLS
        col = (gid - 1) % COLS
        x, y = col * TILE_SIZE, row * TILE_SIZE

        if tile_file:
            tile = Image.open(tile_file).convert("RGBA").resize((TILE_SIZE, TILE_SIZE), Image.LANCZOS)
            sheet.paste(tile, (x, y))
            placed += 1

    sheet.save(output_path)
    print(f"  ✓ Sheet assembled: {output_path.name} ({SHEET_W}×{SHEET_H}px, {placed} tiles placed)")

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

    # Step 3: Assemble sheet
    tileset_out = out_dir / f"dungeon_{args.theme}.png"
    assemble_tileset(tiles_dir, tileset_out)

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
