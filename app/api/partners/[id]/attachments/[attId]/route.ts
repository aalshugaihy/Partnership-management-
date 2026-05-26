import { requireAuthApi } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: { id: string; attId: string } }) {
  const g = requireAuthApi(); if (g) return g
  const row = db().prepare(`SELECT filename, mime, data FROM attachments WHERE id = ? AND partner_id = ?`).get(params.attId, params.id) as any
  if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return new NextResponse(row.data, {
    headers: {
      'Content-Type': row.mime || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(row.filename)}"`,
    },
  })
}
