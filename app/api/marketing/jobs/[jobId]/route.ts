/**
 * GET /api/marketing/jobs/[jobId]
 * GET /api/marketing/jobs/[jobId]?ids=id1,id2,id3   (batch lookup)
 *
 * Reads job(s) from Supabase using the service role key, bypassing RLS.
 * Safe to call from the browser — only returns the specific fields needed
 * for status display (no internal/sensitive fields exposed).
 */

import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const SELECT_FIELDS =
  "id,product_name,platform,status,video_url,video_url_zh,created_at,completed_at,estimated_duration_seconds";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  // Batch mode: ?ids=id1,id2,id3
  const batchIds = new URL(req.url).searchParams.get("ids");

  if (batchIds) {
    const ids = batchIds
      .split(",")
      .map(s => s.trim())
      .filter(Boolean)
      .slice(0, 50); // max 50

    const filter = ids.map(id => `id.eq.${id}`).join(",");
    const url = `${SUPABASE_URL}/rest/v1/marketing_jobs?select=${SELECT_FIELDS}&or=(${filter})&order=created_at.desc`;

    const resp = await fetch(url, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
      cache: "no-store",
    });
    const data = await resp.json();
    if (!resp.ok) return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
    return NextResponse.json(data);
  }

  // Single job (jobId="_batch" is handled above via ?ids= param)
  const url = `${SUPABASE_URL}/rest/v1/marketing_jobs?select=${SELECT_FIELDS}&id=eq.${encodeURIComponent(jobId)}&limit=1`;
  const resp = await fetch(url, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    cache: "no-store",
  });
  const data = await resp.json();
  if (!resp.ok) return NextResponse.json({ error: "Fetch failed" }, { status: 500 });

  const row = Array.isArray(data) ? data[0] : null;
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(row);
}
