# 🚀 إعداد سريع لنظام المواد الخام

## ❗ خطأ قاعدة البيانات
```
Error: Could not find table 'public.raw_material_usage' in Supabase
Error: Could not find 'description' column of 'raw_materials'
```

## 🔧 الحل السريع

### الخطوة 1: افتح Supabase
1. اذهب إلى [supabase.com](https://supabase.com)
2. افتح مشروعك: `https://iklhnsnglhdsdmvcwrzj.supabase.co`
3. اضغط على **SQL Editor** في الشريط الجانبي

### الخطوة 2: تطبيق السكيما
1. انسخ محتويات ملف `database/create_raw_materials_tables.sql`
2. الصق في SQL Editor
3. اضغط **Run** أو **Ctrl+Enter**

### الخطوة 3: التحقق من النجاح
بعد تشغيل السكريبت، يجب أن ترى:
- ✅ `raw_materials` table created
- ✅ `raw_material_purchases` table created  
- ✅ `raw_material_usage` table created
- ✅ RLS policies created

## 📋 السكريبت المطلوب

```sql
-- انسخ هذا والصقه في Supabase SQL Editor
CREATE TABLE IF NOT EXISTS raw_materials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    current_stock DECIMAL(10,3) DEFAULT 0,
    min_stock_alert DECIMAL(10,3) DEFAULT 0,
    unit_cost DECIMAL(10,2) DEFAULT 0,
    supplier_name VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL
);

CREATE TABLE IF NOT EXISTS raw_material_purchases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    raw_material_id UUID REFERENCES raw_materials(id) ON DELETE CASCADE NOT NULL,
    raw_material_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10,3) NOT NULL,
    unit_cost DECIMAL(10,2) NOT NULL,
    total_cost DECIMAL(10,2) NOT NULL,
    supplier_name VARCHAR(255) NOT NULL,
    purchase_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL
);

CREATE TABLE IF NOT EXISTS raw_material_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    raw_material_id UUID REFERENCES raw_materials(id) ON DELETE CASCADE NOT NULL,
    raw_material_name VARCHAR(255) NOT NULL,
    quantity_used DECIMAL(10,3) NOT NULL,
    unit_cost DECIMAL(10,2) NOT NULL,
    total_cost DECIMAL(10,2) NOT NULL,
    usage_date DATE NOT NULL,
    purpose VARCHAR(255) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL
);

ALTER TABLE purchases ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'general';

ALTER TABLE raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_material_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_material_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own raw materials" ON raw_materials FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own raw material purchases" ON raw_material_purchases FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own raw material usage" ON raw_material_usage FOR ALL USING (auth.uid() = user_id);

GRANT ALL ON raw_materials TO authenticated;
GRANT ALL ON raw_material_purchases TO authenticated;
GRANT ALL ON raw_material_usage TO authenticated;
```

## ✅ بعد التطبيق
1. أعد تحميل صفحة المواد الخام: `/raw-materials`
2. يجب أن تعمل جميع الميزات بدون أخطاء
3. جرب إضافة مادة خام جديدة للتأكد

## 🆘 في حالة استمرار المشاكل
- تأكد من تسجيل الدخول بحساب صحيح
- تحقق من متغيرات البيئة في `.env.local`
- أعد تشغيل الخادم المحلي

---
**الوقت المتوقع: 2-3 دقائق فقط** ⏱️
