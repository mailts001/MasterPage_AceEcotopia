/**
 * POST /api/marketing/scene-hint
 * Body: { product_name, product_description, platform, tone }
 *
 * Returns { scene_direction: string } — a ready-to-use POV video direction
 * prompt auto-generated from the product details.
 *
 * Cascade: Gemini 2.0 Flash (free) → Groq Llama 3.3 (free) → Claude Haiku (paid fallback)
 */

import { NextRequest, NextResponse } from "next/server";

const SYSTEM = `You are a social media video director specialising in POV product demos for TikTok/Instagram.
Given a product, write a 2-3 sentence scene direction describing exactly what the camera sees — from the user's first-person POV.
Focus on: hands interacting with the product, sensory details (texture, sound, colour), the satisfying moment of use or result.
Be specific to THIS product. No generic phrases. No text overlays. No watermarks.
Return ONLY the scene direction text — no labels, no quotes, no extra explanation.`;

function buildPrompt(name: string, desc: string, platform: string, tone: string): string {
  const platformCtx: Record<string, string> = {
    TT: "TikTok (fast, energetic, hook in first 2 seconds)",
    IG: "Instagram Reels (warm, aspirational, slightly slower)",
    YT: "YouTube Shorts (clear, educational, show the result)",
    LI: "LinkedIn (professional, polished, outcome-focused)",
  };
  const toneCtx: Record<string, string> = {
    entertaining: "fun and dynamic — quick cuts, satisfying moments",
    professional: "clean and polished — deliberate movements, confident",
    urgent: "fast-paced and dramatic — urgency, transformation",
    educational: "clear step-by-step — show before, during, after",
  };
  return `Product: ${name}
Description: ${desc}
Platform: ${platformCtx[platform] ?? platform}
Tone: ${toneCtx[tone] ?? tone}

Write a POV scene direction for an AI video of someone using this product.`;
}

async function tryGemini(prompt: string): Promise<string | null> {
  const key = process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY ?? "";
  if (!key || key.startsWith("your_")) return null;
  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 200, temperature: 0.7 },
        }),
        signal: AbortSignal.timeout(10_000),
      }
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? null;
  } catch {
    return null;
  }
}

async function tryGroq(prompt: string): Promise<string | null> {
  const key = process.env.GROQ_API_KEY ?? "";
  if (!key || key.startsWith("your_")) return null;
  try {
    const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: prompt },
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data?.choices?.[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}

async function tryClaudeHaiku(prompt: string): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY ?? "";
  if (!key) return null;
  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 200,
        system: SYSTEM,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return (data?.content?.[0]?.text ?? "").trim() || null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const { product_name = "", product_description = "", platform = "TT", tone = "entertaining" } =
    await req.json();

  if (!product_name && !product_description) {
    return NextResponse.json({ error: "product_name or product_description required" }, { status: 400 });
  }

  const prompt = buildPrompt(product_name, product_description, platform, tone);

  const result =
    (await tryGemini(prompt)) ??
    (await tryGroq(prompt)) ??
    (await tryClaudeHaiku(prompt));

  if (!result) {
    return NextResponse.json({ error: "All providers failed" }, { status: 502 });
  }

  return NextResponse.json({ scene_direction: result });
}
