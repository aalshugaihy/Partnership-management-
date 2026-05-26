import { requireRole } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default function AuditPage() {
  requireRole('admin')
  const logs = db().prepare(`
    SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 200
  `).all() as any[]

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-black">سجل التدقيق</h1>
        <p className="text-slate-500 mt-1">آخر 200 إجراء تم تنفيذه على المنصة</p>
      </header>
      <div className="card overflow-hidden">
        <table className="data">
          <thead><tr><th>التاريخ</th><th>المستخدم</th><th>الإجراء</th><th>الهدف</th><th>تفاصيل</th></tr></thead>
          <tbody>
            {logs.map((l: any) => (
              <tr key={l.id}>
                <td className="text-xs text-slate-500 whitespace-nowrap">{l.created_at}</td>
                <td className="text-sm font-mono" dir="ltr">{l.user_email || '—'}</td>
                <td><span className="badge badge-blue">{l.action}</span></td>
                <td className="text-xs">{l.target_type ? `${l.target_type}#${l.target_id}` : '—'}</td>
                <td className="text-xs text-slate-600">{l.details || '—'}</td>
              </tr>
            ))}
            {logs.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-slate-500">لا سجلات بعد.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
