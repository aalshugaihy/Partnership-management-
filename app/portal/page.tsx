import { requireAuth, currentUserFull } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function RepPortal() {
  requireAuth()
  const me = currentUserFull()
  if (!me) redirect('/login')
  if (me.role !== 'rep') redirect('/')
  if (!me.partner_id) {
    return (
      <div className="card p-10 text-center max-w-lg mx-auto">
        <h1 className="text-xl font-bold">لم يتم ربط حسابك بشريك</h1>
        <p className="text-slate-500 mt-2">يرجى التواصل مع مدير النظام لربط حسابك بشركتك.</p>
      </div>
    )
  }

  const partner = db().prepare(`SELECT * FROM partners WHERE id = ?`).get(me.partner_id) as any
  const activities = db().prepare(`SELECT * FROM activities WHERE partner_id = ? ORDER BY occurred_at DESC LIMIT 20`).all(me.partner_id) as any[]
  const opps = db().prepare(`SELECT * FROM opportunities WHERE partner_id = ?`).all(me.partner_id) as any[]
  const attachments = db().prepare(`SELECT id, filename, size, created_at FROM attachments WHERE partner_id = ? ORDER BY created_at DESC`).all(me.partner_id) as any[]

  if (!partner) {
    return <div className="card p-10 text-center">لم يتم العثور على بيانات الشركة.</div>
  }

  return (
    <div className="space-y-6">
      <header>
        <div className="text-xs text-slate-500">مرحبًا بك في بوابة الشريك</div>
        <h1 className="text-2xl font-black">{partner.company}</h1>
        <div className="flex gap-2 mt-2 text-sm">
          <span className="badge badge-blue">{partner.tier}</span>
          <span className="badge badge-amber">{partner.stage}</span>
          <span className="badge badge-green">تفعيل {partner.activation_score}%</span>
        </div>
      </header>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="card p-5 md:col-span-2 space-y-3">
          <h3 className="font-bold">مسار التفعيل</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              ['إرسال الدعوة', !!partner.invite_sent],
              ['إرسال RFI', !!partner.rfi_sent],
              ['استلام أولي', !!partner.initial_receipt],
              ['استلام رد', !!partner.response_received],
              ['حضور ورشة عمل', !!(partner.workshop_attendance && /حضور|تم/.test(partner.workshop_attendance))],
              ['تفعيل كامل', partner.stage === 'تفعيل' || partner.stage === 'إنجاز'],
            ].map(([label, done]: any) => (
              <div key={label} className={`flex items-center gap-2 p-2 rounded-lg ${done ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-500'}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${done ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-white'}`}>
                  {done ? '✓' : '·'}
                </span>
                <span className="text-sm">{label}</span>
              </div>
            ))}
          </div>
          {partner.notes && (
            <div className="text-sm text-slate-600 pt-3 border-t">
              <strong>ملاحظات:</strong> {partner.notes}
            </div>
          )}
        </div>

        <div className="card p-5">
          <h3 className="font-bold mb-3">المرفقات ({attachments.length})</h3>
          <ul className="space-y-2 text-sm">
            {attachments.map((a: any) => (
              <li key={a.id}>
                <a href={`/api/partners/${partner.id}/attachments/${a.id}`} className="text-brand-700 hover:underline">
                  📎 {a.filename}
                </a>
                <div className="text-xs text-slate-500">{(a.size/1024).toFixed(1)}KB</div>
              </li>
            ))}
            {attachments.length === 0 && <li className="text-slate-500">لا مرفقات بعد.</li>}
          </ul>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="font-bold mb-3">سجل النشاطات الأخيرة</h3>
          <ul className="space-y-2 text-sm">
            {activities.map((a: any) => (
              <li key={a.id} className="border-b pb-2 last:border-0">
                <div className="flex justify-between">
                  <div className="font-medium">{a.title}</div>
                  <span className="badge badge-slate">{a.kind}</span>
                </div>
                <div className="text-xs text-slate-500">{a.occurred_at}</div>
              </li>
            ))}
            {activities.length === 0 && <li className="text-slate-500">لا نشاطات بعد.</li>}
          </ul>
        </div>

        <div className="card p-5">
          <h3 className="font-bold mb-3">الفرص المرتبطة ({opps.length})</h3>
          <ul className="space-y-2 text-sm">
            {opps.map((o: any) => (
              <li key={o.id} className="border-b pb-2 last:border-0">
                <div className="font-medium">{o.title}</div>
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>{o.stage}</span>
                  <span>{o.estimated_value ? `${(o.estimated_value/1000).toFixed(0)}K ر.س` : '—'}</span>
                </div>
              </li>
            ))}
            {opps.length === 0 && <li className="text-slate-500">لا فرص مفتوحة.</li>}
          </ul>
        </div>
      </div>

      <div className="text-center text-xs text-slate-500">
        إذا كان لديك تحديث أو سؤال، تواصل مع مدير الشراكات في جهتنا.
      </div>
    </div>
  )
}
