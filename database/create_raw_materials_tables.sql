-- إنشاء جداول إدارة المواد الخام
-- يجب تشغيل هذا السكريبت في Supabase SQL Editor

-- 1. إنشاء جدول المواد الخام
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

-- 2. إنشاء جدول مشتريات المواد الخام
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

-- 3. إنشاء جدول استخدام المواد الخام
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

-- 4. إضافة عمود type إلى جدول المشتريات الموجود (إذا لم يكن موجوداً)
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'general';

-- 5. تفعيل Row Level Security
ALTER TABLE raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_material_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_material_usage ENABLE ROW LEVEL SECURITY;

-- 6. إنشاء سياسات الأمان للمواد الخام
CREATE POLICY "Users can manage their own raw materials" ON raw_materials
    FOR ALL USING (auth.uid() = user_id);

-- 7. إنشاء سياسات الأمان لمشتريات المواد الخام
CREATE POLICY "Users can manage their own raw material purchases" ON raw_material_purchases
    FOR ALL USING (auth.uid() = user_id);

-- 8. إنشاء سياسات الأمان لاستخدام المواد الخام
CREATE POLICY "Users can manage their own raw material usage" ON raw_material_usage
    FOR ALL USING (auth.uid() = user_id);

-- 9. منح الصلاحيات
GRANT ALL ON raw_materials TO authenticated;
GRANT ALL ON raw_material_purchases TO authenticated;
GRANT ALL ON raw_material_usage TO authenticated;
