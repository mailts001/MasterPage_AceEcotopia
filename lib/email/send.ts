/**
 * X68 Email sender via Resend
 * From address uses Resend's sandbox domain until you verify your own domain
 */
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// Use Resend sandbox until you verify a domain
// After verifying e.g. x68.app → change to noreply@x68.app
const FROM = 'X68 <onboarding@resend.dev>'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://master-page-ace-ecotopia.vercel.app'

export async function sendWelcomeEmail({
  to,
  citizenName,
  referralCode,
}: {
  to: string
  citizenName: string
  referralCode: string
}) {
  const { welcomeEmail } = await import('./templates')
  return resend.emails.send({
    from: FROM,
    to,
    subject: `Welcome to X68, ${citizenName} — your 50 Nexus Credits are ready`,
    html: welcomeEmail({ citizenName, referralCode, siteUrl: SITE_URL }),
  })
}

export async function sendCouponEmail({
  to,
  citizenName,
  brandName,
  productName,
  rewardType,
  rewardValue,
  couponCode,
  merchantUrl,
}: {
  to: string
  citizenName: string
  brandName: string
  productName: string
  rewardType: string
  rewardValue: number
  couponCode?: string
  merchantUrl?: string
}) {
  const discountLabel =
    rewardType === 'coupon_pct'   ? `${rewardValue}% off` :
    rewardType === 'coupon_fixed' ? `$${rewardValue} off` :
    rewardType === 'points'       ? `${rewardValue} bonus points` :
                                    `free gift`

  const html = `
<!DOCTYPE html><html><body style="font-family:sans-serif;background:#0a0e1a;color:#e2e8f0;padding:32px;max-width:520px;margin:auto">
  <div style="background:#1a1f35;border:1px solid #f59e0b33;border-radius:16px;padding:32px">
    <div style="font-size:36px;margin-bottom:8px">🎁</div>
    <h1 style="color:#f59e0b;margin:0 0 8px">You collected a reward!</h1>
    <p style="color:#94a3b8;margin:0 0 24px">Hi ${citizenName}, you picked up a deal in the X68 Commerce Game.</p>
    <div style="background:#0a0e1a;border-radius:12px;padding:20px;margin-bottom:24px">
      <div style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:.05em">Brand</div>
      <div style="font-size:18px;font-weight:700;color:#fff;margin:4px 0 16px">${brandName}</div>
      <div style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:.05em">Item</div>
      <div style="color:#e2e8f0;margin:4px 0 16px">${productName}</div>
      <div style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:.05em">Your Reward</div>
      <div style="font-size:22px;font-weight:700;color:#f59e0b;margin:4px 0">${discountLabel}</div>
      ${couponCode ? `
      <div style="margin-top:16px;padding:12px;background:#1a1f35;border:1px dashed #f59e0b66;border-radius:8px;text-align:center">
        <div style="color:#64748b;font-size:11px;margin-bottom:4px">COUPON CODE</div>
        <div style="font-size:24px;font-weight:900;letter-spacing:.15em;color:#f59e0b">${couponCode}</div>
      </div>` : ''}
    </div>
    ${merchantUrl ? `<a href="${merchantUrl}" style="display:block;background:#f59e0b;color:#000;font-weight:700;text-align:center;padding:14px;border-radius:10px;text-decoration:none;margin-bottom:16px">Shop Now →</a>` : ''}
    <p style="color:#475569;font-size:12px;margin:0">Collected in the X68 Commerce District game. Coupons are single-use unless otherwise stated.</p>
  </div>
</body></html>`

  return resend.emails.send({
    from: FROM,
    to,
    subject: `🎁 You collected ${discountLabel} from ${brandName}!`,
    html,
  })
}

export async function sendDistrictAlert({
  to,
  citizenName,
  district,
  alertType,
  message,
  ctaUrl,
  ctaLabel,
}: {
  to: string
  citizenName: string
  district: string
  alertType: string
  message: string
  ctaUrl: string
  ctaLabel: string
}) {
  const { districtAlertEmail } = await import('./templates')

  const subjectMap: Record<string, string> = {
    propos:      '🏙️ PropOS Alert',
    aceeconomy:  '💹 Financial District Signal',
    nexustravel: '✈️ Travel Deal Alert',
    commerce:    '🛒 E-commerce Opportunity',
  }

  return resend.emails.send({
    from: FROM,
    to,
    subject: `${subjectMap[district] ?? '🔔 X68 Alert'}: ${alertType}`,
    html: districtAlertEmail({ district, citizenName, alertType, message, ctaUrl, ctaLabel }),
  })
}
