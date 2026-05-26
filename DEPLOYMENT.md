# دليل النشر خطوة بخطوة

ثلاث منصات سحابية مدعومة، اختر واحدة وابدأ في أقل من ١٠ دقائق.

---

## بنية المنصة (بعد التطوير الكامل)

**17 صفحة، 25+ API endpoint، 13 جدول DB، 4 أدوار مستخدمين**

| المجموعة | الصفحات |
|---|---|
| **التشغيل** | لوحة معلومات، المهام والإشعارات، الشراكات، Pipeline، الفرص، الورش |
| **التحليل** | الخريطة الجيومكانية، KPIs، التوصيات الذكية، التقارير |
| **التواصل** | قوالب الرسائل + إرسال SMTP اختياري |
| **البيانات** | استيراد Excel، النسخ الاحتياطي، الجهات المرخصة |
| **الإدارة** | المستخدمون والأدوار، سجل التدقيق، بوابة الشريك |

**الأدوار:** `admin` (كل شيء) · `manager` (تعديل البيانات) · `viewer` (قراءة) · `rep` (بوابة شريكه فقط)

---

## الإعداد المشترك (قبل أي منصة)

١. **ادفع المستودع لـ GitHub** (إن لم يكن بالفعل):
   - PR الحالي: `https://github.com/aalshugaihy/Partnership-management-/pull/1`
   - بعد قبول الـ PR، الكود سيكون على `main`.

٢. **أعدّ كلمتي المرور:**
   ```bash
   # كلمة مرور قوية للدخول
   openssl rand -base64 16

   # سر التوقيع للكوكيز
   openssl rand -hex 32
   ```
   احتفظ بهما — ستحتاجهما في خطوات التهيئة.

---

## الخيار ١: Render (الأبسط)

موصى به للبداية — لوحة تحكم بصرية، ينشر تلقائياً من GitHub.

### الخطوات

١. **إنشاء حساب**: https://render.com (مجاناً)

٢. **اربط GitHub**: اذهب إلى Account Settings → Connect GitHub → فعّل صلاحية الوصول للمستودع.

٣. **انشر تلقائياً عبر Blueprint** (الأسهل):
   - من Dashboard → **New +** → **Blueprint**
   - اختر مستودع `Partnership-management-`
   - Render سيكتشف ملف `render.yaml` ويُكوّن الخدمة + القرص الدائم تلقائياً
   - في خانة `ADMIN_PASSWORD` ضع كلمة المرور التي ولّدتها
   - اضغط **Apply**

٤. **انتظر البناء** (3-5 دقائق): سترى السجلات مباشرة. عند `==> Your service is live` التطبيق جاهز.

٥. **الوصول**: Render يعطيك رابطاً مثل `https://partnership-management-xxxx.onrender.com`. سجّل دخول بـ `ADMIN_PASSWORD`.

### النطاق المخصص (اختياري)

- في صفحة الخدمة → **Settings** → **Custom Domains** → أضف `partnerships.example.com`
- اتبع تعليمات DNS (CNAME)
- SSL يُفعّل تلقائياً

### تفعيل إرسال البريد الفعلي (SMTP — اختياري)

افتراضياً وحدة "التواصل" تُولّد CSV فقط. لتفعيل الإرسال الفعلي:

١. في خدمتك على Render → **Environment** → أضف:
   - `SMTP_HOST` = (مثلاً) `smtp.gmail.com` أو `smtp.office365.com`
   - `SMTP_PORT` = `587`
   - `SMTP_USER` = بريدك
   - `SMTP_PASS` = كلمة مرور التطبيق (App Password لجوجل/مايكروسوفت)
   - `SMTP_FROM` = `"منصة الشراكات <noreply@yourdomain.com>"`

٢. أعد نشر الخدمة → في صفحة "التواصل" سيظهر زر **إرسال البريد فعليًا**.

> Gmail: فعّل التحقق بخطوتين ثم أنشئ App Password من https://myaccount.google.com/apppasswords

---

## الخيار ٢: Railway (أسرع نشر)

نشر بضغطة زر، أسعار حسب الاستهلاك.

### الخطوات

١. **إنشاء حساب**: https://railway.app (تسجيل عبر GitHub)

٢. **مشروع جديد**:
   - من Dashboard → **New Project** → **Deploy from GitHub repo**
   - اختر `Partnership-management-`

٣. **أضف Volume للبيانات** (مهم — افتراضياً Railway لا يحفظ):
   - من Service → **Settings** → **Volumes** → **+ New Volume**
   - Mount path: `/app/data`
   - Size: 1GB (يكفي بكثير)

٤. **أضف متغيرات البيئة**:
   - من Service → **Variables** → أضف:
     - `ADMIN_PASSWORD` = كلمة المرور التي ولّدتها
     - `SESSION_SECRET` = السر العشوائي (32 حرف)
     - `NODE_ENV` = `production`

٥. **انشر**: اضغط **Deploy**. Railway يكتشف `railway.json` و `Dockerfile` ويبني تلقائياً.

٦. **اعرض رابط النشر**:
   - من Service → **Settings** → **Networking** → **Generate Domain**
   - ستحصل على `https://partnership-management-production.up.railway.app`

### نطاق مخصص

- من Networking → **Custom Domain** → أدخل النطاق واتبع تعليمات CNAME.

---

## الخيار ٣: Fly.io (الأقوى أداءً وأرخص)

أداء عالٍ، نشر عبر CLI، رصيد مجاني سخي.

### التثبيت (مرة واحدة)

```bash
# macOS / Linux
curl -L https://fly.io/install.sh | sh

# Windows
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"

# سجل دخول
fly auth signup     # حساب جديد
fly auth login      # حساب موجود
```

### النشر

من جذر المشروع:

```bash
# ١. إنشاء التطبيق (مرة واحدة فقط)
fly launch --copy-config --no-deploy
# قد يسأل عن إعادة استخدام fly.toml الموجود → Yes
# اختر منطقة قريبة (fra = فرانكفورت، صدقاً قريبة للسعودية)

# ٢. إنشاء Volume للبيانات (مرة واحدة فقط)
fly volumes create app_data --size 1 --region fra

# ٣. ضبط الأسرار (مرة واحدة فقط)
fly secrets set \
  ADMIN_PASSWORD="كلمة-المرور-القوية" \
  SESSION_SECRET="$(openssl rand -hex 32)"

# ٤. النشر (في كل تحديث)
fly deploy
```

### الوصول

```bash
# افتح في المتصفح
fly open

# اعرض السجلات الحية
fly logs

# ادخل للحاوية
fly ssh console
```

### نطاق مخصص

```bash
fly certs create partnerships.example.com
# اتبع تعليمات DNS (A أو AAAA + CNAME للتحقق)
```

---

## تحديث التطبيق بعد النشر

كل المنصات الثلاث تتكامل مع Git:

- **Render / Railway**: ادفع تغيير لفرع `main` → نشر تلقائي.
- **Fly.io**: ادفع للـ Git ثم `fly deploy` يدوياً.

---

## النسخ الاحتياطي (مهم)

من داخل التطبيق:
- **التقارير** → زر **نسخة احتياطية** → يُنزّل ملف `partnership-backup-*.db`

أو عبر API:
```bash
curl -b "pm_session=..." https://your-app/api/backup -o backup-$(date +%F).db
```

أو دورياً عبر cron (من خادم خارجي):
```cron
0 2 * * * curl -s -b "pm_session=..." https://your-app/api/backup -o /backups/pm-$(date +\%F).db
```

### استرجاع نسخة احتياطية

١. أوقف التطبيق
٢. انسخ ملف `.db` المُحمَّل إلى `data/app.db` داخل القرص الدائم
٣. أعد التشغيل

على Fly: `fly ssh sftp shell` ثم `put backup.db /app/data/app.db`
على Railway/Render: عبر لوحة التحكم → File Browser على الـ Volume.

---

## استكشاف الأخطاء

| المشكلة | الحل |
|---|---|
| التطبيق يعيد 500 عند البداية | تحقق من تعيين `ADMIN_PASSWORD` و `SESSION_SECRET` في متغيرات البيئة |
| البيانات تختفي بعد إعادة النشر | تأكد من ربط Volume على المسار `/app/data` |
| الصفحة بالإنجليزية | الـ HTML تُرسل `lang="ar" dir="rtl"` — تحقق من إعدادات المتصفح |
| Health endpoint يعيد 500 | شغّل `npm run seed` يدويًا داخل الحاوية |
| الورش الزمنية فارغة | اضغط "تسجيل لقطة الآن" في صفحة KPI — يجب تكرارها أسبوعياً |

---

## التكاليف التقديرية (شهرياً)

| المنصة | الخطة | الذاكرة | التخزين | التكلفة |
|---|---|---|---|---|
| Render | Starter | 512MB | 1GB | $7 |
| Railway | Hobby | 512MB | 1GB | ~$5 (حسب الاستخدام) |
| Fly.io | shared-cpu-1x | 512MB | 1GB | $0 (ضمن الرصيد المجاني) - $2 |

كل الخطط تكفي بكفاءة لـ 5,000 شراكة + 50,000 نشاط.
