-- حذف جميع البيانات من جدول استخدام المواد الخام
-- Clear all data from raw material usage table

-- حذف جميع سجلات الاستخدام
DELETE FROM raw_material_usage;

-- إعادة تعيين المعرفات التلقائية (إذا كانت موجودة)
-- Reset auto-increment IDs if they exist
-- Note: This depends on your database system
-- For PostgreSQL (Supabase uses PostgreSQL):
-- ALTER SEQUENCE raw_material_usage_id_seq RESTART WITH 1;

-- للتأكد من حذف جميع البيانات
SELECT COUNT(*) as remaining_records FROM raw_material_usage;

-- عرض المواد الخام المتاحة للتأكد من أن البيانات الأساسية سليمة
SELECT id, name, current_stock, unit FROM raw_materials ORDER BY name;
