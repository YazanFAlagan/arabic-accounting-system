-- إضافة عمود مصدر التمويل إلى جدول المشتريات
ALTER TABLE raw_material_purchases 
ADD COLUMN IF NOT EXISTS funding_source VARCHAR(20) DEFAULT 'project';

-- إضافة تعليق للعمود
COMMENT ON COLUMN raw_material_purchases.funding_source IS 'مصدر التمويل: project (أموال المشروع) أو personal (أموال شخصية)';

-- تحديث السجلات الموجودة لتكون من أموال المشروع
UPDATE raw_material_purchases 
SET funding_source = 'project' 
WHERE funding_source IS NULL;
