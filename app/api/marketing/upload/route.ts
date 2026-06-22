/**
 * POST /api/marketing/upload
 *
 * Accepts a multipart/form-data request with:
 *   file   — the image File
 *   jobId  — UUID used as the storage path prefix
 *
 * Uploads to Supabase Storage using the service role key (bypasses RLS).
 * Returns { url: string } — the public URL of the uploaded file.
 *
 * Why server-side? Supabase Storage RLS blocks anonymous uploads from the
 * browser client. The service role key must stay server-side only.
 */

import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const BUCKET       = "marketing-assets";

export async function POST(req: NextRequest) {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json(
      { error: "Server misconfiguration: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set" },
      { status: 500 }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart form data" }, { status: 400 });
  }

  const file  = formData.get("file") as File | null;
  const jobId = (formData.get("jobId") as string | null) ?? crypto.randomUUID();

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Validate — images only, max 10 MB
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only image files are accepted" }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "Image must be under 10 MB" }, { status: 400 });
  }

  const ext      = (file.name.split(".").pop() ?? "jpg").toLowerCase();
  const path     = `product-images/${jobId}/product.${ext}`;
  const bytes    = await file.arrayBuffer();

  // Upload via Supabase Storage REST API with service role key
  const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`;
  const uploadResp = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      apikey:          SERVICE_KEY,
      Authorization:   `Bearer ${SERVICE_KEY}`,
      "Content-Type":  file.type,
      "x-upsert":      "true",
    },
    body: bytes,
  });

  if (!uploadResp.ok) {
    const detail = await uploadResp.text().catch(() => "");
    console.error("[upload] Supabase error:", uploadResp.status, detail);
    return NextResponse.json(
      { error: `Upload failed (${uploadResp.status}): ${detail}` },
      { status: 500 }
    );
  }

  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
  return NextResponse.json({ url: publicUrl, jobId });
}
