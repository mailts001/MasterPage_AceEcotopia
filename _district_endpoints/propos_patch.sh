#!/bin/bash
# Run this on the propOS server: bash propos_patch.sh
# It appends the Nexus endpoint to main.py and restarts the API

MAIN="/root/propos/api/main.py"

# Check it's not already patched
if grep -q "nexus/signals" "$MAIN"; then
  echo "Already patched — skipping"
  exit 0
fi

cat >> "$MAIN" << 'PATCH'


# ── Nexus Master Platform Signal Endpoint ─────────────────────────────────────

def require_nexus(x_nexus_key: str = Header(default="")):
    nexus_key = os.environ.get("NEXUS_API_KEY", "")
    if not nexus_key or x_nexus_key != nexus_key:
        raise HTTPException(status_code=401, detail="Invalid Nexus key")
    return True


@app.get("/api/nexus/signals", dependencies=[Depends(require_nexus)])
def nexus_signals():
    """Read-only aggregate stats for AceEcotopia master platform."""
    from datetime import date

    alerts_today = 0
    active_monitors = 0
    last_signal_at = None

    try:
        log_path = Path(__file__).parent.parent / "logs" / "deals.log"
        if log_path.exists():
            today = date.today().isoformat()
            alerts_today = sum(1 for line in log_path.read_text().splitlines() if today in line)
    except Exception:
        pass

    try:
        cache_dir = Path(__file__).parent.parent / "cache"
        active_monitors = len(list(cache_dir.glob("*.json"))) if cache_dir.exists() else 0
    except Exception:
        pass

    try:
        for log_name in ["deals.log", "bot.log", "agent.log"]:
            log_path = Path(__file__).parent.parent / "logs" / log_name
            if log_path.exists():
                lines = [l for l in log_path.read_text().splitlines() if l.strip()]
                if lines:
                    last_signal_at = lines[-1][:19]
                    break
    except Exception:
        pass

    return {
        "district": "propos",
        "alerts_today": alerts_today,
        "active_monitors": active_monitors,
        "signals_today": alerts_today,
        "last_signal_at": last_signal_at,
        "status": "live",
    }
PATCH

echo "✓ Nexus endpoint appended to main.py"

# Add NEXUS_API_KEY to .env if not present
ENV_FILE="/root/propos/.env"
if ! grep -q "NEXUS_API_KEY" "$ENV_FILE" 2>/dev/null; then
  echo "" >> "$ENV_FILE"
  echo "# AceEcotopia master platform shared secret" >> "$ENV_FILE"
  echo "NEXUS_API_KEY=REPLACE_WITH_YOUR_KEY" >> "$ENV_FILE"
  echo "✓ NEXUS_API_KEY placeholder added to .env — replace the value!"
fi

# Restart the API (adapt if you use a different service name)
if systemctl is-active --quiet propos 2>/dev/null; then
  systemctl restart propos && echo "✓ propos service restarted"
elif systemctl is-active --quiet propos-api 2>/dev/null; then
  systemctl restart propos-api && echo "✓ propos-api service restarted"
else
  echo "⚠ Could not find service name — restart manually: systemctl restart <your-propos-service>"
fi
