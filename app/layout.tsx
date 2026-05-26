import './globals.css'
import type { Metadata } from 'next'
import { Sidebar } from '@/components/Sidebar'

export const metadata: Metadata = {
  title: 'منصة إدارة الشراكات',
  description: 'متابعة الشراكات وتفعيلها وقياس أثرها'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <div className="min-h-screen flex">
          <Sidebar />
          <main className="flex-1 p-6 md:p-8 overflow-x-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
