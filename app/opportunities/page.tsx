import { requireAuth } from '@/lib/auth'
import { db, OPPORTUNITY_STAGES } from '@/lib/db'
import { OpportunitiesClient } from './OpportunitiesClient'

export const dynamic = 'force-dynamic'

export default function OpportunitiesPage() {
  requireAuth()
  const opps = db().prepare(`
    SELECT o.*, p.company FROM opportunities o
    LEFT JOIN partners p ON p.id = o.partner_id
    ORDER BY o.estimated_value DESC
  `).all() as any[]
  const partners = db().prepare(`SELECT id, company FROM partners ORDER BY company`).all() as any[]
  const totalValue = opps.reduce((s, o) => s + (o.estimated_value || 0), 0)
  const weighted = opps.reduce((s, o) => s + (o.estimated_value || 0) * ((o.probability || 0) / 100), 0)
  const open = opps.filter(o => o.status === 'مفتوحة').length

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-end flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black">الفرص الاستثمارية</h1>
          <p className="text-slate-500 mt-1">إدارة محفظة الفرص عبر مراحل البيع</p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="stat py-2 px-3 min-w-[120px]"><div className="text-xs text-slate-500">فرص مفتوحة</div><div className="text-2xl font-black">{open}</div></div>
          <div className="stat py-2 px-3 min-w-[140px]"><div className="text-xs text-slate-500">إجمالي القيمة</div><div className="text-xl font-black">{(totalValue / 1000).toFixed(0)}K ر.س</div></div>
          <div className="stat py-2 px-3 min-w-[140px]"><div className="text-xs text-slate-500">القيمة المرجّحة</div><div className="text-xl font-black text-emerald-700">{(weighted / 1000).toFixed(0)}K ر.س</div></div>
        </div>
      </header>
      <OpportunitiesClient initial={opps} partners={partners} stages={OPPORTUNITY_STAGES as any} />
    </div>
  )
}
