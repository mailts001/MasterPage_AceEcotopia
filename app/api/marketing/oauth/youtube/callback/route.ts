/**
 * YouTube OAuth2 callback — /api/marketing/oauth/youtube/callback
 *
 * Flow:
 *   1. Google redirects here with ?code=&state=
 *   2. Exchange code for access_token + refresh_token
 *   3. Fetch channel info (id, handle)
 *   4. Upsert into Supabase merchant_social_accounts (service role)
 *   5. Redirect to /marketing/connect?connected=YT
 */

import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const CLIENT_ID    = process.env.YOUTUBE_CLIENT_ID!;
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET!;
const BASE_URL     = process.env.NEXT_PUBLIC_BASE_URL ?? "https://master-page-ace-ecotopia.vercel.app";
const REDIRECT_URI = `${BASE_URL}/api/marketing/oauth/youtube/callback`;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code  = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code || !state) {
    return NextResponse.redirect(`${BASE_URL}/marketing/connect?error=youtube_denied`);
  }

  let tgId: string;
  try { tgId = JSON.parse(decodeURIComponent(state)).tg_id; }
  catch { return NextResponse.redirect(`${BASE_URL}/marketing/connect?error=bad_state`); }

  // Exchange code for tokens
  const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code, client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI, grant_type: "authorization_code",
    }),
  });
  if (!tokenResp.ok) return NextResponse.redirect(`${BASE_URL}/marketing/connect?error=youtube_token`);
  const tokens = await tokenResp.json();

  // Get channel info
  const channelResp = await fetch(
    "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
    { headers: { Authorization: `Bearer ${tokens.access_token}` } }
  );
  const channelData = await channelResp.json();
  const channel = channelData.items?.[0];
  const channelId   = channel?.id ?? "";
  const channelName = channel?.snippet?.title ?? "";

  // Upsert into Supabase
  await fetch(`${SUPABASE_URL}/rest/v1/merchant_social_accounts`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json", Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({
      merchant_tg_id:    tgId,
      platform:          "YT",
      platform_user_id:  channelId,
      platform_username: channelName,
      access_token:      tokens.access_token,
      refresh_token:     tokens.refresh_token ?? null,
      token_expiry:      tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : null,
      scopes:            tokens.scope ?? "",
      connected_at:      new Date().toISOString(),
      updated_at:        new Date().toISOString(),
    }),
  });

  return NextResponse.redirect(`${BASE_URL}/marketing/connect?connected=YT`);
}
