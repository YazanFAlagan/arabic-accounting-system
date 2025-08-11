-- إصلاح الأعمدة المفقودة في قاعدة البيانات
-- Fix Missing Columns in Database

-- 1. إضافة عمود funding_source إلى جدول raw_material_purchases
-- Add funding_source column to raw_material_purchases table
ALTER TABLE raw_material_purchases 
ADD COLUMN IF NOT EXISTS funding_source VARCHAR(20) DEFAULT 'project';

-- إضافة عمود updated_at إذا لم يكن موجود
-- Add updated_at column if not exists
ALTER TABLE raw_material_purchases 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- تحديث السجلات الموجودة
-- Update existing records
UPDATE raw_material_purchases 
SET funding_source = 'project' 
WHERE funding_source IS NULL;

UPDATE raw_material_purchases 
SET updated_at = NOW() 
WHERE updated_at IS NULL;

-- 2. إضافة عمود min_stock_alert إلى جدول purchases
-- Add min_stock_alert column to purchases table
ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS min_stock_alert INTEGER DEFAULT 10;

-- إضافة عمود unit إذا لم يكن موجود
-- Add unit column if not exists
ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'قطعة';

-- إضافة عمود type إذا لم يكن موجود
-- Add type column if not exists
ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'product';

-- إضافة عمود notes إذا لم يكن موجود
-- Add notes column if not exists
ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- إضافة قيد للتحقق من نوع المشتريات
-- Add check constraint for purchase type
ALTER TABLE purchases 
ADD CONSTRAINT IF NOT EXISTS purchases_type_check 
CHECK (type IN ('product', 'expense', 'raw_material'));

-- تحديث السجلات الموجودة
-- Update existing records
UPDATE purchases 
SET min_stock_alert = 10 
WHERE min_stock_alert IS NULL;

UPDATE purchases 
SET unit = 'قطعة' 
WHERE unit IS NULL;

UPDATE purchases 
SET type = 'product' 
WHERE type IS NULL;

UPDATE purchases 
SET notes = '' 
WHERE notes IS NULL;

-- إضافة تعليقات للتوثيق
-- Add comments for documentation
COMMENT ON COLUMN raw_material_purchases.funding_source IS 'مصدر التمويل: project (من أموال المشروع) أو personal (من الأموال الشخصية)';
COMMENT ON COLUMN purchases.min_stock_alert IS 'الحد الأدنى للتنبيه من نفاد المخزون';
COMMENT ON COLUMN purchases.unit IS 'وحدة القياس للمنتج';
COMMENT ON COLUMN purchases.type IS 'نوع المشتريات: product (منتج) أو expense (مصروف) أو raw_material (مادة خام)';
COMMENT ON COLUMN purchases.notes IS 'ملاحظات إضافية حول المشتريات';

-- إنشاء فهارس لتحسين الأداء
-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_raw_material_purchases_funding_source ON raw_material_purchases(funding_source);
CREATE INDEX IF NOT EXISTS idx_purchases_type ON purchases(type);
CREATE INDEX IF NOT EXISTS idx_purchases_min_stock_alert ON purchases(min_stock_alert);
