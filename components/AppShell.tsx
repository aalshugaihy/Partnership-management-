'use client'
import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  if (path === '/login') return <>{children}</>
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 p-6 md:p-8 overflow-x-auto">{children}</main>
    </div>
  )
}
