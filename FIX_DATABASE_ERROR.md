# 🔧 حل مشكلة "حدث خطأ في إضافة المادة الخام"

## 🚨 سبب المشكلة
الخطأ يحدث لأن جداول المواد الخام غير موجودة في قاعدة بيانات Supabase.

## ✅ الحل السريع (5 دقائق)

### الخطوة 1: افتح Supabase
1. اذهب إلى: https://supabase.com/dashboard
2. اختر مشروعك: `iklhnsnglhdsdmvcwrzj`
3. اضغط على **SQL Editor** من القائمة الجانبية

### الخطوة 2: تشغيل السكريبت
انسخ والصق الكود التالي في SQL Editor:

```sql
-- إنشاء جدول المواد الخام
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

-- إنشاء جدول مشتريات المواد الخام
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

-- إنشاء جدول استخدام المواد الخام
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

-- إضافة عمود type للمشتريات الموجودة
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'general';

-- تفعيل Row Level Security
ALTER TABLE raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_material_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_material_usage ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسات الأمان
CREATE POLICY "Users can manage their own raw materials" ON raw_materials
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own raw material purchases" ON raw_material_purchases
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own raw material usage" ON raw_material_usage
    FOR ALL USING (auth.uid() = user_id);

-- منح الصلاحيات
GRANT ALL ON raw_materials TO authenticated;
GRANT ALL ON raw_material_purchases TO authenticated;
GRANT ALL ON raw_material_usage TO authenticated;
```

### الخطوة 3: تشغيل السكريبت
- اضغط **Run** أو استخدم **Ctrl+Enter**
- انتظر رسالة النجاح

### الخطوة 4: التحقق
بعد تشغيل السكريبت، يجب أن ترى:
- ✅ `raw_materials` table created
- ✅ `raw_material_purchases` table created
- ✅ `raw_material_usage` table created

## 🧪 اختبار النظام

1. أعد تحميل صفحة المواد الخام: `/raw-materials`
2. اضغط "إضافة مادة خام"
3. املأ البيانات:
   - **الاسم**: ملصقات
   - **الوحدة**: قطعة
   - **المخزون الحالي**: 100
   - **الحد الأدنى**: 10
   - **سعر الوحدة**: 0.5
4. اضغط "حفظ"

إذا ظهرت رسالة "تم إضافة المادة الخام بنجاح!" فالنظام يعمل بشكل صحيح.

## 🔍 في حالة استمرار المشكلة

### تحقق من الأخطاء في Console:
1. اضغط **F12** في المتصفح
2. اذهب إلى **Console**
3. ابحث عن أي أخطاء حمراء

### الأخطاء الشائعة وحلولها:

**خطأ**: `Could not find table 'raw_materials'`
**الحل**: لم يتم تشغيل السكريبت بشكل صحيح، أعد المحاولة

**خطأ**: `permission denied`
**الحل**: تأكد من تسجيل الدخول بحساب صحيح

**خطأ**: `user_id cannot be null`
**الحل**: أعد تسجيل الدخول

## 📞 الدعم الفني
إذا استمرت المشكلة، شارك معي:
1. رسالة الخطأ الكاملة من Console
2. لقطة شاشة من Supabase Tables
3. تأكيد تشغيل السكريبت بنجاح

---
**الوقت المتوقع للحل: 5 دقائق** ⏱️
