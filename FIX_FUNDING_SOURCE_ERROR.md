# إصلاح خطأ funding_source في نظام المواد الخام

## المشكلة
```
Could not find the 'funding_source' column in 'raw_material_purchases' in the schema cache
```

## السبب
الكود يحاول حفظ بيانات `funding_source` (مصدر التمويل) في جدول `raw_material_purchases` لكن هذا العمود غير موجود في قاعدة البيانات.

## الحل

### 1. تطبيق التحديث على Supabase
انسخ والصق الكود التالي في **SQL Editor** في Supabase:

```sql
-- Add funding_source column to raw_material_purchases table
ALTER TABLE raw_material_purchases 
ADD COLUMN IF NOT EXISTS funding_source VARCHAR(50) DEFAULT 'project' 
CHECK (funding_source IN ('project', 'personal'));

-- Update any existing records to have the default value
UPDATE raw_material_purchases 
SET funding_source = 'project' 
WHERE funding_source IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN raw_material_purchases.funding_source IS 'Source of funding: project (من أموال المشروع) or personal (من الأموال الشخصية)';
```

### 2. خطوات التطبيق

1. **افتح Supabase Dashboard**
   - اذهب إلى: https://supabase.com/dashboard
   - اختر مشروعك

2. **افتح SQL Editor**
   - من القائمة الجانبية، اختر "SQL Editor"
   - انقر على "New query"

3. **تطبيق الكود**
   - انسخ الكود أعلاه والصقه
   - انقر على "Run" لتنفيذ الاستعلام

4. **تأكد من النجاح**
   - يجب أن ترى رسالة "Success. No rows returned"
   - اذهب إلى "Table Editor" → "raw_material_purchases"
   - تأكد من وجود عمود `funding_source`

### 3. إعادة تشغيل الموقع
بعد تطبيق التحديث، أعد تشغيل الموقع:
```bash
npm run dev
```

## ما يفعله العمود الجديد
- **project**: الشراء من أموال المشروع (الافتراضي)
- **personal**: الشراء من الأموال الشخصية

هذا يساعد في تتبع مصدر تمويل مشتريات المواد الخام لأغراض المحاسبة.

## ملاحظة
تم تحديث ملف `database/raw_materials_schema.sql` ليتضمن العمود الجديد للمشاريع المستقبلية.
