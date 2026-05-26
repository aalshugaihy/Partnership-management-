import { listPartners } from '@/lib/queries'
import { db, STAGES } from '@/lib/db'
import Link from 'next/link'
import { AddPartnerDialog } from '@/components/AddPartnerDialog'

export const dynamic = 'force-dynamic'

export default function PartnersPage({ searchParams }: { searchParams: { q?: string; stage?: string; tier?: string; sector?: string } }) {
  const partners = listPartners(searchParams)
  const sectors = (db().prepare('SELECT DISTINCT sector FROM partners ORDER BY sector').all() as any[])
    .map(r => r.sector).filter(Boolean)
  const tiers = ['استراتيجي', 'مرتفع', 'قياسي']

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black">الشراكات</h1>
          <p className="text-slate-500 mt-1">إجمالي {partners.length} شراكة</p>
        </div>
        <div className="flex gap-2">
          <Link href="/api/export?type=partners" className="btn btn-ghost border border-slate-200">تصدير Excel</Link>
          <AddPartnerDialog />
        </div>
      </header>

      <form className="card p-4 grid md:grid-cols-5 gap-3">
        <input name="q" defaultValue={searchParams.q || ''} placeholder="بحث عن شركة..."
          className="border rounded-lg px-3 py-2 md:col-span-2" />
        <select name="stage" defaultValue={searchParams.stage || ''} className="border rounded-lg px-3 py-2">
          <option value="">كل المراحل</option>
          {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select name="tier" defaultValue={searchParams.tier || ''} className="border rounded-lg px-3 py-2">
          <option value="">كل المستويات</option>
          {tiers.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select name="sector" defaultValue={searchParams.sector || ''} className="border rounded-lg px-3 py-2">
          <option value="">كل القطاعات</option>
          {sectors.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="md:col-span-5 flex justify-end gap-2">
          <Link href="/partners" className="btn btn-ghost border border-slate-200">إعادة تعيين</Link>
          <button className="btn btn-primary">تطبيق</button>
        </div>
      </form>

      <div className="card overflow-hidden">
        <table className="data">
          <thead>
            <tr>
              <th>#</th>
              <th>الشركة</th>
              <th>القطاع</th>
              <th>الدولة</th>
              <th>المستوى</th>
              <th>المرحلة</th>
              <th>التفعيل</th>
              <th>القيمة الاستراتيجية</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {partners.map(p => (
              <tr key={p.id}>
                <td className="text-slate-500">{p.id}</td>
                <td><Link href={`/partners/${p.id}`} className="font-semibold text-brand-700">{p.company}</Link></td>
                <td>{p.sector}</td>
                <td>{p.country}</td>
                <td><TierBadge tier={p.tier} /></td>
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
                <td>{p.strategic_value}/10</td>
                <td><Link href={`/partners/${p.id}`} className="text-brand-600 text-sm">تفاصيل ←</Link></td>
              </tr>
            ))}
            {partners.length === 0 && (
              <tr><td colSpan={9} className="text-center text-slate-500 py-10">لا توجد نتائج.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TierBadge({ tier }: { tier: string | null }) {
  if (!tier) return null
  const cls = tier === 'استراتيجي' ? 'badge-green' : tier === 'مرتفع' ? 'badge-blue' : 'badge-slate'
  return <span className={`badge ${cls}`}>{tier}</span>
}

function StageBadge({ stage }: { stage: string }) {
  const map: Record<string, string> = {
    'دعوة': 'badge-slate', 'RFI': 'badge-blue', 'استلام أولي': 'badge-blue',
    'رد': 'badge-amber', 'ورشة عمل': 'badge-amber', 'تفعيل': 'badge-green', 'إنجاز': 'badge-green'
  }
  return <span className={`badge ${map[stage] || 'badge-slate'}`}>{stage}</span>
}
