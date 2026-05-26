import fs from 'fs'
import path from 'path'
import { db, computeActivationScore, deriveStage } from '../lib/db'

type RawPartner = {
  id: number
  company: string
  invite_sent?: any
  rfi_sent?: any
  initial_receipt?: any
  response_received?: any
  extension_request?: any
  platform?: any
  rfi_delivery?: any
  workshop_attendance?: any
  workshop_date?: any
  workshop_time?: any
  notes?: any
  status?: any
  remarks?: any
  contacts?: Array<{ name?: any; title?: any; email?: any; linkedin?: any }>
  representative?: { name?: any; phone?: any; email?: any }
}

type Seed = {
  partners: RawPartner[]
  licensed_companies: Array<{ id: number; name: string; phone?: any; email?: any }>
}

function toInt(v: any): number {
  if (v === true) return 1
  if (typeof v === 'string') {
    const t = v.trim()
    if (/^(نعم|تم|true|yes|y)/i.test(t)) return 1
  }
  return 0
}

function s(v: any): string | null {
  if (v === null || v === undefined) return null
  const t = String(v).trim()
  return t || null
}

function inferSector(company: string): string {
  const c = company.toLowerCase()
  if (/maps?|navigation|here|tomtom|mapbox/.test(c)) return 'خرائط وملاحة'
  if (/auto|driving|driver|toyota|hyundai|bmw|mercedes|tesla|nissan|honda/.test(c)) return 'سيارات'
  if (/ai|driver|robot|autonomous|deep|neural/.test(c)) return 'ذكاء اصطناعي'
  if (/cloud|tech|technology|systems|soft|digital|data/.test(c)) return 'تقنية'
  if (/telecom|stc|zain|mobily/.test(c)) return 'اتصالات'
  if (/consulting|advisor|solutions/.test(c)) return 'استشارات'
  return 'متعدد'
}

function inferCountry(company: string): string {
  const c = company.toLowerCase()
  if (/here|tomtom/.test(c)) return 'هولندا'
  if (/apple|mapbox|microsoft|google|nvidia/.test(c)) return 'الولايات المتحدة'
  if (/baidu|alibaba|tencent|pony|huawei|dmp|denso|toyota|nissan|honda/.test(c)) return 'الصين/اليابان'
  if (/bmw|mercedes|bosch|continental/.test(c)) return 'ألمانيا'
  if (/saudi|سعود|stc|zain|mobily|aramco/.test(c) || /[؀-ۿ]/.test(company)) return 'السعودية'
  return 'أخرى'
}

function tierFor(company: string): string {
  const c = company.toLowerCase()
  if (/here|tomtom|apple|google|microsoft|nvidia|baidu|bmw|mercedes|toyota/.test(c)) return 'استراتيجي'
  if (/mapbox|dmp|bosch|pony|aramco|stc/.test(c)) return 'مرتفع'
  return 'قياسي'
}

function strategicValueFor(company: string): number {
  const c = company.toLowerCase()
  if (/here|tomtom|apple|google|microsoft|nvidia|baidu|bmw|toyota|aramco/.test(c)) return 9
  if (/mapbox|dmp|bosch|pony|stc|zain/.test(c)) return 7
  return 5
}

const raw: Seed = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'data', 'seed.json'), 'utf-8')
)

const d = db()

const insP = d.prepare(`
  INSERT OR REPLACE INTO partners
  (id, company, sector, country, tier, status, stage, invite_sent, rfi_sent,
   initial_receipt, response_received, extension_request, platform, rfi_delivery,
   workshop_attendance, workshop_date, workshop_time, notes, strategic_value, activation_score)
  VALUES (@id, @company, @sector, @country, @tier, @status, @stage, @invite_sent, @rfi_sent,
   @initial_receipt, @response_received, @extension_request, @platform, @rfi_delivery,
   @workshop_attendance, @workshop_date, @workshop_time, @notes, @strategic_value, @activation_score)
`)

const delC = d.prepare(`DELETE FROM contacts WHERE partner_id = ?`)
const insC = d.prepare(`
  INSERT INTO contacts (partner_id, name, title, email, phone, linkedin, is_representative)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`)

const insAct = d.prepare(`
  INSERT INTO activities (partner_id, kind, title, description) VALUES (?, ?, ?, ?)
`)

const tx = d.transaction(() => {
  for (const p of raw.partners) {
    const company = (p.company || '').replace(/^\s+|\s+$/g, '')
    if (!company) continue
    const fields = {
      id: p.id,
      company,
      sector: inferSector(company),
      country: inferCountry(company),
      tier: tierFor(company),
      status: s(p.status) || 'لا يوجد',
      stage: '',
      invite_sent: toInt(p.invite_sent),
      rfi_sent: toInt(p.rfi_sent),
      initial_receipt: toInt(p.initial_receipt),
      response_received: toInt(p.response_received),
      extension_request: toInt(p.extension_request),
      platform: s(p.platform),
      rfi_delivery: s(p.rfi_delivery),
      workshop_attendance: s(p.workshop_attendance),
      workshop_date: s(p.workshop_date),
      workshop_time: s(p.workshop_time),
      notes: s(p.notes) || s(p.remarks),
      strategic_value: strategicValueFor(company),
      activation_score: 0,
    }
    fields.activation_score = computeActivationScore(fields as any)
    fields.stage = deriveStage(fields as any)
    insP.run(fields)
    delC.run(p.id)
    for (const c of p.contacts || []) {
      if (!c.name && !c.email) continue
      insC.run(p.id, s(c.name), s(c.title), s(c.email), null, s(c.linkedin), 0)
    }
    if (p.representative?.name) {
      insC.run(p.id, s(p.representative.name), 'ممثل الشركة',
        s(p.representative.email), p.representative.phone ? String(p.representative.phone) : null, null, 1)
    }
    if (toInt(p.invite_sent)) insAct.run(p.id, 'دعوة', 'إرسال دعوة', null)
    if (toInt(p.rfi_sent)) insAct.run(p.id, 'RFI', 'إرسال طلب معلومات (RFI)', null)
    if (toInt(p.response_received)) insAct.run(p.id, 'رد', 'تم استلام الرد', null)
    if (p.workshop_attendance && /حضور|تم/i.test(String(p.workshop_attendance))) {
      insAct.run(p.id, 'ورشة', 'حضور ورشة عمل', s(p.workshop_date))
    }
  }

  d.prepare('DELETE FROM licensed_companies').run()
  const insL = d.prepare(`INSERT INTO licensed_companies (id, name, phone, email) VALUES (?, ?, ?, ?)`)
  for (const l of raw.licensed_companies) {
    insL.run(l.id, l.name, l.phone ? String(l.phone) : null, l.email ? String(l.email).trim() : null)
  }

  // Seed sample organization-wide KPIs
  d.prepare('DELETE FROM kpis WHERE partner_id IS NULL').run()
  const insK = d.prepare(`INSERT INTO kpis (name, target, actual, unit, period, category) VALUES (?, ?, ?, ?, ?, ?)`)
  insK.run('عدد الشراكات المُفعّلة', 50, 0, 'شراكة', '2025', 'تفعيل')
  insK.run('نسبة الرد من الشركات', 70, 0, '%', '2025', 'تفاعل')
  insK.run('عدد ورش العمل المنفذة', 20, 0, 'ورشة', '2025', 'تنفيذ')
  insK.run('القيمة الاستراتيجية المتوسطة', 7, 0, 'نقطة', '2025', 'جودة')
  insK.run('تنوع القطاعات المستهدفة', 8, 0, 'قطاع', '2025', 'تنوع')

  // Seed example opportunities tied to top strategic partners
  d.prepare('DELETE FROM opportunities').run()
  const topPartners = d.prepare(`SELECT id, company FROM partners WHERE strategic_value >= 8 LIMIT 10`).all() as any[]
  const insO = d.prepare(`INSERT INTO opportunities (partner_id, title, description, estimated_value, probability, status) VALUES (?, ?, ?, ?, ?, ?)`)
  for (const p of topPartners) {
    insO.run(p.id, `فرصة تكامل مع ${p.company}`,
      'فرصة تعاون استراتيجي طويل المدى مبنية على القدرات التقنية المشتركة.',
      Math.floor(Math.random() * 5_000_000) + 500_000,
      Math.floor(Math.random() * 60) + 30,
      'مفتوحة')
  }
})
tx()

const total = (d.prepare('SELECT COUNT(*) as n FROM partners').get() as any).n
const contacts = (d.prepare('SELECT COUNT(*) as n FROM contacts').get() as any).n
const licensed = (d.prepare('SELECT COUNT(*) as n FROM licensed_companies').get() as any).n
console.log(`Seeded: ${total} partners, ${contacts} contacts, ${licensed} licensed companies`)
