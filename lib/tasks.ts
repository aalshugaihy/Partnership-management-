import { db } from './db'

export type Task = {
  id: string
  priority: 'عالية' | 'متوسطة' | 'منخفضة'
  category: string
  title: string
  detail: string
  dueIn?: string
  href?: string
  partnerId?: number
}

// Auto-generated proactive tasks based on the current state of the data.
export function generateTasks(): Task[] {
  const d = db()
  const tasks: Task[] = []

  // Partners invited but no response after a "long" time (we don't track invitation date,
  // so use updated_at as proxy for inactivity)
  const stalled = d.prepare(`
    SELECT id, company, julianday('now') - julianday(updated_at) AS days_since
    FROM partners
    WHERE invite_sent = 1 AND response_received = 0
    ORDER BY strategic_value DESC LIMIT 10
  `).all() as any[]
  for (const p of stalled) {
    tasks.push({
      id: `followup-${p.id}`,
      priority: 'عالية',
      category: 'متابعة',
      title: `متابعة ${p.company}`,
      detail: 'دعوة أُرسلت ولم تُستلم استجابة. اعتبر إرسال متابعة احترافية.',
      partnerId: p.id,
      href: `/outreach?t=followup`,
    })
  }

  // Workshops scheduled in next 7 days (no attendance recorded yet)
  const upcomingWs = d.prepare(`
    SELECT id, company, workshop_date FROM partners
    WHERE workshop_date IS NOT NULL
      AND date(workshop_date) >= date('now')
      AND date(workshop_date) <= date('now', '+7 days')
      AND (workshop_attendance IS NULL OR workshop_attendance NOT LIKE '%حضور%')
  `).all() as any[]
  for (const w of upcomingWs) {
    tasks.push({
      id: `workshop-${w.id}`,
      priority: 'عالية',
      category: 'ورشة قادمة',
      title: `تذكير: ورشة عمل مع ${w.company}`,
      detail: `موعد الورشة ${w.workshop_date}. تأكّد من التحضير وتأكيد الحضور.`,
      partnerId: w.id,
      href: `/partners/${w.id}`,
    })
  }

  // Strategic partners with low activation
  const highValueLowActivation = d.prepare(`
    SELECT id, company, activation_score FROM partners
    WHERE strategic_value >= 8 AND activation_score < 30
    LIMIT 5
  `).all() as any[]
  for (const p of highValueLowActivation) {
    tasks.push({
      id: `boost-${p.id}`,
      priority: 'متوسطة',
      category: 'تفعيل',
      title: `رفع تفعيل ${p.company} (${p.activation_score}%)`,
      detail: 'شراكة استراتيجية بمؤشر تفعيل منخفض. خطة 90 يوماً موصى بها.',
      partnerId: p.id,
      href: `/partners/${p.id}`,
    })
  }

  // Opportunities with high value awaiting close in next 30 days
  const opps = d.prepare(`
    SELECT o.id, o.title, o.estimated_value, o.expected_close_date, p.company FROM opportunities o
    LEFT JOIN partners p ON p.id = o.partner_id
    WHERE o.status = 'مفتوحة' AND o.expected_close_date IS NOT NULL
      AND date(o.expected_close_date) <= date('now', '+30 days')
    ORDER BY o.estimated_value DESC LIMIT 5
  `).all() as any[]
  for (const o of opps) {
    tasks.push({
      id: `close-${o.id}`,
      priority: 'عالية',
      category: 'فرصة قريبة الإغلاق',
      title: `إغلاق فرصة: ${o.title}`,
      detail: `${o.company || 'بدون شريك'} · القيمة ${(o.estimated_value || 0)/1000}K ر.س · موعد متوقع ${o.expected_close_date}`,
      href: `/opportunities`,
    })
  }

  // Responsed partners with no rep contact
  const noRep = d.prepare(`
    SELECT p.id, p.company FROM partners p
    WHERE p.response_received = 1
      AND NOT EXISTS (SELECT 1 FROM contacts c WHERE c.partner_id = p.id AND c.is_representative = 1)
    LIMIT 5
  `).all() as any[]
  for (const p of noRep) {
    tasks.push({
      id: `rep-${p.id}`,
      priority: 'متوسطة',
      category: 'تمكين',
      title: `طلب ممثل رسمي من ${p.company}`,
      detail: 'لا يوجد ممثل رسمي مُعيّن. اطلب ترشيحًا لإدراجه في برنامج التمكين.',
      partnerId: p.id,
      href: `/outreach?t=request_rep`,
    })
  }

  return tasks.sort((a, b) => {
    const order: any = { 'عالية': 0, 'متوسطة': 1, 'منخفضة': 2 }
    return order[a.priority] - order[b.priority]
  })
}
