import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const r = db().prepare('SELECT COUNT(*) AS n FROM partners').get() as any
    return NextResponse.json({
      status: 'ok',
      partners: r.n,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    })
  } catch (e: any) {
    return NextResponse.json({ status: 'error', error: e?.message }, { status: 500 })
  }
}
