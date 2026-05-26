import { requireRoleApi, currentUser } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { db, Partner, audit } from '@/lib/db'
import { TEMPLATES } from '@/lib/outreach'
import { sendBatch, mailerStatus } from '@/lib/mailer'

export async function GET() {
  return NextResponse.json(mailerStatus())
}

export async function POST(req: NextRequest) {
  const g = requireRoleApi('admin', 'manager'); if (g) return g
  const { templateId, partnerIds } = await req.json()
  const tpl = TEMPLATES.find(t => t.id === templateId)
  if (!tpl) return NextResponse.json({ error: 'template not found' }, { status: 404 })
  if (!Array.isArray(partnerIds) || !partnerIds.length) {
    return NextResponse.json({ error: 'لم يتم اختيار شركات' }, { status: 400 })
  }

  const status = mailerStatus()
  if (!status.configured) {
    return NextResponse.json({ error: 'SMTP غير مُكوّن. أضف SMTP_HOST/USER/PASS كمتغيرات بيئة.' }, { status: 400 })
  }

  const placeholders = partnerIds.map(() => '?').join(',')
  const partners = db().prepare(`SELECT * FROM partners WHERE id IN (${placeholders})`).all(...partnerIds) as Partner[]
  const contactRows = db().prepare(`
    SELECT partner_id, email FROM contacts
    WHERE partner_id IN (${placeholders}) AND email IS NOT NULL AND email != ''
  `).all(...partnerIds) as any[]

  const emailsByPartner = new Map<number, string[]>()
  for (const c of contactRows) {
    if (!emailsByPartner.has(c.partner_id)) emailsByPartner.set(c.partner_id, [])
    emailsByPartner.get(c.partner_id)!.push(c.email)
  }

  const messages: { to: string; subject: string; text: string }[] = []
  const skipped: string[] = []
  for (const p of partners) {
    const emails = emailsByPartner.get(p.id) || []
    if (!emails.length) { skipped.push(p.company); continue }
    for (const to of emails) {
      messages.push({ to, subject: tpl.subject(p), text: tpl.body(p) })
    }
  }

  if (!messages.length) {
    return NextResponse.json({
      ok: false,
      error: 'لا توجد عناوين بريد لأي من الشركات المختارة.',
      skipped,
    }, { status: 400 })
  }

  const result = await sendBatch(messages)

  // Log activities for each partner whose emails were sent
  const insAct = db().prepare(`INSERT INTO activities (partner_id, kind, title, description, actor) VALUES (?, ?, ?, ?, ?)`)
  const me = currentUser()?.email || 'system'
  for (const p of partners) {
    const emails = emailsByPartner.get(p.id) || []
    if (emails.length) {
      insAct.run(p.id, 'بريد', `إرسال: ${tpl.name}`, `تم إرسال ${emails.length} بريد`, me)
    }
  }
  audit('outreach.send', { user: me, type: 'template', id: templateId, details: `sent ${result.sent}, failed ${result.failed}` })

  return NextResponse.json({
    ok: true,
    sent: result.sent,
    failed: result.failed,
    skipped,
    errors: result.errors.slice(0, 5),
  })
}
