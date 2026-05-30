import { requireAuth } from '@/lib/auth'
import { listPartners } from '@/lib/queries'
import {
  db, STAGES, GEOSA_STAGES,
  GEOSA_CLASSIFICATION_LABELS, ENTITY_CATEGORY_LABELS, AGREEMENT_TYPE_LABELS,
} from '@/lib/db'
import Link from 'next/link'
import { AddPartnerDialog } from '@/components/AddPartnerDialog'

export const dynamic = 'force-dynamic'

type SP = {
  q?: string; stage?: string; tier?: string; sector?: string
  type?: 'prospect' | 'active'
  geosa_classification?: string
  entity_category?: string
}

export default function PartnersPage({ searchParams }: { searchParams: SP }) {
  requireAuth()
  const partners = listPartners(searchParams as any)
  const sectors = (db().prepare('SELECT DISTINCT sector FROM partners WHERE sector IS NOT NULL ORDER BY sector').all() as any[])
    .map(r => r.sector).filter(Boolean)
  const tiers = ['استراتيجي', 'مرتفع', 'قياسي']

  // For tabs: counts per record_type
  const totalProspects = (db().prepare(`SELECT COUNT(*) AS n FROM partners WHERE record_type = 'prospect'`).get() as any).n
  const totalActive = (db().prepare(`SELECT COUNT(*) AS n FROM partners WHERE record_type = 'active'`).get() as any).n
  const totalAll = totalProspects + totalActive

  const activeType = searchParams.type
  // The stage dropdown options depend on which type is filtered
  const stageOptions = activeType === 'active' ? GEOSA_STAGES
    : activeType === 'prospect' ? STAGES
    : [...GEOSA_STAGES, ...STAGES]

  const heading = activeType === 'active' ? 'الشراكات المبرمة'
    : activeType === 'prospect' ? 'المستهدفات (Prospects)'
    : 'كل الشراكات'
  const subtitle = activeType === 'active' ? 'اتفاقيات ومذكرات تفاهم موقّعة فعلياً - وفق منهجية GEOSA'
    : activeType === 'prospect' ? 'شركات مستهدفة لم توقّع بعد - قمع تسويق'
    : 'محفظة الشراكات الكاملة'

  // Build href that preserves the type filter
  const buildHref = (params: Record<string, string | undefined>) => {
    const qs = new URLSearchParams()
    if (activeType) qs.set('type', activeType)
    for (const [k, v] of Object.entries(params)) {
      if (v) qs.set(k, v); else qs.delete(k)
    }
    const s = qs.toString()
    return s ? `/partners?${s}` : '/partners'
  }

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black">{heading}</h1>
          <p className="text-slate-500 mt-1">{subtitle} · إجمالي {partners.length} عرض</p>
        </div>
        <div className="flex gap-2">
          <Link href="/api/export?type=partners" className="btn btn-ghost border border-slate-200">تصدير Excel</Link>
          <AddPartnerDialog />
        </div>
      </header>

      {/* Type filter tabs (GEOSA addition) */}
      <div className="flex gap-2 flex-wrap">
        <Link href="/partners"
          className={`badge ${!activeType ? 'badge-blue' : 'badge-slate'} px-3 py-1.5 text-sm`}>
          الكل ({totalAll})
        </Link>
        <Link href="/partners?type=active"
          className={`badge ${activeType === 'active' ? 'badge-green' : 'badge-slate'} px-3 py-1.5 text-sm`}>
          مبرمة ({totalActive})
        </Link>
        <Link href="/partners?type=prospect"
          className={`badge ${activeType === 'prospect' ? 'badge-amber' : 'badge-slate'} px-3 py-1.5 text-sm`}>
          مستهدفات ({totalProspects})
        </Link>
      </div>

      <form className="card p-4 grid md:grid-cols-5 gap-3">
        {activeType && <input type="hidden" name="type" value={activeType} />}
        <input name="q" defaultValue={searchParams.q || ''} placeholder="بحث عن شركة..."
          className="border rounded-lg px-3 py-2 md:col-span-2" />
        <select name="stage" defaultValue={searchParams.stage || ''} className="border rounded-lg px-3 py-2">
          <option value="">كل المراحل</option>
          {stageOptions.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select name="tier" defaultValue={searchParams.tier || ''} className="border rounded-lg px-3 py-2">
          <option value="">كل المستويات</option>
          {tiers.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select name="sector" defaultValue={searchParams.sector || ''} className="border rounded-lg px-3 py-2">
          <option value="">كل القطاعات</option>
          {sectors.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {/* GEOSA-only filters when type=active */}
        {activeType === 'active' && (
          <>
            <select name="geosa_classification" defaultValue={searchParams.geosa_classification || ''} className="border rounded-lg px-3 py-2">
              <option value="">كل التصنيفات</option>
              {Object.entries(GEOSA_CLASSIFICATION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select name="entity_category" defaultValue={searchParams.entity_category || ''} className="border rounded-lg px-3 py-2">
              <option value="">كل الأصناف</option>
              {Object.entries(ENTITY_CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </>
        )}
        <div className="md:col-span-5 flex justify-end gap-2">
          <Link href={buildHref({})} className="btn btn-ghost border border-slate-200">إعادة تعيين</Link>
          <button className="btn btn-primary">تطبيق</button>
        </div>
      </form>

      <div className="card overflow-hidden">
        <table className="data">
          <thead>
            <tr>
              <th>#</th>
              <th>الجهة</th>
              <th>القطاع</th>
              <th>الدولة</th>
              {activeType === 'active' && <th>تصنيف GEOSA</th>}
              {activeType === 'active' && <th>نوع الاتفاقية</th>}
              {!activeType && <th>النوع</th>}
              <th>المرحلة</th>
              <th>التفعيل</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {partners.map(p => (
              <tr key={p.id}>
                <td className="text-slate-500">{p.id}</td>
                <td><Link href={`/partners/${p.id}`} className="font-semibold text-brand-700">{p.company}</Link></td>
                <td>{p.sector || '—'}</td>
                <td>{p.country || '—'}</td>
                {activeType === 'active' && (
                  <td><GeosaClassBadge value={p.geosa_classification} /></td>
                )}
                {activeType === 'active' && (
                  <td className="text-xs">{p.agreement_type ? AGREEMENT_TYPE_LABELS[p.agreement_type] || p.agreement_type : '—'}</td>
                )}
                {!activeType && (
                  <td>
                    <span className={`badge ${p.record_type === 'active' ? 'badge-green' : 'badge-amber'}`}>
                      {p.record_type === 'active' ? 'مبرمة' : 'مستهدف'}
                    </span>
                  </td>
                )}
                <td><StageBadge stage={p.stage} /></td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-20 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${p.activation_score > 60 ? 'bg-emerald-500' : p.activation_score > 30 ? 'bg-amber-500' : 'bg-rose-500'}`}
                        style={{ width: `${p.activation_score}%` }} />
                    </div>
                    <span className="text-xs text-slate-600">{p.activation_score}%</span>
                  </div>
                </td>
                <td><Link href={`/partners/${p.id}`} className="text-brand-600 text-sm">تفاصيل ←</Link></td>
              </tr>
            ))}
            {partners.length === 0 && (
              <tr><td colSpan={activeType === 'active' ? 9 : 8} className="text-center text-slate-500 py-10">لا توجد نتائج.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function GeosaClassBadge({ value }: { value: string | null }) {
  if (!value) return <span className="text-slate-400 text-xs">—</span>
  const cls = value === 'strategic' ? 'badge-red' : value === 'operational' ? 'badge-amber' : 'badge-blue'
  return <span className={`badge ${cls}`}>{GEOSA_CLASSIFICATION_LABELS[value] || value}</span>
}

function StageBadge({ stage }: { stage: string }) {
  const map: Record<string, string> = {
    // Prospect funnel
    'دعوة': 'badge-slate', 'RFI': 'badge-blue', 'استلام أولي': 'badge-blue',
    'رد': 'badge-amber', 'ورشة عمل': 'badge-amber', 'تفعيل': 'badge-green', 'إنجاز': 'badge-green',
    // GEOSA lifecycle
    'تقييم شامل': 'badge-slate', 'تفعيل وتشغيل': 'badge-blue',
    'متابعة وتقويم': 'badge-amber', 'تحسين وتطوير': 'badge-green',
  }
  return <span className={`badge ${map[stage] || 'badge-slate'}`}>{stage}</span>
}
