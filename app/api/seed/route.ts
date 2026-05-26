import { NextResponse } from 'next/server'
import { execSync } from 'child_process'

export async function POST() {
  try {
    const out = execSync('npm run seed', { encoding: 'utf-8' })
    return NextResponse.json({ ok: true, out })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 })
  }
}
