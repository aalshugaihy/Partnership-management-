import './globals.css'
import type { Metadata } from 'next'
import { AppShell } from '@/components/AppShell'

export const metadata: Metadata = {
  title: 'منصة إدارة الشراكات',
  description: 'متابعة الشراكات وتفعيلها وقياس أثرها'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
