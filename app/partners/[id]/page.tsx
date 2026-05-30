import { requireAuth } from '@/lib/auth'
import { getPartner, getContacts, getActivities, getReviewMeetings } from '@/lib/queries'
import {
  GEOSA_STAGES, parseCoopAreas,
  GEOSA_CLASSIFICATION_LABELS, ENTITY_CATEGORY_LABELS,
  AGREEMENT_TYPE_LABELS, COOPERATION_AREA_LABELS,
} from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { UpdatePartnerForm } from './UpdatePartnerForm'
import { AddActivityForm } from './AddActivityForm'
import { AttachmentsCard } from './AttachmentsCard'
import { ReviewMeetingsCard } from './ReviewMeetingsCard'

export const dynamic = 'force-dynamic'

export default function PartnerDetail({ params }: { params: { id: string } }) {
  requireAuth()
  const id = Number(params.id)
  const partner = getPartner(id)
  if (!partner) notFound()
  const contacts = getContacts(id)
  const activities = getActivities(id)
  const rep = contacts.find(c => c.is_representative)
  const isActive = partner.record_type === 'active'
  const coopAreas = parseCoopAreas(partner.cooperation_areas)
  const reviews = isActive ? getReviewMeetings(id) : []

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <Link href={`/partners${isActive ? '?type=active' : '?type=prospect'}`} className="text-sm text-brand-600">
            ← العودة للقائمة
          </Link>
          <h1 className="text-2xl font-black mt-1">{partner.company}</h1>
          <div className="flex gap-2 mt-2 text-sm flex-wrap">
            <span className={`badge ${isActive ? 'badge-green' : 'badge-amber'}`}>
              {isActive ? 'مبرمة' : 'مستهدف'}
            </span>
            <span className="badge badge-slate">{partner.sector}</span>
            <span className="badge badge-slate">{partner.country}</span>
            {isActive && partner.geosa_classification && (
              <span className={`badge ${partner.geosa_classification === 'strategic' ? 'badge-red' : partner.geosa_classification === 'operational' ? 'badge-amber' : 'badge-blue'}`}>
                {GEOSA_CLASSIFICATION_LABELS[partner.geosa_classification]}
              </span>
            )}
            <span className="badge badge-amber">{partner.stage}</span>
          </div>
        </div>
        <div className="card p-4 min-w-[200px]">
          <div className="text-xs text-slate-500">مؤشر التفعيل</div>
          <div className="text-3xl font-black">{partner.activation_score}%</div>
          <div className="h-2 mt-2 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full ${partner.activation_score > 60 ? 'bg-emerald-500' : partner.activation_score > 30 ? 'bg-amber-500' : 'bg-rose-500'}`}
              style={{ width: `${partner.activation_score}%` }} />
          </div>
        </div>
      </header>

      {/* GEOSA-specific block: agreement metadata + cooperation areas + lifecycle stages */}
      {isActive && (
        <>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="card p-5 space-y-3">
              <h3 className="font-bold">بيانات الاتفاقية</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <KV label="نوع الاتفاقية"
                    value={partner.agreement_type ? AGREEMENT_TYPE_LABELS[partner.agreement_type] : '—'} />
                <KV label="تصنيف GEOSA"
                    value={partner.geosa_classification ? GEOSA_CLASSIFICATION_LABELS[partner.geosa_classification] : '—'} />
                <KV label="صنف الجهة"
                    value={partner.entity_category ? ENTITY_CATEGORY_LABELS[partner.entity_category] : '—'} />
                <KV label="تاريخ التوقيع" value={partner.signed_date || '—'} />
                <KV label="تاريخ الانتهاء" value={partner.expiry_date || '—'} />
                <KV label="موعد المراجعة القادمة" value={partner.next_review_date || '—'} />
              </div>
              {partner.reference_url && (
                <a href={partner.reference_url} target="_blank" rel="noreferrer"
                   className="text-sm text-brand-600 underline">رابط الاتفاقية الرسمي ←</a>
              )}
            </div>

            <div className="card p-5">
              <h3 className="font-bold mb-3">مجالات التعاون</h3>
              {coopAreas.length === 0 ? (
                <div className="text-sm text-slate-500">لم تُحدد بعد.</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {coopAreas.map(a => (
                    <span key={a} className="badge badge-blue text-xs">
                      {COOPERATION_AREA_LABELS[a] || a}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* GEOSA 4-stage lifecycle visualization */}
          <div className="card p-5">
            <h3 className="font-bold mb-3">دورة حياة الشراكة وفق منهجية GEOSA</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {GEOSA_STAGES.map((stage, idx) => {
                const currentIdx = GEOSA_STAGES.indexOf(partner.stage as any)
                const isPassed = currentIdx >= 0 && idx <= currentIdx
                const isCurrent = stage === partner.stage
                return (
                  <div key={stage}
                       className={`p-3 rounded-lg border-2 ${isCurrent ? 'border-brand-500 bg-brand-50' : isPassed ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
                    <div className={`text-xs font-medium ${isCurrent ? 'text-brand-700' : isPassed ? 'text-emerald-700' : 'text-slate-500'}`}>
                      المرحلة {idx + 1}
                    </div>
                    <div className={`font-bold text-sm mt-1 ${isCurrent ? 'text-brand-900' : ''}`}>{stage}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* For prospects: keep the original 6-step funnel UI */}
      {!isActive && (
        <div className="grid md:grid-cols-3 gap-4">
          <div className="card p-5 md:col-span-2 space-y-4">
            <h3 className="font-bold">مسار المستهدف (Funnel)</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Step label="إرسال الدعوة" done={!!partner.invite_sent} />
              <Step label="إرسال RFI" done={!!partner.rfi_sent} />
              <Step label="استلام أولي" done={!!partner.initial_receipt} />
              <Step label="استلام رد" done={!!partner.response_received} />
              <Step label="حضور ورشة عمل" done={!!(partner.workshop_attendance && /حضور|تم/.test(partner.workshop_attendance))} />
              <Step label="تفعيل" done={partner.stage === 'تفعيل' || partner.stage === 'إنجاز'} />
            </div>
            <div className="text-sm text-slate-600 space-y-1 mt-4">
              {partner.platform && <div>المنصة: <strong>{partner.platform}</strong></div>}
              {partner.workshop_date && <div>تاريخ الورشة: <strong>{partner.workshop_date}</strong></div>}
              {partner.notes && <div>ملاحظات: <span className="text-slate-700">{partner.notes}</span></div>}
            </div>
          </div>
          <div className="card p-5">
            <h3 className="font-bold mb-3">ممثل الشركة</h3>
            {rep ? (
              <div className="space-y-1 text-sm">
                <div className="font-semibold">{rep.name}</div>
                <div className="text-slate-500">{rep.title}</div>
                {rep.email && <div className="text-slate-700">{rep.email}</div>}
                {rep.phone && <div className="text-slate-700">{rep.phone}</div>}
              </div>
            ) : (
              <div className="text-sm text-slate-500">لم يتم تعيين ممثل بعد.</div>
            )}
          </div>
        </div>
      )}

      {/* For active partners: representative + notes */}
      {isActive && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="card p-5">
            <h3 className="font-bold mb-3">منسق الجهة</h3>
            {rep ? (
              <div className="space-y-1 text-sm">
                <div className="font-semibold">{rep.name}</div>
                <div className="text-slate-500">{rep.title}</div>
                {rep.email && <div className="text-slate-700">{rep.email}</div>}
                {rep.phone && <div className="text-slate-700">{rep.phone}</div>}
              </div>
            ) : (
              <div className="text-sm text-slate-500">لم يُعيَّن منسق رسمي بعد.</div>
            )}
          </div>
          <div className="card p-5">
            <h3 className="font-bold mb-3">ملاحظات</h3>
            <div className="text-sm text-slate-700">
              {partner.notes || <span className="text-slate-400">لا ملاحظات.</span>}
            </div>
          </div>
        </div>
      )}

      <UpdatePartnerForm partner={partner} />

      {/* GEOSA stage 3: periodic review meetings */}
      {isActive && <ReviewMeetingsCard partnerId={partner.id} initial={reviews} />}

      <AttachmentsCard partnerId={partner.id} />

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="font-bold mb-3">جهات الاتصال ({contacts.length})</h3>
          <div className="space-y-3 text-sm">
            {contacts.map(c => (
              <div key={c.id} className="border-b pb-2 last:border-0">
                <div className="flex justify-between">
                  <div className="font-medium">{c.name}</div>
                  {c.is_representative ? <span className="badge badge-green">ممثل</span> : null}
                </div>
                <div className="text-slate-500 text-xs">{c.title}</div>
                {c.email && <div className="text-slate-700 text-xs">{c.email}</div>}
                {c.linkedin && <a href={c.linkedin} target="_blank" className="text-xs text-brand-600">LinkedIn</a>}
              </div>
            ))}
            {contacts.length === 0 && <div className="text-slate-500">لا توجد جهات اتصال.</div>}
          </div>
        </div>
        <div className="card p-5">
          <h3 className="font-bold mb-3">سجل النشاطات ({activities.length})</h3>
          <ul className="space-y-2 text-sm">
            {activities.map(a => (
              <li key={a.id} className="border-b pb-2 last:border-0">
                <div className="flex justify-between">
                  <div className="font-medium">{a.title}</div>
                  <span className="badge badge-slate">{a.kind}</span>
                </div>
                <div className="text-xs text-slate-500">{a.occurred_at}</div>
                {a.description && <div className="text-slate-600 text-xs">{a.description}</div>}
              </li>
            ))}
            {activities.length === 0 && <div className="text-slate-500">لا نشاطات.</div>}
          </ul>
          <AddActivityForm partnerId={partner.id} />
        </div>
      </div>
    </div>
  )
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="font-medium mt-0.5">{value}</div>
    </div>
  )
}

function Step({ label, done }: { label: string; done: boolean }) {
  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg ${done ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-500'}`}>
      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${done ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-white'}`}>
        {done ? '✓' : '·'}
      </span>
      <span className="text-sm">{label}</span>
    </div>
  )
}
