"""
ADD THIS FILE TO YOUR PROPOS SERVER:
Copy to: /root/propos/api/nexus_signals.py
Then add the route to your main Flask/FastAPI app (see bottom of file)

This exposes a READ-ONLY signal endpoint for AceEcotopia master platform.
NO property data, NO user data, NO prices — only aggregate counts.
"""

import os
import json
from datetime import datetime, date
from pathlib import Path

NEXUS_API_KEY = os.getenv('NEXUS_API_KEY', 'changeme')
LOGS_DIR = Path('/root/propos/logs')
DATA_DIR = Path('/root/propos/data')


def get_nexus_signals():
    """Return safe aggregate stats for the master platform."""

    # Count alerts fired today from logs
    alerts_today = 0
    try:
        log_file = LOGS_DIR / 'alerts.log'
        if log_file.exists():
            today = date.today().isoformat()
            with open(log_file) as f:
                alerts_today = sum(1 for line in f if today in line)
    except Exception:
        pass

    # Count active property monitors
    active_monitors = 0
    try:
        # Adapt this path to wherever propOS stores monitored properties
        state_files = list(DATA_DIR.glob('*.json'))
        active_monitors = len(state_files)
    except Exception:
        pass

    # Last signal timestamp
    last_signal_at = None
    try:
        log_file = LOGS_DIR / 'bot.log'
        if log_file.exists():
            with open(log_file) as f:
                lines = f.readlines()
                if lines:
                    last_signal_at = lines[-1][:19]  # ISO timestamp from log
    except Exception:
        pass

    return {
        'district': 'propos',
        'alerts_today': alerts_today,
        'active_monitors': active_monitors,
        'signals_today': alerts_today,
        'last_signal_at': last_signal_at,
        'status': 'live',
    }


# ============================================================
# FLASK VERSION — add this to your existing Flask app
# ============================================================
# from flask import Flask, request, jsonify
# from .nexus_signals import get_nexus_signals, NEXUS_API_KEY
#
# @app.route('/api/nexus/signals')
# def nexus_signals():
#     key = request.headers.get('x-nexus-key')
#     if key != NEXUS_API_KEY:
#         return jsonify({'error': 'Unauthorized'}), 401
#     return jsonify(get_nexus_signals())


# ============================================================
# FASTAPI VERSION — add this to your existing FastAPI app
# ============================================================
# from fastapi import APIRouter, Header, HTTPException
# from .nexus_signals import get_nexus_signals, NEXUS_API_KEY
#
# router = APIRouter()
#
# @router.get('/api/nexus/signals')
# async def nexus_signals(x_nexus_key: str = Header(None)):
#     if x_nexus_key != NEXUS_API_KEY:
#         raise HTTPException(status_code=401, detail='Unauthorized')
#     return get_nexus_signals()


# ============================================================
# STANDALONE — if propOS has no web server yet, run this:
# python3 nexus_signals.py
# Runs on port 8080, add to nginx proxy
# ============================================================
if __name__ == '__main__':
    from http.server import HTTPServer, BaseHTTPRequestHandler
    import urllib.parse

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            if self.path != '/api/nexus/signals':
                self.send_response(404)
                self.end_headers()
                return
            key = self.headers.get('x-nexus-key')
            if key != NEXUS_API_KEY:
                self.send_response(401)
                self.end_headers()
                return
            data = json.dumps(get_nexus_signals()).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', len(data))
            self.end_headers()
            self.wfile.write(data)

        def log_message(self, *args):
            pass  # suppress logs

    print('PropOS Nexus signals running on :8080')
    HTTPServer(('0.0.0.0', 8080), Handler).serve_forever()
