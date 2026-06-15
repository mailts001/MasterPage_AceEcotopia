import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://master-page-ace-ecotopia.vercel.app'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { to, senderName, referralCode, referralLink, message, personalNote } = await req.json()
  if (!to || !referralCode) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const { error } = await resend.emails.send({
    from: 'X68 <noreply@aceecotopia.com>',
    to,
    subject: `${senderName} invited you to X68 — AI Economic Ecosystem`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0A0E1A;font-family:system-ui,sans-serif;color:#e2e8f0">
  <div style="max-width:520px;margin:0 auto;padding:40px 24px">

    <!-- Logo -->
    <div style="text-align:center;margin-bottom:32px">
      <span style="font-size:28px;font-weight:800;background:linear-gradient(135deg,#00D4FF,#F4B942);
        -webkit-background-clip:text;-webkit-text-fill-color:transparent">X68</span>
      <p style="color:#475569;font-size:12px;margin:4px 0 0">New Economic Verse</p>
    </div>

    <!-- Card -->
    <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);
      border-radius:16px;padding:32px">

      <p style="font-size:14px;color:#94a3b8;margin:0 0 16px">
        <strong style="color:#e2e8f0">${senderName}</strong> thinks you'd find this useful:
      </p>

      <p style="font-size:15px;color:#cbd5e1;line-height:1.6;margin:0 0 24px">
        ${message}
      </p>

      ${personalNote ? `
      <div style="background:rgba(0,212,255,0.05);border-left:2px solid rgba(0,212,255,0.3);
        padding:12px 16px;border-radius:0 8px 8px 0;margin-bottom:24px">
        <p style="font-size:13px;color:#94a3b8;margin:0;font-style:italic">${personalNote}</p>
      </div>` : ''}

      <!-- CTA -->
      <div style="text-align:center;margin:28px 0">
        <a href="${referralLink}"
          style="display:inline-block;background:linear-gradient(135deg,#00D4FF,#0ea5e9);
            color:#000;font-weight:700;font-size:15px;padding:14px 32px;
            border-radius:12px;text-decoration:none">
          Join X68 Free →
        </a>
      </div>

      <!-- What you get -->
      <div style="background:rgba(0,0,0,0.2);border-radius:12px;padding:20px;margin-top:8px">
        <p style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;
          color:#475569;margin:0 0 12px">What you get as a Citizen</p>
        <div style="display:grid;gap:8px">
          ${[
            ['🏠', 'Refinance & property deal alerts'],
            ['📈', 'Stock momentum & squeeze signals'],
            ['✈️', 'Flight price drops & hotel deals'],
            ['🛒', 'E-commerce arbitrage gaps'],
            ['💰', '50 Nexus Credits on signup'],
          ].map(([icon, text]) =>
            `<div style="font-size:13px;color:#94a3b8">${icon} &nbsp;${text}</div>`
          ).join('')}
        </div>
      </div>

      <!-- Referral code -->
      <div style="margin-top:20px;text-align:center">
        <p style="font-size:11px;color:#475569;margin:0 0 8px">Or use referral code at signup</p>
        <code style="font-size:20px;letter-spacing:0.25em;font-weight:700;
          color:#00D4FF;background:rgba(0,212,255,0.08);padding:8px 20px;
          border-radius:8px;border:1px solid rgba(0,212,255,0.2)">
          ${referralCode}
        </code>
      </div>
    </div>

    <p style="text-align:center;font-size:11px;color:#334155;margin-top:24px">
      X68 · New Economic Verse · <a href="${SITE_URL}" style="color:#475569">${SITE_URL}</a>
    </p>
  </div>
</body>
</html>`,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
