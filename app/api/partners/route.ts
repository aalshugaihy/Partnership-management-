import { NextRequest, NextResponse } from 'next/server'
import { db, computeActivationScore, deriveStage } from '@/lib/db'

export async function POST(req: NextRequest) {
  const body = await req.json()
  if (!body.company || typeof body.company !== 'string') {
    return NextResponse.json({ error: 'company required' }, { status: 400 })
  }

  const d = db()
  const nextId = ((d.prepare('SELECT MAX(id) AS m FROM partners').get() as any).m ?? 0) + 1

  const fields = {
    id: nextId,
    company: body.company.trim(),
    sector: body.sector || 'متعدد',
    country: body.country || 'أخرى',
    tier: body.tier || 'قياسي',
    status: body.status || 'لا يوجد',
    invite_sent: body.invite_sent ? 1 : 0,
    rfi_sent: body.rfi_sent ? 1 : 0,
    initial_receipt: body.initial_receipt ? 1 : 0,
    response_received: body.response_received ? 1 : 0,
    extension_request: 0,
    platform: body.platform || null,
    rfi_delivery: null,
    workshop_attendance: null,
    workshop_date: null,
    workshop_time: null,
    notes: body.notes || null,
    strategic_value: body.strategic_value ?? 5,
  }
  const activation = computeActivationScore(fields as any)
  const stage = deriveStage(fields as any)

  d.prepare(`
    INSERT INTO partners
    (id, company, sector, country, tier, status, stage, invite_sent, rfi_sent,
     initial_receipt, response_received, extension_request, platform, rfi_delivery,
     workshop_attendance, workshop_date, workshop_time, notes, strategic_value, activation_score)
    VALUES (@id, @company, @sector, @country, @tier, @status, @stage, @invite_sent, @rfi_sent,
     @initial_receipt, @response_received, @extension_request, @platform, @rfi_delivery,
     @workshop_attendance, @workshop_date, @workshop_time, @notes, @strategic_value, @activation_score)
  `).run({ ...fields, stage, activation_score: activation })

  d.prepare('INSERT INTO activities (partner_id, kind, title, description) VALUES (?, ?, ?, ?)')
    .run(nextId, 'إنشاء', 'تم إنشاء الشراكة', null)

  return NextResponse.json({ ok: true, id: nextId })
}
