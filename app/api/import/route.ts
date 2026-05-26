import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { db, computeActivationScore, deriveStage } from '@/lib/db'

function findCol(headers: string[], aliases: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    const h = String(headers[i] || '').trim().toLowerCase()
    if (aliases.some(a => h.includes(a.toLowerCase()))) return i
  }
  return -1
}

function asBool(v: any): boolean {
  if (v === true || v === 1) return true
  if (typeof v === 'string') return /^(نعم|تم|y|true|1)/i.test(v.trim())
  return false
}

function s(v: any): string | null {
  if (v === null || v === undefined) return null
  const t = String(v).trim()
  return t || null
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) return NextResponse.json({ ok: false, error: 'no file' }, { status: 400 })

    const arr = await file.arrayBuffer()
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(arr as any)
    const ws = wb.worksheets[0]
    if (!ws) return NextResponse.json({ ok: false, error: 'empty workbook' }, { status: 400 })

    const headerRow = ws.getRow(1).values as any[]
    const headers = headerRow.slice(1).map(v => String(v || ''))

    const cols = {
      company: findCol(headers, ['شركة', 'company', 'اسم الشركة', 'أسم الشركة']),
      sector: findCol(headers, ['قطاع', 'sector']),
      country: findCol(headers, ['دولة', 'country']),
      tier: findCol(headers, ['مستوى', 'tier']),
      invite: findCol(headers, ['دعوة', 'invite']),
      rfi: findCol(headers, ['rfi']),
      initial: findCol(headers, ['استلام', 'initial']),
      response: findCol(headers, ['رد', 'استقبال', 'response']),
      workshop: findCol(headers, ['ورش', 'workshop']),
      workshop_date: findCol(headers, ['تاريخ', 'date']),
      platform: findCol(headers, ['منصة', 'platform']),
      status: findCol(headers, ['حالة', 'status']),
      notes: findCol(headers, ['ملاح', 'note']),
    }

    if (cols.company < 0) {
      return NextResponse.json({ ok: false, error: 'لم يتم العثور على عمود اسم الشركة' }, { status: 400 })
    }

    const d = db()
    let created = 0, updated = 0, skipped = 0
    const get = (row: any[], idx: number) => idx >= 0 ? row[idx] : undefined

    const findByName = d.prepare('SELECT id FROM partners WHERE TRIM(company) = ?')
    const ins = d.prepare(`
      INSERT INTO partners
      (id, company, sector, country, tier, status, stage, invite_sent, rfi_sent,
       initial_receipt, response_received, platform, workshop_attendance, workshop_date, notes,
       strategic_value, activation_score)
      VALUES (@id, @company, @sector, @country, @tier, @status, @stage, @invite_sent, @rfi_sent,
       @initial_receipt, @response_received, @platform, @workshop_attendance, @workshop_date, @notes,
       @strategic_value, @activation_score)
    `)
    const upd = d.prepare(`
      UPDATE partners SET sector=COALESCE(?, sector), country=COALESCE(?, country),
        tier=COALESCE(?, tier), status=COALESCE(?, status),
        invite_sent=?, rfi_sent=?, initial_receipt=?, response_received=?,
        platform=COALESCE(?, platform), workshop_attendance=COALESCE(?, workshop_attendance),
        workshop_date=COALESCE(?, workshop_date), notes=COALESCE(?, notes),
        activation_score=?, stage=?, updated_at=datetime('now')
      WHERE id = ?
    `)
    const maxIdRow = d.prepare('SELECT MAX(id) AS m FROM partners').get() as any
    let nextId = (maxIdRow.m ?? 0) + 1

    const tx = d.transaction(() => {
      ws.eachRow({ includeEmpty: false }, (row, rowNum) => {
        if (rowNum === 1) return
        const vals = row.values as any[]
        const r = vals.slice(1)
        const company = s(get(r, cols.company))
        if (!company) { skipped++; return }
        const fields: any = {
          company,
          sector: s(get(r, cols.sector)) || 'متعدد',
          country: s(get(r, cols.country)) || 'أخرى',
          tier: s(get(r, cols.tier)) || 'قياسي',
          status: s(get(r, cols.status)) || 'لا يوجد',
          invite_sent: asBool(get(r, cols.invite)) ? 1 : 0,
          rfi_sent: asBool(get(r, cols.rfi)) ? 1 : 0,
          initial_receipt: asBool(get(r, cols.initial)) ? 1 : 0,
          response_received: asBool(get(r, cols.response)) ? 1 : 0,
          platform: s(get(r, cols.platform)),
          workshop_attendance: s(get(r, cols.workshop)),
          workshop_date: s(get(r, cols.workshop_date)),
          notes: s(get(r, cols.notes)),
          strategic_value: 5,
        }
        fields.activation_score = computeActivationScore(fields)
        fields.stage = deriveStage(fields)

        const existing = findByName.get(company) as any
        if (existing) {
          upd.run(fields.sector, fields.country, fields.tier, fields.status,
            fields.invite_sent, fields.rfi_sent, fields.initial_receipt, fields.response_received,
            fields.platform, fields.workshop_attendance, fields.workshop_date, fields.notes,
            fields.activation_score, fields.stage, existing.id)
          updated++
        } else {
          ins.run({ id: nextId++, ...fields })
          created++
        }
      })
    })
    tx()

    return NextResponse.json({ ok: true, created, updated, skipped })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'خطأ غير متوقع' }, { status: 500 })
  }
}
