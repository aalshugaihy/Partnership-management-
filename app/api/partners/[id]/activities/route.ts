import { NextRequest, NextResponse } from 'next/server'
import { logActivity } from '@/lib/queries'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const id = Number(params.id)
  if (!body.title) return NextResponse.json({ error: 'title required' }, { status: 400 })
  logActivity(id, body.kind || 'ملاحظة', body.title, body.description ?? null)
  return NextResponse.json({ ok: true })
}
