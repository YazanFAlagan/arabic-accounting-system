-- ===================================================================
-- إصلاح شامل لنظام الفواتير
-- Complete Invoice System Fix
-- ===================================================================

-- 1. إضافة أعمدة الأسعار للمنتجات (إذا لم تكن موجودة)
-- Add price columns to products table if they don't exist
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS retail_price DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS shop_price DECIMAL(10,2) DEFAULT 0;

-- تحديث البيانات الموجودة
UPDATE products 
SET retail_price = COALESCE(selling_price, 0),
    shop_price = COALESCE(selling_price * 0.9, 0)
WHERE retail_price = 0 OR shop_price = 0;

-- 2. حذف العروض الموجودة لتجنب تضارب أنواع البيانات
-- Drop existing views to avoid data type conflicts
DROP VIEW IF EXISTS invoices_summary CASCADE;
DROP VIEW IF EXISTS invoices_detailed CASCADE;

-- 3. إنشاء جدول الفواتير (إذا لم يكن موجوداً)
-- Create invoices table if it doesn't exist
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

-- 4. إنشاء جدول عناصر الفواتير (إذا لم يكن موجوداً)
-- Create invoice items table if it doesn't exist
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

-- 5. إنشاء الفهارس
-- Create indexes
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_sale_type ON invoices(sale_type);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_product_id ON invoice_items(product_id);

-- 6. إعداد RLS
-- Setup RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان للفواتير
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

-- سياسات الأمان لعناصر الفواتير
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

-- 7. إصلاح دالة توليد رقم الفاتورة
-- Fix invoice number generation function
DROP FUNCTION IF EXISTS generate_invoice_number();

CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
    current_year TEXT;
    current_month TEXT;
    next_number INTEGER;
    new_invoice_number TEXT;
    table_exists BOOLEAN;
BEGIN
    -- التحقق من وجود جدول الفواتير
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'invoices'
    ) INTO table_exists;
    
    -- إذا لم يكن الجدول موجود، استخدم رقم افتراضي
    IF NOT table_exists THEN
        current_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
        current_month := LPAD(EXTRACT(MONTH FROM CURRENT_DATE)::TEXT, 2, '0');
        new_invoice_number := 'INV-' || current_year || current_month || '-0001';
        RETURN new_invoice_number;
    END IF;
    
    -- الحصول على السنة والشهر الحاليين
    current_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    current_month := LPAD(EXTRACT(MONTH FROM CURRENT_DATE)::TEXT, 2, '0');
    
    -- البحث عن آخر رقم فاتورة في الشهر الحالي
    SELECT COALESCE(
        MAX(
            CAST(
                SUBSTRING(i.invoice_number FROM '[0-9]+$') AS INTEGER
            )
        ), 0
    ) + 1
    INTO next_number
    FROM invoices i
    WHERE i.invoice_number LIKE 'INV-' || current_year || current_month || '-%';
    
    -- إذا لم توجد فواتير في هذا الشهر، ابدأ من 1
    IF next_number IS NULL THEN
        next_number := 1;
    END IF;
    
    -- تكوين رقم الفاتورة الجديد
    new_invoice_number := 'INV-' || current_year || current_month || '-' || LPAD(next_number::TEXT, 4, '0');
    
    RETURN new_invoice_number;
END;
$$ LANGUAGE plpgsql;

-- 8. دالة حساب إجماليات الفاتورة
-- Function to calculate invoice totals
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

-- 9. المحفزات
-- Triggers
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

-- إنشاء المحفزات
DROP TRIGGER IF EXISTS trigger_update_invoice_totals ON invoice_items;
CREATE TRIGGER trigger_update_invoice_totals
    AFTER INSERT OR UPDATE OR DELETE ON invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_invoice_totals();

DROP TRIGGER IF EXISTS trigger_update_stock_on_invoice_change ON invoice_items;
CREATE TRIGGER trigger_update_stock_on_invoice_change
    AFTER INSERT OR UPDATE OR DELETE ON invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION update_stock_on_invoice_change();

-- 10. إنشاء العروض
-- Create views
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
    COUNT(ii.id) as items_count,
    COALESCE(SUM(ii.quantity), 0) as total_quantity,
    i.created_at,
    i.updated_at
FROM invoices i
LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
GROUP BY i.id, i.invoice_number, i.customer_name, i.invoice_date, 
         i.sale_type, i.subtotal, i.discount_percentage, i.discount_amount, 
         i.total_amount, i.status, i.notes, i.created_at, i.updated_at
ORDER BY i.created_at DESC;

-- 11. منح الصلاحيات
-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON invoices TO authenticated;
GRANT ALL ON invoice_items TO authenticated;
GRANT ALL ON invoices_summary TO authenticated;
GRANT EXECUTE ON FUNCTION generate_invoice_number() TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_invoice_totals(UUID) TO authenticated;

-- 12. اختبار النظام
-- Test the system
SELECT 'Testing invoice number generation...' as test_message;
SELECT generate_invoice_number() as generated_number;

-- ===================================================================
-- تم إصلاح نظام الفواتير بالكامل
-- Invoice system completely fixed!
-- ===================================================================

SELECT 'تم إصلاح نظام الفواتير بالكامل! Invoice system completely fixed!' as status;
