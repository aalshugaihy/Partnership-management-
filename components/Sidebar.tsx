'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

type Me = { email: string; role: string } | null

const baseLinks = [
  { href: '/', label: 'لوحة المعلومات', icon: '◐' },
  { href: '/tasks', label: 'المهام والإشعارات', icon: '●' },
  { href: '/partners', label: 'الشراكات', icon: '◇' },
  { href: '/pipeline', label: 'مسار التفعيل', icon: '⇶' },
  { href: '/opportunities', label: 'الفرص الاستثمارية', icon: '✦' },
  { href: '/workshops', label: 'ورش العمل', icon: '◉' },
  { href: '/map', label: 'الخريطة الجيومكانية', icon: '◎' },
  { href: '/kpi', label: 'مؤشرات الأثر', icon: '▤' },
  { href: '/outreach', label: 'التواصل والقوالب', icon: '✉' },
  { href: '/recommendations', label: 'التوصيات الذكية', icon: '★' },
  { href: '/reports', label: 'التقارير المؤتمتة', icon: '▦' },
  { href: '/import', label: 'استيراد البيانات', icon: '↥' },
  { href: '/licensed', label: 'الجهات المرخصة', icon: '✓' },
]

const adminLinks = [
  { href: '/users', label: 'المستخدمون', icon: '◈' },
  { href: '/audit', label: 'سجل التدقيق', icon: '⊟' },
]

export function Sidebar() {
  const path = usePathname()
  const [me, setMe] = useState<Me>(null)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.ok ? r.json() : null).then(d => setMe(d?.user || null)).catch(() => {})
  }, [])

  if (path === '/login') return null

  const isRep = me?.role === 'rep'
  const links = isRep
    ? [{ href: '/portal', label: 'بوابة الشريك', icon: '◉' }]
    : baseLinks

  return (
    <aside className="w-64 bg-white border-l border-slate-200 p-5 flex flex-col gap-1 shrink-0 max-h-screen overflow-y-auto">
      <div className="mb-4 px-2">
        <div className="text-xl font-black text-brand-700">منصة الشراكات</div>
        <div className="text-xs text-slate-500 mt-1">{isRep ? 'بوابة الشريك' : 'إدارة - متابعة - أثر'}</div>
      </div>

      <div className="space-y-1">
        {links.map(l => (
          <Link key={l.href} href={l.href} className={`sidebar-link ${path === l.href ? 'active' : ''}`}>
            <span className="text-lg leading-none">{l.icon}</span>
            <span>{l.label}</span>
          </Link>
        ))}
      </div>

      {me?.role === 'admin' && (
        <>
          <div className="border-t my-3"></div>
          <div className="text-xs text-slate-400 px-2 mb-1">إدارة النظام</div>
          {adminLinks.map(l => (
            <Link key={l.href} href={l.href} className={`sidebar-link ${path === l.href ? 'active' : ''}`}>
              <span className="text-lg leading-none">{l.icon}</span>
              <span>{l.label}</span>
            </Link>
          ))}
        </>
      )}

      <div className="border-t my-3"></div>

      {me && (
        <div className="px-2 py-2 bg-slate-50 rounded-lg text-xs">
          <div className="font-mono text-slate-700 truncate" dir="ltr">{me.email}</div>
          <div className="text-slate-500 mt-1">{me.role}</div>
        </div>
      )}

      <button
        onClick={async () => {
          await fetch('/api/auth/logout', { method: 'POST' })
          window.location.href = '/login'
        }}
        className="sidebar-link mt-2 text-rose-600 hover:bg-rose-50"
      >
        <span className="text-lg leading-none">↩</span>
        <span>تسجيل الخروج</span>
      </button>

      <div className="mt-auto pt-4 text-xs text-slate-400 px-2">
        الإصدار 1.0 · {new Date().getFullYear()}
      </div>
    </aside>
  )
}
