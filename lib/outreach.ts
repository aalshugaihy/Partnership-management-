import { db, Partner } from './db'

export type OutreachTemplate = {
  id: string
  name: string
  audience: string
  subject: (p: Partner) => string
  body: (p: Partner) => string
}

const ORG = 'الإدارة العامة للشراكات'

export const TEMPLATES: OutreachTemplate[] = [
  {
    id: 'invite',
    name: 'دعوة أولية',
    audience: 'شركات لم تُرسل لها دعوة بعد',
    subject: p => `دعوة شراكة استراتيجية - ${p.company}`,
    body: p => `السلام عليكم،

يسرّنا التواصل مع ${p.company} لاستكشاف فرص شراكة استراتيجية تعود بالنفع على الطرفين، خصوصاً في مجال ${p.sector}.

نقترح ترتيب لقاء أولي خلال الأسابيع القادمة لمناقشة الفرص المتاحة وآفاق التعاون.

نتطلع لتواصلكم.
مع التحية،
${ORG}`,
  },
  {
    id: 'followup',
    name: 'متابعة شراكة معلقة',
    audience: 'شركات استلمت الدعوة ولم ترد',
    subject: p => `متابعة: دعوة الشراكة مع ${p.company}`,
    body: p => `تحية طيبة،

نتابع معكم بشأن دعوة الشراكة التي تم إرسالها لـ ${p.company}. نأمل أن تكون قد وصلتكم.

نُدرك أن الجداول مزدحمة، ونودّ التأكيد على القيمة المتوقعة من هذه الشراكة:
• تكامل تقني مع منظومتنا في قطاع ${p.sector}
• فرص نمو مشتركة في السوق
• وصول لشبكة شركائنا الاستراتيجيين

هل يمكن ترتيب مكالمة قصيرة (20 دقيقة) خلال الأسبوع القادم؟

مع التقدير،
${ORG}`,
  },
  {
    id: 'rfi',
    name: 'إرسال طلب معلومات (RFI)',
    audience: 'شركات في مرحلة RFI',
    subject: p => `طلب معلومات (RFI) - ${p.company}`,
    body: p => `مرحباً،

نشكركم على اهتمامكم بالشراكة. كخطوة تالية، نرفق طلب المعلومات (RFI) الذي يساعدنا على فهم قدرات ${p.company} وملاءمتها لاحتياجاتنا.

نرجو تعبئة النموذج وإعادته خلال 14 يوماً. نحن مستعدّون لأي استفسار.

مع التحية،
${ORG}`,
  },
  {
    id: 'workshop_invite',
    name: 'دعوة لورشة عمل',
    audience: 'شركات وصلت لمرحلة استلام الرد',
    subject: p => `دعوة لورشة عمل ثنائية - ${p.company}`,
    body: p => `أهلاً بكم،

سعدنا بردّكم الإيجابي. كخطوة تالية، نقترح ورشة عمل ثنائية لاستعراض:
• نقاط التكامل التقني والتشغيلي
• خارطة طريق مقترحة لتفعيل الشراكة
• مؤشرات الأداء المشتركة

نقترح المواعيد التالية. يُرجى تأكيد ما يناسبكم:
1. الثلاثاء القادم 10:00ص
2. الخميس القادم 2:00م
3. الأحد بعد القادم 11:00ص

مع التقدير،
${ORG}`,
  },
  {
    id: 'request_rep',
    name: 'طلب ترشيح ممثل رسمي',
    audience: 'شركات نشطة بدون ممثل',
    subject: p => `ترشيح ممثل رسمي للشراكة - ${p.company}`,
    body: p => `تحية طيبة،

تطوّر شراكتنا مع ${p.company} يستوجب وجود ممثل رسمي ينسّق على المستوى التشغيلي ويحضر اللقاءات الدورية.

نأمل تزويدنا باسم ممثلكم الرسمي وبيانات تواصله، ليتم إدراجه في برنامج تمكين ممثلي الشركاء.

مع الشكر،
${ORG}`,
  },
  {
    id: 'activation_kickoff',
    name: 'انطلاق التفعيل',
    audience: 'شركات حضرت ورشة العمل',
    subject: p => `انطلاق تفعيل الشراكة - ${p.company}`,
    body: p => `مرحباً،

شكراً لمشاركتكم في ورشة العمل. وفقاً لما تم الاتفاق عليه، ندخل الآن مرحلة التفعيل الفعلي للشراكة.

الخطوات القادمة:
1. توقيع مذكرة التفاهم خلال أسبوعين
2. تشكيل فريق عمل مشترك
3. اعتماد مؤشرات الأداء (KPIs) للربع الأول
4. لقاء شهري للمتابعة

نتطلع لمرحلة مثمرة.
${ORG}`,
  },
]

export function audienceFor(templateId: string): Partner[] {
  const d = db()
  switch (templateId) {
    case 'invite':
      return d.prepare(`SELECT * FROM partners WHERE invite_sent = 0 ORDER BY strategic_value DESC LIMIT 50`).all() as Partner[]
    case 'followup':
      return d.prepare(`SELECT * FROM partners WHERE invite_sent = 1 AND response_received = 0 ORDER BY strategic_value DESC LIMIT 50`).all() as Partner[]
    case 'rfi':
      return d.prepare(`SELECT * FROM partners WHERE rfi_sent = 1 AND initial_receipt = 0 ORDER BY strategic_value DESC LIMIT 50`).all() as Partner[]
    case 'workshop_invite':
      return d.prepare(`SELECT * FROM partners WHERE response_received = 1 AND (workshop_attendance IS NULL OR workshop_attendance = '') ORDER BY strategic_value DESC LIMIT 50`).all() as Partner[]
    case 'request_rep':
      return d.prepare(`
        SELECT p.* FROM partners p
        WHERE p.response_received = 1 AND NOT EXISTS (
          SELECT 1 FROM contacts c WHERE c.partner_id = p.id AND c.is_representative = 1
        ) ORDER BY p.strategic_value DESC LIMIT 50
      `).all() as Partner[]
    case 'activation_kickoff':
      return d.prepare(`SELECT * FROM partners WHERE workshop_attendance LIKE '%حضور%' OR workshop_attendance LIKE '%تم%' ORDER BY strategic_value DESC LIMIT 50`).all() as Partner[]
    default:
      return []
  }
}
