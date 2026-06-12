# ── Nexus Master Platform Signal Endpoint ─────────────────────────────────────
# ADD THESE LINES to /root/propos/api/main.py
# Place after the existing imports, add NEXUS_API_KEY to your .env file.
# READ-ONLY — aggregate counts only, no property data exposed.

# --- Add this near the top with other env reads (after load_dotenv line) ---
# NEXUS_API_KEY = os.environ.get("NEXUS_API_KEY", "")

# --- Add this function ---
def require_nexus(x_nexus_key: str = Header(default="")):
    nexus_key = os.environ.get("NEXUS_API_KEY", "")
    if not nexus_key or x_nexus_key != nexus_key:
        raise HTTPException(status_code=401, detail="Invalid Nexus key")
    return True


# --- Add this endpoint (paste at the end of main.py, before any if __name__ block) ---
@app.get("/api/nexus/signals", dependencies=[Depends(require_nexus)])
def nexus_signals():
    """
    Read-only aggregate stats for AceEcotopia master platform.
    No property data, no user data — counts and timestamps only.
    """
    import glob
    from datetime import date

    alerts_today = 0
    active_monitors = 0
    last_signal_at = None

    # Count deal alerts fired today
    try:
        log_path = Path(__file__).parent.parent / "logs" / "deals.log"
        if log_path.exists():
            today = date.today().isoformat()
            alerts_today = sum(1 for line in log_path.read_text().splitlines() if today in line)
    except Exception:
        pass

    # Count cached property records as a proxy for active monitors
    try:
        cache_dir = Path(__file__).parent.parent / "cache"
        active_monitors = len(list(cache_dir.glob("*.json"))) if cache_dir.exists() else 0
    except Exception:
        pass

    # Last entry in bot/agent log as last signal timestamp
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
