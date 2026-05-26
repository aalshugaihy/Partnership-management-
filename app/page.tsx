import { overview } from '@/lib/queries'
import { BarChartCard, PieChartCard, ActivationGauge } from '@/components/Charts'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function Dashboard() {
  const ov = overview()

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black">لوحة معلومات الشراكات</h1>
          <p className="text-slate-500 mt-1">نظرة شاملة على حالة الشراكات وتفعيلها وأثرها</p>
        </div>
        <div className="flex gap-2">
          <Link href="/reports" className="btn btn-primary">توليد تقرير</Link>
          <Link href="/recommendations" className="btn btn-ghost border border-slate-200">عرض التوصيات</Link>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="إجمالي الشراكات" value={ov.totalPartners} accent="brand" />
        <Stat label="في مرحلة التفعيل" value={ov.activated} accent="green" />
        <Stat label="نسبة الاستجابة" value={`${ov.responseRate}%`} accent="amber" />
        <Stat label="ورش العمل المنفذة" value={ov.workshopsHeld} accent="blue" />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="card p-5 md:col-span-2">
          <h3 className="font-bold mb-3">توزيع الشراكات حسب المرحلة</h3>
          <BarChartCard data={ov.byStage} xKey="stage" yKey="count" />
        </div>
        <div className="card p-5">
          <h3 className="font-bold mb-3">متوسط مؤشر التفعيل</h3>
          <ActivationGauge value={ov.avgActivation} />
          <div className="text-center -mt-10 mb-3 text-4xl font-black text-slate-800">{ov.avgActivation}%</div>
          <div className="text-center text-xs text-slate-500">يستند للنشاط في كل مراحل التفعيل</div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="font-bold mb-3">القطاعات</h3>
          <PieChartCard data={ov.bySector.slice(0, 6)} nameKey="sector" valueKey="count" />
        </div>
        <div className="card p-5">
          <h3 className="font-bold mb-3">المستويات</h3>
          <PieChartCard data={ov.byTier} nameKey="tier" valueKey="count" />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="font-bold mb-3">أعلى الشراكات تفعيلاً</h3>
          <table className="data">
            <thead><tr><th>الشركة</th><th>القطاع</th><th>التفعيل</th></tr></thead>
            <tbody>
              {ov.topPartners.map(p => (
                <tr key={p.id}>
                  <td><Link href={`/partners/${p.id}`} className="text-brand-700 font-medium">{p.company}</Link></td>
                  <td>{p.sector}</td>
                  <td><span className="badge badge-blue">{p.activation_score}%</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card p-5">
          <h3 className="font-bold mb-3">آخر النشاطات</h3>
          <ul className="space-y-3 text-sm">
            {ov.recentActivity.map((a: any) => (
              <li key={a.id} className="flex justify-between items-start gap-3 border-b pb-2 last:border-b-0">
                <div>
                  <div className="font-medium">{a.title}</div>
                  <div className="text-xs text-slate-500">{a.company}</div>
                </div>
                <span className="badge badge-slate whitespace-nowrap">{a.kind}</span>
              </li>
            ))}
            {ov.recentActivity.length === 0 && (
              <li className="text-slate-500 text-sm">لا توجد نشاطات بعد.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: any; accent: string }) {
  const colors: Record<string, string> = {
    brand: 'text-brand-700 bg-brand-50',
    green: 'text-emerald-700 bg-emerald-50',
    amber: 'text-amber-700 bg-amber-50',
    blue: 'text-blue-700 bg-blue-50',
  }
  return (
    <div className="stat">
      <div className={`inline-block px-2 py-0.5 rounded-md text-xs w-fit ${colors[accent]}`}>{label}</div>
      <div className="text-3xl font-black mt-2">{value}</div>
    </div>
  )
}
