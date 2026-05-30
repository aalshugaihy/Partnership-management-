import fs from 'fs'
import path from 'path'
import {
  db, computeActivationScore, deriveStage, serializeCoopAreas,
  GEOSA_STAGES,
} from '../lib/db'
import { ensureDefaultAdmin } from '../lib/auth'

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

type GeosaPartner = {
  company: string
  entity_category: string
  agreement_type: string
  geosa_classification: string
  cooperation_areas: string[]
  country?: string
  sector?: string
  region?: string
  signed_date?: string
  expiry_date?: string
  reference_url?: string
  latitude?: number
  longitude?: number
  notes?: string
}

type Seed = {
  partners: RawPartner[]
  licensed_companies: Array<{ id: number; name: string; phone?: any; email?: any }>
}

type GeosaSeed = {
  active_partners: GeosaPartner[]
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

// === Helpers for GEOSA active partners ===

// Map GEOSA classification → numeric strategic value (1-10)
function strategicForClassification(cls: string): number {
  if (cls === 'strategic') return 9
  if (cls === 'operational') return 7
  return 5
}

// Map GEOSA classification → tier label (reuse existing tier values for visual continuity)
function tierForClassification(cls: string): string {
  if (cls === 'strategic') return 'استراتيجي'
  if (cls === 'operational') return 'مرتفع'
  return 'قياسي'
}

// Map entity category → human-readable sector if PDF didn't specify one
function sectorForEntity(category: string): string {
  switch (category) {
    case 'government': return 'حكومي'
    case 'university': return 'تعليم وبحث'
    case 'private': return 'قطاع خاص'
    case 'international_org': return 'منظمات دولية'
    case 'regional_alliance': return 'تحالفات إقليمية'
    case 'ngo': return 'منظمات غير ربحية'
    default: return 'متعدد'
  }
}

function findFile(name: string): string | null {
  const candidates = [
    path.join(__dirname, name),
    path.join(process.cwd(), 'scripts', name),
    path.join(process.cwd(), 'data', name),
  ]
  for (const c of candidates) if (fs.existsSync(c)) return c
  return null
}

const seedPath = findFile('seed.json')
if (!seedPath) throw new Error('seed.json not found')
console.log(`Reading prospects seed from: ${seedPath}`)
const raw: Seed = JSON.parse(fs.readFileSync(seedPath, 'utf-8'))

const geosaPath = findFile('geosa-partners.json')
let geosaSeed: GeosaSeed = { active_partners: [] }
if (geosaPath) {
  console.log(`Reading GEOSA active partners from: ${geosaPath}`)
  geosaSeed = JSON.parse(fs.readFileSync(geosaPath, 'utf-8'))
}

const d = db()

const insP = d.prepare(`
  INSERT OR REPLACE INTO partners
  (id, company, sector, country, region, tier, status, stage, invite_sent, rfi_sent,
   initial_receipt, response_received, extension_request, platform, rfi_delivery,
   workshop_attendance, workshop_date, workshop_time, notes, strategic_value, activation_score,
   record_type, agreement_type, geosa_classification, entity_category, cooperation_areas,
   signed_date, expiry_date, next_review_date, reference_url, latitude, longitude)
  VALUES (@id, @company, @sector, @country, @region, @tier, @status, @stage, @invite_sent, @rfi_sent,
   @initial_receipt, @response_received, @extension_request, @platform, @rfi_delivery,
   @workshop_attendance, @workshop_date, @workshop_time, @notes, @strategic_value, @activation_score,
   @record_type, @agreement_type, @geosa_classification, @entity_category, @cooperation_areas,
   @signed_date, @expiry_date, @next_review_date, @reference_url, @latitude, @longitude)
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
  // === 1) Prospects (the original 151 lead-funnel records) ===
  for (const p of raw.partners) {
    const company = (p.company || '').replace(/^\s+|\s+$/g, '')
    if (!company) continue
    const fields: any = {
      id: p.id,
      company,
      sector: inferSector(company),
      country: inferCountry(company),
      region: null,
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
      record_type: 'prospect',
      agreement_type: null,
      geosa_classification: null,
      entity_category: null,
      cooperation_areas: '[]',
      signed_date: null,
      expiry_date: null,
      next_review_date: null,
      reference_url: null,
      latitude: null,
      longitude: null,
    }
    fields.activation_score = computeActivationScore(fields)
    fields.stage = deriveStage(fields)
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

  // === 2) GEOSA Active Partners (signed MoUs and agreements) ===
  // Idempotent: skip insert if a partner with the same company name already exists.
  // This makes it safe to re-run seed on an existing database (e.g. after deployment upgrades).
  const findByName = d.prepare(`SELECT id FROM partners WHERE TRIM(company) = TRIM(?)`)
  const updGeosa = d.prepare(`
    UPDATE partners SET
      record_type = 'active',
      agreement_type = COALESCE(@agreement_type, agreement_type),
      geosa_classification = COALESCE(@geosa_classification, geosa_classification),
      entity_category = COALESCE(@entity_category, entity_category),
      cooperation_areas = COALESCE(@cooperation_areas, cooperation_areas),
      sector = COALESCE(@sector, sector),
      country = COALESCE(@country, country),
      region = COALESCE(@region, region),
      latitude = COALESCE(@latitude, latitude),
      longitude = COALESCE(@longitude, longitude),
      updated_at = datetime('now')
    WHERE id = @id
  `)
  const startId = ((d.prepare('SELECT MAX(id) AS m FROM partners').get() as any).m ?? 0) + 1
  let nextId = startId
  let geosaInserted = 0, geosaUpdated = 0
  for (const g of geosaSeed.active_partners) {
    const existing = findByName.get(g.company) as any
    if (existing) {
      // Already there → upgrade its GEOSA metadata in place.
      updGeosa.run({
        id: existing.id,
        agreement_type: g.agreement_type,
        geosa_classification: g.geosa_classification,
        entity_category: g.entity_category,
        cooperation_areas: serializeCoopAreas(g.cooperation_areas || []),
        sector: g.sector || sectorForEntity(g.entity_category),
        country: g.country || 'السعودية',
        region: g.region || null,
        latitude: g.latitude ?? null,
        longitude: g.longitude ?? null,
      })
      geosaUpdated++
      continue
    }
    const id = nextId++
    // Distribute the 4 GEOSA stages so the pipeline isn't empty
    const stageIdx = (id - startId) % GEOSA_STAGES.length
    const fields: any = {
      id,
      company: g.company,
      sector: g.sector || sectorForEntity(g.entity_category),
      country: g.country || 'السعودية',
      region: g.region || null,
      tier: tierForClassification(g.geosa_classification),
      status: 'مبرمة',
      stage: GEOSA_STAGES[stageIdx],
      invite_sent: 1, rfi_sent: 1, initial_receipt: 1, response_received: 1, extension_request: 0,
      platform: null, rfi_delivery: null,
      workshop_attendance: 'تم الحضور', workshop_date: null, workshop_time: null,
      notes: g.notes || null,
      strategic_value: strategicForClassification(g.geosa_classification),
      activation_score: stageIdx === 0 ? 30 : stageIdx === 1 ? 60 : stageIdx === 2 ? 80 : 95,
      record_type: 'active',
      agreement_type: g.agreement_type,
      geosa_classification: g.geosa_classification,
      entity_category: g.entity_category,
      cooperation_areas: serializeCoopAreas(g.cooperation_areas || []),
      signed_date: g.signed_date || null,
      expiry_date: g.expiry_date || null,
      // schedule next review 6 months from now for partners in 'متابعة وتقويم'
      next_review_date: stageIdx === 2 ? new Date(Date.now() + 180 * 86400_000).toISOString().slice(0, 10) : null,
      reference_url: g.reference_url || null,
      latitude: g.latitude ?? null,
      longitude: g.longitude ?? null,
    }
    insP.run(fields)
    insAct.run(id, 'توقيع', `توقيع ${fields.agreement_type === 'mou' ? 'مذكرة تفاهم' : 'اتفاقية'}`,
      `تم توقيع الاتفاقية مع ${g.company}`)
    geosaInserted++
  }
  console.log(`GEOSA active partners: ${geosaInserted} inserted, ${geosaUpdated} updated.`)

  // === 3) Licensed companies ===
  d.prepare('DELETE FROM licensed_companies').run()
  const insL = d.prepare(`INSERT INTO licensed_companies (id, name, phone, email) VALUES (?, ?, ?, ?)`)
  for (const l of raw.licensed_companies) {
    insL.run(l.id, l.name, l.phone ? String(l.phone) : null, l.email ? String(l.email).trim() : null)
  }

  // === 4) Organization-wide KPIs ===
  d.prepare('DELETE FROM kpis WHERE partner_id IS NULL').run()
  const insK = d.prepare(`INSERT INTO kpis (name, target, actual, unit, period, category) VALUES (?, ?, ?, ?, ?, ?)`)
  // GEOSA-aligned KPIs
  insK.run('عدد الاتفاقيات الفاعلة (مبرمة)', 40, 0, 'اتفاقية', '2025', 'تفعيل')
  insK.run('نسبة الأنشطة المتفق عليها المنفّذة', 80, 0, '%', '2025', 'تنفيذ')
  insK.run('عدد المبادرات المشتركة المفعّلة', 25, 0, 'مبادرة', '2025', 'تفعيل')
  insK.run('متوسط رضا الأطراف (1-5)', 4, 0, 'نقطة', '2025', 'جودة')
  insK.run('عدد اجتماعات المراجعة الدورية', 50, 0, 'اجتماع', '2025', 'متابعة')
  insK.run('تنوع مجالات التعاون', 7, 0, 'مجال', '2025', 'تنوع')
  insK.run('تنوع تصنيفات الجهات', 6, 0, 'صنف', '2025', 'تنوع')
  // Prospect-funnel KPIs (kept for backward compat)
  insK.run('نسبة الرد من المستهدفات', 70, 0, '%', '2025', 'تفاعل')
  insK.run('عدد ورش العمل المنفذة', 20, 0, 'ورشة', '2025', 'تنفيذ')

  // === 5) Sample opportunities ===
  d.prepare('DELETE FROM opportunities').run()
  const topActive = d.prepare(`
    SELECT id, company FROM partners WHERE record_type = 'active' AND geosa_classification = 'strategic'
    LIMIT 8
  `).all() as any[]
  const insO = d.prepare(`
    INSERT INTO opportunities (partner_id, title, description, estimated_value, probability, stage, status, expected_close_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)
  for (const p of topActive) {
    insO.run(p.id, `توسعة التعاون مع ${p.company}`,
      'فرصة توسيع نطاق الاتفاقية الحالية إلى مجالات تعاون إضافية (تبادل بيانات، تدريب مشترك).',
      Math.floor(Math.random() * 3_000_000) + 500_000,
      Math.floor(Math.random() * 50) + 40,
      'تأهيل',
      'مفتوحة',
      new Date(Date.now() + 90 * 86400_000).toISOString().slice(0, 10))
  }
})
tx()

ensureDefaultAdmin()

const total = (d.prepare('SELECT COUNT(*) AS n FROM partners').get() as any).n
const prospects = (d.prepare(`SELECT COUNT(*) AS n FROM partners WHERE record_type = 'prospect'`).get() as any).n
const active = (d.prepare(`SELECT COUNT(*) AS n FROM partners WHERE record_type = 'active'`).get() as any).n
const contacts = (d.prepare('SELECT COUNT(*) AS n FROM contacts').get() as any).n
const licensed = (d.prepare('SELECT COUNT(*) AS n FROM licensed_companies').get() as any).n
const users = (d.prepare('SELECT COUNT(*) AS n FROM users').get() as any).n
console.log(`Seeded: ${total} partners (${prospects} prospects + ${active} active GEOSA), ${contacts} contacts, ${licensed} licensed, ${users} user(s)`)
console.log(`Default login: ${process.env.ADMIN_EMAIL || 'admin@local'} / ${process.env.ADMIN_PASSWORD || 'admin1234'}`)
