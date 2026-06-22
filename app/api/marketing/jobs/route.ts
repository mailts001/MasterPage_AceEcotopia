/**
 * POST /api/marketing/jobs
 *
 * Inserts a new marketing job using the service role key, bypassing RLS.
 * The anon key on the client cannot INSERT into marketing_jobs (RLS blocks it).
 *
 * Body: JSON — the job payload (all fields optional except product_name)
 * Returns: { id: string } — the new job UUID
 */

import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export async function POST(req: NextRequest) {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json(
      { error: "Server misconfiguration: missing Supabase env vars" },
      { status: 500 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.product_name) {
    return NextResponse.json({ error: "product_name is required" }, { status: 400 });
  }

  const resp = await fetch(`${SUPABASE_URL}/rest/v1/marketing_jobs`, {
    method: "POST",
    headers: {
      apikey:          SERVICE_KEY,
      Authorization:   `Bearer ${SERVICE_KEY}`,
      "Content-Type":  "application/json",
      Prefer:          "return=representation",
    },
    body: JSON.stringify(body),
  });

  const data = await resp.json();

  if (!resp.ok) {
    console.error("[jobs] Supabase insert error:", resp.status, data);
    return NextResponse.json(
      { error: data?.message ?? `Insert failed (${resp.status})` },
      { status: 500 }
    );
  }

  // Supabase returns an array; grab the first row
  const row = Array.isArray(data) ? data[0] : data;
  return NextResponse.json({ id: row.id });
}
