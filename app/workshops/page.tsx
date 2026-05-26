import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function WorkshopsPage() {
  requireAuth()
  const workshops = db().prepare(`
    SELECT id, company, workshop_date, workshop_time, workshop_attendance, platform, sector
    FROM partners
    WHERE workshop_date IS NOT NULL OR workshop_attendance IS NOT NULL
    ORDER BY workshop_date DESC
  `).all() as any[]

  const now = new Date().toISOString().slice(0, 10)
  const attended = workshops.filter(w => w.workshop_attendance && /حضور|تم/.test(w.workshop_attendance))
  const upcoming = workshops.filter(w => w.workshop_date && w.workshop_date >= now && !attended.includes(w))
  const past = workshops.filter(w => w.workshop_date && w.workshop_date < now && !attended.includes(w))
  const noShow = workshops.filter(w => w.workshop_attendance && !/حضور|تم/.test(w.workshop_attendance))

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-black">ورش العمل</h1>
        <p className="text-slate-500 mt-1">إدارة ومتابعة ورش العمل مع الشركاء</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="stat py-3 px-4"><div className="text-xs text-slate-500">إجمالي</div><div className="text-2xl font-black">{workshops.length}</div></div>
        <div className="stat py-3 px-4"><div className="text-xs text-slate-500">قادمة</div><div className="text-2xl font-black text-amber-600">{upcoming.length}</div></div>
        <div className="stat py-3 px-4"><div className="text-xs text-slate-500">تم الحضور</div><div className="text-2xl font-black text-emerald-600">{attended.length}</div></div>
        <div className="stat py-3 px-4"><div className="text-xs text-slate-500">عدم حضور</div><div className="text-2xl font-black text-rose-600">{noShow.length}</div></div>
      </div>

      <Section title="ورش قادمة" items={upcoming} accent="amber" />
      <Section title="ورش حضرها الشركاء" items={attended} accent="emerald" />
      <Section title="ورش سابقة" items={past} accent="slate" />
      {noShow.length > 0 && <Section title="عدم حضور / تعذّر" items={noShow} accent="rose" />}
    </div>
  )
}

function Section({ title, items, accent }: { title: string; items: any[]; accent: string }) {
  if (!items.length) return null
  return (
    <section>
      <h2 className={`text-lg font-bold mb-2 text-${accent}-700`}>{title} ({items.length})</h2>
      <div className="card overflow-hidden">
        <table className="data">
          <thead>
            <tr><th>الشركة</th><th>القطاع</th><th>التاريخ</th><th>الوقت</th><th>المنصة</th><th>الحالة</th><th></th></tr>
          </thead>
          <tbody>
            {items.map(w => (
              <tr key={w.id}>
                <td className="font-medium">{w.company}</td>
                <td>{w.sector}</td>
                <td>{w.workshop_date || '—'}</td>
                <td>{w.workshop_time || '—'}</td>
                <td>{w.platform || '—'}</td>
                <td>
                  {w.workshop_attendance && /حضور|تم/.test(w.workshop_attendance)
                    ? <span className="badge badge-green">حضور</span>
                    : w.workshop_attendance
                      ? <span className="badge badge-amber">{w.workshop_attendance}</span>
                      : <span className="badge badge-slate">معلق</span>}
                </td>
                <td><Link href={`/partners/${w.id}`} className="text-brand-600 text-sm">عرض ←</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
