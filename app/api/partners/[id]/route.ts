import { requireAuthApi } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { db, computeActivationScore, deriveStage } from '@/lib/db'
import { logActivity } from '@/lib/queries'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const g = requireAuthApi(); if (g) return g;
  const id = Number(params.id)
  const body = await req.json()
  const cur = db().prepare('SELECT * FROM partners WHERE id = ?').get(id) as any
  if (!cur) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const next = {
    ...cur,
    invite_sent: body.invite_sent ? 1 : 0,
    rfi_sent: body.rfi_sent ? 1 : 0,
    initial_receipt: body.initial_receipt ? 1 : 0,
    response_received: body.response_received ? 1 : 0,
    workshop_attendance: body.workshop_attendance ?? cur.workshop_attendance,
    workshop_date: body.workshop_date ?? cur.workshop_date,
    notes: body.notes ?? cur.notes,
    status: body.status ?? cur.status,
  }
  next.activation_score = computeActivationScore(next)
  next.stage = deriveStage(next)

  db().prepare(`
    UPDATE partners SET invite_sent=?, rfi_sent=?, initial_receipt=?, response_received=?,
      workshop_attendance=?, workshop_date=?, notes=?, status=?, activation_score=?, stage=?,
      updated_at=datetime('now')
    WHERE id = ?
  `).run(next.invite_sent, next.rfi_sent, next.initial_receipt, next.response_received,
    next.workshop_attendance, next.workshop_date, next.notes, next.status,
    next.activation_score, next.stage, id)

  const changes: string[] = []
  if (cur.invite_sent !== next.invite_sent) changes.push(next.invite_sent ? 'تم إرسال الدعوة' : 'تراجع عن إرسال الدعوة')
  if (cur.rfi_sent !== next.rfi_sent) changes.push(next.rfi_sent ? 'تم إرسال RFI' : 'تراجع عن RFI')
  if (cur.response_received !== next.response_received && next.response_received) changes.push('تم استلام الرد')
  if (cur.stage !== next.stage) changes.push(`الانتقال للمرحلة: ${next.stage}`)
  for (const c of changes) logActivity(id, 'تحديث', c)

  return NextResponse.json({ ok: true, partner: next })
}
