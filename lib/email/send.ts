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
