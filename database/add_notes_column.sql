-- إضافة عمود notes المفقود إلى جدول purchases
-- Add missing notes column to purchases table

-- إضافة عمود notes
ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- تحديث السجلات الموجودة
UPDATE purchases 
SET notes = '' 
WHERE notes IS NULL;

-- إضافة تعليق للتوثيق
COMMENT ON COLUMN purchases.notes IS 'ملاحظات إضافية حول المشتريات';
