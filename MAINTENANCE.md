# X68 新国度 — System Maintenance Guide

Last updated: 2026-07-21

---

## Architecture Overview

| Layer | What | Where | Stack |
|---|---|---|---|
| Master Page | Public site + citizen portal | Vercel (auto-deploy from `main`) | Next.js 15, Supabase, Tailwind |
| Financial API | Signal proxy + GA intel | Hetzner VPS `:8505` | Python FastAPI (`nexus_api.py`) |
| Trading Bot | Live strategy engine | Hetzner VPS | Python, IBKR Gateway |
| CareerGenome | District 7 — career intelligence | `career-genome.vercel.app` | Separate repo/deploy |

---

## Infrastructure

| Resource | Details |
|---|---|
| Vercel project | `master-page-ace-ecotopia.vercel.app` |
| GitHub repo | `mailts001/MasterPage_AceEcotopia` |
| Supabase project | Auth + DB (citizens, saved_assets, visitor_logs, credits_ledger) |
| Hetzner VPS | `204.168.221.101` — SSH: `ssh -i ~/.ssh/hetzner_trading root@204.168.221.101` |
| CareerGenome | `career-genome.vercel.app` — separate Vercel project |

---

## Environment Variables (Vercel)

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key (safe to expose) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only admin key — used to count auth.users |
| `ACEECONOMY_URL` | VPS financial API base: `http://204.168.221.101:8505` |
| `NEXUS_API_KEY` | Shared secret: `x68-nexus-internal-2024` |
| `RESEND_API_KEY` | Welcome email delivery |

---

## Supabase Tables

| Table | Purpose | Key columns |
|---|---|---|
| `citizens` | Citizen profiles | `id` (= auth.users.id), `display_name`, `tier`, `nexus_credits`, `referral_code`, `telegram_chat_id` |
| `saved_assets` | Watchlist items | `citizen_id`, `asset_id`, `district` |
| `credits_ledger` | Nexus credit history | `citizen_id`, `action`, `amount`, `created_at` |
| `visitor_logs` | Unique IP tracking | `ip`, `date`, `path`, `visits`, `last_seen` |

> **Citizen count**: always use `supabase.auth.admin.listUsers()` with the service role key — NOT `from('citizens').select(count)`. Supabase auth signup creates rows in `auth.users`, not `citizens` (no mirror trigger exists).

### SQL — increment_visits RPC (required for visitor tracking)
```sql
create or replace function increment_visits(p_ip text, p_date date)
returns void language plpgsql as $$
begin
  update visitor_logs set visits = visits + 1, last_seen = now()
  where ip = p_ip and date = p_date;
end;
$$;
```

---

## VPS Services

```bash
# Start / stop / restart
systemctl start|stop|restart tradingbot
systemctl start|stop|restart watchdog
systemctl start|stop|restart telegram_handler
systemctl start|stop|restart streamlit
systemctl start|stop|restart financial_nexus   # FastAPI on :8505

# Key log files
tail -f /root/trading/logs/bot.log
cat /root/trading/logs/bot_state.json
cat /root/trading/logs/ga_shadow_signals.jsonl | tail -20
cat /root/trading/logs/congress_signals.json
cat /root/trading/logs/macro_report.json
cat /root/trading/logs/ga_recommended_symbols.json
cat /root/trading/logs/rebalance_suggestion.json

# Financial API
systemctl restart financial_nexus
curl -H 'x-nexus-key: x68-nexus-internal-2024' http://localhost:8505/api/nexus/intel
```

### Financial Nexus API — all endpoints

| Endpoint | Purpose | Cache |
|---|---|---|
| `GET /api/nexus/signals` | District stats for citystate | live |
| `GET /api/nexus/picks?market=US` | US momentum + squeeze signals (default) | live |
| `GET /api/nexus/picks?market=HK` | HK scanner picks + squeeze (9 AM SGT) | live |
| `GET /api/nexus/picks?market=JP` | Japan (TSE) picks + squeeze (12:15 AM SGT) | live |
| `GET /api/nexus/picks?market=SG` | Singapore (SGX) picks + squeeze (9:15 AM SGT) | live |
| `GET /api/nexus/picks?market=ETF` | US sector ETF screener + sector rotation | live |
| `GET /api/nexus/intel` | Full regime intel: GA signals, options rec, congress trades, news | 15 min |
| `GET /api/nexus/signal-history` | Signal history export | live |
| `GET /api/nexus/commerce` | Commerce arbitrage opportunities | live |
| `GET /health` | Health check | live |

---

## Districts — Quick Reference

| # | District | ID | URL / Path | Status |
|---|---|---|---|---|
| 1 | PropOS | `propos` | `http://5.223.72.120:8504` | External VPS |
| 2 | Financial District | `aceeconomy` | `/citizen/dashboard/financial` | Internal + VPS API |
| 3 | NexusTravel | `nexustravel` | `nexus-travel-seven.vercel.app` | External Vercel |
| 4 | E-commerce | `commerce` | `/citizen/dashboard/commerce` | Internal (Citizen tier) |
| 5 | SerenityOS | `serenity` | `/citizen/dashboard/wellness` | Internal |
| 6 | MarketingOS | `marketingos` | `/marketing` | Internal |
| 7 | CareerGenome | `careergenome` | `career-genome.vercel.app/interview` | External Vercel |

> Citizens are **global** (passport model) — they don't belong to a specific district. One signup = access to all districts.

---

## Financial District — Market Coverage

### Multi-market selector (added 2026-07-21)
The dashboard has a 5-region market selector: 🇺🇸 US | 🇭🇰 HK | 🇯🇵 Japan | 🇸🇬 Singapore | 🌏 ETFs

All APAC markets read from the same `scanner_results.json` on VPS, filtered by the `market` field. The `save_scanner_results()` function in `scanner.py` merges picks per-market so they coexist in the file.

**Cron schedule (SGT):**
| Market | Scanner | Squeeze |
|---|---|---|
| US | 9 PM Mon–Fri | 8:30 PM (T1), 9:40 PM (T2) |
| HK | 9 AM Mon–Fri | 9 AM (T1) |
| JP (TSE) | 12:15 AM Mon–Fri | 11:45 PM (T1) |
| SG (SGX) | 9:15 AM Mon–Fri | — |

**Watchlists:**
- HK: Hang Seng blue chips + tech (9988 EXCLUDED — pre-existing short)
- JP: 30 Nikkei 225 blue chips — Sony (6758.T), Toyota (7203.T), SoftBank (9984.T), Nintendo (7974.T), MUFG (8306.T) and more
- SG: STI components + major REITs — DBS (D05.SI), OCBC (O39.SI), CapitaLand (C31.SI), Ascendas (A17U.SI) and more

**ETF tab** pulls `etf_screener.json` (US sector ETFs: XLK, XLV, XLF, XBI etc. with top holdings) and `market_pulse.json` (12-sector rotation heatmap, 5d/22d performance).

---

## Financial District — GA Intel Tab

Added 2026-07-15, upgraded 2026-07-21. The "📡 GA Intel" tab surfaces live signals from the upgraded trading system's 10-signal market regime engine:

**Data sources (all on VPS `logs/`):**
- `market_regime.json` → 10-signal regime (BULL/CAUTION/WARNING/DANGER), VIX, breadth, SPY 5d, rotation signals
- `news_sentiment.json` → scored headlines, bullish/bearish, shock event flag
- `options_scan.json` → Iron Condor setups with strikes, PoP%, credit, breakevens, IV rank
- `ga_shadow_signals.jsonl` → GA evolution paper-trade signals (confidence, stop, target, 4-factor scores)
- `ga_recommended_symbols.json` → hot sectors / bearish / defensive breakdown
- `rebalance_suggestion.json` → best-performing strategy by Sharpe ratio
- `congress_signals.json` → congressional + insider trade disclosures

**OPTIONS_MAP (regime → strategy recommendation):**
- BULL → Wheel Strategy (covered calls + CSPs)
- CAUTION → Iron Condors + Bull Put Spreads
- WARNING → Iron Condors (skew higher) + Protective Puts, 40% size
- DANGER → Protective Puts + Collars only

**To update strategy labels:** edit the `strategy_label_map` dict in `/root/trading/nexus_api.py` (the `intel` function).

---

## CareerGenome — District 7

Integrated 2026-07-15 as the seventh X68 district.

| Integration point | File | Notes |
|---|---|---|
| i18n strings | `lib/i18n.ts` | Keys: `d_careergenome_name/tag/desc` |
| Districts section | `components/districts/DistrictsSection.tsx` | Dual CTA: interview + recruiters |
| Showcase carousel | `components/districts/DistrictShowcase.tsx` | Video: `/districts/careergenome.mp4` |
| City map SVG | `components/citymap/CareerGenomeDistrict.tsx` | DNA helix + trajectory animation |
| Citystate API | `app/api/nexus/citystate/route.ts` | `careergenome` district entry |
| Citizen dashboard | `app/citizen/dashboard/page.tsx` | District card, indigo theme |
| FAQ guide | `components/education/DistrictGuide.tsx` | Added to both Q1 grid and Q2 comparison |
| Video asset | `public/districts/careergenome.mp4` | Compressed from ~/Documents/careerGenome/public/ |
| Poster | `public/districts/careergenome-poster.jpg` | Extracted at 0.5s |

**External routes on career-genome.vercel.app:**
- Citizen CTA → `/interview`
- Recruiter CTA → `/for-recruiters/search`
- Do NOT use `/recruiters` — 404

---

## Citizen Count — Critical Note

The hero stats and Live City State both count citizens from `auth.users`, not the `citizens` table:

```typescript
// In aggregate/route.ts and citystate/route.ts
function adminDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}
const { data } = await adminDb().auth.admin.listUsers({ perPage: 9999 })
const citizens = data?.users?.length ?? 0
```

If citizen count shows 0, check `SUPABASE_SERVICE_ROLE_KEY` is set in Vercel environment variables (not `SUPABASE_SERVICE_KEY`).

---

## IP Visitor Tracking

**How it works:**
1. `components/PageTracker.tsx` — client component, fires `POST /api/nexus/track` on every route change
2. `app/api/nexus/track/route.ts` — reads `x-forwarded-for`, upserts to `visitor_logs(ip, date)`, calls `increment_visits` RPC
3. Stats appear in citystate API as `unique_ips_today` and `unique_ips_total`
4. Displayed in the hero stats grid as "Visitors Today" and "Total Visitors"

---

## Citystate API — Districts Live Count

The `districts` object in `app/api/nexus/citystate/route.ts` must include ALL 8 districts or the "Districts Live" counter will be wrong. Current list: `propos`, `aceeconomy`, `nexustravel`, `commerce`, `serenity`, `marketingos`, `careergenome`, `deepqi`.

> Each district entry needs at minimum: `health_score`, `alerts_today`, `active_monitors`, `revenue_tier`, `status`.

---

## Adding a New District — Checklist

- [x] `lib/i18n.ts` — add name/tag/desc keys + `districtFeatures` entry; update "Seven" → "Eight" in hero/pricing strings
- [ ] `components/districts/DistrictsSection.tsx` — add `DistrictEntry` to `DISTRICTS` array
- [ ] `components/districts/DistrictShowcase.tsx` — add entry with video/poster assets
- [ ] `components/citymap/` — create `NewDistrict.tsx` SVG animation; add to `X68CityMap.tsx`
- [ ] `app/api/nexus/citystate/route.ts` — add district entry to `districts` response object
- [ ] `app/citizen/dashboard/page.tsx` — add district card
- [ ] `components/education/DistrictGuide.tsx` — add to Q1 grid and Q2 comparison
- [ ] `app/humans/page.tsx` — add expert role (if applicable)
- [ ] Add video to `public/districts/<id>.mp4` and poster `public/districts/<id>-poster.jpg`

---

## Anti-Scalping Protections (Trading Bot — DO NOT TOUCH)

These live in `/root/trading/strategies/base_strategy.py`:
- `min_hold_met()` — LongTerm=4h, MeanRev=2h; stop-loss bypasses only
- `owns_symbol()` — each strategy only exits its own positions
- `is_worth_exiting()` — profit must exceed 2× round-trip commission (~$5)
- `order_confirmed()` — waits for IBKR confirmation before saving state
- `already_in_state()` — checks IBKR live positions, not just state file

Never remove these. They prevent scalping loops and cross-strategy interference.

---

## Known Exclusions (Trading)

- `9988` (Alibaba HK) — EXCLUDED permanently. Pre-existing short -1400 shares causes order loop.
- `700` (Tencent) — Commented out of instruments. Ghost position history.
- IB Gateway restarts daily 11:59 AM SGT — watchdog pauses during this window.

---

## Deployment Workflow

```bash
# All changes deploy automatically via Vercel on push to main
git add <files>
git commit -m "your message"
git push origin main

# Vercel build takes ~60-90 seconds
# Monitor at: https://vercel.com/mailts001/master-page-ace-ecotopia
```

---

## If Things Break

| Symptom | Likely cause | Fix |
|---|---|---|
| Citizens shows 0 | `SUPABASE_SERVICE_ROLE_KEY` missing/wrong in Vercel | Check env vars in Vercel dashboard |
| Districts Live < 8 | Missing district in citystate route | Add to `districts` object in `citystate/route.ts` |
| Financial tab empty | VPS API down | `systemctl restart financial_nexus` on VPS |
| GA Intel 404 | `financial_nexus` running old code before `__main__` fix | Ensure `/api/nexus/intel` route is above `if __name__` in `nexus_api.py` |
| HK/JP/SG tab always empty | Scanner hasn't run yet (outside market hours) | Expected — each market only populates after its cron runs; check `scanner_results.json` `last_updated` field |
| ETF tab empty | `etf_screener.json` missing or stale | Check file exists on VPS; ETF scan is part of US nightly scan at 9 PM SGT |
| Intel tab TypeError crash | Missing fields in fallback response | All arrays must have `?? []` defaults in both `route.ts` fallback AND component optional chaining |
| Visitor count stuck | `increment_visits` RPC missing | Re-run SQL above in Supabase SQL editor |
| Build error: duplicate `today` | Re-introduced duplicate `const today` in citystate route | Check `citystate/route.ts` — only one `const today` per function scope |
| CareerGenome links 404 | Wrong path used | Citizen CTA = `/interview`, Recruiter CTA = `/for-recruiters/search` |
