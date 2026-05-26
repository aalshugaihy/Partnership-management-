import { NextRequest, NextResponse } from 'next/server'
import { buildExecutiveReport, generateRecommendations } from '@/lib/queries'

export async function GET(_req: NextRequest) {
  const r = buildExecutiveReport()
  const recs = generateRecommendations()

  // Generate a simple HTML report that the browser can print to PDF
  const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<title>التقرير التنفيذي للشراكات</title>
<style>
  body { font-family: 'Tajawal', Arial, sans-serif; background: #f8fafc; color: #0f172a; padding: 32px; }
  h1 { color: #1d4ed8; }
  h2 { color: #2563eb; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-top: 28px; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  th, td { padding: 8px; text-align: right; border-bottom: 1px solid #e2e8f0; }
  th { background: #2563eb; color: white; }
  .kv { display: inline-block; padding: 12px 16px; background: white; border: 1px solid #e2e8f0; border-radius: 8px; margin: 4px; min-width: 140px; }
  .kv b { display: block; font-size: 22px; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 6px; font-size: 12px; }
  .red { background: #fee2e2; color: #b91c1c; }
  .amber { background: #fef3c7; color: #92400e; }
  .green { background: #d1fae5; color: #065f46; }
  .rec { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 12px; }
  .print { background: #2563eb; color: white; border: 0; padding: 10px 20px; border-radius: 8px; cursor: pointer; }
  @media print { .no-print { display: none; } }
</style>
</head>
<body>
<button onclick="window.print()" class="print no-print">طباعة / حفظ كـ PDF</button>
<h1>التقرير التنفيذي للشراكات</h1>
<div>صدر في: ${new Date(r.generatedAt).toLocaleString('ar-SA')}</div>

<h2>ملخص تنفيذي</h2>
<div>
  <span class="kv"><span>إجمالي الشراكات</span><b>${r.overview.totalPartners}</b></span>
  <span class="kv"><span>مفعّلة</span><b>${r.overview.activated}</b></span>
  <span class="kv"><span>نسبة الاستجابة</span><b>${r.overview.responseRate}%</b></span>
  <span class="kv"><span>ورش منفذة</span><b>${r.overview.workshopsHeld}</b></span>
  <span class="kv"><span>متوسط التفعيل</span><b>${r.overview.avgActivation}%</b></span>
</div>

<h2>أبرز النقاط</h2>
<ul>${r.highlights.map(h => `<li>${h}</li>`).join('')}</ul>

${r.risks.length ? `<h2>المخاطر</h2><ul>${r.risks.map(h => `<li style="color:#b91c1c">${h}</li>`).join('')}</ul>` : ''}

<h2>التوزيع حسب المرحلة</h2>
<table><thead><tr><th>المرحلة</th><th>العدد</th><th>النسبة</th></tr></thead>
<tbody>${r.overview.byStage.map(s => `<tr><td>${s.stage}</td><td>${s.count}</td><td>${r.overview.totalPartners ? Math.round((s.count / r.overview.totalPartners) * 100) : 0}%</td></tr>`).join('')}</tbody>
</table>

<h2>التوزيع حسب القطاع</h2>
<table><thead><tr><th>القطاع</th><th>العدد</th></tr></thead>
<tbody>${r.overview.bySector.map((s: any) => `<tr><td>${s.sector}</td><td>${s.count}</td></tr>`).join('')}</tbody>
</table>

<h2>أعلى الفرص</h2>
<table><thead><tr><th>الشركة</th><th>الفرصة</th><th>القيمة</th><th>الاحتمالية</th></tr></thead>
<tbody>${r.topOpportunities.map(o => `<tr><td>${o.company}</td><td>${o.title}</td><td>${(o.estimated_value/1000).toFixed(0)}K ر.س</td><td>${o.probability}%</td></tr>`).join('')}</tbody>
</table>

<h2>التوصيات (${recs.length})</h2>
${recs.map(rec => `
  <div class="rec">
    <div><span class="badge ${rec.priority === 'عالية' ? 'red' : rec.priority === 'متوسطة' ? 'amber' : 'green'}">أولوية ${rec.priority}</span> <strong>${rec.title}</strong></div>
    <div style="margin-top:6px"><strong>السبب:</strong> ${rec.rationale}</div>
    <div><strong>الإجراء:</strong> ${rec.action}</div>
    <div><strong>الأثر المتوقع:</strong> ${rec.expectedImpact}</div>
    ${rec.affectedPartners.length ? `<div style="margin-top:6px;font-size:12px"><strong>الشركات:</strong> ${rec.affectedPartners.map(p => p.company).join('، ')}</div>` : ''}
  </div>
`).join('')}

</body>
</html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  })
}
