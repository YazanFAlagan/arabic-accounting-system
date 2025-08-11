-- إضافة trigger لتحديث المخزون عند الاستخدام
CREATE OR REPLACE FUNCTION update_stock_on_usage()
RETURNS TRIGGER AS $$
BEGIN
    -- تحديث المخزون بطرح الكمية المستخدمة
    UPDATE raw_materials 
    SET current_stock = current_stock - NEW.quantity_used,
        updated_at = NOW()
    WHERE id = NEW.raw_material_id;
    
    -- التأكد من أن المخزون لا يصبح سالب
    UPDATE raw_materials 
    SET current_stock = GREATEST(current_stock, 0)
    WHERE id = NEW.raw_material_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger للاستخدام
DROP TRIGGER IF EXISTS trigger_update_stock_on_usage ON raw_material_usage;
CREATE TRIGGER trigger_update_stock_on_usage
    AFTER INSERT ON raw_material_usage
    FOR EACH ROW EXECUTE FUNCTION update_stock_on_usage();

-- إضافة trigger لإرجاع المخزون عند حذف سجل الاستخدام
CREATE OR REPLACE FUNCTION restore_stock_on_usage_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- إرجاع الكمية المستخدمة إلى المخزون
    UPDATE raw_materials 
    SET current_stock = current_stock + OLD.quantity_used,
        updated_at = NOW()
    WHERE id = OLD.raw_material_id;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger للحذف
DROP TRIGGER IF EXISTS trigger_restore_stock_on_usage_delete ON raw_material_usage;
CREATE TRIGGER trigger_restore_stock_on_usage_delete
    BEFORE DELETE ON raw_material_usage
    FOR EACH ROW EXECUTE FUNCTION restore_stock_on_usage_delete();

-- تصحيح المخزون الحالي بناءً على الاستخدامات الموجودة
UPDATE raw_materials 
SET current_stock = (
    SELECT COALESCE(
        (SELECT SUM(quantity) FROM raw_material_purchases WHERE raw_material_id = raw_materials.id),
        0
    ) - COALESCE(
        (SELECT SUM(quantity_used) FROM raw_material_usage WHERE raw_material_id = raw_materials.id),
        0
    )
)
WHERE id IN (SELECT DISTINCT raw_material_id FROM raw_material_usage);
