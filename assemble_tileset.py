"""
Assemble individual 32x32 tile PNGs into an 11x11 tileset sheet (352x352).

Usage:
  1. In MagicaVoxel: render each tile, save as tile_001.png, tile_002.png ... tile_121.png
  2. Put all PNGs in a folder (e.g. ~/tiles/)
  3. Run: python3 assemble_tileset.py ~/tiles/ dungeon.png

Tile naming: tile_001.png = gid 1 (row 0, col 0), tile_002.png = gid 2, etc.
Any missing tile is filled with transparency.
"""

import sys
from pathlib import Path
try:
    from PIL import Image
except ImportError:
    print("Install Pillow: pip3 install Pillow")
    sys.exit(1)

COLS = 11
ROWS = 11
TILE_SIZE = 32
SHEET_W = COLS * TILE_SIZE  # 352
SHEET_H = ROWS * TILE_SIZE  # 352

def assemble(tiles_dir: str, output: str):
    tiles_path = Path(tiles_dir)
    sheet = Image.new("RGBA", (SHEET_W, SHEET_H), (0, 0, 0, 0))

    for gid in range(1, COLS * ROWS + 1):
        # Try different naming conventions
        candidates = [
            tiles_path / f"tile_{gid:03d}.png",
            tiles_path / f"tile_{gid}.png",
            tiles_path / f"{gid:03d}.png",
            tiles_path / f"{gid}.png",
        ]
        tile_file = next((p for p in candidates if p.exists()), None)

        row = (gid - 1) // COLS
        col = (gid - 1) % COLS
        x = col * TILE_SIZE
        y = row * TILE_SIZE

        if tile_file:
            tile = Image.open(tile_file).convert("RGBA").resize((TILE_SIZE, TILE_SIZE), Image.LANCZOS)
            sheet.paste(tile, (x, y))
            print(f"  gid {gid:3d} → row {row}, col {col} ✓")
        else:
            print(f"  gid {gid:3d} → MISSING (transparent)")

    sheet.save(output)
    print(f"\nSaved: {output} ({SHEET_W}×{SHEET_H}px)")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 assemble_tileset.py <tiles_dir> <output.png>")
        sys.exit(1)
    assemble(sys.argv[1], sys.argv[2])
