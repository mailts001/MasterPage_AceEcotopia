"use client";

/**
 * /marketing/connect — Connect social accounts for auto-posting
 *
 * Merchants link their social accounts here once.
 * Tokens stored in Supabase merchant_social_accounts table (service role).
 * Identity is merchant_tg_id (entered by user, stored in localStorage).
 *
 * OAuth flows per platform:
 *   YouTube  → Google OAuth2  → /api/marketing/oauth/youtube/callback
 *   TikTok   → TikTok OAuth2  → /api/marketing/oauth/tiktok/callback
 *   Instagram → Meta OAuth2   → /api/marketing/oauth/instagram/callback
 *   LinkedIn  → LinkedIn OAuth → /api/marketing/oauth/linkedin/callback
 */

import { useState, useEffect } from "react";

type Platform = "TT" | "IG" | "YT" | "LI";

const PLATFORMS: {
  value: Platform;
  label: string;
  icon: string;
  color: string;
  note: string;
  available: boolean;
}[] = [
  {
    value: "YT", label: "YouTube Shorts", icon: "▶️",
    color: "border-red-500/40 bg-red-500/5",
    note: "Works immediately — no app review needed.",
    available: true,
  },
  {
    value: "LI", label: "LinkedIn", icon: "💼",
    color: "border-blue-500/40 bg-blue-500/5",
    note: "Posts to your personal or company page.",
    available: true,
  },
  {
    value: "IG", label: "Instagram Reels", icon: "📸",
    color: "border-pink-500/40 bg-pink-500/5",
    note: "Requires a Professional (Business/Creator) account.",
    available: true,
  },
  {
    value: "TT", label: "TikTok", icon: "🎵",
    color: "border-slate-500/40 bg-slate-500/5",
    note: "Posts as private until TikTok app audit completes (~4 weeks).",
    available: true,
  },
];

function buildOAuthUrl(platform: Platform, tgId: string): string {
  const state = encodeURIComponent(JSON.stringify({ platform, tg_id: tgId }));
  const base  = process.env.NEXT_PUBLIC_BASE_URL ?? "https://master-page-ace-ecotopia.vercel.app";

  switch (platform) {
    case "YT": {
      const params = new URLSearchParams({
        client_id:     process.env.NEXT_PUBLIC_YOUTUBE_CLIENT_ID ?? "",
        redirect_uri:  `${base}/api/marketing/oauth/youtube/callback`,
        response_type: "code",
        scope:         "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube",
        access_type:   "offline",
        prompt:        "consent",
        state,
      });
      return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    }
    case "LI": {
      const params = new URLSearchParams({
        response_type: "code",
        client_id:     process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID ?? "",
        redirect_uri:  `${base}/api/marketing/oauth/linkedin/callback`,
        scope:         "openid profile w_member_social",
        state,
      });
      return `https://www.linkedin.com/oauth/v2/authorization?${params}`;
    }
    case "IG": {
      const params = new URLSearchParams({
        client_id:     process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID ?? "",
        redirect_uri:  `${base}/api/marketing/oauth/instagram/callback`,
        scope:         "instagram_basic,instagram_content_publish,pages_read_engagement",
        response_type: "code",
        state,
      });
      return `https://www.facebook.com/v21.0/dialog/oauth?${params}`;
    }
    case "TT": {
      const params = new URLSearchParams({
        client_key:    process.env.NEXT_PUBLIC_TIKTOK_CLIENT_KEY ?? "",
        redirect_uri:  `${base}/api/marketing/oauth/tiktok/callback`,
        scope:         "user.info.basic,video.publish",
        response_type: "code",
        state,
      });
      return `https://www.tiktok.com/v2/auth/authorize/?${params}`;
    }
  }
}

export default function ConnectPage() {
  const [tgId,      setTgId]      = useState("");
  const [tgSaved,   setTgSaved]   = useState(false);
  const [connected, setConnected] = useState<Record<string, boolean>>({});

  // Load saved tg_id and connected platforms from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("mos_tg_id") ?? "";
    if (saved) { setTgId(saved); setTgSaved(true); }

    const raw = localStorage.getItem("mos_connected") ?? "{}";
    try { setConnected(JSON.parse(raw)); } catch { /* ok */ }

    // Check URL for ?connected=YT (callback redirect)
    const params = new URLSearchParams(window.location.search);
    const justConnected = params.get("connected");
    if (justConnected) {
      const updated = { ...JSON.parse(localStorage.getItem("mos_connected") ?? "{}"), [justConnected]: true };
      localStorage.setItem("mos_connected", JSON.stringify(updated));
      setConnected(updated);
      window.history.replaceState({}, "", "/marketing/connect");
    }
  }, []);

  function saveTgId() {
    if (!tgId.trim()) return;
    localStorage.setItem("mos_tg_id", tgId.trim());
    setTgSaved(true);
  }

  function connect(platform: Platform) {
    if (!tgSaved || !tgId.trim()) { alert("Save your Telegram ID first."); return; }
    const url = buildOAuthUrl(platform, tgId.trim());
    if (!url) return;
    window.location.href = url;
  }

  function disconnect(platform: Platform) {
    const updated = { ...connected, [platform]: false };
    localStorage.setItem("mos_connected", JSON.stringify(updated));
    setConnected(updated);
    // TODO: also revoke token in Supabase via API route
  }

  return (
    <main className="min-h-screen bg-[#080C18] text-white px-4 py-8">
      <div className="max-w-xl mx-auto">

        {/* Nav */}
        <div className="flex items-center gap-2 mb-8 text-sm">
          <a href="/marketing" className="text-slate-500 hover:text-slate-300 transition-colors">← MarketingOS</a>
          <span className="text-slate-700">/</span>
          <span className="text-white font-medium">Connect Accounts</span>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-black mb-1">Auto-Post to Social Media</h1>
          <p className="text-slate-400 text-sm">
            Connect your accounts once. When your video is ready, we post it automatically — no manual download needed.
          </p>
        </div>

        {/* Step 1: Telegram ID */}
        <div className={`rounded-xl border p-5 mb-6 ${tgSaved ? "border-green-500/30 bg-green-500/5" : "border-slate-700 bg-slate-800/40"}`}>
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${tgSaved ? "bg-green-500/20 text-green-400" : "bg-slate-700 text-slate-400"}`}>
              Step 1
            </span>
            <h2 className="text-sm font-semibold text-white">Your Telegram ID</h2>
            {tgSaved && <span className="text-green-400 text-xs ml-auto">✅ Saved</span>}
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Used to link your social accounts to your video jobs. Get your ID from <strong className="text-slate-400">@userinfobot</strong> on Telegram.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={tgId}
              onChange={e => { setTgId(e.target.value); setTgSaved(false); }}
              placeholder="e.g. 1245366658"
              className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-rose-500"
            />
            <button
              onClick={saveTgId}
              disabled={!tgId.trim() || tgSaved}
              className="px-4 py-2 rounded-lg bg-rose-500 hover:bg-rose-600 disabled:opacity-40 text-white text-sm font-medium transition-colors"
            >
              {tgSaved ? "Saved" : "Save"}
            </button>
          </div>
        </div>

        {/* Step 2: Connect platforms */}
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-700 text-slate-400">Step 2</span>
            <h2 className="text-sm font-semibold text-white">Connect Platforms</h2>
          </div>
          <div className="space-y-3">
            {PLATFORMS.map(p => {
              const isConnected = !!connected[p.value];
              return (
                <div key={p.value} className={`border rounded-xl p-4 ${isConnected ? "border-green-500/40 bg-green-500/5" : p.color}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{p.icon}</span>
                      <div>
                        <p className="text-white text-sm font-semibold">{p.label}</p>
                        <p className="text-slate-500 text-xs mt-0.5">{p.note}</p>
                      </div>
                    </div>
                    {isConnected ? (
                      <button
                        onClick={() => disconnect(p.value)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-slate-600 text-slate-400 hover:text-red-400 hover:border-red-500/40 transition-colors"
                      >
                        Disconnect
                      </button>
                    ) : (
                      <button
                        onClick={() => connect(p.value)}
                        disabled={!tgSaved}
                        className="text-xs px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white font-medium transition-colors"
                      >
                        Connect →
                      </button>
                    )}
                  </div>
                  {isConnected && (
                    <p className="text-green-400 text-xs mt-2">✅ Connected — videos will auto-post after rendering</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Info box */}
        <div className="mt-6 rounded-xl bg-slate-800/40 border border-slate-700/60 p-4 text-xs text-slate-500 space-y-1.5">
          <p className="text-slate-400 font-semibold">How it works</p>
          <p>After your video is approved and rendered, we post it automatically using the account you connected above.</p>
          <p>Your tokens are stored securely — we never store your password, only the platform-issued OAuth token.</p>
          <p>You can disconnect at any time. Disconnecting does not delete previously posted videos.</p>
        </div>

        <div className="mt-6 text-center">
          <a href="/marketing/submit" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
            → Submit a product for video generation
          </a>
        </div>

      </div>
    </main>
  );
}
