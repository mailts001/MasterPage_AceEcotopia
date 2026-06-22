import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const DISTRICT_ROLES: Record<string, { role: string; requiredCredential: boolean; feeRange: [number, number] }> = {
  marketingos: { role: 'Content Creator / Copywriter',        requiredCredential: false, feeRange: [10, 50]  },
  propos:      { role: 'Licensed Property Agent',             requiredCredential: true,  feeRange: [30, 200] },
  nexustravel: { role: 'Travel Concierge',                    requiredCredential: false, feeRange: [20, 100] },
  commerce:    { role: 'Sourcing Agent / Seller Consultant',  requiredCredential: false, feeRange: [15, 80]  },
  aceeconomy:  { role: 'Trading Mentor / Analyst',            requiredCredential: false, feeRange: [20, 150] },
  serenity:    { role: 'Wellness Coach',                      requiredCredential: false, feeRange: [20, 120] },
}

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!
const OWNER_TELEGRAM_ID  = '1245366658'

async function sendTelegramMessage(text: string, replyMarkup?: object) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: OWNER_TELEGRAM_ID,
      text,
      parse_mode: 'Markdown',
      reply_markup: replyMarkup,
    }),
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      expertId, full_name, district, role_title,
      qualifications, credential_number, fee_per_session, bio,
      portfolio_url, languages, available_hours,
    } = body

    if (!expertId || !district) {
      return NextResponse.json({ error: 'Missing expertId or district' }, { status: 400 })
    }

    const districtMeta = DISTRICT_ROLES[district]

    // ── AI Screening ─────────────────────────────────────────────
    const screeningPrompt = `You are screening a human expert applicant for X68, a Singapore AI platform.
Each district connects citizens with human experts when AI alone isn't enough.

APPLICANT:
- Name: ${full_name}
- District applied: ${district} (${districtMeta?.role ?? 'Unknown role'})
- Role title: ${role_title}
- Qualifications: ${qualifications}
- Credential number: ${credential_number || 'Not provided'}
- Fee per session: S$${fee_per_session}
- Expected fee range for this district: S$${districtMeta?.feeRange[0]}–${districtMeta?.feeRange[1]}
- Bio: ${bio}
- Portfolio: ${portfolio_url || 'Not provided'}
- Languages: ${languages}
- Available hours: ${available_hours || 'Not specified'}

SCREENING CRITERIA:
1. Does their role/qualifications match the district they applied to?
2. Is their fee within reasonable range for Singapore market?
3. Are their credentials plausible and specific (not vague)?
4. Does bio show genuine expertise (not just generic claims)?
5. For PropOS: CEA registration is REQUIRED. Flag if missing.
6. For Financial: must NOT claim to give regulated investment advice.

Respond in this exact JSON format:
{
  "recommendation": "auto_approve" | "review" | "reject",
  "confidence": 0.0-1.0,
  "district_match": true | false,
  "assigned_district": "${district}",
  "fee_ok": true | false,
  "credential_flag": true | false,
  "flags": ["list of concerns, empty array if none"],
  "summary": "2-3 sentence plain English summary for the platform owner to read",
  "welcome_message": "A warm 1-sentence Telegram welcome message to send the expert IF approved (address them by first name)"
}`

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 600,
      messages: [{ role: 'user', content: screeningPrompt }],
    })

    const rawText = response.content[0].type === 'text' ? response.content[0].text : '{}'
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    const screening = jsonMatch ? JSON.parse(jsonMatch[0]) : { recommendation: 'review', summary: 'Screening parse error — manual review needed.' }

    // ── Update Supabase with screening result ─────────────────────
    const newStatus =
      screening.recommendation === 'auto_approve' ? 'approved' :
      screening.recommendation === 'reject'       ? 'rejected' :
                                                    'pending_review'

    await supabase
      .from('human_experts')
      .update({
        status: newStatus,
        screening_result: screening,
        screening_at: new Date().toISOString(),
      })
      .eq('id', expertId)

    // ── Telegram alert to owner ───────────────────────────────────
    const statusEmoji =
      screening.recommendation === 'auto_approve' ? '✅' :
      screening.recommendation === 'reject'       ? '❌' : '🔍'

    const flagText = screening.flags?.length
      ? `\n⚠️ *Flags:* ${screening.flags.join(', ')}`
      : ''

    const message = `${statusEmoji} *New Expert Application*\n\n` +
      `👤 *${full_name}*\n` +
      `🏙️ District: ${district}\n` +
      `💼 Role: ${role_title}\n` +
      `💰 Fee: S$${fee_per_session}/session\n` +
      `🎯 Confidence: ${Math.round((screening.confidence ?? 0) * 100)}%\n` +
      `${flagText}\n\n` +
      `📋 *AI Summary:*\n${screening.summary}\n\n` +
      `_Status auto-set to: ${newStatus}_`

    // Show approve/reject buttons only if status is pending_review
    const replyMarkup = newStatus === 'pending_review' ? {
      inline_keyboard: [[
        { text: '✅ Approve', callback_data: `approve_expert_${expertId}` },
        { text: '❌ Reject',  callback_data: `reject_expert_${expertId}`  },
      ]],
    } : undefined

    await sendTelegramMessage(message, replyMarkup)

    // ── If auto-approved, welcome the expert via Telegram ─────────
    if (newStatus === 'approved' && body.telegram_handle && screening.welcome_message) {
      // Note: we can only message if expert has started a chat with the bot
      // Store for manual send or future bot integration
      await supabase
        .from('human_experts')
        .update({ welcome_message_pending: screening.welcome_message })
        .eq('id', expertId)
    }

    return NextResponse.json({
      status: newStatus,
      recommendation: screening.recommendation,
      summary: screening.summary,
    })

  } catch (err) {
    console.error('Screening error:', err)
    return NextResponse.json({ error: 'Screening failed' }, { status: 500 })
  }
}
