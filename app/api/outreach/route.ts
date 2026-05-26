import { NextRequest, NextResponse } from 'next/server'
import { db, Partner } from '@/lib/db'
import { TEMPLATES } from '@/lib/outreach'

function csvEscape(v: any): string {
  if (v === null || v === undefined) return ''
  const s = String(v).replace(/"/g, '""')
  return `"${s}"`
}

export async function POST(req: NextRequest) {
  const { templateId, partnerIds } = await req.json()
  const tpl = TEMPLATES.find(t => t.id === templateId)
  if (!tpl) return NextResponse.json({ error: 'template not found' }, { status: 404 })
  if (!Array.isArray(partnerIds) || partnerIds.length === 0) {
    return NextResponse.json({ error: 'no partners selected' }, { status: 400 })
  }

  const placeholders = partnerIds.map(() => '?').join(',')
  const partners = db().prepare(`SELECT * FROM partners WHERE id IN (${placeholders})`).all(...partnerIds) as Partner[]
  const contacts = db().prepare(`
    SELECT partner_id, email FROM contacts WHERE partner_id IN (${placeholders}) AND email IS NOT NULL
  `).all(...partnerIds) as any[]
  const emailMap = new Map<number, string[]>()
  for (const c of contacts) {
    if (!emailMap.has(c.partner_id)) emailMap.set(c.partner_id, [])
    emailMap.get(c.partner_id)!.push(c.email)
  }

  const header = ['الشركة', 'القطاع', 'البريد(البرد)', 'العنوان', 'المحتوى'].map(csvEscape).join(',')
  const lines = [header]
  for (const p of partners) {
    const emails = (emailMap.get(p.id) || []).join('; ')
    lines.push([p.company, p.sector || '', emails, tpl.subject(p), tpl.body(p)].map(csvEscape).join(','))
  }
  const csv = '﻿' + lines.join('\n') // BOM for Excel Arabic support

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="outreach-${templateId}.csv"`,
    },
  })
}
