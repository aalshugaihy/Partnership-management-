import { db, Partner, Contact, Activity, KPI, Opportunity, STAGES } from './db'

export function listPartners(opts: {
  q?: string
  stage?: string
  tier?: string
  sector?: string
  status?: string
  limit?: number
} = {}): Partner[] {
  const d = db()
  const where: string[] = []
  const args: any[] = []
  if (opts.q) { where.push('(company LIKE ? OR notes LIKE ?)'); args.push(`%${opts.q}%`, `%${opts.q}%`) }
  if (opts.stage) { where.push('stage = ?'); args.push(opts.stage) }
  if (opts.tier)  { where.push('tier = ?');  args.push(opts.tier)  }
  if (opts.sector){ where.push('sector = ?');args.push(opts.sector)}
  if (opts.status){ where.push('status = ?');args.push(opts.status)}
  const sql = `SELECT * FROM partners ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY strategic_value DESC, id ASC ${opts.limit ? 'LIMIT ' + opts.limit : ''}`
  return d.prepare(sql).all(...args) as Partner[]
}

export function getPartner(id: number): Partner | null {
  return db().prepare('SELECT * FROM partners WHERE id = ?').get(id) as Partner | null
}

export function getContacts(partnerId: number): Contact[] {
  return db().prepare('SELECT * FROM contacts WHERE partner_id = ? ORDER BY is_representative DESC, id ASC').all(partnerId) as Contact[]
}

export function getActivities(partnerId: number): Activity[] {
  return db().prepare('SELECT * FROM activities WHERE partner_id = ? ORDER BY occurred_at DESC').all(partnerId) as Activity[]
}

export function getKPIs(partnerId?: number): KPI[] {
  const d = db()
  if (partnerId === undefined) return d.prepare('SELECT * FROM kpis WHERE partner_id IS NULL').all() as KPI[]
  return d.prepare('SELECT * FROM kpis WHERE partner_id = ?').all(partnerId) as KPI[]
}

export function getOpportunities(): Opportunity[] {
  return db().prepare(`
    SELECT o.*, p.company AS company FROM opportunities o
    LEFT JOIN partners p ON p.id = o.partner_id
    ORDER BY estimated_value DESC
  `).all() as any[]
}

export function getLicensed() {
  return db().prepare('SELECT * FROM licensed_companies ORDER BY id').all() as any[]
}

export function logActivity(partnerId: number, kind: string, title: string, description?: string) {
  db().prepare('INSERT INTO activities (partner_id, kind, title, description) VALUES (?, ?, ?, ?)')
    .run(partnerId, kind, title, description ?? null)
}

export type Overview = {
  totalPartners: number
  activated: number
  inPipeline: number
  responseRate: number
  workshopsHeld: number
  avgActivation: number
  byStage: { stage: string; count: number }[]
  bySector: { sector: string; count: number }[]
  byTier: { tier: string; count: number }[]
  byCountry: { country: string; count: number }[]
  recentActivity: Activity[]
  topPartners: Partner[]
}

export function overview(): Overview {
  const d = db()
  const totalPartners = (d.prepare('SELECT COUNT(*) AS n FROM partners').get() as any).n
  const activated = (d.prepare("SELECT COUNT(*) AS n FROM partners WHERE stage = 'تفعيل' OR stage = 'إنجاز'").get() as any).n
  const inPipeline = (d.prepare("SELECT COUNT(*) AS n FROM partners WHERE stage != 'إنجاز'").get() as any).n
  const responded = (d.prepare("SELECT COUNT(*) AS n FROM partners WHERE response_received = 1").get() as any).n
  const invited = (d.prepare("SELECT COUNT(*) AS n FROM partners WHERE invite_sent = 1").get() as any).n
  const workshopsHeld = (d.prepare(`SELECT COUNT(*) AS n FROM partners WHERE workshop_attendance LIKE '%حضور%' OR workshop_attendance LIKE '%تم%'`).get() as any).n
  const avgActivation = (d.prepare(`SELECT IFNULL(AVG(activation_score), 0) AS n FROM partners`).get() as any).n

  const byStage = STAGES.map(stage => ({
    stage,
    count: (d.prepare('SELECT COUNT(*) AS n FROM partners WHERE stage = ?').get(stage) as any).n
  }))
  const bySector = d.prepare(`SELECT sector, COUNT(*) AS count FROM partners GROUP BY sector ORDER BY count DESC`).all() as any[]
  const byTier = d.prepare(`SELECT tier, COUNT(*) AS count FROM partners GROUP BY tier ORDER BY count DESC`).all() as any[]
  const byCountry = d.prepare(`SELECT country, COUNT(*) AS count FROM partners GROUP BY country ORDER BY count DESC`).all() as any[]
  const recentActivity = d.prepare(`SELECT a.*, p.company FROM activities a JOIN partners p ON p.id = a.partner_id ORDER BY a.occurred_at DESC LIMIT 8`).all() as any[]
  const topPartners = d.prepare(`SELECT * FROM partners ORDER BY activation_score DESC, strategic_value DESC LIMIT 5`).all() as Partner[]

  return {
    totalPartners,
    activated,
    inPipeline,
    responseRate: invited ? Math.round((responded / invited) * 100) : 0,
    workshopsHeld,
    avgActivation: Math.round(avgActivation),
    byStage,
    bySector,
    byTier,
    byCountry,
    recentActivity,
    topPartners,
  }
}

export type Recommendation = {
  id: string
  priority: 'عالية' | 'متوسطة' | 'منخفضة'
  category: string
  title: string
  rationale: string
  action: string
  expectedImpact: string
  affectedPartners: { id: number; company: string }[]
}

export function generateRecommendations(): Recommendation[] {
  const d = db()
  const recs: Recommendation[] = []

  const stalled = d.prepare(`
    SELECT id, company FROM partners
    WHERE invite_sent = 1 AND response_received = 0
    ORDER BY strategic_value DESC LIMIT 12
  `).all() as any[]
  if (stalled.length > 3) {
    recs.push({
      id: 'r-stalled',
      priority: 'عالية',
      category: 'متابعة',
      title: `إعادة تنشيط ${stalled.length} شراكة معلقة`,
      rationale: 'هذه الشركات استلمت دعوة ولم ترد بعد. التأخر يُقلّل فرص التفعيل.',
      action: 'إرسال رسالة متابعة احترافية خلال 7 أيام مع عرض قيمة محدّث ومقترح اجتماع.',
      expectedImpact: 'رفع معدل الاستجابة بنسبة 15-25% خلال شهر.',
      affectedPartners: stalled.slice(0, 8),
    })
  }

  const noWorkshop = d.prepare(`
    SELECT id, company FROM partners
    WHERE response_received = 1 AND (workshop_attendance IS NULL OR workshop_attendance = '' OR workshop_attendance NOT LIKE '%حضور%')
    AND strategic_value >= 7
    ORDER BY strategic_value DESC LIMIT 10
  `).all() as any[]
  if (noWorkshop.length) {
    recs.push({
      id: 'r-workshops',
      priority: 'عالية',
      category: 'تفعيل',
      title: `جدولة ورش عمل لـ ${noWorkshop.length} شريك استراتيجي`,
      rationale: 'هؤلاء الشركاء استجابوا لكن لم يتم تفعيلهم عبر ورشة عمل تشاركية - وهي محطة حاسمة للانتقال للتنفيذ.',
      action: 'تنسيق ورش عمل ثنائية افتراضية أو حضورية في الأسابيع الأربعة القادمة.',
      expectedImpact: 'تحويل ~60% من هؤلاء الشركاء إلى مرحلة التفعيل.',
      affectedPartners: noWorkshop,
    })
  }

  const sectors = d.prepare(`SELECT sector, COUNT(*) AS c FROM partners GROUP BY sector`).all() as any[]
  const weak = sectors.filter(s => s.c <= 2)
  if (weak.length) {
    recs.push({
      id: 'r-diversify',
      priority: 'متوسطة',
      category: 'تنويع',
      title: 'تنويع محفظة الشراكات في قطاعات قليلة التمثيل',
      rationale: `القطاعات التالية ممثلة بشكل ضعيف: ${weak.map(w => w.sector).join('، ')}. التنويع يقلّل المخاطر ويفتح فرص تكامل.`,
      action: 'بناء قائمة مستهدفة من 5-10 شركات في كل قطاع ضعيف خلال هذا الربع.',
      expectedImpact: 'توازن محفظة الشراكات ورفع المرونة الاستراتيجية.',
      affectedPartners: [],
    })
  }

  const lowActivation = d.prepare(`
    SELECT id, company FROM partners
    WHERE activation_score < 30 AND strategic_value >= 8
    LIMIT 10
  `).all() as any[]
  if (lowActivation.length) {
    recs.push({
      id: 'r-low-activation',
      priority: 'عالية',
      category: 'أداء',
      title: `شراكات استراتيجية بأداء تفعيل منخفض`,
      rationale: 'شركات ذات قيمة استراتيجية عالية لكن مؤشر تفعيلها أقل من 30%. توجد فجوة كبيرة بين القيمة المحتملة والواقع.',
      action: 'تكليف مدير حسابات مخصص لكل شريك من هؤلاء، مع خطة تفعيل من 90 يوماً.',
      expectedImpact: 'مضاعفة مؤشر التفعيل خلال ربع واحد لشركاء ذوي تأثير عالٍ.',
      affectedPartners: lowActivation,
    })
  }

  const noRep = d.prepare(`
    SELECT p.id, p.company FROM partners p
    WHERE p.response_received = 1 AND NOT EXISTS (
      SELECT 1 FROM contacts c WHERE c.partner_id = p.id AND c.is_representative = 1
    ) ORDER BY p.strategic_value DESC LIMIT 8
  `).all() as any[]
  if (noRep.length) {
    recs.push({
      id: 'r-reps',
      priority: 'متوسطة',
      category: 'تمكين',
      title: `تعيين ممثلين رسميين لـ ${noRep.length} شركة فاعلة`,
      rationale: 'ضمان وجود ممثل رسمي يُسرّع الاستجابة ويبني علاقة طويلة المدى.',
      action: 'طلب ترشيح ممثل رسمي وتأهيله ضمن برنامج تمكين ممثلي الشركاء.',
      expectedImpact: 'تقليل زمن الاستجابة وتعميق العلاقة المؤسسية.',
      affectedPartners: noRep,
    })
  }

  const topOpp = d.prepare(`
    SELECT o.title, o.estimated_value, p.company FROM opportunities o
    JOIN partners p ON p.id = o.partner_id
    WHERE o.status = 'مفتوحة'
    ORDER BY o.estimated_value * o.probability DESC LIMIT 5
  `).all() as any[]
  if (topOpp.length) {
    recs.push({
      id: 'r-opportunities',
      priority: 'عالية',
      category: 'فرص',
      title: 'تركيز الجهد على أعلى الفرص المتوقعة',
      rationale: `هناك ${topOpp.length} فرص مفتوحة بقيمة عالية مرجّحة. تركيز الجهد عليها يعظّم العائد.`,
      action: `ترتيب اجتماعات تنفيذية للفرص الخمس الكبرى خلال أسبوعين مع خطة إغلاق واضحة.`,
      expectedImpact: 'تسريع تحويل الفرص الكبيرة إلى عقود فعلية.',
      affectedPartners: [],
    })
  }

  return recs
}

export type ReportSummary = {
  generatedAt: string
  overview: Overview
  highlights: string[]
  risks: string[]
  recommendationsCount: number
  topOpportunities: any[]
}

export type Snapshot = {
  id: number
  taken_at: string
  total_partners: number
  activated: number
  response_rate: number
  workshops_held: number
  avg_activation: number
  open_opportunities: number
  pipeline_value: number
}

export function takeSnapshot(): Snapshot {
  const ov = overview()
  const d = db()
  const opps = d.prepare(`SELECT COUNT(*) AS n, IFNULL(SUM(estimated_value * probability / 100.0), 0) AS v FROM opportunities WHERE status = 'مفتوحة'`).get() as any
  d.prepare(`
    INSERT INTO impact_snapshots
    (total_partners, activated, response_rate, workshops_held, avg_activation, open_opportunities, pipeline_value)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(ov.totalPartners, ov.activated, ov.responseRate, ov.workshopsHeld, ov.avgActivation, opps.n, opps.v)
  return d.prepare(`SELECT * FROM impact_snapshots ORDER BY id DESC LIMIT 1`).get() as Snapshot
}

export function listSnapshots(limit = 30): Snapshot[] {
  return db().prepare(`SELECT * FROM impact_snapshots ORDER BY taken_at ASC LIMIT ?`).all(limit) as Snapshot[]
}

export function buildExecutiveReport(): ReportSummary {
  const ov = overview()
  const recs = generateRecommendations()
  const topOpportunities = db().prepare(`
    SELECT o.title, o.estimated_value, o.probability, p.company
    FROM opportunities o JOIN partners p ON p.id = o.partner_id
    ORDER BY o.estimated_value DESC LIMIT 5
  `).all() as any[]

  const highlights: string[] = []
  highlights.push(`تتم متابعة ${ov.totalPartners} شراكة، منها ${ov.activated} في مرحلة التفعيل أو الإنجاز.`)
  highlights.push(`متوسط مؤشر التفعيل يبلغ ${ov.avgActivation}% - مؤشر شامل لمستوى تقدّم الشراكات.`)
  highlights.push(`نسبة الاستجابة الإجمالية ${ov.responseRate}% (${ov.workshopsHeld} ورشة عمل منفذة).`)
  if (ov.bySector.length) {
    highlights.push(`أعلى القطاعات تمثيلاً: ${ov.bySector.slice(0, 3).map(s => `${s.sector} (${s.count})`).join('، ')}.`)
  }

  const risks: string[] = []
  if (ov.responseRate < 50) risks.push('نسبة الاستجابة أقل من 50% - حاجة لإعادة هندسة الرسالة الافتتاحية.')
  if (ov.avgActivation < 40) risks.push('مؤشر التفعيل المتوسط منخفض - يتطلّب خطة تسريع.')
  const concentration = ov.bySector[0]
  if (concentration && concentration.count / Math.max(1, ov.totalPartners) > 0.4) {
    risks.push(`تركيز عالٍ في قطاع ${concentration.sector} (>40% من الشراكات) - مخاطر تنويع.`)
  }

  return {
    generatedAt: new Date().toISOString(),
    overview: ov,
    highlights,
    risks,
    recommendationsCount: recs.length,
    topOpportunities,
  }
}
