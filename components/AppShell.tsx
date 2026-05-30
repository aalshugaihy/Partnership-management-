'use client'
import { Suspense } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  if (path === '/login') return <>{children}</>
  return (
    <div className="min-h-screen flex">
      {/* Suspense wraps Sidebar because it uses useSearchParams (Next 14 requires
          this for the not-found static page where Sidebar is also rendered). */}
      <Suspense fallback={<div className="w-64 bg-white border-l border-slate-200" />}>
        <Sidebar />
      </Suspense>
      <main className="flex-1 p-6 md:p-8 overflow-x-auto">{children}</main>
    </div>
  )
}
