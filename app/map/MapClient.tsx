'use client'
import { useMemo } from 'react'

type P = { id: number; company: string; sector: string | null; tier: string | null; activation_score: number; lat: number; lng: number }

// SVG-based world map (Mercator). No external map service needed (works offline).
export function MapClient({ points }: { points: P[] }) {
  const w = 900
  const h = 480

  // Mercator projection (lat -85..85)
  const project = (lat: number, lng: number) => {
    const x = (lng + 180) * (w / 360)
    const latRad = Math.max(-1.484, Math.min(1.484, (lat * Math.PI) / 180))
    const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2))
    const y = h / 2 - (w * mercN) / (2 * Math.PI)
    return { x, y }
  }

  const projected = useMemo(() => points.map(p => ({ ...p, ...project(p.lat, p.lng) })), [points])

  const colorFor = (s: number) => s > 60 ? '#10b981' : s > 30 ? '#f59e0b' : '#ef4444'

  return (
    <div className="card p-4">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto bg-slate-50 rounded-lg">
        {/* Simple continent landmasses as background (approximate) */}
        <rect x="0" y="0" width={w} height={h} fill="#e0f2fe" />
        {/* Major landmasses (very simplified silhouettes) */}
        <g fill="#d1fae5" stroke="#a7f3d0" strokeWidth="0.5">
          <path d="M150,90 L320,80 L420,140 L380,200 L300,220 L200,210 L120,170 Z" />{/* North America */}
          <path d="M250,260 L320,260 L340,400 L280,420 L240,390 L230,310 Z" />{/* South America */}
          <path d="M420,90 L520,85 L540,150 L510,180 L460,170 L430,140 Z" />{/* Europe */}
          <path d="M450,180 L560,180 L600,260 L580,330 L500,360 L460,290 L440,210 Z" />{/* Africa */}
          <path d="M550,110 L740,90 L800,170 L760,220 L680,210 L600,180 L560,150 Z" />{/* Asia */}
          <path d="M720,300 L820,300 L830,360 L760,370 L720,340 Z" />{/* Australia */}
        </g>

        {/* Latitude/longitude grid */}
        <g stroke="#cbd5e1" strokeWidth="0.3" opacity="0.5">
          {[-60, -30, 0, 30, 60].map(lat => {
            const { y } = project(lat, 0)
            return <line key={lat} x1={0} y1={y} x2={w} y2={y} />
          })}
          {[-150, -90, -30, 30, 90, 150].map(lng => {
            const x = (lng + 180) * (w / 360)
            return <line key={lng} x1={x} y1={0} x2={x} y2={h} />
          })}
        </g>

        {/* Partner points */}
        {projected.map(p => (
          <g key={p.id}>
            <circle
              cx={p.x}
              cy={p.y}
              r={Math.max(4, Math.min(14, 4 + p.activation_score / 10))}
              fill={colorFor(p.activation_score)}
              fillOpacity="0.6"
              stroke={colorFor(p.activation_score)}
              strokeWidth="1.5"
            >
              <title>{p.company} ({p.sector}) - {p.activation_score}%</title>
            </circle>
          </g>
        ))}
      </svg>

      <div className="flex justify-center gap-6 mt-3 text-xs text-slate-600">
        <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500 opacity-60" /> تفعيل عالي (&gt;60%)</div>
        <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-500 opacity-60" /> متوسط (30-60%)</div>
        <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-rose-500 opacity-60" /> منخفض (&lt;30%)</div>
        <div className="text-slate-400">حجم الدائرة يعكس مستوى التفعيل</div>
      </div>
    </div>
  )
}
