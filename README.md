# نظام المحاسبة العربية - Arabic Accounting System

نظام محاسبة شامل مبني بـ Next.js 15 مع قاعدة بيانات Supabase، مصمم خصيصاً للشركات العربية.

## ✨ المميزات

- **نظام إدارة المخزون** - تتبع المنتجات والمواد الخام
- **نظام الفواتير** - إنشاء وإدارة الفواتير
- **نظام المشتريات** - إدارة المشتريات والموردين
- **نظام المبيعات** - تتبع المبيعات والعملاء
- **نظام إدارة الديون** - متابعة الديون المستحقة
- **تقارير الربح والخسارة** - تحليل الأداء المالي
- **واجهة عربية** - تصميم مخصص للغة العربية
- **نظام المصادقة** - تسجيل الدخول الآمن

## 🚀 النشر على Netlify

### 1. رفع المشروع على GitHub
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 2. ربط المشروع بـ Netlify
1. اذهب إلى [Netlify](https://netlify.com)
2. اضغط على "New site from Git"
3. اختر GitHub وحدد المستودع `arabic-accounting-system`
4. اضبط إعدادات البناء:
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`

### 3. إعداد المتغيرات البيئية
في لوحة تحكم Netlify، أضف المتغيرات التالية:

```env
NEXT_PUBLIC_SUPABASE_URL=https://iklhnsnglhdsdmvcwrzj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrbGhuc25nbGhkc2RtdmN3cnpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3ODEzMjUsImV4cCI6MjA3MDM1NzMyNX0.-9lzsxEil63-9GW6Dq42f8_Q-pgLY6hI_wOwGcXMbC4
```

### 4. إعداد قاعدة البيانات
1. اذهب إلى [Supabase](https://supabase.com)
2. أنشئ مشروع جديد
3. نفذ ملفات SQL الموجودة في مجلد `database/`
4. ابدأ بـ `complete_database_setup.sql`

## 🛠️ التطوير المحلي

### متطلبات النظام
- Node.js 20+
- npm أو yarn

### التثبيت
```bash
git clone https://github.com/YazanFAlagan/arabic-accounting-system.git
cd arabic-accounting-system
npm install
```

### إعداد المتغيرات البيئية
```bash
cp env.example .env.local
# عدّل القيم حسب إعدادات Supabase الخاصة بك
```

### تشغيل المشروع
```bash
npm run dev
```

## 📁 هيكل المشروع

```
src/
├── app/                    # صفحات التطبيق
│   ├── dashboard/         # لوحة التحكم
│   ├── inventory/         # إدارة المخزون
│   ├── invoices/          # نظام الفواتير
│   ├── purchases/         # نظام المشتريات
│   ├── sales/             # نظام المبيعات
│   └── reports/           # التقارير
├── components/            # المكونات القابلة لإعادة الاستخدام
├── contexts/              # سياق React
└── lib/                   # المكتبات والخدمات
```

## 🗄️ قاعدة البيانات

المشروع يستخدم Supabase مع الجداول التالية:
- `products` - المنتجات
- `raw_materials` - المواد الخام
- `invoices` - الفواتير
- `purchases` - المشتريات
- `sales` - المبيعات
- `users` - المستخدمين

## 🎨 التصميم

- **Tailwind CSS** للتصميم
- **Lucide React** للأيقونات
- **Recharts** للرسوم البيانية
- تصميم متجاوب يعمل على جميع الأجهزة

## 📱 الميزات المتقدمة

- **تصدير PDF** للفواتير والتقارير
- **تصدير Excel** للبيانات
- **نظام تنبيهات** للمخزون المنخفض
- **تقارير مفصلة** للأداء المالي
- **نظام صلاحيات** للمستخدمين

## 🔧 استكشاف الأخطاء

### مشاكل شائعة
1. **خطأ في الاتصال بقاعدة البيانات**: تأكد من صحة متغيرات Supabase
2. **مشاكل في البناء**: تأكد من استخدام Node.js 20+
3. **أخطاء TypeScript**: قم بتشغيل `npm run lint` للتحقق من الأخطاء

## 📞 الدعم

للمساعدة والدعم:
- أنشئ Issue على GitHub
- راجع ملفات التوثيق في مجلد `database/`

## 📄 الترخيص

هذا المشروع مفتوح المصدر ومتاح للاستخدام التجاري.

---

**تم التطوير بواسطة فريق المصنع** 🏭
