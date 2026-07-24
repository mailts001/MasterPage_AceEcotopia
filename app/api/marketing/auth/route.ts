import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { pin } = await req.json();
  const correct = process.env.MARKETING_PIN ?? "";
  if (!correct) return NextResponse.json({ error: "not configured" }, { status: 500 });
  if (pin === correct) return NextResponse.json({ ok: true });
  return NextResponse.json({ error: "wrong pin" }, { status: 401 });
}
