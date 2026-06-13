/**
 * X68 Email Templates
 * Clean, dark-themed HTML emails for district alerts
 */

const BASE_STYLE = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #0A0E1A;
  color: #e2e8f0;
  margin: 0;
  padding: 0;
`

const DISTRICT_COLORS: Record<string, { accent: string; label: string; icon: string }> = {
  propos:      { accent: '#60a5fa', label: 'PropOS District',      icon: '🏙️' },
  aceeconomy:  { accent: '#34d399', label: 'Financial District',   icon: '💹' },
  nexustravel: { accent: '#a78bfa', label: 'NexusTravel District', icon: '✈️' },
  commerce:    { accent: '#fbbf24', label: 'E-commerce District',  icon: '🛒' },
}

export function districtAlertEmail({
  district,
  citizenName,
  alertType,
  message,
  ctaUrl,
  ctaLabel,
}: {
  district: string
  citizenName: string
  alertType: string
  message: string
  ctaUrl: string
  ctaLabel: string
}) {
  const d = DISTRICT_COLORS[district] ?? { accent: '#00D4FF', label: district, icon: '🌐' }

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="${BASE_STYLE}">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">

    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <span style="font-size:24px;font-weight:900;background:linear-gradient(90deg,#00D4FF,#60a5fa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">X68</span>
      <span style="color:#475569;font-size:12px;display:block;margin-top:4px;">新国度 · New Economic Verse</span>
    </div>

    <!-- District badge -->
    <div style="background:#111827;border:1px solid ${d.accent}33;border-radius:12px;padding:24px;margin-bottom:24px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
        <span style="font-size:24px;">${d.icon}</span>
        <div>
          <span style="color:${d.accent};font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">${d.label}</span>
          <div style="color:#94a3b8;font-size:11px;">${alertType}</div>
        </div>
      </div>
      <p style="color:#e2e8f0;font-size:15px;line-height:1.6;margin:0;">
        Hi <strong>${citizenName}</strong>, ${message}
      </p>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:32px;">
      <a href="${ctaUrl}"
        style="background:${d.accent};color:#000;font-weight:700;font-size:14px;padding:12px 28px;border-radius:8px;text-decoration:none;display:inline-block;">
        ${ctaLabel} →
      </a>
    </div>

    <!-- Footer -->
    <div style="border-top:1px solid #1e293b;padding-top:20px;text-align:center;">
      <p style="color:#334155;font-size:11px;margin:0;">
        You're receiving this as an X68 Citizen.<br>
        <a href="${ctaUrl}/citizen/dashboard" style="color:#475569;">Manage alerts</a> ·
        <a href="${ctaUrl}/citizen/dashboard" style="color:#475569;">Dashboard</a>
      </p>
    </div>

  </div>
</body>
</html>`
}

export function welcomeEmail({ citizenName, referralCode, siteUrl }: {
  citizenName: string
  referralCode: string
  siteUrl: string
}) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="${BASE_STYLE}">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">

    <div style="text-align:center;margin-bottom:32px;">
      <span style="font-size:32px;font-weight:900;background:linear-gradient(90deg,#00D4FF,#60a5fa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">X68</span>
      <span style="color:#475569;font-size:12px;display:block;margin-top:4px;">新国度 · New Economic Verse</span>
    </div>

    <div style="background:#111827;border:1px solid #1e3a5f;border-radius:16px;padding:32px;margin-bottom:24px;">
      <h1 style="color:#fff;font-size:22px;margin:0 0 8px;">Welcome, Citizen ${citizenName} 🎉</h1>
      <p style="color:#94a3b8;font-size:14px;margin:0 0 24px;">You've joined the X68 New Economic Verse. Your AI agents are standing by.</p>

      <div style="background:#0A0E1A;border-radius:10px;padding:16px;margin-bottom:20px;">
        <p style="color:#64748b;font-size:11px;margin:0 0 6px;text-transform:uppercase;letter-spacing:0.05em;">Your Referral Code</p>
        <p style="color:#00D4FF;font-size:22px;font-weight:700;font-family:monospace;letter-spacing:0.15em;margin:0;">${referralCode}</p>
        <p style="color:#475569;font-size:11px;margin:6px 0 0;">Share this — earn 100 Nexus Credits per friend who joins</p>
      </div>

      <div style="display:grid;gap:10px;">
        ${[
          ['🏙️', 'PropOS', 'Property intelligence & deal alerts'],
          ['💹', 'Financial', 'Stock signals & market intelligence'],
          ['✈️', 'NexusTravel', 'Flight & hotel price alerts'],
          ['🛒', 'E-commerce', 'Arbitrage & deal scanning'],
        ].map(([icon, name, desc]) => `
        <div style="background:#111827;border-radius:8px;padding:12px;display:flex;gap:10px;align-items:center;">
          <span style="font-size:18px;">${icon}</span>
          <div>
            <div style="color:#e2e8f0;font-size:13px;font-weight:600;">${name}</div>
            <div style="color:#64748b;font-size:11px;">${desc}</div>
          </div>
        </div>`).join('')}
      </div>
    </div>

    <div style="text-align:center;">
      <a href="${siteUrl}/citizen/dashboard"
        style="background:#00D4FF;color:#000;font-weight:700;font-size:14px;padding:14px 32px;border-radius:10px;text-decoration:none;display:inline-block;">
        Enter Your Dashboard →
      </a>
    </div>

  </div>
</body>
</html>`
}
