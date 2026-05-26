import { requireRole } from '@/lib/auth'
import { db, ROLE_LABELS } from '@/lib/db'
import { UsersClient } from './UsersClient'

export const dynamic = 'force-dynamic'

export default function UsersPage() {
  requireRole('admin')
  const users = db().prepare(`SELECT id, email, name, role, active, created_at, last_login FROM users ORDER BY created_at DESC`).all() as any[]
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-black">المستخدمون والصلاحيات</h1>
        <p className="text-slate-500 mt-1">إدارة من يصل للمنصة ومستوى صلاحياته</p>
      </header>
      <UsersClient initial={users} labels={ROLE_LABELS as any} />
    </div>
  )
}
