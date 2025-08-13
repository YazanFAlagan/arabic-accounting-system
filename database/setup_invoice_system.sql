-- ===================================================================
-- إعداد نظام الفواتير - دعم بيع عدة أصناف في فاتورة واحدة
-- Invoice System Setup - Support Multi-Item Sales
-- ===================================================================

-- 1. إنشاء جدول الفواتير الرئيسي
-- Create main invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  sale_type VARCHAR(20) DEFAULT 'retail' CHECK (sale_type IN ('wholesale', 'retail', 'shop')),
  
  -- إجماليات الفاتورة
  subtotal DECIMAL(10,2) DEFAULT 0, -- المجموع قبل الخصم
  discount_percentage DECIMAL(5,2) DEFAULT 0, -- خصم نسبة مئوية على إجمالي الفاتورة
  discount_amount DECIMAL(10,2) DEFAULT 0, -- خصم مبلغ ثابت على إجمالي الفاتورة
  total_amount DECIMAL(10,2) DEFAULT 0, -- المجموع النهائي
  
  -- معلومات إضافية
  notes TEXT,
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('draft', 'completed', 'cancelled')),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. إنشاء جدول عناصر الفاتورة
-- Create invoice items table
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  product_id UUID, -- قد يكون NULL إذا تم حذف المنتج لاحقاً
  product_name VARCHAR(255) NOT NULL, -- نحتفظ باسم المنتج حتى لو حُذف
  
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL, -- السعر الأصلي حسب نوع البيع
  
  -- خصومات على مستوى العنصر
  item_discount_percentage DECIMAL(5,2) DEFAULT 0,
  item_discount_amount DECIMAL(10,2) DEFAULT 0,
  final_unit_price DECIMAL(10,2) NOT NULL, -- السعر النهائي بعد خصم العنصر
  line_total DECIMAL(10,2) NOT NULL, -- إجمالي السطر (final_unit_price * quantity)
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. إنشاء فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_sale_type ON invoices(sale_type);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_product_id ON invoice_items(product_id);

-- 4. إعداد RLS (Row Level Security)
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان للفواتير
CREATE POLICY "Users can view their own invoices" ON invoices
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own invoices" ON invoices
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own invoices" ON invoices
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own invoices" ON invoices
  FOR DELETE USING (auth.uid() = user_id);

-- سياسات الأمان لعناصر الفواتير
CREATE POLICY "Users can view their own invoice items" ON invoice_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM invoices 
      WHERE invoices.id = invoice_items.invoice_id 
      AND invoices.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own invoice items" ON invoice_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices 
      WHERE invoices.id = invoice_items.invoice_id 
      AND invoices.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own invoice items" ON invoice_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM invoices 
      WHERE invoices.id = invoice_items.invoice_id 
      AND invoices.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own invoice items" ON invoice_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM invoices 
      WHERE invoices.id = invoice_items.invoice_id 
      AND invoices.user_id = auth.uid()
    )
  );

-- 5. دالة لتوليد رقم فاتورة تلقائي
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
    current_year TEXT;
    current_month TEXT;
    next_number INTEGER;
    invoice_number TEXT;
BEGIN
    -- الحصول على السنة والشهر الحاليين
    current_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    current_month := LPAD(EXTRACT(MONTH FROM CURRENT_DATE)::TEXT, 2, '0');
    
    -- البحث عن آخر رقم فاتورة في الشهر الحالي
    SELECT COALESCE(
        MAX(
            CAST(
                SUBSTRING(invoice_number FROM '[0-9]+$') AS INTEGER
            )
        ), 0
    ) + 1
    INTO next_number
    FROM invoices
    WHERE invoice_number LIKE 'INV-' || current_year || current_month || '-%';
    
    -- تكوين رقم الفاتورة الجديد
    invoice_number := 'INV-' || current_year || current_month || '-' || LPAD(next_number::TEXT, 4, '0');
    
    RETURN invoice_number;
END;
$$ LANGUAGE plpgsql;

-- 6. دالة لحساب إجماليات الفاتورة
CREATE OR REPLACE FUNCTION calculate_invoice_totals(invoice_id_param UUID)
RETURNS VOID AS $$
DECLARE
    calculated_subtotal DECIMAL(10,2);
    invoice_discount_percentage DECIMAL(5,2);
    invoice_discount_amount DECIMAL(10,2);
    calculated_total DECIMAL(10,2);
    percentage_discount DECIMAL(10,2);
BEGIN
    -- حساب المجموع الفرعي من عناصر الفاتورة
    SELECT COALESCE(SUM(line_total), 0)
    INTO calculated_subtotal
    FROM invoice_items
    WHERE invoice_id = invoice_id_param;
    
    -- الحصول على خصومات الفاتورة
    SELECT discount_percentage, discount_amount
    INTO invoice_discount_percentage, invoice_discount_amount
    FROM invoices
    WHERE id = invoice_id_param;
    
    -- حساب خصم النسبة المئوية
    percentage_discount := calculated_subtotal * (COALESCE(invoice_discount_percentage, 0) / 100);
    
    -- حساب المجموع النهائي
    calculated_total := calculated_subtotal - percentage_discount - COALESCE(invoice_discount_amount, 0);
    
    -- التأكد من أن المجموع لا يقل عن صفر
    IF calculated_total < 0 THEN
        calculated_total := 0;
    END IF;
    
    -- تحديث الفاتورة
    UPDATE invoices
    SET 
        subtotal = calculated_subtotal,
        total_amount = calculated_total,
        updated_at = NOW()
    WHERE id = invoice_id_param;
END;
$$ LANGUAGE plpgsql;

-- 7. محفز لتحديث إجماليات الفاتورة عند تغيير العناصر
CREATE OR REPLACE FUNCTION trigger_update_invoice_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- تحديث إجماليات الفاتورة عند إضافة/تعديل/حذف عنصر
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        PERFORM calculate_invoice_totals(NEW.invoice_id);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM calculate_invoice_totals(OLD.invoice_id);
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- إنشاء المحفز
DROP TRIGGER IF EXISTS trigger_update_invoice_totals ON invoice_items;
CREATE TRIGGER trigger_update_invoice_totals
    AFTER INSERT OR UPDATE OR DELETE ON invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_invoice_totals();

-- 8. محفز لتحديث المخزون عند إنشاء/تعديل/حذف الفواتير
CREATE OR REPLACE FUNCTION update_stock_on_invoice_change()
RETURNS TRIGGER AS $$
BEGIN
    -- عند إضافة عنصر جديد للفاتورة
    IF TG_OP = 'INSERT' THEN
        -- تقليل المخزون
        UPDATE products 
        SET current_stock = current_stock - NEW.quantity,
            updated_at = NOW()
        WHERE id = NEW.product_id;
        
        RETURN NEW;
    END IF;
    
    -- عند تعديل عنصر في الفاتورة
    IF TG_OP = 'UPDATE' THEN
        -- إرجاع الكمية القديمة
        UPDATE products 
        SET current_stock = current_stock + OLD.quantity
        WHERE id = OLD.product_id;
        
        -- خصم الكمية الجديدة
        UPDATE products 
        SET current_stock = current_stock - NEW.quantity,
            updated_at = NOW()
        WHERE id = NEW.product_id;
        
        RETURN NEW;
    END IF;
    
    -- عند حذف عنصر من الفاتورة
    IF TG_OP = 'DELETE' THEN
        -- إرجاع المخزون
        UPDATE products 
        SET current_stock = current_stock + OLD.quantity,
            updated_at = NOW()
        WHERE id = OLD.product_id;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- إنشاء المحفز لتحديث المخزون
DROP TRIGGER IF EXISTS trigger_update_stock_on_invoice_change ON invoice_items;
CREATE TRIGGER trigger_update_stock_on_invoice_change
    AFTER INSERT OR UPDATE OR DELETE ON invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION update_stock_on_invoice_change();

-- 9. عرض شامل للفواتير مع التفاصيل
CREATE OR REPLACE VIEW invoices_summary AS
SELECT 
    i.id,
    i.invoice_number,
    i.customer_name,
    i.invoice_date,
    i.sale_type,
    i.subtotal,
    i.discount_percentage,
    i.discount_amount,
    i.total_amount,
    i.status,
    i.notes,
    -- عدد العناصر في الفاتورة
    COUNT(ii.id) as items_count,
    -- إجمالي الكمية
    COALESCE(SUM(ii.quantity), 0) as total_quantity,
    -- تاريخ الإنشاء والتحديث
    i.created_at,
    i.updated_at
FROM invoices i
LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
GROUP BY i.id, i.invoice_number, i.customer_name, i.invoice_date, 
         i.sale_type, i.subtotal, i.discount_percentage, i.discount_amount, 
         i.total_amount, i.status, i.notes, i.created_at, i.updated_at
ORDER BY i.created_at DESC;

-- 10. عرض تفصيلي للفواتير مع العناصر
CREATE OR REPLACE VIEW invoices_detailed AS
SELECT 
    i.id as invoice_id,
    i.invoice_number,
    i.customer_name,
    i.invoice_date,
    i.sale_type,
    i.subtotal as invoice_subtotal,
    i.discount_percentage as invoice_discount_percentage,
    i.discount_amount as invoice_discount_amount,
    i.total_amount as invoice_total,
    i.status,
    i.notes as invoice_notes,
    -- تفاصيل العناصر
    ii.id as item_id,
    ii.product_id,
    ii.product_name,
    ii.quantity,
    ii.unit_price,
    ii.item_discount_percentage,
    ii.item_discount_amount,
    ii.final_unit_price,
    ii.line_total,
    -- معلومات المنتج (إذا كان موجوداً)
    p.current_stock,
    p.wholesale_price,
    p.retail_price,
    p.shop_price
FROM invoices i
LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
LEFT JOIN products p ON ii.product_id = p.id
ORDER BY i.created_at DESC, ii.created_at ASC;

-- إضافة تعليقات توضيحية
COMMENT ON TABLE invoices IS 'جدول الفواتير الرئيسي - يحتوي على معلومات الفاتورة العامة';
COMMENT ON TABLE invoice_items IS 'جدول عناصر الفواتير - يحتوي على تفاصيل كل منتج في الفاتورة';
COMMENT ON VIEW invoices_summary IS 'عرض ملخص للفواتير مع الإحصائيات الأساسية';
COMMENT ON VIEW invoices_detailed IS 'عرض تفصيلي للفواتير مع جميع العناصر والمنتجات';

-- منح الصلاحيات المطلوبة
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON invoices TO authenticated;
GRANT ALL ON invoice_items TO authenticated;
GRANT ALL ON invoices_summary TO authenticated;
GRANT ALL ON invoices_detailed TO authenticated;
GRANT EXECUTE ON FUNCTION generate_invoice_number() TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_invoice_totals(UUID) TO authenticated;

-- ===================================================================
-- تم الانتهاء من إعداد نظام الفواتير
-- Invoice system setup completed successfully!
-- ===================================================================

SELECT 'تم إعداد نظام الفواتير بنجاح! Invoice system setup completed successfully!' as status;
