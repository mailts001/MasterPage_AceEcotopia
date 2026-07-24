"use client";

import { useState, useRef, useEffect } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Platform  = "TT" | "IG" | "YT" | "LI";
type Tone      = "entertaining" | "professional" | "urgent" | "educational";
type VideoType = "text_overlay" | "ai_unboxing" | "ai_demo" | "ai_pov_demo" | "avatar_ad";
type BgMode    = "remove" | "keep";
type Step      = "form" | "submitting" | "success" | "error";

interface FormData {
  product_name:        string;
  product_description: string;
  platform:            Platform;
  tone:                Tone;
  video_type:          VideoType;
  bg_mode:             BgMode;
  face_image_url:      string;
  scene_direction:     string;
  website_url:         string;
  price:               string;
  promo_code:          string;
  affiliate_url:       string;
  affiliate_opted_in:  boolean;
  merchant_tg_id:      string;
  brand_color:         string;
  brand_name:          string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PLATFORMS: {
  value: Platform; label: string; icon: string; desc: string;
  format: string; dims: string; length: string;
}[] = [
  { value: "TT", label: "TikTok",         icon: "🎵", desc: "60s+ for monetisation",      format: "9:16 Portrait", dims: "1080×1920", length: "15–60s" },
  { value: "IG", label: "Instagram Reels",icon: "📸", desc: "15–90s, 3–5 hashtags",       format: "9:16 Portrait", dims: "1080×1920", length: "15–90s" },
  { value: "YT", label: "YouTube Shorts", icon: "▶️", desc: "Under 60s, no minimum",      format: "9:16 Portrait", dims: "1080×1920", length: "≤60s"   },
  { value: "LI", label: "LinkedIn",       icon: "💼", desc: "Professional, 80% muted ok", format: "9:16 Portrait", dims: "1080×1920", length: "15–30s" },
];

const TONES: { value: Tone; label: string; emoji: string }[] = [
  { value: "entertaining",  label: "Entertaining",  emoji: "🎭" },
  { value: "professional",  label: "Professional",  emoji: "💼" },
  { value: "urgent",        label: "Urgent / FOMO", emoji: "🔥" },
  { value: "educational",   label: "Educational",   emoji: "📚" },
];

const VIDEO_TYPES: { value: VideoType; label: string; icon: string; desc: string; needsImage: boolean; needsFace?: boolean; badge?: string; cost?: string }[] = [
  {
    value:      "text_overlay",
    label:      "Animated Caption Video",
    icon:       "✏️",
    desc:       "AI writes script + captions, animated over your product photo. Fast, bilingual EN+ZH. Always works.",
    needsImage: false,
    badge:      "FREE",
    cost:       "No cost",
  },
  {
    value:      "ai_unboxing",
    label:      "AI Product Reveal",
    icon:       "📦",
    desc:       "Your product photo comes alive — cinematic float, reveal, and zoom. Best for clean product shots.",
    needsImage: true,
    badge:      "AI",
    cost:       "~$0.02–0.05",
  },
  {
    value:      "ai_pov_demo",
    label:      "AI POV Demo",
    icon:       "🤳",
    desc:       "First-person POV: hands using your product, close-up texture, satisfying result. AI auto-writes scene direction from your description.",
    needsImage: true,
    badge:      "AI",
    cost:       "~$0.02–0.05",
  },
  {
    value:      "ai_demo",
    label:      "AI Lifestyle Scene",
    icon:       "🎬",
    desc:       "AI generates a lifestyle video of someone using your product in a real-world setting.",
    needsImage: false,
    badge:      "AI",
    cost:       "~$0.02–0.05",
  },
];

const ACCENT = "#F43F5E";
const SESSION_KEY = "mkt_unlocked";

// ---------------------------------------------------------------------------
// Password gate (sessionStorage — persists while tab is open)
// ---------------------------------------------------------------------------

function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState(false);

  async function check() {
    const res = await fetch("/api/marketing/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    if (res.ok) {
      sessionStorage.setItem(SESSION_KEY, "1");
      onUnlock();
    } else {
      setErr(true);
      setPin("");
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0f0f0f", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 16, padding: "40px 48px", maxWidth: 360, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🔐</div>
        <h2 style={{ color: "#fff", marginBottom: 8, fontSize: 20 }}>MarketingOS</h2>
        <p style={{ color: "#888", fontSize: 14, marginBottom: 24 }}>Enter your access PIN to continue</p>
        <input
          type="password"
          value={pin}
          onChange={e => { setPin(e.target.value); setErr(false); }}
          onKeyDown={e => e.key === "Enter" && check()}
          placeholder="PIN"
          autoFocus
          style={{
            width: "100%", padding: "12px 16px", borderRadius: 8, border: err ? "1px solid #f43f5e" : "1px solid #333",
            background: "#111", color: "#fff", fontSize: 18, textAlign: "center",
            outline: "none", boxSizing: "border-box", marginBottom: 8,
          }}
        />
        {err && <p style={{ color: "#f43f5e", fontSize: 13, marginBottom: 8 }}>Wrong PIN — try again</p>}
        <button
          onClick={check}
          style={{ width: "100%", padding: "12px 0", borderRadius: 8, background: ACCENT, color: "#fff", border: "none", fontWeight: 700, fontSize: 15, cursor: "pointer", marginTop: 8 }}
        >
          Unlock →
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MarketingSubmitPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [step, setStep]           = useState<Step>("form");
  const [jobId, setJobId]         = useState("");
  const [errorMsg, setErrorMsg]   = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageLandscape, setImageLandscape] = useState(false);
  const [facePreview, setFacePreview] = useState<string | null>(null);
  const [faceFile, setFaceFile]       = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const faceRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === "1") setUnlocked(true);
  }, []);

  // URL scraper state
  const [scrapeUrl, setScrapeUrl]         = useState("");
  const [scraping, setScraping]           = useState(false);
  const [scrapeError, setScrapeError]     = useState("");
  const [scrapeOk, setScrapeOk]           = useState(false);
  const [scrapedImageUrl, setScrapedImageUrl] = useState<string | null>(null);

  const [hinting, setHinting]             = useState(false);
  const [hintOk, setHintOk]               = useState(false);

  const [form, setForm] = useState<FormData>({
    product_name:        "",
    product_description: "",
    platform:            "TT",
    tone:                "entertaining",
    video_type:          "text_overlay",
    bg_mode:             "remove",
    face_image_url:      "",
    scene_direction:     "",
    website_url:         "",
    price:               "",
    promo_code:          "",
    affiliate_url:       "",
    affiliate_opted_in:  false,
    merchant_tg_id:      "",
    brand_color:         ACCENT,
    brand_name:          "",
  });

  // ── Handlers ────────────────────────────────────────────────────────────

  function set(field: keyof FormData, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("Image must be under 10 MB");
      return;
    }
    setImageFile(file);
    const objectUrl = URL.createObjectURL(file);
    setImagePreview(objectUrl);
    setScrapedImageUrl(null); // clear any scraped image — user's upload takes priority
    // Detect orientation
    const img = new Image();
    img.onload = () => setImageLandscape(img.naturalWidth > img.naturalHeight);
    img.src = objectUrl;
  }

  function handleFaceImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert("Image must be under 10 MB"); return; }
    setFaceFile(file);
    setFacePreview(URL.createObjectURL(file));
  }

  async function handleScrape() {
    if (!scrapeUrl.trim()) return;
    setScraping(true);
    setScrapeError("");
    setScrapeOk(false);
    try {
      const url = scrapeUrl.trim().startsWith("http") ? scrapeUrl.trim() : `https://${scrapeUrl.trim()}`;
      const resp = await fetch(`/api/marketing/scrape?url=${encodeURIComponent(url)}`);
      const data = await resp.json();
      if (!resp.ok || data.error) throw new Error(data.error ?? "Extraction failed");

      // Auto-fill form fields — only overwrite if extracted value is non-empty
      setForm((prev) => ({
        ...prev,
        product_name:        data.product_name        || prev.product_name,
        product_description: data.product_description || prev.product_description,
        brand_name:          data.brand_name          || prev.brand_name,
        brand_color:         data.brand_color         || prev.brand_color,
        website_url:         data.cta_url             || prev.website_url,
        price:               data.price               || prev.price,
      }));

      // If an OG image was found, show it as preview (but don't auto-upload — user must confirm)
      if (data.product_image_url) {
        setImagePreview(data.product_image_url);
        setScrapedImageUrl(data.product_image_url);
      }

      setScrapeOk(true);
    } catch (err) {
      setScrapeError((err as Error).message);
    } finally {
      setScraping(false);
    }
  }

  async function generateSceneHint() {
    setHinting(true);
    setHintOk(false);
    try {
      const resp = await fetch("/api/marketing/scene-hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_name:        form.product_name,
          product_description: form.product_description,
          platform:            form.platform,
          tone:                form.tone,
        }),
      });
      const data = await resp.json();
      if (!resp.ok || data.error) throw new Error(data.error ?? "Generation failed");
      set("scene_direction", data.scene_direction);
      setHintOk(true);
    } catch (err) {
      console.error("[scene-hint]", err);
    } finally {
      setHinting(false);
    }
  }

  async function uploadImage(file: File, tempId: string): Promise<string> {
    // Upload via server-side API route (uses service role key to bypass RLS)
    const fd = new FormData();
    fd.append("file",  file);
    fd.append("jobId", tempId);
    const resp = await fetch("/api/marketing/upload", { method: "POST", body: fd });
    const data = await resp.json();
    if (!resp.ok || data.error) throw new Error(`Image upload failed: ${data.error ?? resp.statusText}`);
    return data.url as string;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.product_name.trim()) return;
    setStep("submitting");

    try {
      // 1. Upload image FIRST using a temp UUID so we have the URL before insert
      //    This avoids needing UPDATE permission — everything goes in the INSERT.
      let imageUrl: string | null = null;
      if (imageFile) {
        const tempId = crypto.randomUUID();
        imageUrl = await uploadImage(imageFile, tempId);
      }

      // Upload face image if avatar_ad selected
      let faceUrl: string | null = null;
      if (faceFile && form.video_type === "avatar_ad") {
        const faceTempId = crypto.randomUUID();
        const faceFd = new FormData();
        faceFd.append("file",  faceFile);
        faceFd.append("jobId", `faces/${faceTempId}`);
        const faceResp = await fetch("/api/marketing/upload", { method: "POST", body: faceFd });
        const faceData = await faceResp.json();
        if (!faceResp.ok || faceData.error) throw new Error(`Face upload failed: ${faceData.error}`);
        faceUrl = faceData.url as string;
      }

      // 2. Insert job with image URL already included — single INSERT, no UPDATE needed
      //    If user didn't upload a file but we got an OG image from scraping, use that.
      const finalImageUrl = imageUrl ?? scrapedImageUrl ?? null;

      const jobPayload = {
        product_name:        form.product_name.trim(),
        product_description: form.product_description.trim(),
        platform:            form.platform,
        tone:                form.tone,
        video_type:          form.video_type,
        bg_mode:             form.bg_mode,
        website_url:         form.website_url.trim() || null,
        price:               form.price.trim() || null,
        promo_code:          form.promo_code.trim() || null,
        affiliate_url:       form.affiliate_url.trim() || null,
        affiliate_opted_in:  form.affiliate_opted_in,
        merchant_tg_id:      form.merchant_tg_id.trim() || null,
        brand_color:         form.brand_color,
        brand_name:          form.brand_name.trim() || null,
        scene_direction:     form.scene_direction.trim() || null,
        product_image_url:   finalImageUrl,
        face_image_url:      faceUrl,
        status:              "pending",
      };

      // Insert via server-side API route (service role key bypasses RLS)
      const insertResp = await fetch("/api/marketing/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jobPayload),
      });
      const insertData = await insertResp.json();
      if (!insertResp.ok || insertData.error) throw new Error(insertData.error ?? "Insert failed");
      const newJobId = insertData.id as string;

      setJobId(newJobId);
      setStep("success");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStep("error");
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  if (!unlocked) return <PasswordGate onUnlock={() => setUnlocked(true)} />;

  if (step === "submitting") return <LoadingScreen />;
  if (step === "success")    return <SuccessScreen jobId={jobId} platform={form.platform} productName={form.product_name} />;
  if (step === "error")      return <ErrorScreen msg={errorMsg} onRetry={() => setStep("form")} />;

  return (
    <main className="min-h-screen bg-[#080C18] text-white px-4 py-12">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 rounded-full px-4 py-1.5 text-rose-400 text-sm font-semibold mb-4">
            🎬 MarketingOS — District 6
          </div>
          <h1 className="text-3xl font-black text-white mb-2">
            Create Your AI Marketing Video
          </h1>
          <p className="text-slate-400 text-sm">
            Fill in your product details. We&apos;ll generate a TikTok-ready video in EN + 中文 within 24 hours.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ── URL Auto-fill ──────────────────────────────────────────────── */}
          <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🌐</span>
              <div>
                <p className="text-sm font-semibold text-indigo-300">Start from a URL</p>
                <p className="text-xs text-slate-400">Paste your website, landing page, or Shopee listing — we&apos;ll auto-fill the form for you.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={scrapeUrl}
                onChange={(e) => { setScrapeUrl(e.target.value); setScrapeOk(false); setScrapeError(""); }}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleScrape())}
                placeholder="https://x68.sg  or  shopee.sg/your-product"
                className={inputCls}
              />
              <button
                type="button"
                onClick={handleScrape}
                disabled={!scrapeUrl.trim() || scraping}
                className="shrink-0 px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors whitespace-nowrap"
              >
                {scraping ? "⏳ Reading…" : "Auto-fill ✨"}
              </button>
            </div>
            {scrapeError && (
              <p className="text-xs text-rose-400">⚠️ {scrapeError}</p>
            )}
            {scrapeOk && (
              <p className="text-xs text-green-400">
                ✅ Form auto-filled from your page — review and adjust below before submitting.
              </p>
            )}
            <p className="text-xs text-slate-600">
              Works best on product landing pages, Shopee/Lazada listings, and static websites. You can edit everything after.
            </p>
          </div>

          {/* Product Name */}
          <Field label="Product Name" required>
            <input
              type="text"
              value={form.product_name}
              onChange={(e) => set("product_name", e.target.value)}
              placeholder="e.g. Organic Matcha Powder 100g"
              required
              className={inputCls}
            />
          </Field>

          {/* Description */}
          <Field label="Product Description" required hint="Key features, benefits, target audience">
            <textarea
              value={form.product_description}
              onChange={(e) => set("product_description", e.target.value)}
              placeholder="What makes your product special? Who is it for? Any unique selling points?"
              rows={4}
              required
              className={inputCls + " resize-none"}
            />
          </Field>

          {/* Product Image */}
          <Field label="Product Image" hint="JPG/PNG/WEBP · max 10 MB">
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-rose-500/50 rounded-xl p-6 cursor-pointer transition-colors text-center"
            >
              {imagePreview ? (
                <img src={imagePreview} alt="preview" className="max-h-48 mx-auto rounded-lg object-contain" />
              ) : (
                <div className="text-slate-500 text-sm">
                  <div className="text-3xl mb-2">📷</div>
                  <span>Click to upload product image</span>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleImage}
              className="hidden"
            />
            {/* Landscape orientation notice */}
            {imageLandscape && (
              <div className="mt-2 rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-xs flex gap-2">
                <span className="text-amber-400 shrink-0">📐</span>
                <div className="text-amber-300">
                  <span className="font-semibold">Landscape photo detected.</span>{" "}
                  Your video will be 9:16 portrait (platform requirement). Your photo will be centred inside the frame with a matching blurred backdrop — it will look great. For a cleaner result, try <strong>AI Remove Background</strong> below.
                </div>
              </div>
            )}

            {/* Photo guidelines */}
            <div className="mt-3 rounded-xl bg-slate-800/40 border border-slate-700/60 p-3 text-xs space-y-1.5">
              <p className="text-slate-400 font-semibold mb-2">📸 Tips for best video quality</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                <div className="flex items-start gap-1.5 text-green-400">
                  <span className="shrink-0">✅</span>
                  <span className="text-slate-400">Single product, centred in frame</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="shrink-0 text-green-400">✅</span>
                  <span className="text-slate-400">Plain / simple background</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="shrink-0 text-green-400">✅</span>
                  <span className="text-slate-400">Good lighting, no heavy shadows</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="shrink-0 text-green-400">✅</span>
                  <span className="text-slate-400">Min 800×800 px resolution</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="shrink-0 text-rose-400">❌</span>
                  <span className="text-slate-500">Cluttered / busy backgrounds</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="shrink-0 text-rose-400">❌</span>
                  <span className="text-slate-500">Watermarks or text overlays on photo</span>
                </div>
              </div>
              <p className="text-slate-600 pt-1">
                AI auto-removes background for clean product animation. Plain backgrounds work best.
              </p>
            </div>

            {/* Background mode toggle */}
            <div className="mt-3">
              <p className="text-xs text-slate-400 font-semibold mb-2">Background handling</p>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { v: "remove", icon: "✂️", label: "AI Remove Background", hint: "Clean gradient backdrop — best for most products" },
                  { v: "keep",   icon: "📷", label: "Keep My Background",   hint: "Use photo as-is — good for lifestyle shots" },
                ] as { v: BgMode; icon: string; label: string; hint: string }[]).map((opt) => (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => set("bg_mode", opt.v)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      form.bg_mode === opt.v
                        ? "border-rose-500 bg-rose-500/10 text-white"
                        : "border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600"
                    }`}
                  >
                    <div className="text-xs font-semibold">{opt.icon} {opt.label}</div>
                    <div className="text-xs opacity-60 mt-0.5">{opt.hint}</div>
                  </button>
                ))}
              </div>
            </div>
          </Field>

          {/* Platform */}
          <Field label="Target Platform" required>
            <div className="grid grid-cols-2 gap-3">
              {PLATFORMS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => set("platform", p.value)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    form.platform === p.value
                      ? "border-rose-500 bg-rose-500/10 text-white"
                      : "border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600"
                  }`}
                >
                  <div className="text-lg mb-0.5">{p.icon} <span className="font-semibold text-sm">{p.label}</span></div>
                  <div className="text-xs opacity-60 mb-1">{p.desc}</div>
                  {form.platform === p.value && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      <span className="text-xs bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-full px-2 py-0.5">{p.format}</span>
                      <span className="text-xs bg-slate-700/60 text-slate-400 rounded-full px-2 py-0.5">{p.dims}</span>
                      <span className="text-xs bg-slate-700/60 text-slate-400 rounded-full px-2 py-0.5">{p.length}</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-600 mt-2">
              📐 Video format is auto-selected for your platform — no extra settings needed.
            </p>
          </Field>

          {/* Tone */}
          <Field label="Video Tone">
            <div className="grid grid-cols-2 gap-3">
              {TONES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => set("tone", t.value)}
                  className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                    form.tone === t.value
                      ? "border-rose-500 bg-rose-500/10 text-white"
                      : "border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600"
                  }`}
                >
                  {t.emoji} {t.label}
                </button>
              ))}
            </div>
          </Field>

          {/* Video Type */}
          <Field label="Video Style">
            <div className="space-y-2">
              {VIDEO_TYPES.map((vt) => {
                const badgeColor: Record<string, string> = {
                  FREE: "bg-green-500/20 text-green-400 border-green-500/30",
                  AI:   "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
                  UGC:  "bg-amber-500/20 text-amber-400 border-amber-500/30",
                };
                return (
                  <button
                    key={vt.value}
                    type="button"
                    onClick={() => set("video_type", vt.value)}
                    className={`w-full p-3 rounded-xl border text-left transition-all ${
                      form.video_type === vt.value
                        ? "border-rose-500 bg-rose-500/10 text-white"
                        : "border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-xl mt-0.5">{vt.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold">{vt.label}</span>
                          {vt.badge && (
                            <span className={`text-xs border rounded-full px-2 py-0.5 ${badgeColor[vt.badge] ?? ""}`}>
                              {vt.badge}
                            </span>
                          )}
                          {vt.needsImage && (
                            <span className="text-xs bg-slate-700/60 text-slate-400 rounded-full px-2 py-0.5">
                              photo req.
                            </span>
                          )}
                        </div>
                        <div className="text-xs opacity-60 mt-0.5">{vt.desc}</div>
                      </div>
                      {vt.cost && (
                        <span className="shrink-0 text-xs text-slate-500 font-mono whitespace-nowrap mt-0.5">
                          {vt.cost}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

          </Field>

          {/* POV Scene Direction — shown only for ai_pov_demo */}
          {form.video_type === "ai_pov_demo" && (
            <Field
              label="Scene Direction"
              hint="Describe exactly what the camera sees — hands, product, the satisfying moment. AI can write this for you."
            >
              <div className="space-y-2">
                <textarea
                  value={form.scene_direction}
                  onChange={(e) => { set("scene_direction", e.target.value); setHintOk(false); }}
                  placeholder="e.g. POV hands massaging shampoo into wet hair, rich lather forming, steam rising, close-up of clean scalp reveal..."
                  rows={3}
                  className={inputCls + " resize-none"}
                />
                <button
                  type="button"
                  onClick={generateSceneHint}
                  disabled={hinting || (!form.product_name && !form.product_description)}
                  className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl border border-indigo-500/40 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {hinting ? (
                    <><span className="animate-spin">⟳</span> Generating scene direction...</>
                  ) : hintOk ? (
                    <><span>✅</span> Generated — edit freely</>
                  ) : (
                    <><span>✨</span> Auto-generate from my product description</>
                  )}
                </button>
                <p className="text-xs text-slate-600">Free — uses Gemini or Groq. Fill in Product Name + Description first for best results.</p>
              </div>
            </Field>
          )}

          {/* Optional fields — collapsible */}
          <details className="group">
            <summary className="cursor-pointer text-slate-400 text-sm font-medium hover:text-white transition-colors list-none flex items-center gap-2">
              <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
              Optional Details (website, price, promo code)
            </summary>
            <div className="mt-4 space-y-4 pl-4 border-l border-slate-800">
              <Field label="Website / Product URL">
                <input type="url" value={form.website_url} onChange={(e) => set("website_url", e.target.value)}
                  placeholder="https://shopee.sg/your-product" className={inputCls} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Price">
                  <input type="text" value={form.price} onChange={(e) => set("price", e.target.value)}
                    placeholder="S$29.90" className={inputCls} />
                </Field>
                <Field label="Promo Code">
                  <input type="text" value={form.promo_code} onChange={(e) => set("promo_code", e.target.value)}
                    placeholder="SAVE10" className={inputCls} />
                </Field>
              </div>
            </div>
          </details>

          {/* Affiliate */}
          <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.affiliate_opted_in}
                onChange={(e) => set("affiliate_opted_in", e.target.checked)}
                className="mt-1 accent-rose-500"
              />
              <div>
                <div className="text-sm font-semibold text-white">Include affiliate link in video CTA</div>
                <div className="text-xs text-slate-400 mt-0.5">
                  We&apos;ll add your Shopee/Lazada link with UTM tracking. You keep all commissions.
                </div>
              </div>
            </label>
            {form.affiliate_opted_in && (
              <input
                type="url"
                value={form.affiliate_url}
                onChange={(e) => set("affiliate_url", e.target.value)}
                placeholder="https://shopee.sg/your-affiliate-link"
                className={inputCls + " mt-3"}
              />
            )}
          </div>

          {/* Telegram */}
          <Field
            label="Your Telegram ID"
            hint="Get notified when your video is ready. Find your ID via @userinfobot on Telegram."
          >
            <input
              type="text"
              value={form.merchant_tg_id}
              onChange={(e) => set("merchant_tg_id", e.target.value)}
              placeholder="e.g. 1234567890"
              className={inputCls}
            />
          </Field>

          {/* Brand colour */}
          <Field label="Brand Accent Colour" hint="Used for highlights in your video">
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.brand_color}
                onChange={(e) => set("brand_color", e.target.value)}
                className="w-12 h-10 rounded-lg cursor-pointer border border-slate-700 bg-transparent"
              />
              <span className="text-slate-400 text-sm font-mono">{form.brand_color}</span>
              <button type="button" onClick={() => set("brand_color", ACCENT)}
                className="text-xs text-rose-400 hover:text-rose-300">reset</button>
            </div>
          </Field>

          {/* Submit */}
          <button
            type="submit"
            disabled={!form.product_name.trim() || !form.product_description.trim()}
            className="w-full py-4 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-lg transition-colors shadow-lg shadow-rose-500/20"
          >
            🎬 Submit Video Request
          </button>

          <p className="text-center text-xs text-slate-500">
            Your request will be reviewed before production begins. Expected delivery within 24 hours.
          </p>
        </form>
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const inputCls =
  "w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-rose-500/60 focus:bg-slate-800 transition-colors";

function Field({
  label, hint, required, children,
}: {
  label: string; hint?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-slate-300">
        {label} {required && <span className="text-rose-400">*</span>}
      </label>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
      {children}
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#080C18] flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-4 animate-bounce">🎬</div>
        <p className="text-white font-semibold text-lg">Submitting your request...</p>
        <p className="text-slate-400 text-sm mt-2">Uploading image and creating job</p>
      </div>
    </div>
  );
}

function SuccessScreen({ jobId, platform, productName }: { jobId: string; platform: Platform; productName: string }) {
  const [copied, setCopied] = useState(false);
  const platformLabels: Record<Platform, string> = {
    TT: "TikTok", IG: "Instagram Reels", YT: "YouTube Shorts", LI: "LinkedIn",
  };
  const statusUrl = `/marketing/status/${jobId}`;

  // Save to localStorage so My Requests list can show this job
  useEffect(() => {
    try {
      const key = "mos_jobs";
      const existing: unknown[] = JSON.parse(localStorage.getItem(key) ?? "[]");
      const entry = { id: jobId, product_name: productName, platform, created_at: new Date().toISOString() };
      // Deduplicate by id
      const updated = [entry, ...existing.filter((j: unknown) => (j as { id: string }).id !== jobId)].slice(0, 50);
      localStorage.setItem(key, JSON.stringify(updated));
    } catch { /* localStorage unavailable */ }
  }, [jobId, platform, productName]);

  function copyJobId() {
    navigator.clipboard.writeText(jobId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="min-h-screen bg-[#080C18] flex flex-col px-4 py-10">
      {/* Back nav */}
      <div className="max-w-md mx-auto w-full mb-6">
        <a href="/marketing" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">
          ← Back to MarketingOS
        </a>
      </div>

      <div className="max-w-md mx-auto w-full flex-1 flex flex-col justify-center">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🎬</div>
          <h2 className="text-2xl font-black text-white mb-2">Request Submitted!</h2>
          <p className="text-slate-400 text-sm">
            Your {platformLabels[platform]} video is pending review. You&apos;ll get an update via Telegram once it&apos;s approved and in production.
          </p>
        </div>

        {/* Job ID box — prominent with copy button */}
        <div className="bg-slate-800/60 border border-rose-500/30 rounded-xl p-4 mb-6">
          <p className="text-xs text-slate-500 mb-2 font-semibold uppercase tracking-wide">
            📋 Your Job Reference ID
          </p>
          <div className="flex items-center gap-2">
            <p className="text-xs font-mono text-white break-all flex-1">{jobId}</p>
            <button
              onClick={copyJobId}
              className="shrink-0 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs text-slate-300 font-medium transition-colors"
            >
              {copied ? "✅ Copied" : "Copy"}
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Save this ID — use it to check your video status anytime.
          </p>
        </div>

        {/* Primary CTA — Check Status */}
        <a
          href={statusUrl}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-base transition-colors mb-3 shadow-lg shadow-rose-500/20"
        >
          🔍 Check Video Status
        </a>

        {/* Pipeline steps */}
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 mb-6 space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <span className="text-yellow-400 text-base mt-0.5">⏳</span>
            <div>
              <p className="text-white font-medium">Step 1 — Under review</p>
              <p className="text-slate-500 text-xs">Owner approves within a few hours</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-blue-400 text-base mt-0.5">🎬</span>
            <div>
              <p className="text-white font-medium">Step 2 — Video production</p>
              <p className="text-slate-500 text-xs">EN + 中文 videos rendered automatically (within 24h)</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-green-400 text-base mt-0.5">📲</span>
            <div>
              <p className="text-white font-medium">Step 3 — Download via Telegram</p>
              <p className="text-slate-500 text-xs">Links sent to your Telegram, or check status page anytime</p>
            </div>
          </div>
        </div>

        {/* Secondary actions */}
        <div className="flex gap-3">
          <a
            href="/marketing/submit"
            className="flex-1 text-center py-3 rounded-xl border border-slate-700 hover:border-slate-600 text-slate-400 hover:text-white text-sm font-medium transition-colors"
          >
            + Submit Another
          </a>
          <a
            href="/marketing/status"
            className="flex-1 text-center py-3 rounded-xl border border-slate-700 hover:border-slate-600 text-slate-400 hover:text-white text-sm font-medium transition-colors"
          >
            📋 My Requests
          </a>
        </div>
      </div>
    </div>
  );
}

function ErrorScreen({ msg, onRetry }: { msg: string; onRetry: () => void }) {
  return (
    <div className="min-h-screen bg-[#080C18] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="text-5xl mb-4">❌</div>
        <h2 className="text-xl font-bold text-white mb-3">Something went wrong</h2>
        <p className="text-slate-400 text-sm mb-2">{msg}</p>
        <button onClick={onRetry}
          className="mt-4 px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-xl transition-colors">
          Try Again
        </button>
      </div>
    </div>
  );
}
