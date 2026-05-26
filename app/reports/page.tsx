import { requireAuth } from '@/lib/auth'
import { buildExecutiveReport } from '@/lib/queries'

export const dynamic = 'force-dynamic'

export default function ReportsPage() {
  requireAuth()
  const r = buildExecutiveReport()
  const date = new Date(r.generatedAt).toLocaleString('ar-SA')

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-end flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black">التقارير المؤتمتة</h1>
          <p className="text-slate-500 mt-1">تقارير تنفيذية تُولّد تلقائياً من بيانات المنصة</p>
        </div>
        <div className="flex gap-2">
          <a href="/api/reports?format=pdf" className="btn btn-primary">تنزيل PDF</a>
          <a href="/api/export?type=partners" className="btn btn-ghost border border-slate-200">تنزيل Excel</a>
          <a href="/api/backup" className="btn btn-ghost border border-slate-200">نسخة احتياطية</a>
        </div>
      </header>

      <div className="card p-8 space-y-6" id="report">
        <div className="border-b pb-4">
          <h2 className="text-2xl font-black text-brand-700">التقرير التنفيذي للشراكات</h2>
          <div className="text-sm text-slate-500 mt-1">صدر في: {date}</div>
        </div>

        <section>
          <h3 className="font-bold text-lg mb-3">ملخص تنفيذي</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <KV label="إجمالي الشراكات" value={r.overview.totalPartners} />
            <KV label="مُفعّلة" value={r.overview.activated} />
            <KV label="نسبة الاستجابة" value={`${r.overview.responseRate}%`} />
            <KV label="ورش منفذة" value={r.overview.workshopsHeld} />
            <KV label="متوسط التفعيل" value={`${r.overview.avgActivation}%`} />
            <KV label="عدد القطاعات" value={r.overview.bySector.length} />
            <KV label="عدد التوصيات" value={r.recommendationsCount} />
            <KV label="فرص نشطة" value={r.topOpportunities.length} />
          </div>
        </section>

        <section>
          <h3 className="font-bold text-lg mb-3">أبرز النقاط</h3>
          <ul className="list-disc list-inside space-y-2 text-slate-700">
            {r.highlights.map((h, i) => <li key={i}>{h}</li>)}
          </ul>
        </section>

        {r.risks.length > 0 && (
          <section>
            <h3 className="font-bold text-lg mb-3">المخاطر والتنبيهات</h3>
            <ul className="list-disc list-inside space-y-2 text-rose-700">
              {r.risks.map((h, i) => <li key={i}>{h}</li>)}
            </ul>
          </section>
        )}

        <section>
          <h3 className="font-bold text-lg mb-3">التوزيع حسب المرحلة</h3>
          <table className="data">
            <thead><tr><th>المرحلة</th><th>العدد</th><th>النسبة</th></tr></thead>
            <tbody>
              {r.overview.byStage.map(s => (
                <tr key={s.stage}>
                  <td>{s.stage}</td>
                  <td>{s.count}</td>
                  <td>{r.overview.totalPartners ? Math.round((s.count / r.overview.totalPartners) * 100) : 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section>
          <h3 className="font-bold text-lg mb-3">أهم الفرص</h3>
          <table className="data">
            <thead><tr><th>الشركة</th><th>الفرصة</th><th>القيمة</th><th>الاحتمالية</th></tr></thead>
            <tbody>
              {r.topOpportunities.map((o, i) => (
                <tr key={i}>
                  <td>{o.company}</td>
                  <td>{o.title}</td>
                  <td>{(o.estimated_value / 1000).toFixed(0)}K ر.س</td>
                  <td>{o.probability}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <footer className="border-t pt-4 text-xs text-slate-500">
          تم توليد هذا التقرير آلياً من منصة إدارة الشراكات. للتغذية الراجعة: تحديث بيانات الشراكات يُحدّث التقرير فوراً.
        </footer>
      </div>
    </div>
  )
}

function KV({ label, value }: { label: string; value: any }) {
  return (
    <div className="bg-slate-50 p-3 rounded-lg">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-xl font-black">{value}</div>
    </div>
  )
}
