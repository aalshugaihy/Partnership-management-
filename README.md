# منصة إدارة الشراكات (Partnership Management Platform)

تطبيق ويب متكامل لإدارة الشراكات المؤسسية: متابعة، تفعيل، قياس أثر، توصيات ذكية، وتقارير مؤتمتة. واجهة عربية RTL بالكامل، مستقلة عن أي خدمة خارجية.

## المزايا

| المجال | المزايا |
|---|---|
| **لوحات معلومات** | لوحة تنفيذية بمؤشرات شاملة + رسوم بيانية تفاعلية + خريطة جيومكانية |
| **إدارة الشراكات** | متابعة 7 مراحل تفعيل + Pipeline كانبان + بحث متعدد المعايير |
| **الفرص الاستثمارية** | 6 مراحل بيع، CRUD كامل، حساب القيمة المرجّحة |
| **التواصل** | 6 قوالب رسائل عربية + جمهور مستهدف ديناميكي + تنزيل CSV |
| **التقارير** | تقارير تنفيذية مؤتمتة + تصدير Excel + PDF |
| **التوصيات** | محرك توصيات يحلل التعثرات والفجوات والفرص بأولويات |
| **التتبع الزمني** | لقطات (Snapshots) لمؤشرات الأداء + رسم اتجاه |
| **المرفقات** | رفع/تنزيل ملفات لكل شراكة (≤5MB) |
| **المستخدمون** | 4 أدوار (admin/manager/viewer/rep) + حماية ضد القوة الغاشمة |
| **التدقيق** | سجل لكل إجراء حساس مع المستخدم والتاريخ |
| **النسخ الاحتياطي** | تنزيل قاعدة البيانات بضغطة زر |
| **الاستيراد** | رفع ملفات Excel من الواجهة |

## التشغيل المحلي

```bash
npm install
cp .env.example .env.local      # عدّل ADMIN_PASSWORD و SESSION_SECRET
npm run seed                     # تعبئة البيانات
npm run dev                      # http://localhost:3000
```

دخول افتراضي: `admin@local` / `admin1234`.

## النشر للإنتاج

راجع [DEPLOYMENT.md](./DEPLOYMENT.md) للتعليمات التفصيلية على **Render**، **Railway**، أو **Fly.io**.

ملف `render.yaml` جاهز للنشر بضغطة Blueprint واحدة على Render.

## بنية الكود

```
app/                       # صفحات Next.js (App Router) - كلها RTL
  api/                     # نقاط النهاية REST
    auth/{login,logout,me} # المصادقة
    partners/[id]/         # تحديث + نشاطات + مرفقات
    opportunities          # CRUD فرص
    users                  # إدارة مستخدمين (admin)
    snapshots, backup,
    export, reports,
    search, import         # خدمات الأعمال
  partners, pipeline, opportunities, workshops, map,
  kpi, outreach, recommendations, reports, import,
  licensed, users, audit, login                # الصفحات
components/                # Sidebar, Charts, AppShell, Forms
lib/
  db.ts                    # SQLite schema + migrations + helpers
  auth.ts                  # Sessions, roles, login, audit
  queries.ts               # Business logic + reports + recs
  outreach.ts              # 6 قوالب رسائل
scripts/seed.ts            # تعبئة DB من seed.json
data/seed.json             # 151 شراكة + 70 جهة مرخصة
.github/workflows/ci.yml   # اختبار شامل آلي على GitHub
Dockerfile                 # متعدد مراحل، مستخدم غير-root، healthcheck
render.yaml                # Blueprint لـ Render
fly.toml, railway.json     # تكوينات Fly/Railway
```

## الأدوار (Roles)

| الدور | الصلاحيات |
|---|---|
| `admin` | كل شيء + إدارة المستخدمين + سجل التدقيق |
| `manager` | تعديل الشراكات، الفرص، إنشاء أنشطة، رفع مرفقات |
| `viewer` | قراءة فقط لكل البيانات |
| `rep` | (تحت التطوير) بوابة ممثل الشركة - عرض شراكته فقط |

## متغيرات البيئة

| المتغير | افتراضي | الوصف |
|---|---|---|
| `ADMIN_EMAIL` | `admin@local` | بريد المدير الافتراضي |
| `ADMIN_PASSWORD` | `admin1234` | كلمة مرور المدير (غيّرها!) |
| `SESSION_SECRET` | (مولّد) | سر توقيع الكوكيز (≥16 حرف) |
| `DB_PATH` | `data/app.db` | مسار قاعدة البيانات |
| `DISABLE_AUTH` | — | `1` لتعطيل المصادقة (تطوير فقط) |
| `PORT` | `3000` | منفذ الاستماع |

## مصادر البيانات

تم استخراج **151 شراكة** و **70 جهة مرخصة** من ملف "القائمة المختصرة 1.03". ملف 1.01 محمي بكلمة مرور - يمكن استيراده لاحقاً عبر صفحة "استيراد البيانات".

## CI/CD

كل دفع إلى الفرع يُشغّل GitHub Action يبني التطبيق ويختبر جميع المسارات.
