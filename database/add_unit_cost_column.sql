-- ===================================================================
-- إضافة عمود تكلفة الوحدة للمنتجات
-- Add unit_cost column to products table
-- ===================================================================

-- إضافة عمود تكلفة الوحدة إذا لم يكن موجوداً
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(10,2) DEFAULT 0;

-- تحديث البيانات الموجودة (يمكن تعديلها يدوياً)
UPDATE products 
SET unit_cost = wholesale_price * 0.7  -- افتراضياً تكلفة الشراء = 70% من سعر الجملة
WHERE unit_cost = 0;

-- إضافة تعليق توضيحي
COMMENT ON COLUMN products.unit_cost IS 'تكلفة شراء الوحدة - Unit purchase cost';

-- إنشاء فهرس للأداء
CREATE INDEX IF NOT EXISTS idx_products_unit_cost ON products(unit_cost);

-- عرض رسالة تأكيد
SELECT 'تم إضافة عمود تكلفة الوحدة بنجاح!' as message;
SELECT 'عدد المنتجات المحدثة: ' || COUNT(*) as updated_count FROM products WHERE unit_cost > 0;
