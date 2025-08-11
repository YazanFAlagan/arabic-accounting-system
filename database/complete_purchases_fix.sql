-- إصلاح شامل لجدول purchases - إضافة جميع الأعمدة المفقودة
-- Complete fix for purchases table - Add all missing columns

-- إضافة جميع الأعمدة المفقودة في جدول purchases
-- Add all missing columns to purchases table

-- 1. عمود min_stock_alert
ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS min_stock_alert INTEGER DEFAULT 10;

-- 2. عمود unit (وحدة القياس)
ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'قطعة';

-- 3. عمود type (نوع المشتريات)
ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'product';

-- 4. عمود notes (الملاحظات)
ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- 5. عمود payment_method (طريقة الدفع)
ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) DEFAULT 'project';

-- إضافة قيود للتحقق من صحة البيانات
-- Add constraints to validate data

-- قيد للتحقق من نوع المشتريات
ALTER TABLE purchases 
ADD CONSTRAINT IF NOT EXISTS purchases_type_check 
CHECK (type IN ('product', 'expense', 'raw_material'));

-- قيد للتحقق من طريقة الدفع
ALTER TABLE purchases 
ADD CONSTRAINT IF NOT EXISTS purchases_payment_method_check 
CHECK (payment_method IN ('project', 'personal'));

-- تحديث السجلات الموجودة بالقيم الافتراضية
-- Update existing records with default values

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

UPDATE purchases 
SET payment_method = 'project' 
WHERE payment_method IS NULL;

-- إضافة تعليقات للتوثيق
-- Add comments for documentation
COMMENT ON COLUMN purchases.min_stock_alert IS 'الحد الأدنى للتنبيه من نفاد المخزون';
COMMENT ON COLUMN purchases.unit IS 'وحدة القياس للمنتج (قطعة، كيلو، لتر، إلخ)';
COMMENT ON COLUMN purchases.type IS 'نوع المشتريات: product (منتج) أو expense (مصروف) أو raw_material (مادة خام)';
COMMENT ON COLUMN purchases.notes IS 'ملاحظات إضافية حول المشتريات';
COMMENT ON COLUMN purchases.payment_method IS 'طريقة الدفع: project (من أموال المشروع) أو personal (من الأموال الشخصية)';

-- إنشاء فهارس لتحسين الأداء
-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_purchases_type ON purchases(type);
CREATE INDEX IF NOT EXISTS idx_purchases_payment_method ON purchases(payment_method);
CREATE INDEX IF NOT EXISTS idx_purchases_min_stock_alert ON purchases(min_stock_alert);

-- عرض رسالة نجاح
SELECT 'تم إضافة جميع الأعمدة المفقودة بنجاح إلى جدول purchases' AS result;
