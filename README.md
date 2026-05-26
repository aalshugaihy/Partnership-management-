# منصة إدارة الشراكات (Partnership Management Platform)

تطبيق ويب متكامل لإدارة الشراكات المؤسسية: متابعة، تفعيل، قياس أثر، توصيات ذكية، وتقارير مؤتمتة. واجهة عربية RTL بالكامل.

## المزايا

- **لوحة معلومات تنفيذية** مع رسوم بيانية تفاعلية
- **متابعة الشراكات** عبر 7 مراحل تفعيل (دعوة → RFI → استلام → رد → ورشة → تفعيل → إنجاز)
- **Pipeline كانبان** لتصور حالة المحفظة
- **مؤشرات الأثر (KPIs)** مع تتبع زمني عبر اللقطات (Snapshots)
- **محرك توصيات ذكي** يحلل التعثرات والفجوات
- **التواصل والقوالب**: 6 قوالب رسائل عربية تُخصَّص لكل شركة + تنزيل CSV
- **تقارير تنفيذية مؤتمتة** قابلة للتصدير (Excel + PDF)
- **استيراد Excel** من الواجهة لإضافة شراكات جماعية
- **مصادقة بكلمة مرور** وحماية كاملة للمسارات
- **نسخ احتياطية** قابلة للتنزيل بضغطة زر

## التشغيل المحلي

```bash
npm install
cp .env.example .env.local      # عدّل ADMIN_PASSWORD و SESSION_SECRET
npm run seed                     # تعبئة البيانات من data/seed.json
npm run dev                      # http://localhost:3000
```

كلمة المرور الافتراضية: `admin1234`.

## النشر للإنتاج

### الخيار ١: Docker (موصى به)

```bash
# بناء الصورة
docker build -t partnership-management .

# تشغيل مع تخزين دائم
docker run -d \
  -p 3000:3000 \
  -e ADMIN_PASSWORD="كلمة-مرور-قوية" \
  -e SESSION_SECRET="$(openssl rand -hex 32)" \
  -v partnership-data:/app/data \
  --name partnership-app \
  --restart unless-stopped \
  partnership-management
```

أو عبر `docker-compose`:

```bash
export ADMIN_PASSWORD="كلمة-مرور-قوية"
export SESSION_SECRET="$(openssl rand -hex 32)"
docker compose up -d
```

### الخيار ٢: VPS مباشر (Ubuntu/Debian)

```bash
# على الخادم
sudo apt update && sudo apt install -y nodejs npm
git clone <repo-url> && cd Partnership-management-
npm ci
npm run build
npm run seed

# متغيرات البيئة (في /etc/systemd/system/partnership.service مثلاً)
ADMIN_PASSWORD=... SESSION_SECRET=... npm start
```

ثم اضبط `nginx` كـ reverse proxy لـ `localhost:3000` مع SSL عبر Certbot.

### الخيار ٣: منصات السحابة

- **Render / Railway / Fly.io**: انشر مباشرة من Dockerfile مع volume للـ `/app/data`.
- **AWS / GCP / Azure**: ECS / Cloud Run / Container Apps + EFS / Filestore للبيانات.
- **Vercel**: غير موصى به لأن SQLite يحتاج FS قابل للكتابة. للنشر على Vercel، استبدل `better-sqlite3` بـ Postgres (مثل Neon/Supabase).

## متغيرات البيئة

| المتغير | الإلزام | الوصف |
|---|---|---|
| `ADMIN_PASSWORD` | نعم | كلمة المرور لتسجيل الدخول |
| `SESSION_SECRET` | نعم | سر التوقيع للكوكيز (≥32 حرف عشوائي) |
| `DISABLE_AUTH` | لا | `1` لتعطيل المصادقة (تطوير فقط) |
| `NODE_ENV` | لا | `production` للإنتاج |

## نقاط النهاية (API)

| المسار | الطريقة | الوظيفة |
|---|---|---|
| `/api/health` | GET | فحص صحة النظام (عام) |
| `/api/auth/login` | POST | تسجيل دخول |
| `/api/auth/logout` | POST | تسجيل خروج |
| `/api/partners` | POST | إنشاء شراكة |
| `/api/partners/[id]` | PATCH | تحديث حالة شراكة |
| `/api/partners/[id]/activities` | POST | تسجيل نشاط |
| `/api/opportunities` | POST/PATCH | إدارة الفرص |
| `/api/outreach` | POST | توليد CSV رسائل |
| `/api/import` | POST | استيراد Excel |
| `/api/export?type=partners\|licensed` | GET | تصدير Excel |
| `/api/reports` | GET | توليد تقرير HTML قابل للطباعة |
| `/api/snapshots` | GET/POST | لقطات الأثر الزمني |
| `/api/backup` | GET | تنزيل نسخة احتياطية من قاعدة البيانات |

## النسخ الاحتياطي

من صفحة "التقارير" → زر **نسخة احتياطية** يُنزّل الملف الكامل لـ SQLite. يُنصح بجدولة:

```bash
# كل ليلة 2:00 صباحاً
0 2 * * * curl -s -b "pm_session=..." https://app.example.com/api/backup -o /backups/partnership-$(date +\%F).db
```

أو ببساطة `rsync` لمجلد `data/` بشكل دوري.

## بنية الكود

```
app/                  # صفحات Next.js (App Router)
  api/                # نقاط النهاية REST
  partners/[id]/      # صفحة تفاصيل + نماذج
  ...
components/           # UI components (Sidebar, Charts, Forms)
lib/
  db.ts               # SQLite + هجرات
  queries.ts          # استعلامات + محرك التوصيات + تقارير
  outreach.ts         # قوالب الرسائل
  auth.ts             # المصادقة
middleware.ts         # حماية المسارات
scripts/seed.ts       # تعبئة قاعدة البيانات
data/seed.json        # البذور من ملف Excel الأصلي
Dockerfile            # بناء Docker
docker-compose.yml    # تشغيل سريع
```

## مصادر البيانات الأولية

تم استخراج **151 شراكة** و **70 جهة مرخصة** من ملف "القائمة المختصرة 1.03" المرفق.
ملف 1.01 محمي بكلمة مرور؛ يمكن استيراده لاحقاً بعد فك تشفيره عبر صفحة "استيراد البيانات".

## الترخيص

داخلي - لا يُعاد توزيعه دون إذن.
