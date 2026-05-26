import { db } from '@/lib/db'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function WorkshopsPage() {
  const workshops = db().prepare(`
    SELECT id, company, workshop_date, workshop_time, workshop_attendance, platform, sector
    FROM partners
    WHERE workshop_date IS NOT NULL OR workshop_attendance IS NOT NULL
    ORDER BY workshop_date DESC
  `).all() as any[]

  const attended = workshops.filter(w => w.workshop_attendance && /حضور|تم/.test(w.workshop_attendance)).length
  const scheduled = workshops.filter(w => w.workshop_date && !w.workshop_attendance).length

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-black">ورش العمل</h1>
        <p className="text-slate-500 mt-1">إدارة ومتابعة ورش العمل مع الشركاء</p>
      </header>

      <div className="grid grid-cols-3 gap-4">
        <div className="stat"><div className="text-xs text-slate-500">إجمالي الورش</div><div className="text-3xl font-black">{workshops.length}</div></div>
        <div className="stat"><div className="text-xs text-slate-500">تم الحضور</div><div className="text-3xl font-black text-emerald-600">{attended}</div></div>
        <div className="stat"><div className="text-xs text-slate-500">مجدولة</div><div className="text-3xl font-black text-amber-600">{scheduled}</div></div>
      </div>

      <div className="card">
        <table className="data">
          <thead>
            <tr><th>الشركة</th><th>القطاع</th><th>التاريخ</th><th>الوقت</th><th>المنصة</th><th>الحضور</th><th></th></tr>
          </thead>
          <tbody>
            {workshops.map(w => (
              <tr key={w.id}>
                <td className="font-medium">{w.company}</td>
                <td>{w.sector}</td>
                <td>{w.workshop_date ? new Date(w.workshop_date).toLocaleDateString('ar-SA') : '—'}</td>
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
            {workshops.length === 0 && (
              <tr><td colSpan={7} className="text-center text-slate-500 py-10">لا توجد ورش عمل بعد.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
