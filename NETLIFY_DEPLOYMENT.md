# 🚀 دليل النشر السريع على Netlify

## 📋 المتطلبات المسبقة

✅ **تم رفع المشروع على GitHub**  
✅ **ملف `netlify.toml` موجود**  
✅ **ملف `package.json` يحتوي على جميع التبعيات**  
✅ **ملف `.gitignore` مُعد بشكل صحيح**

## 🎯 الخطوات السريعة

### 1. إنشاء حساب Netlify
- اذهب إلى [netlify.com](https://netlify.com)
- اضغط "Sign up" وأنشئ حساب جديد
- يمكنك التسجيل بـ GitHub مباشرة

### 2. ربط المشروع
1. في لوحة تحكم Netlify، اضغط **"New site from Git"**
2. اختر **GitHub** كمصدر
3. ابحث عن المستودع: `arabic-accounting-system`
4. اضغط **"Connect"**

### 3. إعدادات البناء
```bash
Build command: npm run build
Publish directory: .next
```

### 4. إعداد المتغيرات البيئية
في قسم **"Environment variables"**، أضف:

| المفتاح | القيمة |
|---------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://iklhnsnglhdsdmvcwrzj.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrbGhuc25nbGhkc2RtdmN3cnpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3ODEzMjUsImV4cCI6MjA3MDM1NzMyNX0.-9lzsxEil63-9GW6Dq42f8_Q-pgLY6hI_wOwGcXMbC4` |

### 5. نشر الموقع
- اضغط **"Deploy site"**
- انتظر حتى يكتمل البناء (عادةً 2-5 دقائق)
- ستظهر رسالة "Site is live" عند اكتمال النشر

## 🔧 إعدادات متقدمة

### إعدادات البناء
```toml
[build]
  command = "npm run build"
  publish = ".next"
  functions = ".next/functions"

[build.environment]
  NODE_VERSION = "20"
  NEXT_TELEMETRY_DISABLED = "1"
  NODE_OPTIONS = "--max_old_space_size=4096"
```

### إعادة التوجيه
```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

## 🗄️ إعداد قاعدة البيانات

### 1. إنشاء مشروع Supabase
- اذهب إلى [supabase.com](https://supabase.com)
- أنشئ مشروع جديد
- احفظ URL و API Key

### 2. تنفيذ ملفات SQL
```sql
-- ابدأ بهذا الملف أولاً
database/complete_database_setup.sql

-- ثم نفذ باقي الملفات حسب الحاجة
database/invoice_system_schema.sql
database/raw_materials_schema.sql
```

### 3. تحديث المتغيرات البيئية
إذا كنت تستخدم Supabase مختلف، عدّل المتغيرات في Netlify.

## 🚨 استكشاف الأخطاء

### خطأ في البناء
```
Error: Command failed: npm run build
```
**الحل:**
- تأكد من استخدام Node.js 20+
- تحقق من صحة `package.json`
- راجع سجلات البناء في Netlify

### خطأ في الاتصال بقاعدة البيانات
```
Error: Invalid API key
```
**الحل:**
- تحقق من صحة `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- تأكد من تفعيل RLS في Supabase
- راجع إعدادات السياسات

### خطأ في الصفحات
```
Error: Page not found
```
**الحل:**
- تأكد من وجود `[[redirects]]` في `netlify.toml`
- تحقق من إعدادات Next.js
- راجع مسارات الصفحات

## 📱 اختبار الموقع

### 1. اختبار الوظائف الأساسية
- ✅ تسجيل الدخول
- ✅ لوحة التحكم
- ✅ إدارة المخزون
- ✅ نظام الفواتير

### 2. اختبار التجاوب
- 📱 الهاتف المحمول
- 💻 الكمبيوتر
- 📱 الجهاز اللوحي

### 3. اختبار الأداء
- سرعة التحميل
- استجابة الواجهة
- عمل قاعدة البيانات

## 🔄 التحديثات المستقبلية

### تحديث تلقائي
- كل مرة ترفع تغييرات على GitHub
- Netlify سيقوم بالنشر تلقائياً
- لا حاجة لإعدادات إضافية

### النشر اليدوي
- في Netlify، اضغط **"Trigger deploy"**
- اختر **"Deploy latest commit"**

## 📞 الدعم

### موارد مفيدة
- [Netlify Docs](https://docs.netlify.com)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Supabase Docs](https://supabase.com/docs)

### الحصول على المساعدة
- أنشئ Issue على GitHub
- راجع ملفات التوثيق
- تحقق من سجلات Netlify

---

**🎉 تهانينا! موقعك الآن يعمل على Netlify** 🎉

**رابط الموقع:** `https://your-site-name.netlify.app`
