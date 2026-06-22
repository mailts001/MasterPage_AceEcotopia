/**
 * LinkedIn OAuth callback — /api/marketing/oauth/linkedin/callback
 *
 * LinkedIn OAuth 2.0 flow:
 *   1. LinkedIn redirects here with ?code=&state=
 *   2. Exchange code for access_token (60-day lifetime)
 *   3. Fetch member profile (sub = person URN, name)
 *   4. Upsert into merchant_social_accounts
 *   5. Redirect to /marketing/connect?connected=LI
 *
 * Required scopes: openid profile w_member_social
 */

import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL    = process.env.SUPABASE_URL!;
const SUPABASE_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const CLIENT_ID       = process.env.LINKEDIN_CLIENT_ID!;
const CLIENT_SECRET   = process.env.LINKEDIN_CLIENT_SECRET!;
const BASE_URL        = process.env.NEXT_PUBLIC_BASE_URL ?? "https://master-page-ace-ecotopia.vercel.app";
const REDIRECT_URI    = `${BASE_URL}/api/marketing/oauth/linkedin/callback`;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code  = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code || !state) {
    return NextResponse.redirect(`${BASE_URL}/marketing/connect?error=linkedin_denied`);
  }

  let tgId: string;
  try { tgId = JSON.parse(decodeURIComponent(state)).tg_id; }
  catch { return NextResponse.redirect(`${BASE_URL}/marketing/connect?error=bad_state`); }

  // Exchange code for token
  const tokenResp = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code", code,
      redirect_uri: REDIRECT_URI, client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
    }),
  });
  if (!tokenResp.ok) return NextResponse.redirect(`${BASE_URL}/marketing/connect?error=linkedin_token`);
  const tokens = await tokenResp.json();

  // Fetch profile (OpenID Connect userinfo)
  const profileResp = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const profile = await profileResp.json();
  // LinkedIn person URN is the 'sub' field from OIDC
  const personId = profile.sub ?? "";
  const name     = profile.name ?? profile.given_name ?? "";

  // Upsert into Supabase
  await fetch(`${SUPABASE_URL}/rest/v1/merchant_social_accounts`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json", Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({
      merchant_tg_id:    tgId,
      platform:          "LI",
      platform_user_id:  personId,
      platform_username: name,
      access_token:      tokens.access_token,
      refresh_token:     tokens.refresh_token ?? null,
      token_expiry:      tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : null,
      scopes:            "openid profile w_member_social",
      connected_at:      new Date().toISOString(),
      updated_at:        new Date().toISOString(),
    }),
  });

  return NextResponse.redirect(`${BASE_URL}/marketing/connect?connected=LI`);
}
