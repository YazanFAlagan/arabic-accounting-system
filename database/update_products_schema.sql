-- ===================================================================
-- تحديث جدول المنتجات لدعم الأسعار المتعددة
-- Update Products Table for Multiple Price Types
-- ===================================================================

-- إضافة أعمدة الأسعار الجديدة
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS retail_price DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS shop_price DECIMAL(10,2) DEFAULT 0;

-- تحديث البيانات الموجودة: نسخ سعر البيع الحالي إلى السعر القطاعي
UPDATE products 
SET retail_price = selling_price,
    shop_price = selling_price * 0.9  -- سعر المحلات أقل بـ 10% افتراضياً
WHERE retail_price = 0;

-- إضافة تعليقات توضيحية
COMMENT ON COLUMN products.wholesale_price IS 'سعر الجملة - Wholesale price';
COMMENT ON COLUMN products.retail_price IS 'سعر القطاعي - Retail price';
COMMENT ON COLUMN products.shop_price IS 'سعر المحلات - Shop price';
COMMENT ON COLUMN products.selling_price IS 'سعر البيع العام (مهجور) - General selling price (deprecated)';

-- إنشاء فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_products_wholesale_price ON products(wholesale_price);
CREATE INDEX IF NOT EXISTS idx_products_retail_price ON products(retail_price);
CREATE INDEX IF NOT EXISTS idx_products_shop_price ON products(shop_price);

-- ===================================================================
-- تحديث جدول المبيعات لدعم نوع البيع والخصم
-- Update Sales Table for Sale Type and Discount
-- ===================================================================

-- إضافة أعمدة جديدة لجدول المبيعات
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS sale_type VARCHAR(20) DEFAULT 'retail' CHECK (sale_type IN ('wholesale', 'retail', 'shop')),
ADD COLUMN IF NOT EXISTS original_unit_price DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS final_unit_price DECIMAL(10,2) DEFAULT 0;

-- تحديث البيانات الموجودة
UPDATE sales 
SET original_unit_price = unit_price,
    final_unit_price = unit_price,
    sale_type = 'retail'
WHERE original_unit_price = 0;

-- إضافة تعليقات توضيحية
COMMENT ON COLUMN sales.sale_type IS 'نوع البيع: wholesale (جملة), retail (قطاعي), shop (محلات)';
COMMENT ON COLUMN sales.original_unit_price IS 'السعر الأصلي قبل الخصم';
COMMENT ON COLUMN sales.discount_percentage IS 'نسبة الخصم %';
COMMENT ON COLUMN sales.discount_amount IS 'قيمة الخصم بالجنيه';
COMMENT ON COLUMN sales.final_unit_price IS 'السعر النهائي بعد الخصم';

-- إنشاء فهرس للأداء
CREATE INDEX IF NOT EXISTS idx_sales_sale_type ON sales(sale_type);

-- ===================================================================
-- دالة لحساب السعر حسب نوع البيع
-- Function to Calculate Price by Sale Type
-- ===================================================================

CREATE OR REPLACE FUNCTION get_product_price(
    product_id UUID,
    sale_type VARCHAR(20)
) RETURNS DECIMAL(10,2) AS $$
DECLARE
    price DECIMAL(10,2);
BEGIN
    SELECT 
        CASE 
            WHEN sale_type = 'wholesale' THEN wholesale_price
            WHEN sale_type = 'retail' THEN retail_price
            WHEN sale_type = 'shop' THEN shop_price
            ELSE retail_price
        END
    INTO price
    FROM products 
    WHERE id = product_id;
    
    RETURN COALESCE(price, 0);
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- دالة لحساب السعر النهائي مع الخصم
-- Function to Calculate Final Price with Discount
-- ===================================================================

CREATE OR REPLACE FUNCTION calculate_final_price(
    original_price DECIMAL(10,2),
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0
) RETURNS DECIMAL(10,2) AS $$
DECLARE
    final_price DECIMAL(10,2);
    percentage_discount DECIMAL(10,2);
BEGIN
    -- حساب خصم النسبة المئوية
    percentage_discount := original_price * (discount_percentage / 100);
    
    -- السعر النهائي = السعر الأصلي - خصم النسبة - خصم المبلغ
    final_price := original_price - percentage_discount - discount_amount;
    
    -- التأكد من أن السعر النهائي لا يقل عن صفر
    IF final_price < 0 THEN
        final_price := 0;
    END IF;
    
    RETURN final_price;
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- تحديث إجراء تحديث المخزون
-- Update Stock Update Trigger
-- ===================================================================

-- إنشاء أو تحديث دالة تحديث المخزون عند البيع
CREATE OR REPLACE FUNCTION update_stock_on_sale()
RETURNS TRIGGER AS $$
BEGIN
    -- تقليل المخزون عند إضافة بيع جديد
    IF TG_OP = 'INSERT' THEN
        UPDATE products 
        SET current_stock = current_stock - NEW.quantity,
            updated_at = NOW()
        WHERE name = NEW.product_name;
        
        RETURN NEW;
    END IF;
    
    -- تعديل المخزون عند تحديث البيع
    IF TG_OP = 'UPDATE' THEN
        -- إرجاع الكمية القديمة
        UPDATE products 
        SET current_stock = current_stock + OLD.quantity
        WHERE name = OLD.product_name;
        
        -- خصم الكمية الجديدة
        UPDATE products 
        SET current_stock = current_stock - NEW.quantity,
            updated_at = NOW()
        WHERE name = NEW.product_name;
        
        RETURN NEW;
    END IF;
    
    -- إرجاع المخزون عند حذف البيع
    IF TG_OP = 'DELETE' THEN
        UPDATE products 
        SET current_stock = current_stock + OLD.quantity,
            updated_at = NOW()
        WHERE name = OLD.product_name;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- إنشاء المحفز إذا لم يكن موجوداً
DROP TRIGGER IF EXISTS trigger_update_stock_on_sale ON sales;
CREATE TRIGGER trigger_update_stock_on_sale
    AFTER INSERT OR UPDATE OR DELETE ON sales
    FOR EACH ROW
    EXECUTE FUNCTION update_stock_on_sale();

-- ===================================================================
-- عرض تقرير الأسعار للمنتجات
-- Products Price Report View
-- ===================================================================

CREATE OR REPLACE VIEW products_price_report AS
SELECT 
    id,
    name,
    wholesale_price,
    retail_price,
    shop_price,
    current_stock,
    min_stock_alert,
    -- حساب هوامش الربح
    ROUND(((retail_price - wholesale_price) / NULLIF(wholesale_price, 0) * 100), 2) as retail_profit_margin,
    ROUND(((shop_price - wholesale_price) / NULLIF(wholesale_price, 0) * 100), 2) as shop_profit_margin,
    -- تحديد حالة المخزون
    CASE 
        WHEN current_stock <= min_stock_alert THEN 'منخفض'
        WHEN current_stock <= min_stock_alert * 2 THEN 'متوسط'
        ELSE 'جيد'
    END as stock_status,
    created_at,
    updated_at
FROM products
ORDER BY name;

-- إضافة تعليق على العرض
COMMENT ON VIEW products_price_report IS 'تقرير شامل لأسعار المنتجات وهوامش الربح وحالة المخزون';
