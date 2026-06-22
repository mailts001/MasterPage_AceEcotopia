/**
 * GET /api/marketing/scrape?url=https://...
 *
 * Fetches a URL, strips HTML to text, and uses Claude Haiku to extract:
 *   product_name, product_description, brand_name, brand_color,
 *   product_image_url, cta_url, price
 *
 * Used by the MarketingOS submit form "Start from a URL" feature.
 * Server-side only — ANTHROPIC_API_KEY never reaches the client.
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

// Resolves a potentially relative URL against the page base
function resolveUrl(src: string, base: string): string {
  if (!src) return "";
  try { return new URL(src, base).href; } catch { return src; }
}

export async function GET(req: NextRequest) {
  const rawUrl = new URL(req.url).searchParams.get("url") ?? "";
  if (!rawUrl) {
    return NextResponse.json({ error: "url parameter required" }, { status: 400 });
  }

  // Normalise — add https:// if missing
  const pageUrl = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;

  // ── Fetch page ─────────────────────────────────────────────────────────────
  let html = "";
  try {
    const resp = await fetch(pageUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; MarketingOS/1.0; +https://x68.sg)",
        Accept: "text/html,application/xhtml+xml,*/*",
      },
      signal: AbortSignal.timeout(12_000),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    html = await resp.text();
  } catch (err) {
    return NextResponse.json(
      { error: `Could not fetch page: ${(err as Error).message}` },
      { status: 422 }
    );
  }

  // ── Extract OG meta tags ───────────────────────────────────────────────────
  const ogImg = (
    html.match(
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i
    )?.[1] ??
    html.match(
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i
    )?.[1] ??
    ""
  );
  const ogTitle =
    html.match(
      /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i
    )?.[1] ??
    html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ??
    "";
  const ogDesc =
    html.match(
      /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i
    )?.[1] ??
    html.match(
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i
    )?.[1] ??
    "";
  const resolvedImg = resolveUrl(ogImg, pageUrl);

  // ── Strip HTML to readable text ────────────────────────────────────────────
  const bodyText = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s{3,}/g, "  ")
    .trim()
    .slice(0, 7000); // keep well under token limit

  // ── Claude extraction ──────────────────────────────────────────────────────
  const prompt = `You are a marketing copy analyst. Extract product/service info from the webpage below.
Return ONLY a valid JSON object — no markdown fences, no extra text.

Source URL: ${pageUrl}
OG Title: ${ogTitle}
OG Description: ${ogDesc}
OG Image: ${resolvedImg}

Page text (truncated to 7000 chars):
${bodyText}

Return exactly this JSON shape (all fields required, use "" for unknowns):
{
  "product_name": "concise product or service name, max 60 chars",
  "product_description": "2-3 short paragraphs: what it is, key benefits/features, who it's for. 150-250 words. Write in second-person marketing tone.",
  "brand_name": "company or brand name",
  "brand_color": "#hexcode — infer dominant brand colour from context/industry, else use #F43F5E",
  "product_image_url": "${resolvedImg || "best product hero image URL found on page, or empty string"}",
  "cta_url": "${pageUrl}",
  "price": "visible price with currency symbol, or empty string if not found"
}`;

  try {
    const msg = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const text = (msg.content[0] as { type: string; text: string }).text.trim();
    // Be lenient — strip any accidental markdown fences
    const jsonStr = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Claude returned no JSON block");

    const data = JSON.parse(jsonMatch[0]);
    return NextResponse.json(data);
  } catch (err) {
    console.error("[scrape] Claude extraction failed:", err);
    return NextResponse.json(
      { error: `Extraction failed: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
