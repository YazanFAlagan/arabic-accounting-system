-- ===================================================================
-- إصلاح شامل لنظام الفواتير
-- Complete Invoice System Fix
-- ===================================================================

-- 1. إضافة أعمدة الأسعار للمنتجات (إذا لم تكن موجودة)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS retail_price DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS shop_price DECIMAL(10,2) DEFAULT 0;

-- 2. تحديث البيانات الموجودة
UPDATE products 
SET retail_price = COALESCE(selling_price, 0),
    shop_price = COALESCE(selling_price * 0.9, 0)
WHERE retail_price = 0 OR shop_price = 0;

-- 3. حذف العروض الموجودة لتجنب تضارب أنواع البيانات
DROP VIEW IF EXISTS invoices_summary CASCADE;
DROP VIEW IF EXISTS invoices_detailed CASCADE;

-- 4. إنشاء جدول الفواتير (إذا لم يكن موجوداً)
CREATE TABLE IF NOT EXISTS invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  sale_type VARCHAR(20) DEFAULT 'retail' CHECK (sale_type IN ('wholesale', 'retail', 'shop')),
  
  -- إجماليات الفاتورة
  subtotal DECIMAL(10,2) DEFAULT 0,
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) DEFAULT 0,
  
  -- معلومات إضافية
  notes TEXT,
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('draft', 'completed', 'cancelled')),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. إنشاء جدول عناصر الفواتير (إذا لم يكن موجوداً)
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  product_id UUID,
  product_name VARCHAR(255) NOT NULL,
  
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL,
  
  -- خصومات على مستوى العنصر
  item_discount_percentage DECIMAL(5,2) DEFAULT 0,
  item_discount_amount DECIMAL(10,2) DEFAULT 0,
  final_unit_price DECIMAL(10,2) NOT NULL,
  line_total DECIMAL(10,2) NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. إنشاء الفهارس
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_sale_type ON invoices(sale_type);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_product_id ON invoice_items(product_id);

-- 7. إعداد RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- 8. سياسات الأمان للفواتير
DROP POLICY IF EXISTS "Users can view their own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can insert their own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can update their own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can delete their own invoices" ON invoices;

CREATE POLICY "Users can view their own invoices" ON invoices
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own invoices" ON invoices
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own invoices" ON invoices
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own invoices" ON invoices
  FOR DELETE USING (auth.uid() = user_id);

-- 9. سياسات الأمان لعناصر الفواتير
DROP POLICY IF EXISTS "Users can view their own invoice items" ON invoice_items;
DROP POLICY IF EXISTS "Users can insert their own invoice items" ON invoice_items;
DROP POLICY IF EXISTS "Users can update their own invoice items" ON invoice_items;
DROP POLICY IF EXISTS "Users can delete their own invoice items" ON invoice_items;

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

-- 10. إنشاء دالة لتحديث updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 11. إنشاء trigger لتحديث updated_at
DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at 
    BEFORE UPDATE ON invoices 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 12. حذف الدالة الموجودة أولاً ثم إنشاء دالة لتوليد رقم الفاتورة
DROP FUNCTION IF EXISTS generate_invoice_number() CASCADE;
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS VARCHAR(50) AS $$
DECLARE
    next_number INTEGER;
    invoice_number VARCHAR(50);
    current_year VARCHAR(4);
    current_month VARCHAR(2);
BEGIN
    -- الحصول على السنة والشهر الحاليين
    current_year := EXTRACT(YEAR FROM CURRENT_DATE)::VARCHAR;
    current_month := LPAD(EXTRACT(MONTH FROM CURRENT_DATE)::VARCHAR, 2, '0');
    
    -- البحث عن آخر رقم فاتورة في هذا الشهر
    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 18) AS INTEGER)), 0)
    INTO next_number
    FROM invoices 
    WHERE invoice_number LIKE 'INV-' || current_year || current_month || '-%';
    
    -- زيادة الرقم بمقدار 1
    next_number := next_number + 1;
    
    -- تنسيق رقم الفاتورة: INV-YYYYMM-0001
    invoice_number := 'INV-' || current_year || current_month || '-' || LPAD(next_number::VARCHAR, 4, '0');
    
    RETURN invoice_number;
END;
$$ LANGUAGE plpgsql;

-- 13. إنشاء trigger لتوليد رقم الفاتورة تلقائياً
DROP TRIGGER IF EXISTS set_invoice_number ON invoices;
CREATE TRIGGER set_invoice_number
    BEFORE INSERT ON invoices
    FOR EACH ROW
    WHEN (NEW.invoice_number IS NULL OR NEW.invoice_number = '')
    EXECUTE FUNCTION generate_invoice_number();

-- 14. إنشاء view لعرض ملخص الفواتير
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
    i.created_at,
    COUNT(ii.id) as items_count,
    SUM(ii.quantity) as total_quantity
FROM invoices i
LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
GROUP BY i.id, i.invoice_number, i.customer_name, i.invoice_date, i.sale_type, 
         i.subtotal, i.discount_percentage, i.discount_amount, i.total_amount, 
         i.status, i.created_at;

-- 15. إنشاء view لعرض تفاصيل الفواتير
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
    i.total_amount as invoice_total_amount,
    i.notes as invoice_notes,
    i.status as invoice_status,
    i.created_at as invoice_created_at,
    ii.id as item_id,
    ii.product_id,
    ii.product_name,
    ii.quantity,
    ii.unit_price,
    ii.item_discount_percentage,
    ii.item_discount_amount,
    ii.final_unit_price,
    ii.line_total,
    ii.created_at as item_created_at
FROM invoices i
LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
ORDER BY i.created_at DESC, ii.created_at;

-- 16. إضافة صلاحيات للمستخدمين
GRANT SELECT, INSERT, UPDATE, DELETE ON invoices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON invoice_items TO authenticated;
GRANT SELECT ON invoices_summary TO authenticated;
GRANT SELECT ON invoices_detailed TO authenticated;

-- 17. رسالة نجاح
DO $$
BEGIN
    RAISE NOTICE 'تم إصلاح نظام الفواتير بنجاح!';
    RAISE NOTICE 'تم إنشاء/تحديث الجداول: invoices, invoice_items';
    RAISE NOTICE 'تم إنشاء الفهارس والـ RLS';
    RAISE NOTICE 'تم إنشاء الدوال والـ Triggers';
    RAISE NOTICE 'تم إنشاء الـ Views: invoices_summary, invoices_detailed';
END $$;
