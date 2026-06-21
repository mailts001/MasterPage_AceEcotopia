"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Platform = "TT" | "IG" | "YT" | "LI";
type Tone = "entertaining" | "professional" | "urgent" | "educational";
type Step = "form" | "submitting" | "success" | "error";

interface FormData {
  product_name: string;
  product_description: string;
  platform: Platform;
  tone: Tone;
  website_url: string;
  price: string;
  promo_code: string;
  affiliate_url: string;
  affiliate_opted_in: boolean;
  merchant_tg_id: string;
  brand_color: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PLATFORMS: { value: Platform; label: string; icon: string; desc: string }[] = [
  { value: "TT", label: "TikTok",          icon: "🎵", desc: "60s+ for monetisation" },
  { value: "IG", label: "Instagram Reels",  icon: "📸", desc: "15–90s, 3–5 hashtags"  },
  { value: "YT", label: "YouTube Shorts",   icon: "▶️",  desc: "Under 60s, no min"    },
  { value: "LI", label: "LinkedIn",         icon: "💼", desc: "Professional, 80% muted ok" },
];

const TONES: { value: Tone; label: string; emoji: string }[] = [
  { value: "entertaining",  label: "Entertaining",  emoji: "🎭" },
  { value: "professional",  label: "Professional",  emoji: "💼" },
  { value: "urgent",        label: "Urgent / FOMO", emoji: "🔥" },
  { value: "educational",   label: "Educational",   emoji: "📚" },
];

const ACCENT = "#F43F5E";
const BUCKET = "marketing-assets";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MarketingSubmitPage() {
  const supabase = createClient();

  const [step, setStep]           = useState<Step>("form");
  const [jobId, setJobId]         = useState("");
  const [errorMsg, setErrorMsg]   = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormData>({
    product_name:       "",
    product_description:"",
    platform:           "TT",
    tone:               "entertaining",
    website_url:        "",
    price:              "",
    promo_code:         "",
    affiliate_url:      "",
    affiliate_opted_in: false,
    merchant_tg_id:     "",
    brand_color:        ACCENT,
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
    setImagePreview(URL.createObjectURL(file));
  }

  async function uploadImage(file: File, tempId: string): Promise<string> {
    // Always use lowercase .jpg extension to avoid case-sensitivity issues
    const ext  = (file.name.split(".").pop() ?? "jpg").toLowerCase();
    const path = `product-images/${tempId}/product.${ext}`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) throw new Error(`Image upload failed: ${error.message}`);
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
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

      // 2. Insert job with image URL already included — single INSERT, no UPDATE needed
      const jobPayload = {
        product_name:        form.product_name.trim(),
        product_description: form.product_description.trim(),
        platform:            form.platform,
        tone:                form.tone,
        website_url:         form.website_url.trim() || null,
        price:               form.price.trim() || null,
        promo_code:          form.promo_code.trim() || null,
        affiliate_url:       form.affiliate_url.trim() || null,
        affiliate_opted_in:  form.affiliate_opted_in,
        merchant_tg_id:      form.merchant_tg_id.trim() || null,
        brand_color:         form.brand_color,
        product_image_url:   imageUrl,
        status:              "pending",
      };

      const { data: rows, error: insertErr } = await supabase
        .from("marketing_jobs")
        .insert(jobPayload)
        .select("id")
        .single();

      if (insertErr || !rows) throw new Error(insertErr?.message ?? "Insert failed");
      const newJobId = rows.id as string;

      setJobId(newJobId);
      setStep("success");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStep("error");
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  if (step === "submitting") return <LoadingScreen />;
  if (step === "success")    return <SuccessScreen jobId={jobId} platform={form.platform} />;
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
          <Field label="Product Image" hint="JPG/PNG/WEBP · max 10 MB · recommended 1:1 or 4:5">
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
                  <div className="text-xs opacity-60">{p.desc}</div>
                </button>
              ))}
            </div>
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

function SuccessScreen({ jobId, platform }: { jobId: string; platform: Platform }) {
  const platformLabels: Record<Platform, string> = {
    TT: "TikTok", IG: "Instagram Reels", YT: "YouTube Shorts", LI: "LinkedIn",
  };
  return (
    <div className="min-h-screen bg-[#080C18] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="text-6xl mb-6">✅</div>
        <h2 className="text-2xl font-black text-white mb-3">Request Submitted!</h2>
        <p className="text-slate-400 mb-6">
          Your {platformLabels[platform]} video request is pending review.
          We&apos;ll notify you via Telegram once it&apos;s in production.
        </p>
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 mb-6 text-left">
          <p className="text-xs text-slate-500 mb-1">Job Reference</p>
          <p className="text-xs font-mono text-slate-300 break-all">{jobId}</p>
        </div>
        <div className="space-y-3 text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <span className="text-rose-400">⏳</span> Pending owner review
          </div>
          <div className="flex items-center gap-2">
            <span className="text-yellow-400">🎬</span> EN + 中文 video production (within 24h)
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-400">📲</span> Telegram download link sent to you
          </div>
        </div>
        <a
          href="/marketing/submit"
          className="mt-8 inline-block px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-xl transition-colors"
        >
          Submit Another Product
        </a>
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
