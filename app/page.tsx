import { requireAuth } from '@/lib/auth'
import { overview } from '@/lib/queries'
import {
  GEOSA_CLASSIFICATION_LABELS, ENTITY_CATEGORY_LABELS, COOPERATION_AREA_LABELS,
} from '@/lib/db'
import { BarChartCard, PieChartCard, ActivationGauge } from '@/components/Charts'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function Dashboard() {
  requireAuth()
  const ov = overview()

  // Localize labels for charts
  const classData = ov.byClassification.map(r => ({
    name: GEOSA_CLASSIFICATION_LABELS[r.geosa_classification] || r.geosa_classification,
    count: r.count,
  }))
  const entityData = ov.byEntityCategory.map(r => ({
    name: ENTITY_CATEGORY_LABELS[r.entity_category] || r.entity_category,
    count: r.count,
  }))
  const coopData = ov.byCooperationArea.map(r => ({
    name: COOPERATION_AREA_LABELS[r.area] || r.area,
    count: r.count,
  }))

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black">لوحة معلومات الشراكات</h1>
          <p className="text-slate-500 mt-1">منهجية GEOSA - تفعيل، متابعة، وقياس أثر الاتفاقيات</p>
        </div>
        <div className="flex gap-2">
          <Link href="/reports" className="btn btn-primary">توليد تقرير</Link>
          <Link href="/recommendations" className="btn btn-ghost border border-slate-200">عرض التوصيات</Link>
        </div>
      </header>

      {/* Top-level KPIs - GEOSA active partnerships first, then prospects */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="شراكات مبرمة (GEOSA)" value={ov.active} accent="green" href="/partners?type=active" />
        <Stat label="مستهدفات (Prospects)" value={ov.prospects} accent="amber" href="/partners?type=prospect" />
        <Stat label="مراجعات قادمة" value={ov.upcomingReviews.length} accent="blue" />
        <Stat label="ورش العمل المنفذة" value={ov.workshopsHeld} accent="brand" />
      </div>

      {/* GEOSA lifecycle distribution + activation gauge */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="card p-5 md:col-span-2">
          <h3 className="font-bold mb-3">توزيع الشراكات المبرمة على مراحل دورة GEOSA</h3>
          <BarChartCard data={ov.byGeosaStage.map(s => ({ stage: s.stage, count: s.count }))} xKey="stage" yKey="count" />
        </div>
        <div className="card p-5">
          <h3 className="font-bold mb-3">متوسط مؤشر التفعيل</h3>
          <ActivationGauge value={ov.avgActivation} />
          <div className="text-center -mt-10 mb-3 text-4xl font-black text-slate-800">{ov.avgActivation}%</div>
          <div className="text-center text-xs text-slate-500">عبر كل الشراكات في المنصة</div>
        </div>
      </div>

      {/* GEOSA: classification + entity + cooperation areas */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="card p-5">
          <h3 className="font-bold mb-3">تصنيف GEOSA</h3>
          {classData.length > 0 ? (
            <PieChartCard data={classData} nameKey="name" valueKey="count" />
          ) : (
            <div className="text-center text-slate-500 py-12 text-sm">لا بيانات بعد</div>
          )}
        </div>
        <div className="card p-5">
          <h3 className="font-bold mb-3">صنف الجهة</h3>
          {entityData.length > 0 ? (
            <PieChartCard data={entityData} nameKey="name" valueKey="count" />
          ) : (
            <div className="text-center text-slate-500 py-12 text-sm">لا بيانات بعد</div>
          )}
        </div>
        <div className="card p-5">
          <h3 className="font-bold mb-3">مجالات التعاون</h3>
          {coopData.length > 0 ? (
            <BarChartCard data={coopData.map(d => ({ stage: d.name, count: d.count }))} xKey="stage" yKey="count" height={200} />
          ) : (
            <div className="text-center text-slate-500 py-12 text-sm">لا بيانات بعد</div>
          )}
        </div>
      </div>

      {/* Top active partners + recent activity */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="font-bold mb-3">أعلى الشراكات المبرمة تفعيلاً</h3>
          <table className="data">
            <thead><tr><th>الجهة</th><th>تصنيف GEOSA</th><th>التفعيل</th></tr></thead>
            <tbody>
              {ov.topActivePartners.map(p => (
                <tr key={p.id}>
                  <td><Link href={`/partners/${p.id}`} className="text-brand-700 font-medium">{p.company}</Link></td>
                  <td className="text-xs">{p.geosa_classification ? GEOSA_CLASSIFICATION_LABELS[p.geosa_classification] : '—'}</td>
                  <td><span className="badge badge-blue">{p.activation_score}%</span></td>
                </tr>
              ))}
              {ov.topActivePartners.length === 0 && (
                <tr><td colSpan={3} className="text-center text-slate-500 py-4">لا توجد شراكات مبرمة بعد.</td></tr>
              )}
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

      {/* Upcoming reviews — surfacing GEOSA stage 3 (Continuous Monitoring) */}
      {ov.upcomingReviews.length > 0 && (
        <div className="card p-5">
          <h3 className="font-bold mb-3">المراجعات الدورية القادمة</h3>
          <table className="data">
            <thead><tr><th>الجهة</th><th>موعد المراجعة</th><th></th></tr></thead>
            <tbody>
              {ov.upcomingReviews.map((r: any) => (
                <tr key={r.id}>
                  <td><Link href={`/partners/${r.id}`} className="text-brand-700 font-medium">{r.company}</Link></td>
                  <td>{r.next_review_date}</td>
                  <td><Link href={`/partners/${r.id}`} className="text-brand-600 text-sm">افتح ←</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, accent, href }: { label: string; value: any; accent: string; href?: string }) {
  const colors: Record<string, string> = {
    brand: 'text-brand-700 bg-brand-50',
    green: 'text-emerald-700 bg-emerald-50',
    amber: 'text-amber-700 bg-amber-50',
    blue: 'text-blue-700 bg-blue-50',
  }
  const inner = (
    <>
      <div className={`inline-block px-2 py-0.5 rounded-md text-xs w-fit ${colors[accent]}`}>{label}</div>
      <div className="text-3xl font-black mt-2">{value}</div>
    </>
  )
  if (href) return <Link href={href} className="stat hover:border-brand-500 transition">{inner}</Link>
  return <div className="stat">{inner}</div>
}
