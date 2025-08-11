# إصلاح شامل لأخطاء قاعدة البيانات

## المشاكل المكتشفة

### 1. خطأ funding_source
```
Could not find the 'funding_source' column in 'raw_material_purchases'
```

### 2. خطأ min_stock_alert
```
Could not find the 'min_stock_alert' column of 'purchases' in the schema cache
```

## الحل الشامل

### خطوات الإصلاح في Supabase

1. **افتح Supabase Dashboard**
   - اذهب إلى: https://supabase.com/dashboard
   - اختر مشروعك: `iklhnsnglhdsdmvcwrzj`

2. **افتح SQL Editor**
   - من القائمة الجانبية، اختر "SQL Editor"
   - انقر على "New query"

3. **انسخ والصق الكود التالي:**

```sql
-- إصلاح الأعمدة المفقودة في قاعدة البيانات
-- Fix Missing Columns in Database

-- 1. إضافة عمود funding_source إلى جدول raw_material_purchases
ALTER TABLE raw_material_purchases 
ADD COLUMN IF NOT EXISTS funding_source VARCHAR(20) DEFAULT 'project';

-- إضافة عمود updated_at إذا لم يكن موجود
ALTER TABLE raw_material_purchases 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- تحديث السجلات الموجودة
UPDATE raw_material_purchases 
SET funding_source = 'project' 
WHERE funding_source IS NULL;

UPDATE raw_material_purchases 
SET updated_at = NOW() 
WHERE updated_at IS NULL;

-- 2. إضافة عمود min_stock_alert إلى جدول purchases
ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS min_stock_alert INTEGER DEFAULT 10;

-- إضافة عمود unit إذا لم يكن موجود
ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'قطعة';

-- إضافة عمود type إذا لم يكن موجود
ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'product';

-- إضافة قيد للتحقق من نوع المشتريات
ALTER TABLE purchases 
ADD CONSTRAINT IF NOT EXISTS purchases_type_check 
CHECK (type IN ('product', 'expense', 'raw_material'));

-- تحديث السجلات الموجودة
UPDATE purchases 
SET min_stock_alert = 10 
WHERE min_stock_alert IS NULL;

UPDATE purchases 
SET unit = 'قطعة' 
WHERE unit IS NULL;

UPDATE purchases 
SET type = 'product' 
WHERE type IS NULL;

-- إضافة فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_raw_material_purchases_funding_source ON raw_material_purchases(funding_source);
CREATE INDEX IF NOT EXISTS idx_purchases_type ON purchases(type);
CREATE INDEX IF NOT EXISTS idx_purchases_min_stock_alert ON purchases(min_stock_alert);
```

4. **تنفيذ الكود**
   - انقر على "Run" لتنفيذ جميع الاستعلامات
   - يجب أن ترى رسالة "Success" لكل استعلام

5. **التحقق من النجاح**
   - اذهب إلى "Table Editor"
   - تحقق من جدول `raw_material_purchases` - يجب أن يحتوي على عمود `funding_source`
   - تحقق من جدول `purchases` - يجب أن يحتوي على عمود `min_stock_alert`

## النتيجة المتوقعة

بعد تطبيق هذا الإصلاح:

### ✅ جدول raw_material_purchases
- `funding_source`: لتتبع مصدر التمويل (project/personal)
- `updated_at`: لتتبع آخر تحديث

### ✅ جدول purchases  
- `min_stock_alert`: الحد الأدنى للتنبيه
- `unit`: وحدة القياس
- `type`: نوع المشتريات (product/expense/raw_material)

### ✅ الميزات المُفعلة
- ✅ صفحة المواد الخام تعمل بدون أخطاء
- ✅ تسجيل مشتريات المواد الخام مع مصدر التمويل
- ✅ صفحة المشتريات تعمل بدون أخطاء
- ✅ تتبع المخزون والتنبيهات
- ✅ تصنيف المشتريات حسب النوع

## إعادة تشغيل الموقع

بعد تطبيق التحديث في Supabase:
```bash
# توقف الخادم الحالي (Ctrl+C)
# ثم أعد تشغيله
npm run dev
```

## ملاحظات مهمة

- ✅ جميع التحديثات آمنة ولن تؤثر على البيانات الموجودة
- ✅ القيم الافتراضية ستُطبق على السجلات الموجودة
- ✅ الفهارس ستحسن أداء الاستعلامات
- ✅ القيود ستضمن سلامة البيانات

**بعد تطبيق هذا الإصلاح، نظام المحاسبة العربي سيعمل بشكل كامل! 🚀**
