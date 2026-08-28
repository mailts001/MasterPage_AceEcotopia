# MasterPage AceEcotopia — Claude Code Context

## Project
Next.js app on Vercel — https://master-page-ace-ecotopia.vercel.app
Game server: Colyseus on VPS 204.168.221.101:2567 (service: colyseus_game)
Game repo: /root/x68-game on VPS (TOSIOS fork, TypeScript monorepo)
Cloudflare tunnel: https://admit-layout-representative-processed.trycloudflare.com → :2567
  - Tunnel runs in screen session "tunnel" on VPS; URL changes on restart → update GAME_BASE_URL in play/page.tsx

## Key Files
- app/citizen/dashboard/commerce/play/page.tsx — game iframe, passes uid/email in URL params
- app/admin/merchants/page.tsx — merchant/product/coupon/campaign/placement admin UI
- app/api/admin/merchants/route.ts — server-side admin API (service role key, bypasses RLS)
- app/api/game/collect/route.ts — called by game server when player collects item → records reward_unlock → sends coupon email
- lib/email/send.ts — Resend email functions (sendCouponEmail added)
- components/districts/DistrictsSection.tsx — landing page district cards
- components/citymap/X68CityMap.tsx — animated city map with district overlays

## Game Server Files (on VPS /root/x68-game)
- packages/server/src/rooms/GameRoom.ts — Colyseus room, fetches placements from Supabase, handles collect
- packages/server/src/states/GameState.ts — game loop, spawns merchant prop items
- packages/server/src/entities/Game.ts — Colyseus schema, includes backgroundImageUrl field
- packages/client/src/screens/Home/Home.tsx — lobby, reads uid/email from URL params
- packages/client/src/screens/Game/Game.tsx — game screen, passes citizen identity in join options
- packages/client/src/game/Game.ts — PIXI renderer, loads background image from Loader

## Supabase Tables (game-related)
- merchants, products, coupons, campaigns — merchant setup
- campaign_placements — links product+coupon into game slot; fields: game_role, spawn_count, background_image_url, district_id, game_id, priority
- reward_unlocks — records when a citizen collects an item; UNIQUE(citizen_id, placement_id) prevents duplicates
- game_sessions, citizen_wallet — future use

## Game Placement Roles — DECISION PENDING
Currently ALL roles behave identically (spawn → contact → collect → email coupon).
Roles are stored in DB but not differentiated in game logic yet.
Planned behaviour (not yet built):
  - collectible: standard walk-over collect ✅ WORKS
  - target: must shoot item to unlock, then collect
  - decoy: collecting gives nothing / "Better luck next time" popup
  - mystery: item invisible until player within 80px radius, then reveals
  - reward: drops from killing a player who carried it
Decision: only use 'collectible' for initial merchant launch.
Revisit when ready to add game depth — decoy and mystery are quickest to build.

## Admin Setup Order
1. Merchant → 2. Products → 3. Coupons → 4. Campaign → 5. Placements
- Placements tab: set spawn_count (= how many items per game session = marketing budget)
- Set background_image_url: merchant shop photo from Imgur (i.imgur.com/xxx.jpg direct link)

## Image Hosting
- Imgur direct URL: https://i.imgur.com/XXXXXXX.jpg (right-click image → Copy image address)
- NOT album URL: https://imgur.com/a/XXXXX (this is a page, not an image)
- remove.bg: remove white background for cleaner product sprites in game
- Instagram URLs do NOT work (auth-gated, expire)

## Environment Variables Required
Vercel: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
        ADMIN_SECRET, RESEND_API_KEY, GAME_SERVER_SECRET=x68game2026
VPS /root/x68-game/.env: SUPABASE_URL, SUPABASE_SERVICE_KEY, GAME_SERVER_SECRET, NEXT_API_URL

## Rebuild Game After Changes
ssh root@204.168.221.101 "screen -dmS build bash -c 'cd /root/x68-game && yarn build > /tmp/build.log 2>&1; systemctl restart colyseus_game; echo DONE >> /tmp/build.log'"
# Check: ssh root@204.168.221.101 "tail -3 /tmp/build.log"
