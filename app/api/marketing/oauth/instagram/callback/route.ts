/**
 * Instagram / Meta OAuth callback — /api/marketing/oauth/instagram/callback
 *
 * Meta Graph API flow:
 *   1. Meta redirects here with ?code=&state=
 *   2. Exchange code for short-lived token
 *   3. Exchange for long-lived token (60 days)
 *   4. Get Instagram Business Account ID linked to the Facebook page
 *   5. Upsert into merchant_social_accounts
 *   6. Redirect to /marketing/connect?connected=IG
 *
 * Requirements:
 *   - User must have a Facebook account + linked Facebook Page
 *   - Instagram account must be Professional (Business or Creator)
 *   - App needs instagram_business_content_publish permission (Meta review)
 */

import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL  = process.env.SUPABASE_URL!;
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const APP_ID        = process.env.INSTAGRAM_APP_ID!;
const APP_SECRET    = process.env.INSTAGRAM_APP_SECRET!;
const BASE_URL      = process.env.NEXT_PUBLIC_BASE_URL ?? "https://master-page-ace-ecotopia.vercel.app";
const REDIRECT_URI  = `${BASE_URL}/api/marketing/oauth/instagram/callback`;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code  = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code || !state) {
    return NextResponse.redirect(`${BASE_URL}/marketing/connect?error=instagram_denied`);
  }

  let tgId: string;
  try { tgId = JSON.parse(decodeURIComponent(state)).tg_id; }
  catch { return NextResponse.redirect(`${BASE_URL}/marketing/connect?error=bad_state`); }

  // Step 1: Short-lived token
  const shortResp = await fetch("https://graph.facebook.com/v21.0/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: APP_ID, client_secret: APP_SECRET,
      redirect_uri: REDIRECT_URI, code,
    }),
  });
  if (!shortResp.ok) return NextResponse.redirect(`${BASE_URL}/marketing/connect?error=ig_short_token`);
  const { access_token: shortToken } = await shortResp.json();

  // Step 2: Long-lived token
  const longResp = await fetch(
    `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${APP_ID}&client_secret=${APP_SECRET}&fb_exchange_token=${shortToken}`
  );
  const longData = await longResp.json();
  const longToken   = longData.access_token ?? shortToken;
  const expiresIn   = longData.expires_in ?? 5184000; // 60 days default

  // Step 3: Get Instagram account ID
  const pagesResp = await fetch(
    `https://graph.facebook.com/v21.0/me/accounts?fields=instagram_business_account{id,username}&access_token=${longToken}`
  );
  const pagesData = await pagesResp.json();
  const igAccount = pagesData.data?.[0]?.instagram_business_account;
  const igUserId  = igAccount?.id ?? "";
  const igHandle  = igAccount?.username ?? "";

  // Upsert into Supabase
  await fetch(`${SUPABASE_URL}/rest/v1/merchant_social_accounts`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json", Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({
      merchant_tg_id:    tgId,
      platform:          "IG",
      platform_user_id:  igUserId,
      platform_username: igHandle,
      access_token:      longToken,
      refresh_token:     null,  // Meta long-lived tokens don't have refresh_token
      token_expiry:      new Date(Date.now() + expiresIn * 1000).toISOString(),
      scopes:            "instagram_basic,instagram_content_publish",
      connected_at:      new Date().toISOString(),
      updated_at:        new Date().toISOString(),
    }),
  });

  return NextResponse.redirect(`${BASE_URL}/marketing/connect?connected=IG`);
}
