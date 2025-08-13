# إصلاح نظام الفواتير - Invoice System Fix

## المشكلة
يحدث خطأ عند محاولة حفظ الفاتورة: `Error saving invoice: {}`
أو خطأ عند توليد رقم الفاتورة: `Error generating invoice number: {}`

## السبب
1. جداول نظام الفواتير غير موجودة في قاعدة البيانات
2. دالة `generate_invoice_number()` لا تعمل بشكل صحيح
3. الملفات موجودة ولكن لم يتم تنفيذها

## الحل السريع (الأفضل)

قم بتنفيذ ملف واحد شامل في Supabase SQL Editor:

**`database/complete_invoice_fix.sql`**

هذا الملف يحل جميع المشاكل دفعة واحدة.

## الحل التفصيلي (إذا كنت تفضل الخطوات المنفصلة)

### الخطوة 1: إعداد قاعدة البيانات

قم بتنفيذ الملفات التالية في Supabase SQL Editor بالترتيب:

#### 1. إعداد جدول المنتجات (إذا لم يتم من قبل)
```sql
-- تنفيذ محتوى ملف: database/update_products_schema.sql
```

#### 2. إعداد نظام الفواتير
```sql
-- تنفيذ محتوى ملف: database/setup_invoice_system.sql
```

#### 3. إصلاح دالة توليد رقم الفاتورة
```sql
-- تنفيذ محتوى ملف: database/fix_invoice_number_function.sql
```

### الخطوة 2: التحقق من الإعداد

بعد تنفيذ الملفات، تأكد من وجود الجداول التالية:

```sql
-- التحقق من وجود الجداول
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('invoices', 'invoice_items', 'products');

-- التحقق من وجود الدوال
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('generate_invoice_number', 'calculate_invoice_totals');

-- اختبار دالة توليد رقم الفاتورة
SELECT generate_invoice_number() as test_number;
```

### الخطوة 3: اختبار النظام

1. انتقل إلى صفحة الفواتير
2. حاول إنشاء فاتورة جديدة
3. تحقق من وحدة التحكم (Console) للحصول على رسائل التصحيح

## الملفات المطلوبة

### 1. `database/complete_invoice_fix.sql` (الحل الشامل)
- إصلاح جميع المشاكل دفعة واحدة
- إنشاء جميع الجداول والدوال والمحفزات
- إصلاح دالة توليد رقم الفاتورة
- إعداد الأمان والصلاحيات

### 2. `database/setup_invoice_system.sql`
- إنشاء جدول `invoices`
- إنشاء جدول `invoice_items`
- إنشاء الدوال المطلوبة
- إعداد RLS (Row Level Security)
- إنشاء المحفزات (Triggers)

### 3. `database/update_products_schema.sql`
- إضافة أعمدة الأسعار المتعددة
- تحديث جدول المنتجات

### 4. `database/fix_invoice_number_function.sql`
- إصلاح دالة توليد رقم الفاتورة
- معالجة الحالات الاستثنائية

## هيكل الجداول

### جدول الفواتير (invoices)
```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  invoice_date DATE NOT NULL,
  sale_type VARCHAR(20) DEFAULT 'retail',
  subtotal DECIMAL(10,2) DEFAULT 0,
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### جدول عناصر الفواتير (invoice_items)
```sql
CREATE TABLE invoice_items (
  id UUID PRIMARY KEY,
  invoice_id UUID REFERENCES invoices(id),
  product_id UUID,
  product_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  item_discount_percentage DECIMAL(5,2) DEFAULT 0,
  item_discount_amount DECIMAL(10,2) DEFAULT 0,
  final_unit_price DECIMAL(10,2) NOT NULL,
  line_total DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## الدوال المطلوبة

### 1. `generate_invoice_number()`
توليد رقم فاتورة تلقائي بالصيغة: `INV-YYYYMM-XXXX`
- يتعامل مع الحالات الاستثنائية
- يتحقق من وجود الجدول قبل الاستخدام

### 2. `calculate_invoice_totals(invoice_id)`
حساب إجماليات الفاتورة تلقائياً

## المحفزات (Triggers)

### 1. `trigger_update_invoice_totals`
تحديث إجماليات الفاتورة عند تغيير العناصر

### 2. `trigger_update_stock_on_invoice_change`
تحديث المخزون عند إنشاء/تعديل/حذف الفواتير

## الأخطاء المحتملة وحلولها

### خطأ: "relation 'invoices' does not exist"
**الحل:** تنفيذ ملف `complete_invoice_fix.sql`

### خطأ: "function generate_invoice_number() does not exist"
**الحل:** تنفيذ ملف `complete_invoice_fix.sql`

### خطأ: "Error generating invoice number: {}"
**الحل:** تنفيذ ملف `complete_invoice_fix.sql` أو `fix_invoice_number_function.sql`

### خطأ: "column 'retail_price' does not exist"
**الحل:** تنفيذ ملف `complete_invoice_fix.sql`

### خطأ: "permission denied"
**الحل:** التأكد من إعداد RLS بشكل صحيح

## اختبار النظام

بعد الإعداد، جرب:

1. إنشاء فاتورة جديدة
2. إضافة منتجات للفاتورة
3. تطبيق خصومات
4. حفظ الفاتورة
5. التحقق من تحديث المخزون

## ملاحظات مهمة

- **الحل الأفضل:** استخدم `complete_invoice_fix.sql` لحل جميع المشاكل دفعة واحدة
- تأكد من وجود منتجات في جدول `products` قبل إنشاء الفواتير
- تأكد من تسجيل الدخول كي تعمل RLS بشكل صحيح
- تحقق من وحدة التحكم للحصول على رسائل التصحيح المفصلة

## الدعم

إذا استمرت المشكلة، تحقق من:
1. رسائل الخطأ في وحدة التحكم
2. سجلات Supabase
3. إعدادات RLS
4. صلاحيات المستخدم
5. تنفيذ ملف `verify_invoice_system.sql` للتحقق من الإعداد
