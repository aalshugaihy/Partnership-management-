import { requireAuth } from '@/lib/auth'
import { getKPIs, overview, listSnapshots } from '@/lib/queries'
import { db } from '@/lib/db'
import { BarChartCard, TrendChart } from '@/components/Charts'
import { SnapshotButton } from './SnapshotButton'

export const dynamic = 'force-dynamic'

export default function KPIPage() {
  requireAuth()
  const ov = overview()
  const kpis = getKPIs()

  // Update KPI actuals based on current state
  const actualMap: Record<string, number> = {
    'عدد الشراكات المُفعّلة': ov.activated,
    'نسبة الرد من الشركات': ov.responseRate,
    'عدد ورش العمل المنفذة': ov.workshopsHeld,
    'القيمة الاستراتيجية المتوسطة': Math.round((db().prepare('SELECT AVG(strategic_value) AS a FROM partners').get() as any).a || 0),
    'تنوع القطاعات المستهدفة': ov.bySector.length,
  }

  const opportunities = db().prepare(`
    SELECT o.*, p.company FROM opportunities o
    LEFT JOIN partners p ON p.id = o.partner_id
    ORDER BY estimated_value DESC
  `).all() as any[]

  const snapshots = listSnapshots(30).map(s => ({
    label: new Date(s.taken_at).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' }),
    'مفعّلة': s.activated,
    'نسبة الرد': s.response_rate,
    'متوسط التفعيل': s.avg_activation,
  }))

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-end flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black">مؤشرات الأداء والأثر</h1>
          <p className="text-slate-500 mt-1">قياس أثر الشراكات على أهداف المنظمة</p>
        </div>
        <SnapshotButton />
      </header>

      <div className="grid md:grid-cols-2 gap-4">
        {kpis.map(k => {
          const actual = actualMap[k.name] ?? k.actual
          const pct = k.target ? Math.min(100, Math.round((actual / k.target) * 100)) : 0
          return (
            <div key={k.id} className="card p-5">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-sm text-slate-500">{k.category}</div>
                  <h3 className="font-bold mt-1">{k.name}</h3>
                </div>
                <span className={`badge ${pct >= 80 ? 'badge-green' : pct >= 50 ? 'badge-amber' : 'badge-red'}`}>
                  {pct}%
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-3">
                <span className="text-3xl font-black">{actual}</span>
                <span className="text-slate-400">من {k.target} {k.unit}</span>
              </div>
              <div className="h-2 mt-3 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full ${pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                  style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
      </div>

      <div className="card p-5">
        <h3 className="font-bold mb-3">تتبع الأثر عبر الزمن</h3>
        {snapshots.length > 1 ? (
          <TrendChart data={snapshots} />
        ) : (
          <div className="text-center text-slate-500 py-12 text-sm">
            لا توجد لقطات كافية بعد. اضغط <strong>تسجيل لقطة الآن</strong> لبدء التتبع الزمني.
          </div>
        )}
      </div>

      <div className="card p-5">
        <h3 className="font-bold mb-3">توزيع الشراكات على الدول</h3>
        <BarChartCard data={ov.byCountry.slice(0, 8)} xKey="country" yKey="count" />
      </div>

      <div className="card p-5">
        <h3 className="font-bold mb-3">الفرص المتوقعة</h3>
        <table className="data">
          <thead><tr><th>العنوان</th><th>الشركة</th><th>القيمة المتوقعة</th><th>الاحتمالية</th><th>الحالة</th></tr></thead>
          <tbody>
            {opportunities.map(o => (
              <tr key={o.id}>
                <td className="font-medium">{o.title}</td>
                <td>{o.company || '—'}</td>
                <td>{o.estimated_value ? `${(o.estimated_value / 1000).toFixed(0)}K ر.س` : '—'}</td>
                <td>{o.probability ? `${o.probability}%` : '—'}</td>
                <td><span className="badge badge-amber">{o.status}</span></td>
              </tr>
            ))}
            {opportunities.length === 0 && (
              <tr><td colSpan={5} className="text-center text-slate-500 py-8">لا توجد فرص مسجلة.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
