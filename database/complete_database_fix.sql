-- ===================================================================
-- إصلاح شامل لقاعدة البيانات - Complete Database Fix
-- ===================================================================

-- 1. إصلاح جدول المنتجات (Products)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS retail_price DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS shop_price DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS category VARCHAR(100),
ADD COLUMN IF NOT EXISTS supplier_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- تحديث البيانات الموجودة
UPDATE products 
SET retail_price = COALESCE(selling_price, 0),
    shop_price = COALESCE(selling_price * 0.9, 0)
WHERE retail_price = 0 OR shop_price = 0;

-- 2. إصلاح جدول المشتريات (Purchases)
ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS min_stock_alert INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'قطعة',
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'product',
ADD COLUMN IF NOT EXISTS funding_source VARCHAR(20) DEFAULT 'project',
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- إضافة قيد للتحقق من نوع المشتريات
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'purchases_type_check' 
        AND table_name = 'purchases'
    ) THEN
        ALTER TABLE purchases ADD CONSTRAINT purchases_type_check 
        CHECK (type IN ('product', 'expense', 'raw_material'));
    END IF;
END $$;

-- إضافة قيد للتحقق من مصدر التمويل
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'purchases_funding_source_check' 
        AND table_name = 'purchases'
    ) THEN
        ALTER TABLE purchases ADD CONSTRAINT purchases_funding_source_check 
        CHECK (funding_source IN ('project', 'personal'));
    END IF;
END $$;

-- 3. إنشاء جدول المواد الخام (إذا لم يكن موجوداً)
CREATE TABLE IF NOT EXISTS raw_materials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    current_stock DECIMAL(10,3) DEFAULT 0,
    min_stock_alert DECIMAL(10,3) DEFAULT 0,
    unit_cost DECIMAL(10,2) DEFAULT 0,
    supplier_name VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL
);

-- 4. إنشاء جدول مشتريات المواد الخام (إذا لم يكن موجوداً)
CREATE TABLE IF NOT EXISTS raw_material_purchases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    raw_material_id UUID REFERENCES raw_materials(id) ON DELETE CASCADE NOT NULL,
    raw_material_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10,3) NOT NULL,
    unit_cost DECIMAL(10,2) NOT NULL,
    total_cost DECIMAL(10,2) NOT NULL,
    supplier_name VARCHAR(255) NOT NULL,
    purchase_date DATE NOT NULL,
    funding_source VARCHAR(20) DEFAULT 'project' CHECK (funding_source IN ('project', 'personal')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL
);

-- 5. إنشاء جدول استخدام المواد الخام (إذا لم يكن موجوداً)
CREATE TABLE IF NOT EXISTS raw_material_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    raw_material_id UUID REFERENCES raw_materials(id) ON DELETE CASCADE NOT NULL,
    raw_material_name VARCHAR(255) NOT NULL,
    quantity_used DECIMAL(10,3) NOT NULL,
    usage_date DATE NOT NULL,
    project_name VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL
);

-- 6. إنشاء جدول التدفق النقدي (إذا لم يكن موجوداً)
CREATE TABLE IF NOT EXISTS cash_flow (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
    amount DECIMAL(10,2) NOT NULL,
    description TEXT NOT NULL,
    expense_amount DECIMAL(10,2) DEFAULT 0,
    income_amount DECIMAL(10,2) DEFAULT 0,
    payment_method VARCHAR(20) DEFAULT 'project' CHECK (payment_method IN ('project', 'personal')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL
);

-- 7. إنشاء جدول الفواتير (إذا لم يكن موجوداً)
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

-- 8. إنشاء جدول عناصر الفواتير (إذا لم يكن موجوداً)
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

-- 9. إنشاء الفهارس
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_current_stock ON products(current_stock);
CREATE INDEX IF NOT EXISTS idx_products_retail_price ON products(retail_price);
CREATE INDEX IF NOT EXISTS idx_products_shop_price ON products(shop_price);

CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_product_id ON purchases(product_id);
CREATE INDEX IF NOT EXISTS idx_purchases_purchase_date ON purchases(purchase_date);
CREATE INDEX IF NOT EXISTS idx_purchases_type ON purchases(type);
CREATE INDEX IF NOT EXISTS idx_purchases_funding_source ON purchases(funding_source);
CREATE INDEX IF NOT EXISTS idx_purchases_created_at ON purchases(created_at);

CREATE INDEX IF NOT EXISTS idx_raw_materials_user_id ON raw_materials(user_id);
CREATE INDEX IF NOT EXISTS idx_raw_materials_name ON raw_materials(name);
CREATE INDEX IF NOT EXISTS idx_raw_materials_current_stock ON raw_materials(current_stock);

CREATE INDEX IF NOT EXISTS idx_raw_material_purchases_user_id ON raw_material_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_raw_material_purchases_raw_material_id ON raw_material_purchases(raw_material_id);
CREATE INDEX IF NOT EXISTS idx_raw_material_purchases_purchase_date ON raw_material_purchases(purchase_date);

CREATE INDEX IF NOT EXISTS idx_raw_material_usage_user_id ON raw_material_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_raw_material_usage_raw_material_id ON raw_material_usage(raw_material_id);
CREATE INDEX IF NOT EXISTS idx_raw_material_usage_usage_date ON raw_material_usage(usage_date);

CREATE INDEX IF NOT EXISTS idx_cash_flow_user_id ON cash_flow(user_id);
CREATE INDEX IF NOT EXISTS idx_cash_flow_type ON cash_flow(type);
CREATE INDEX IF NOT EXISTS idx_cash_flow_created_at ON cash_flow(created_at);

CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_sale_type ON invoices(sale_type);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_product_id ON invoice_items(product_id);

-- 10. إعداد RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_material_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_material_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_flow ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- 11. سياسات الأمان للمنتجات (مشتركة بين المستخدمين)
DROP POLICY IF EXISTS "Products are viewable by everyone" ON products;
CREATE POLICY "Products are viewable by everyone" ON products
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert products" ON products;
CREATE POLICY "Users can insert products" ON products
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can update products" ON products;
CREATE POLICY "Users can update products" ON products
  FOR UPDATE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can delete products" ON products;
CREATE POLICY "Users can delete products" ON products
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- 12. سياسات الأمان للمشتريات
DROP POLICY IF EXISTS "Users can view their own purchases" ON purchases;
CREATE POLICY "Users can view their own purchases" ON purchases
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own purchases" ON purchases;
CREATE POLICY "Users can insert their own purchases" ON purchases
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own purchases" ON purchases;
CREATE POLICY "Users can update their own purchases" ON purchases
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own purchases" ON purchases;
CREATE POLICY "Users can delete their own purchases" ON purchases
  FOR DELETE USING (auth.uid() = user_id);

-- 13. سياسات الأمان للمواد الخام
DROP POLICY IF EXISTS "Users can view their own raw materials" ON raw_materials;
CREATE POLICY "Users can view their own raw materials" ON raw_materials
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own raw materials" ON raw_materials;
CREATE POLICY "Users can insert their own raw materials" ON raw_materials
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own raw materials" ON raw_materials;
CREATE POLICY "Users can update their own raw materials" ON raw_materials
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own raw materials" ON raw_materials;
CREATE POLICY "Users can delete their own raw materials" ON raw_materials
  FOR DELETE USING (auth.uid() = user_id);

-- 14. سياسات الأمان لمشتريات المواد الخام
DROP POLICY IF EXISTS "Users can view their own raw material purchases" ON raw_material_purchases;
CREATE POLICY "Users can view their own raw material purchases" ON raw_material_purchases
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own raw material purchases" ON raw_material_purchases;
CREATE POLICY "Users can insert their own raw material purchases" ON raw_material_purchases
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own raw material purchases" ON raw_material_purchases;
CREATE POLICY "Users can update their own raw material purchases" ON raw_material_purchases
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own raw material purchases" ON raw_material_purchases;
CREATE POLICY "Users can delete their own raw material purchases" ON raw_material_purchases
  FOR DELETE USING (auth.uid() = user_id);

-- 15. سياسات الأمان لاستخدام المواد الخام
DROP POLICY IF EXISTS "Users can view their own raw material usage" ON raw_material_usage;
CREATE POLICY "Users can view their own raw material usage" ON raw_material_usage
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own raw material usage" ON raw_material_usage;
CREATE POLICY "Users can insert their own raw material usage" ON raw_material_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own raw material usage" ON raw_material_usage;
CREATE POLICY "Users can update their own raw material usage" ON raw_material_usage
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own raw material usage" ON raw_material_usage;
CREATE POLICY "Users can delete their own raw material usage" ON raw_material_usage
  FOR DELETE USING (auth.uid() = user_id);

-- 16. سياسات الأمان للتدفق النقدي
DROP POLICY IF EXISTS "Users can view their own cash flow" ON cash_flow;
CREATE POLICY "Users can view their own cash flow" ON cash_flow
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own cash flow" ON cash_flow;
CREATE POLICY "Users can insert their own cash flow" ON cash_flow
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own cash flow" ON cash_flow;
CREATE POLICY "Users can update their own cash flow" ON cash_flow
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own cash flow" ON cash_flow;
CREATE POLICY "Users can delete their own cash flow" ON cash_flow
  FOR DELETE USING (auth.uid() = user_id);

-- 17. سياسات الأمان للفواتير
DROP POLICY IF EXISTS "Users can view their own invoices" ON invoices;
CREATE POLICY "Users can view their own invoices" ON invoices
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own invoices" ON invoices;
CREATE POLICY "Users can insert their own invoices" ON invoices
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own invoices" ON invoices;
CREATE POLICY "Users can update their own invoices" ON invoices
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own invoices" ON invoices;
CREATE POLICY "Users can delete their own invoices" ON invoices
  FOR DELETE USING (auth.uid() = user_id);

-- 18. سياسات الأمان لعناصر الفواتير
DROP POLICY IF EXISTS "Users can view their own invoice items" ON invoice_items;
CREATE POLICY "Users can view their own invoice items" ON invoice_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM invoices 
      WHERE invoices.id = invoice_items.invoice_id 
      AND invoices.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert their own invoice items" ON invoice_items;
CREATE POLICY "Users can insert their own invoice items" ON invoice_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices 
      WHERE invoices.id = invoice_items.invoice_id 
      AND invoices.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their own invoice items" ON invoice_items;
CREATE POLICY "Users can update their own invoice items" ON invoice_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM invoices 
      WHERE invoices.id = invoice_items.invoice_id 
      AND invoices.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete their own invoice items" ON invoice_items;
CREATE POLICY "Users can delete their own invoice items" ON invoice_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM invoices 
      WHERE invoices.id = invoice_items.invoice_id 
      AND invoices.user_id = auth.uid()
    )
  );

-- 19. إنشاء دالة لتحديث updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 20. إنشاء triggers لتحديث updated_at
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at 
    BEFORE UPDATE ON products 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_purchases_updated_at ON purchases;
CREATE TRIGGER update_purchases_updated_at 
    BEFORE UPDATE ON purchases 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_raw_materials_updated_at ON raw_materials;
CREATE TRIGGER update_raw_materials_updated_at 
    BEFORE UPDATE ON raw_materials 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_raw_material_purchases_updated_at ON raw_material_purchases;
CREATE TRIGGER update_raw_material_purchases_updated_at 
    BEFORE UPDATE ON raw_material_purchases 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_cash_flow_updated_at ON cash_flow;
CREATE TRIGGER update_cash_flow_updated_at 
    BEFORE UPDATE ON cash_flow 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at 
    BEFORE UPDATE ON invoices 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 21. حذف الدالة الموجودة أولاً ثم إنشاء دالة لتوليد رقم الفاتورة
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

-- 22. إنشاء دالة trigger لتوليد رقم الفاتورة تلقائياً
DROP FUNCTION IF EXISTS set_invoice_number_trigger() CASCADE;
CREATE OR REPLACE FUNCTION set_invoice_number_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- إذا كان رقم الفاتورة فارغاً أو null، قم بتوليد رقم جديد
    IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
        NEW.invoice_number := generate_invoice_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 23. إنشاء trigger لتوليد رقم الفاتورة تلقائياً
DROP TRIGGER IF EXISTS set_invoice_number ON invoices;
CREATE TRIGGER set_invoice_number
    BEFORE INSERT ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION set_invoice_number_trigger();

-- 24. إنشاء views
DROP VIEW IF EXISTS invoices_summary CASCADE;
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

DROP VIEW IF EXISTS invoices_detailed CASCADE;
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

-- 25. إضافة صلاحيات للمستخدمين
GRANT SELECT, INSERT, UPDATE, DELETE ON products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON purchases TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON raw_materials TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON raw_material_purchases TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON raw_material_usage TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON cash_flow TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON invoices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON invoice_items TO authenticated;
GRANT SELECT ON invoices_summary TO authenticated;
GRANT SELECT ON invoices_detailed TO authenticated;

-- 27. إضافة نظام إدارة الديون
-- إنشاء جدول الأشخاص/الجهات
CREATE TABLE IF NOT EXISTS debt_entities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) DEFAULT 'individual' CHECK (type IN ('individual', 'company', 'supplier', 'customer')),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL
);

-- إنشاء جدول الديون
CREATE TABLE IF NOT EXISTS debts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    entity_id UUID REFERENCES debt_entities(id) ON DELETE CASCADE NOT NULL,
    debt_type VARCHAR(20) NOT NULL CHECK (debt_type IN ('owed_to_me', 'owed_by_me')),
    original_amount DECIMAL(10,2) NOT NULL,
    current_balance DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EGP',
    due_date DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paid', 'cancelled', 'overdue')),
    description TEXT NOT NULL,
    category VARCHAR(100) DEFAULT 'general',
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL
);

-- إنشاء جدول معاملات الديون
CREATE TABLE IF NOT EXISTS debt_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    debt_id UUID REFERENCES debts(id) ON DELETE CASCADE NOT NULL,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('payment', 'receipt', 'adjustment')),
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'cash',
    reference_number VARCHAR(100),
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL
);

-- إنشاء جدول تذكيرات الديون
CREATE TABLE IF NOT EXISTS debt_reminders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    debt_id UUID REFERENCES debts(id) ON DELETE CASCADE NOT NULL,
    reminder_date DATE NOT NULL,
    reminder_type VARCHAR(20) DEFAULT 'due_date' CHECK (reminder_type IN ('due_date', 'overdue', 'custom')),
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'acknowledged')),
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL
);

-- إنشاء فهارس نظام الديون
CREATE INDEX IF NOT EXISTS idx_debt_entities_name ON debt_entities(name);
CREATE INDEX IF NOT EXISTS idx_debt_entities_type ON debt_entities(type);
CREATE INDEX IF NOT EXISTS idx_debt_entities_user_id ON debt_entities(user_id);

CREATE INDEX IF NOT EXISTS idx_debts_entity_id ON debts(entity_id);
CREATE INDEX IF NOT EXISTS idx_debts_debt_type ON debts(debt_type);
CREATE INDEX IF NOT EXISTS idx_debts_status ON debts(status);
CREATE INDEX IF NOT EXISTS idx_debts_due_date ON debts(due_date);
CREATE INDEX IF NOT EXISTS idx_debts_user_id ON debts(user_id);

CREATE INDEX IF NOT EXISTS idx_debt_transactions_debt_id ON debt_transactions(debt_id);
CREATE INDEX IF NOT EXISTS idx_debt_transactions_type ON debt_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_debt_transactions_date ON debt_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_debt_transactions_user_id ON debt_transactions(user_id);

CREATE INDEX IF NOT EXISTS idx_debt_reminders_debt_id ON debt_reminders(debt_id);
CREATE INDEX IF NOT EXISTS idx_debt_reminders_date ON debt_reminders(reminder_date);
CREATE INDEX IF NOT EXISTS idx_debt_reminders_status ON debt_reminders(status);
CREATE INDEX IF NOT EXISTS idx_debt_reminders_user_id ON debt_reminders(user_id);

-- إعداد RLS لنظام الديون
ALTER TABLE debt_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_reminders ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان لنظام الديون
DROP POLICY IF EXISTS "Users can view their own debt entities" ON debt_entities;
CREATE POLICY "Users can view their own debt entities" ON debt_entities
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own debt entities" ON debt_entities;
CREATE POLICY "Users can insert their own debt entities" ON debt_entities
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own debt entities" ON debt_entities;
CREATE POLICY "Users can update their own debt entities" ON debt_entities
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own debt entities" ON debt_entities;
CREATE POLICY "Users can delete their own debt entities" ON debt_entities
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own debts" ON debts;
CREATE POLICY "Users can view their own debts" ON debts
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own debts" ON debts;
CREATE POLICY "Users can insert their own debts" ON debts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own debts" ON debts;
CREATE POLICY "Users can update their own debts" ON debts
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own debts" ON debts;
CREATE POLICY "Users can delete their own debts" ON debts
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own debt transactions" ON debt_transactions;
CREATE POLICY "Users can view their own debt transactions" ON debt_transactions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own debt transactions" ON debt_transactions;
CREATE POLICY "Users can insert their own debt transactions" ON debt_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own debt transactions" ON debt_transactions;
CREATE POLICY "Users can insert their own debt transactions" ON debt_transactions
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own debt transactions" ON debt_transactions;
CREATE POLICY "Users can delete their own debt transactions" ON debt_transactions
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own debt reminders" ON debt_reminders;
CREATE POLICY "Users can view their own debt reminders" ON debt_reminders
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own debt reminders" ON debt_reminders;
CREATE POLICY "Users can insert their own debt reminders" ON debt_reminders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own debt reminders" ON debt_reminders;
CREATE POLICY "Users can update their own debt reminders" ON debt_reminders
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own debt reminders" ON debt_reminders;
CREATE POLICY "Users can delete their own debt reminders" ON debt_reminders
  FOR DELETE USING (auth.uid() = user_id);

-- إنشاء دوال نظام الديون
CREATE OR REPLACE FUNCTION update_debt_balance()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE debts 
    SET current_balance = (
        SELECT 
            CASE 
                WHEN d.debt_type = 'owed_to_me' THEN 
                    d.original_amount - COALESCE(SUM(CASE WHEN dt.transaction_type = 'receipt' THEN dt.amount ELSE 0 END), 0)
                ELSE 
                    d.original_amount - COALESCE(SUM(CASE WHEN dt.transaction_type = 'payment' THEN dt.amount ELSE 0 END), 0)
            END
        FROM debts d
        LEFT JOIN debt_transactions dt ON d.id = dt.debt_id
        WHERE d.id = NEW.debt_id
        GROUP BY d.id, d.original_amount, d.debt_type
    ),
    updated_at = NOW()
    WHERE id = NEW.debt_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_debt_status()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE debts 
    SET 
        status = CASE 
            WHEN current_balance <= 0 THEN 'paid'
            WHEN due_date < CURRENT_DATE AND current_balance > 0 THEN 'overdue'
            ELSE 'active'
        END,
        updated_at = NOW()
    WHERE id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء triggers لنظام الديون
DROP TRIGGER IF EXISTS update_debt_balance_trigger ON debt_transactions;
CREATE TRIGGER update_debt_balance_trigger
    AFTER INSERT OR UPDATE OR DELETE ON debt_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_debt_balance();

DROP TRIGGER IF EXISTS update_debt_status_trigger ON debts;
CREATE TRIGGER update_debt_status_trigger
    AFTER INSERT OR UPDATE ON debts
    FOR EACH ROW
    EXECUTE FUNCTION update_debt_status();

-- إنشاء views لنظام الديون
DROP VIEW IF EXISTS debt_summary CASCADE;
CREATE OR REPLACE VIEW debt_summary AS
SELECT 
    d.id,
    de.name as entity_name,
    de.type as entity_type,
    d.debt_type,
    d.original_amount,
    d.current_balance,
    d.currency,
    d.due_date,
    d.status,
    d.description,
    d.category,
    d.priority,
    d.created_at,
    d.updated_at,
    CASE 
        WHEN d.debt_type = 'owed_to_me' THEN 'أموال عليك'
        ELSE 'أموال عليهم'
        END as debt_type_arabic,
    CASE 
        WHEN d.status = 'active' THEN 'نشط'
        WHEN d.status = 'paid' THEN 'مدفوع'
        WHEN d.status = 'overdue' THEN 'متأخر'
        ELSE 'ملغي'
    END as status_arabic
FROM debts d
JOIN debt_entities de ON d.entity_id = de.id;

DROP VIEW IF EXISTS debt_balance_summary CASCADE;
CREATE OR REPLACE VIEW debt_balance_summary AS
SELECT 
    debt_type,
    COUNT(*) as total_debts,
    SUM(original_amount) as total_original_amount,
    SUM(current_balance) as total_current_balance,
    SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_debts,
    SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_debts,
    SUM(CASE WHEN status = 'overdue' THEN 1 ELSE 0 END) as overdue_debts
FROM debts
GROUP BY debt_type;

DROP VIEW IF EXISTS debt_transactions_summary CASCADE;
CREATE OR REPLACE VIEW debt_transactions_summary AS
SELECT 
    dt.id,
    de.name as entity_name,
    d.description as debt_description,
    dt.transaction_type,
    dt.amount,
    dt.payment_method,
    dt.reference_number,
    dt.transaction_date,
    dt.notes,
    dt.created_at,
    CASE 
        WHEN dt.transaction_type = 'payment' THEN 'دفع'
        WHEN dt.transaction_type = 'receipt' THEN 'قبض'
        ELSE 'تعديل'
    END as transaction_type_arabic
FROM debt_transactions dt
JOIN debts d ON dt.debt_id = d.id
JOIN debt_entities de ON d.entity_id = de.id;

-- إضافة صلاحيات نظام الديون
GRANT SELECT, INSERT, UPDATE, DELETE ON debt_entities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON debts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON debt_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON debt_reminders TO authenticated;
GRANT SELECT ON debt_summary TO authenticated;
GRANT SELECT ON debt_balance_summary TO authenticated;
GRANT SELECT ON debt_transactions_summary TO authenticated;

-- 28. رسالة نجاح
DO $$
BEGIN
    RAISE NOTICE 'تم إصلاح قاعدة البيانات بنجاح!';
    RAISE NOTICE 'تم إنشاء/تحديث جميع الجداول المطلوبة';
    RAISE NOTICE 'تم إنشاء الفهارس والـ RLS';
    RAISE NOTICE 'تم إنشاء الدوال والـ Triggers';
    RAISE NOTICE 'تم إنشاء الـ Views';
    RAISE NOTICE 'تم إعداد نظام إدارة الديون';
    RAISE NOTICE 'النظام جاهز للاستخدام!';
END $$;
