# X68 新国度 — System Maintenance Guide

Last updated: 2026-07-15

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
| `GET /api/nexus/picks` | Momentum + squeeze signals | live |
| `GET /api/nexus/intel` | GA strategy rec + congress trades + regime | 15 min |
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

## Financial District — GA Intel Tab

Added 2026-07-15. The "📡 GA Intel" tab surfaces live data from the upgraded trading system:

**Data sources (all on VPS):**
- `macro_report.json` → market regime (Transitional / Bullish / Bearish) + IC suitability
- `ga_shadow_signals.jsonl` → GA evolution paper-trade signals (confidence, stop, target, 4-factor scores)
- `ga_recommended_symbols.json` → hot sectors / bearish / defensive breakdown
- `rebalance_suggestion.json` → best-performing strategy by Sharpe ratio
- `congress_signals.json` → congressional + insider trade disclosures

**How rationale is generated:** `nexus_api.py → /api/nexus/intel` builds a plain-English rationale from regime + best strategy. No LLM — deterministic string construction from live data.

**To update strategy labels:** edit the `strategy_map` dict in `/root/trading/nexus_api.py` (the `intel` function).

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

The `districts` object in `app/api/nexus/citystate/route.ts` must include ALL 7 districts or the "Districts Live" counter will be wrong. Current list: `propos`, `aceeconomy`, `nexustravel`, `commerce`, `serenity`, `marketingos`, `careergenome`.

> Each district entry needs at minimum: `health_score`, `alerts_today`, `active_monitors`, `revenue_tier`, `status`.

---

## Adding a New District — Checklist

- [ ] `lib/i18n.ts` — add name/tag/desc keys + `districtFeatures` entry; update "Seven" → "Eight" in hero/pricing strings
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
| Districts Live < 7 | Missing district in citystate route | Add to `districts` object in `citystate/route.ts` |
| Financial tab empty | VPS API down | `systemctl restart financial_nexus` on VPS |
| GA Intel 404 | `financial_nexus` running old code before `__main__` fix | Ensure `/api/nexus/intel` route is above `if __name__` in `nexus_api.py` |
| Visitor count stuck | `increment_visits` RPC missing | Re-run SQL above in Supabase SQL editor |
| Build error: duplicate `today` | Re-introduced duplicate `const today` in citystate route | Check `citystate/route.ts` — only one `const today` per function scope |
| CareerGenome links 404 | Wrong path used | Citizen CTA = `/interview`, Recruiter CTA = `/for-recruiters/search` |
