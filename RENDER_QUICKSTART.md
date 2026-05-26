# 🚀 نشر سريع على Render - دقيقتان

## الخطوة ١: دمج PR إلى main

اذهب إلى: **https://github.com/aalshugaihy/Partnership-management-/pull/1**

اضغط:
1. **Ready for review** (إن كان draft)
2. **Merge pull request** → **Confirm merge**

> ✅ الكود الآن على فرع `main`.

## الخطوة ٢: إنشاء كلمة مرور المدير

افتح Terminal على جهازك وشغّل:
```bash
openssl rand -base64 16
```

ستحصل على شيء مثل: `Z9k$mP2vNqR1xY4z`

**انسخ هذه القيمة** — ستحتاجها لاحقًا.

## الخطوة ٣: النشر على Render

### الطريقة (أ): زر واحد (الأسهل)

اضغط هذا الزر — يقوم بكل شيء تلقائيًا:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/aalshugaihy/Partnership-management-)

أو افتح مباشرة:
```
https://render.com/deploy?repo=https://github.com/aalshugaihy/Partnership-management-
```

سيطلب منك Render:
1. تسجيل دخول (عبر GitHub مجاناً)
2. مراجعة `render.yaml` (يعرض لك ما سيُنشأ)
3. إدخال `ADMIN_PASSWORD` ← الصق القيمة من الخطوة ٢
4. اضغط **Apply**

### الطريقة (ب): يدويًا من Dashboard

١. https://dashboard.render.com → **New +** → **Blueprint**
٢. اختر مستودع `aalshugaihy/Partnership-management-`
٣. Render يقرأ `render.yaml` تلقائياً → يعرض:
   - خدمة Web واحدة (Docker)
   - قرص دائم 1GB على `/app/data`
   - متغير `ADMIN_PASSWORD` يطلب القيمة منك
   - متغير `SESSION_SECRET` يولّده تلقائياً
٤. الصق كلمة المرور في `ADMIN_PASSWORD`
٥. **Apply**

## الخطوة ٤: انتظر البناء (3-5 دقائق)

ستشاهد السجلات الحية:
```
==> Cloning from https://github.com/aalshugaihy/Partnership-management-
==> Building Docker image...
[deps]    npm ci... 1245 packages installed
[builder] next build... ✓ Compiled successfully (17 pages)
[runner]  Image: 234MB
==> Deploying...
==> Container started
⇒ Seeding initial database...
Seeded: 151 partners, 181 contacts, 70 licensed companies, 1 user(s)
Default login: admin@local / <your-password>
▲ Next.js 14.2.15 - Local: http://0.0.0.0:3000
✓ Ready in 320ms
==> Your service is live 🎉
```

## الخطوة ٥: افتح المنصة

Render يعطيك رابطاً مثل:
```
https://partnership-management-xxxx.onrender.com
```

سجّل دخول:
- البريد: `admin@local`
- كلمة المرور: التي وضعتها في الخطوة ٢

## الخطوة ٦: تحقق فوري

من جهازك، شغّل سكربت التحقق:
```bash
git clone https://github.com/aalshugaihy/Partnership-management-
cd Partnership-management-
./scripts/verify-deployment.sh https://your-app.onrender.com admin@local YOUR_PASSWORD
```

ستحصل على تقرير ملوّن يؤكد كل شيء يعمل.

---

## ما بعد النشر — مهام إدارية مهمّة

### أضف فريقك (5 دقائق)
١. ادخل المنصة → **المستخدمون** (يظهر للأدمن فقط)
٢. **+ مستخدم جديد** لكل عضو:
   - **مدير شراكات (manager)**: لمن يحدّث البيانات
   - **مُطّلع (viewer)**: للقراءة فقط (مديري الإدارات)
   - **ممثل شريك (rep)**: لشخص من شركة شريكة — يصل لبوابة شركته فقط

### نسخ احتياطية دورية (موصى به)
أنشئ cron خارجي ينزّل ملف DB أسبوعياً:
```bash
# على أي خادم بسيط (مثلاً جهازك أو خادم نسخ)
0 2 * * 0 curl -s -b "pm_session=<cookie>" \
  https://your-app.onrender.com/api/backup \
  -o /backups/pm-$(date +\%F).db
```

أو ببساطة افتح **التقارير** → **نسخة احتياطية** أسبوعياً.

### مراقبة الأثر الزمني
أسبوعياً افتح **مؤشرات الأثر** → **تسجيل لقطة الآن**. بعد 3-4 لقطات سترى رسوم اتجاه مفيدة.

### تفعيل إرسال البريد الفعلي (اختياري)
إذا أردت إرسال قوالب التواصل فعلياً بدل تنزيل CSV:

١. **Render Dashboard** → خدمتك → **Environment** → أضف:
```
SMTP_HOST     = smtp.gmail.com         (أو smtp.office365.com)
SMTP_PORT     = 587
SMTP_USER     = your-email@gmail.com
SMTP_PASS     = <App Password — ليس كلمة مرور حسابك العادية>
SMTP_FROM     = "منصة الشراكات <your-email@gmail.com>"
```

> **Gmail**: فعّل التحقق بخطوتين ثم أنشئ App Password من https://myaccount.google.com/apppasswords
>
> **Office 365**: استخدم بريد العمل + App Password من https://account.activedirectory.windowsazure.com/AppPasswords.aspx

٢. **Manual Deploy** → **Deploy latest commit**

٣. في صفحة "التواصل والقوالب" سيظهر زر **إرسال البريد فعلياً**.

### نطاق مخصص (اختياري)
١. **Render Dashboard** → خدمتك → **Settings** → **Custom Domains**
٢. أدخل: `partnerships.yourcompany.com`
٣. اتبع تعليمات DNS (سجل CNAME)
٤. SSL يُفعّل تلقائياً خلال 5-10 دقائق

---

## استكشاف الأخطاء

| المشكلة | السبب الأرجح | الحل |
|---|---|---|
| Build failed at `npm ci` | مشكلة شبكة عابرة | اضغط **Manual Deploy → Deploy latest commit** |
| `/api/health` يرجع 500 | DB لم تنشأ | اذهب لـ **Shell** في Render واكتب `npm run seed` |
| `Cannot find module 'better-sqlite3'` | Docker build أُلغي قبل بناء native | امسح الـ build cache وأعد النشر |
| البيانات تختفي بعد redeploy | Volume غير مربوط | تأكد أن `disk` في `render.yaml` يشير لـ `/app/data` |
| 401 على كل API | `SESSION_SECRET` تغيّر | امسح كوكيز المتصفح وسجّل دخول من جديد |
| Login يرفض كل المحاولات | `ADMIN_PASSWORD` غير مضبوط | تحقق Environment Variables وأعد النشر |
| `429 Too Many Requests` | 5 محاولات فاشلة | انتظر 10 دقائق أو اشطب جدول `login_attempts` من Shell |

---

## التكلفة المتوقعة

- **Starter Plan**: $7/شهر (ذاكرة 512MB، أداء كافٍ لـ 50 مستخدم متزامن)
- **القرص**: $0.25/GB/شهر (1GB = $0.25)
- **الإجمالي**: ~$7.25/شهر

> Render يعرض **Free tier** للتجربة لكن يُطفئ الخدمة بعد 15 دقيقة خمول. مناسب للاختبار فقط.

---

## التحقق من جاهزية المنصة (قبل الإنتاج الفعلي)

✅ كلمة مرور قوية في `ADMIN_PASSWORD` (لا تستخدم `admin1234`)
✅ `SESSION_SECRET` مولّد آلياً من Render (لا تشاركه)
✅ نطاق مخصص مع SSL (اختياري لكن موصى به)
✅ نسخة احتياطية أسبوعية مجدولة
✅ سجل التدقيق يُراجع شهرياً (`/audit`)
✅ المستخدمون لهم أدوار محدودة (تجنّب جعل الجميع admin)
✅ SMTP مكوّن (إذا تستخدم القوالب)
✅ شغّل `./scripts/verify-deployment.sh` بعد كل نشر
