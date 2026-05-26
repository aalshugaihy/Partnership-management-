import nodemailer, { Transporter } from 'nodemailer'

type Mail = { to: string; subject: string; text: string; html?: string }

let transporter: Transporter | null = null
let lastErr: string | null = null

function isConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
}

function getTransporter(): Transporter | null {
  if (!isConfigured()) return null
  if (transporter) return transporter
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === '1' || Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER!,
      pass: process.env.SMTP_PASS!,
    },
  })
  return transporter
}

export async function sendMail(m: Mail): Promise<{ ok: boolean; error?: string }> {
  const t = getTransporter()
  if (!t) {
    return { ok: false, error: 'SMTP غير مُكوّن (SMTP_HOST, SMTP_USER, SMTP_PASS غير محددة)' }
  }
  try {
    const from = process.env.SMTP_FROM || process.env.SMTP_USER
    await t.sendMail({ from, to: m.to, subject: m.subject, text: m.text, html: m.html })
    lastErr = null
    return { ok: true }
  } catch (e: any) {
    lastErr = e?.message || String(e)
    return { ok: false, error: lastErr || undefined }
  }
}

export async function sendBatch(messages: Mail[]): Promise<{ sent: number; failed: number; errors: string[] }> {
  let sent = 0, failed = 0
  const errors: string[] = []
  for (const m of messages) {
    const r = await sendMail(m)
    if (r.ok) sent++
    else { failed++; if (r.error) errors.push(`${m.to}: ${r.error}`) }
  }
  return { sent, failed, errors }
}

export function mailerStatus() {
  return {
    configured: isConfigured(),
    host: process.env.SMTP_HOST || null,
    from: process.env.SMTP_FROM || process.env.SMTP_USER || null,
    lastError: lastErr,
  }
}

export async function verifyMailer(): Promise<{ ok: boolean; error?: string }> {
  const t = getTransporter()
  if (!t) return { ok: false, error: 'SMTP غير مُكوّن' }
  try {
    await t.verify()
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) }
  }
}
