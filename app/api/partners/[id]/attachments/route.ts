import { requireAuthApi, requireRoleApi, currentUser } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { db, audit } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const g = requireAuthApi(); if (g) return g
  const rows = db().prepare(`
    SELECT id, filename, mime, size, uploaded_by, created_at
    FROM attachments WHERE partner_id = ? ORDER BY created_at DESC
  `).all(params.id)
  return NextResponse.json({ attachments: rows })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const g = requireRoleApi('admin', 'manager'); if (g) return g
  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'no file' }, { status: 400 })
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'الملف أكبر من 5MB' }, { status: 400 })

  const buf = Buffer.from(await file.arrayBuffer())
  db().prepare(`
    INSERT INTO attachments (partner_id, filename, mime, size, data, uploaded_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(params.id, file.name, file.type, file.size, buf, currentUser()?.email || null)
  audit('attachment.upload', { user: currentUser()?.email, type: 'partner', id: params.id, details: file.name })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const g = requireRoleApi('admin', 'manager'); if (g) return g
  const attId = req.nextUrl.searchParams.get('attId')
  if (!attId) return NextResponse.json({ error: 'attId required' }, { status: 400 })
  db().prepare(`DELETE FROM attachments WHERE id = ? AND partner_id = ?`).run(attId, params.id)
  audit('attachment.delete', { user: currentUser()?.email, type: 'partner', id: params.id })
  return NextResponse.json({ ok: true })
}
