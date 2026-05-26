import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { MapClient } from './MapClient'

export const dynamic = 'force-dynamic'

// Approximate coordinates for inferred country labels.
const COUNTRY_COORDS: Record<string, [number, number]> = {
  'السعودية': [24.7136, 46.6753],
  'الولايات المتحدة': [37.7749, -97.0],
  'هولندا': [52.3676, 4.9041],
  'ألمانيا': [52.52, 13.405],
  'الصين/اليابان': [35.6762, 139.6503],
  'أخرى': [25.0, 45.0],
}

export default function MapPage() {
  requireAuth()
  const partners = db().prepare(`
    SELECT id, company, sector, country, tier, activation_score, latitude, longitude
    FROM partners ORDER BY strategic_value DESC
  `).all() as any[]

  const points = partners.map(p => {
    let lat = p.latitude
    let lng = p.longitude
    if (lat == null || lng == null) {
      const c = COUNTRY_COORDS[p.country] || COUNTRY_COORDS['أخرى']
      // jitter so multiple partners in same country don't fully overlap
      const j = (p.id % 100) / 1000
      lat = c[0] + (Math.sin(p.id) * 0.5)
      lng = c[1] + (Math.cos(p.id) * 0.5) + j
    }
    return { ...p, lat, lng }
  })

  const byCountry = partners.reduce((acc: any, p: any) => {
    acc[p.country || 'غير محدد'] = (acc[p.country || 'غير محدد'] || 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-black">الخريطة الجيومكانية</h1>
        <p className="text-slate-500 mt-1">توزيع الشراكات جغرافياً مع تحليل حسب الدولة والقطاع</p>
      </header>
      <div className="grid md:grid-cols-4 gap-4">
        <div className="md:col-span-3">
          <MapClient points={points} />
        </div>
        <div className="card p-4 space-y-3">
          <h3 className="font-bold">التوزيع الجغرافي</h3>
          {Object.entries(byCountry).sort((a:any,b:any)=>b[1]-a[1]).map(([c, n]: any) => (
            <div key={c} className="flex justify-between text-sm">
              <span>{c}</span>
              <span className="font-semibold">{n}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
