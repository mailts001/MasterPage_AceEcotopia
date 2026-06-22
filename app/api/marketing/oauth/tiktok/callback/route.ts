/**
 * TikTok OAuth2 callback — /api/marketing/oauth/tiktok/callback
 *
 * TikTok API v2 flow:
 *   1. TikTok redirects here with ?code=&state=
 *   2. Exchange code for access_token (POST /v2/oauth/token/)
 *   3. Fetch user info (open_id, display_name) via /v2/user/info/
 *   4. Upsert into merchant_social_accounts
 *   5. Redirect to /marketing/connect?connected=TT
 *
 * Note: Without TikTok app audit, posted videos default to private.
 */

import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL    = process.env.SUPABASE_URL!;
const SUPABASE_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const CLIENT_KEY      = process.env.TIKTOK_CLIENT_KEY!;
const CLIENT_SECRET   = process.env.TIKTOK_CLIENT_SECRET!;
const BASE_URL        = process.env.NEXT_PUBLIC_BASE_URL ?? "https://master-page-ace-ecotopia.vercel.app";
const REDIRECT_URI    = `${BASE_URL}/api/marketing/oauth/tiktok/callback`;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code  = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code || !state) {
    return NextResponse.redirect(`${BASE_URL}/marketing/connect?error=tiktok_denied`);
  }

  let tgId: string;
  try { tgId = JSON.parse(decodeURIComponent(state)).tg_id; }
  catch { return NextResponse.redirect(`${BASE_URL}/marketing/connect?error=bad_state`); }

  // Exchange code for tokens
  const tokenResp = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: CLIENT_KEY, client_secret: CLIENT_SECRET,
      code, grant_type: "authorization_code", redirect_uri: REDIRECT_URI,
    }),
  });
  if (!tokenResp.ok) return NextResponse.redirect(`${BASE_URL}/marketing/connect?error=tiktok_token`);
  const tokenData = await tokenResp.json();
  const tokens    = tokenData.data ?? {};

  // Fetch user info
  const userResp = await fetch(
    "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url",
    { headers: { Authorization: `Bearer ${tokens.access_token}` } }
  );
  const userData = (await userResp.json()).data?.user ?? {};

  // Upsert into Supabase
  await fetch(`${SUPABASE_URL}/rest/v1/merchant_social_accounts`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json", Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({
      merchant_tg_id:    tgId,
      platform:          "TT",
      platform_user_id:  userData.open_id ?? tokens.open_id ?? "",
      platform_username: userData.display_name ?? "",
      access_token:      tokens.access_token,
      refresh_token:     tokens.refresh_token ?? null,
      token_expiry:      tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : null,
      scopes:            tokens.scope ?? "user.info.basic,video.publish",
      connected_at:      new Date().toISOString(),
      updated_at:        new Date().toISOString(),
    }),
  });

  return NextResponse.redirect(`${BASE_URL}/marketing/connect?connected=TT`);
}
