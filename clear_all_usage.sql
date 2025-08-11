-- حذف جميع سجلات استخدام المواد الخام
-- Clear all raw material usage records

-- 1. حذف جميع السجلات من جدول الاستخدام
DELETE FROM raw_material_usage;

-- 2. التحقق من أن الجدول فارغ
SELECT COUNT(*) as "عدد السجلات المتبقية" FROM raw_material_usage;

-- 3. عرض المواد الخام المتاحة
SELECT 
    name as "اسم المادة",
    current_stock as "المخزون الحالي", 
    unit as "الوحدة"
FROM raw_materials 
ORDER BY name;
