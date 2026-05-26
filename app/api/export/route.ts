import { requireAuthApi } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { listPartners, getLicensed } from '@/lib/queries'

export async function GET(req: NextRequest) {
  const g = requireAuthApi(); if (g) return g;
  const type = req.nextUrl.searchParams.get('type') || 'partners'
  const wb = new ExcelJS.Workbook()
  wb.creator = 'منصة إدارة الشراكات'
  wb.created = new Date()

  if (type === 'partners') {
    const ws = wb.addWorksheet('الشراكات', { views: [{ rightToLeft: true }] })
    ws.columns = [
      { header: '#', key: 'id', width: 6 },
      { header: 'الشركة', key: 'company', width: 30 },
      { header: 'القطاع', key: 'sector', width: 18 },
      { header: 'الدولة', key: 'country', width: 14 },
      { header: 'المستوى', key: 'tier', width: 12 },
      { header: 'المرحلة', key: 'stage', width: 14 },
      { header: 'التفعيل %', key: 'activation_score', width: 10 },
      { header: 'القيمة الاستراتيجية', key: 'strategic_value', width: 12 },
      { header: 'إرسال دعوة', key: 'invite_sent', width: 10 },
      { header: 'إرسال RFI', key: 'rfi_sent', width: 10 },
      { header: 'استلام رد', key: 'response_received', width: 10 },
      { header: 'حضور الورشة', key: 'workshop_attendance', width: 14 },
      { header: 'تاريخ الورشة', key: 'workshop_date', width: 14 },
      { header: 'الحالة', key: 'status', width: 14 },
      { header: 'ملاحظات', key: 'notes', width: 30 },
    ]
    ws.getRow(1).font = { bold: true }
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } }
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
    for (const p of listPartners()) ws.addRow(p)
  } else if (type === 'licensed') {
    const ws = wb.addWorksheet('الجهات المرخصة', { views: [{ rightToLeft: true }] })
    ws.columns = [
      { header: '#', key: 'id', width: 6 },
      { header: 'الجهة', key: 'name', width: 40 },
      { header: 'رقم التواصل', key: 'phone', width: 16 },
      { header: 'البريد الإلكتروني', key: 'email', width: 30 },
    ]
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } }
    for (const r of getLicensed()) ws.addRow(r)
  }

  const buf = await wb.xlsx.writeBuffer()
  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${type}-${Date.now()}.xlsx"`,
    },
  })
}
