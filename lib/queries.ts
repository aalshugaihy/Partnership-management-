import {
  db, Partner, Contact, Activity, KPI, Opportunity, ReviewMeeting,
  STAGES, GEOSA_STAGES,
} from './db'

export function listPartners(opts: {
  q?: string
  stage?: string
  tier?: string
  sector?: string
  status?: string
  type?: 'prospect' | 'active'                  // record_type filter (GEOSA)
  geosa_classification?: string
  entity_category?: string
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
  if (opts.type)  { where.push('record_type = ?'); args.push(opts.type) }
  if (opts.geosa_classification) { where.push('geosa_classification = ?'); args.push(opts.geosa_classification) }
  if (opts.entity_category) { where.push('entity_category = ?'); args.push(opts.entity_category) }
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
  prospects: number
  active: number
  activated: number
  inPipeline: number
  responseRate: number
  workshopsHeld: number
  avgActivation: number
  byStage: { stage: string; count: number }[]
  byGeosaStage: { stage: string; count: number }[]
  bySector: { sector: string; count: number }[]
  byTier: { tier: string; count: number }[]
  byCountry: { country: string; count: number }[]
  byClassification: { geosa_classification: string; count: number }[]
  byEntityCategory: { entity_category: string; count: number }[]
  byCooperationArea: { area: string; count: number }[]
  recentActivity: Activity[]
  topPartners: Partner[]
  topActivePartners: Partner[]
  upcomingReviews: any[]
}

export function overview(): Overview {
  const d = db()
  const totalPartners = (d.prepare('SELECT COUNT(*) AS n FROM partners').get() as any).n
  const prospects = (d.prepare(`SELECT COUNT(*) AS n FROM partners WHERE record_type = 'prospect'`).get() as any).n
  const active = (d.prepare(`SELECT COUNT(*) AS n FROM partners WHERE record_type = 'active'`).get() as any).n
  const activated = (d.prepare("SELECT COUNT(*) AS n FROM partners WHERE stage = 'تفعيل' OR stage = 'إنجاز' OR stage = 'تفعيل وتشغيل' OR stage = 'متابعة وتقويم' OR stage = 'تحسين وتطوير'").get() as any).n
  const inPipeline = (d.prepare("SELECT COUNT(*) AS n FROM partners WHERE stage != 'إنجاز'").get() as any).n
  const responded = (d.prepare("SELECT COUNT(*) AS n FROM partners WHERE response_received = 1 AND record_type = 'prospect'").get() as any).n
  const invited = (d.prepare("SELECT COUNT(*) AS n FROM partners WHERE invite_sent = 1 AND record_type = 'prospect'").get() as any).n
  const workshopsHeld = (d.prepare(`SELECT COUNT(*) AS n FROM partners WHERE workshop_attendance LIKE '%حضور%' OR workshop_attendance LIKE '%تم%'`).get() as any).n
  const avgActivation = (d.prepare(`SELECT IFNULL(AVG(activation_score), 0) AS n FROM partners`).get() as any).n

  // Prospect-funnel stages (record_type='prospect')
  const byStage = STAGES.map(stage => ({
    stage,
    count: (d.prepare(`SELECT COUNT(*) AS n FROM partners WHERE stage = ? AND record_type = 'prospect'`).get(stage) as any).n,
  }))
  // GEOSA lifecycle stages (record_type='active')
  const byGeosaStage = GEOSA_STAGES.map(stage => ({
    stage,
    count: (d.prepare(`SELECT COUNT(*) AS n FROM partners WHERE stage = ? AND record_type = 'active'`).get(stage) as any).n,
  }))
  const bySector = d.prepare(`SELECT sector, COUNT(*) AS count FROM partners WHERE sector IS NOT NULL GROUP BY sector ORDER BY count DESC`).all() as any[]
  const byTier = d.prepare(`SELECT tier, COUNT(*) AS count FROM partners WHERE tier IS NOT NULL GROUP BY tier ORDER BY count DESC`).all() as any[]
  const byCountry = d.prepare(`SELECT country, COUNT(*) AS count FROM partners WHERE country IS NOT NULL GROUP BY country ORDER BY count DESC`).all() as any[]
  const byClassification = d.prepare(`
    SELECT geosa_classification, COUNT(*) AS count FROM partners
    WHERE record_type = 'active' AND geosa_classification IS NOT NULL
    GROUP BY geosa_classification ORDER BY count DESC
  `).all() as any[]
  const byEntityCategory = d.prepare(`
    SELECT entity_category, COUNT(*) AS count FROM partners
    WHERE record_type = 'active' AND entity_category IS NOT NULL
    GROUP BY entity_category ORDER BY count DESC
  `).all() as any[]

  // Cooperation areas: each partner has a JSON array; we count occurrences across all active partners.
  const activePartners = d.prepare(`SELECT cooperation_areas FROM partners WHERE record_type = 'active'`).all() as any[]
  const areaCounts: Record<string, number> = {}
  for (const r of activePartners) {
    try {
      const areas = JSON.parse(r.cooperation_areas || '[]') as string[]
      for (const a of areas) areaCounts[a] = (areaCounts[a] || 0) + 1
    } catch {}
  }
  const byCooperationArea = Object.entries(areaCounts)
    .map(([area, count]) => ({ area, count }))
    .sort((a, b) => b.count - a.count)

  const recentActivity = d.prepare(`SELECT a.*, p.company FROM activities a JOIN partners p ON p.id = a.partner_id ORDER BY a.occurred_at DESC LIMIT 8`).all() as any[]
  const topPartners = d.prepare(`SELECT * FROM partners ORDER BY activation_score DESC, strategic_value DESC LIMIT 5`).all() as Partner[]
  const topActivePartners = d.prepare(`
    SELECT * FROM partners WHERE record_type = 'active'
    ORDER BY activation_score DESC, strategic_value DESC LIMIT 5
  `).all() as Partner[]

  const upcomingReviews = d.prepare(`
    SELECT id, company, next_review_date FROM partners
    WHERE record_type = 'active' AND next_review_date IS NOT NULL
      AND date(next_review_date) >= date('now')
    ORDER BY next_review_date ASC LIMIT 5
  `).all() as any[]

  return {
    totalPartners,
    prospects,
    active,
    activated,
    inPipeline,
    responseRate: invited ? Math.round((responded / invited) * 100) : 0,
    workshopsHeld,
    avgActivation: Math.round(avgActivation),
    byStage,
    byGeosaStage,
    bySector,
    byTier,
    byCountry,
    byClassification,
    byEntityCategory,
    byCooperationArea,
    recentActivity,
    topPartners,
    topActivePartners,
    upcomingReviews,
  }
}

// Review meetings (GEOSA methodology stage 3 — periodic committee meetings)
export function getReviewMeetings(partnerId: number): ReviewMeeting[] {
  return db().prepare(
    `SELECT * FROM review_meetings WHERE partner_id = ? ORDER BY meeting_date DESC`
  ).all(partnerId) as ReviewMeeting[]
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

  // ═══ GEOSA active-partner recommendations (lifecycle stage) ═══

  // 1) Agreements expiring within 90 days
  const expiring = d.prepare(`
    SELECT id, company FROM partners
    WHERE record_type = 'active' AND expiry_date IS NOT NULL
      AND date(expiry_date) <= date('now', '+90 days')
      AND date(expiry_date) >= date('now')
    ORDER BY expiry_date ASC LIMIT 10
  `).all() as any[]
  if (expiring.length) {
    recs.push({
      id: 'r-expiring',
      priority: 'عالية',
      category: 'تجديد',
      title: `${expiring.length} اتفاقية تنتهي خلال 90 يوم`,
      rationale: 'وفقاً لمنهجية GEOSA - مرحلة التحسين والتطوير، يجب مراجعة الاتفاقيات قبل انتهائها بفترة كافية لاتخاذ قرار التجديد.',
      action: 'فتح ملف كل اتفاقية، تقييم الأثر المتحقق، وبدء مفاوضات التجديد أو إعداد قرار الإنهاء.',
      expectedImpact: 'منع انقطاع التعاون مع الشركاء الفاعلين وتأمين استمرارية المبادرات.',
      affectedPartners: expiring,
    })
  }

  // 2) Overdue periodic reviews (GEOSA stage 3 — continuous monitoring)
  const overdueReviews = d.prepare(`
    SELECT id, company FROM partners
    WHERE record_type = 'active' AND next_review_date IS NOT NULL
      AND date(next_review_date) < date('now')
    ORDER BY next_review_date ASC LIMIT 10
  `).all() as any[]
  if (overdueReviews.length) {
    recs.push({
      id: 'r-overdue-review',
      priority: 'عالية',
      category: 'متابعة',
      title: `${overdueReviews.length} شراكة تجاوزت موعد المراجعة الدورية`,
      rationale: 'منهجية GEOSA تتطلب اجتماعات لجان مشتركة نصف سنوية. تأخر المراجعة يُضعف الحوكمة ويفوّت فرص التحسين.',
      action: 'جدولة اجتماع مراجعة خلال 14 يوم لكل شراكة + تجهيز تقرير الإنجازات وعوائق التنفيذ.',
      expectedImpact: 'استعادة وتيرة المتابعة، رفع نسبة تنفيذ الأنشطة المتفق عليها، وكشف مبكر للمخاطر.',
      affectedPartners: overdueReviews,
    })
  }

  // 3) Strategic active partners with low activation
  const strategicLow = d.prepare(`
    SELECT id, company FROM partners
    WHERE record_type = 'active' AND geosa_classification = 'strategic' AND activation_score < 50
    LIMIT 10
  `).all() as any[]
  if (strategicLow.length) {
    recs.push({
      id: 'r-strategic-gap',
      priority: 'عالية',
      category: 'تفعيل',
      title: `${strategicLow.length} شراكة استراتيجية بأداء تفعيل ضعيف`,
      rationale: 'شراكات مصنّفة "استراتيجية" حسب GEOSA لكن مؤشر التفعيل أقل من 50%. هذه فجوة بين القيمة المتوقعة والواقع.',
      action: 'تكليف مدير حسابات مخصص، إعداد خطة تفعيل من 90 يوماً مع KPIs شهرية، ورفع للقيادة شهرياً.',
      expectedImpact: 'مضاعفة الأنشطة المنفذة خلال ربع واحد ورفع التصنيف لمستوى "متابعة فعّالة".',
      affectedPartners: strategicLow,
    })
  }

  // 4) Active partners with no cooperation area defined
  const noAreas = d.prepare(`
    SELECT id, company FROM partners
    WHERE record_type = 'active' AND (cooperation_areas IS NULL OR cooperation_areas = '[]' OR cooperation_areas = '')
    LIMIT 10
  `).all() as any[]
  if (noAreas.length) {
    recs.push({
      id: 'r-no-cooperation-areas',
      priority: 'متوسطة',
      category: 'توثيق',
      title: `${noAreas.length} شراكة بلا تحديد لمجالات التعاون`,
      rationale: 'منهجية GEOSA - مرحلة التقييم الشامل تتطلب توثيق مجالات التعاون لكل اتفاقية (تبادل بيانات / R&D / تدريب / إلخ).',
      action: 'مراجعة نص الاتفاقية وتسجيل مجالات التعاون الفعلية في ملف كل شراكة.',
      expectedImpact: 'تمكين تحليل أعمق للمحفظة وتحديد فجوات التغطية في مجالات أهداف الهيئة.',
      affectedPartners: noAreas,
    })
  }

  // 5) Imbalance in entity categories (over-concentration in one type)
  const byCategory = d.prepare(`
    SELECT entity_category, COUNT(*) AS c FROM partners
    WHERE record_type = 'active' AND entity_category IS NOT NULL
    GROUP BY entity_category
  `).all() as any[]
  const totalActive = byCategory.reduce((s, r) => s + r.c, 0)
  if (totalActive > 0) {
    const dominant = byCategory.find(r => r.c / totalActive > 0.55)
    if (dominant) {
      recs.push({
        id: 'r-concentration',
        priority: 'متوسطة',
        category: 'تنويع',
        title: `تركّز محفظة الشراكات الفاعلة في صنف واحد`,
        rationale: `${Math.round(100*dominant.c/totalActive)}% من الشراكات النشطة في صنف "${dominant.entity_category}". الاعتماد على صنف واحد يقلّل تنوع المنفعة.`,
        action: 'استكشاف شراكات جديدة في الأصناف الأقل تمثيلاً (خاصة المنظمات الدولية والقطاع الخاص).',
        expectedImpact: 'محفظة أكثر مرونة وتوازناً يمكنها تغطية جميع جوانب مهمة الهيئة.',
        affectedPartners: [],
      })
    }
  }

  // ═══ Prospect-funnel recommendations (legacy) ═══

  const stalled = d.prepare(`
    SELECT id, company FROM partners
    WHERE record_type = 'prospect' AND invite_sent = 1 AND response_received = 0
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
    WHERE record_type = 'prospect' AND response_received = 1
      AND (workshop_attendance IS NULL OR workshop_attendance = '' OR workshop_attendance NOT LIKE '%حضور%')
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
