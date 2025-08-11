-- ===================================================================
-- إعداد قاعدة البيانات الكامل للنظام المحاسبي العربي
-- Complete Database Setup for Arabic Accounting System
-- ===================================================================

-- 1. إضافة عمود نوع الدفع لجدول المشتريات
-- Add payment_method column to purchases table
ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'project' 
CHECK (payment_method IN ('project', 'personal'));

-- تحديث السجلات الموجودة
UPDATE purchases 
SET payment_method = 'project' 
WHERE payment_method IS NULL;

-- إضافة تعليق توضيحي
COMMENT ON COLUMN purchases.payment_method IS 'Payment method: project (من أموال المشروع) or personal (من الأموال الشخصية)';

-- إنشاء فهرس للأداء
CREATE INDEX IF NOT EXISTS idx_purchases_payment_method ON purchases(payment_method);

-- ===================================================================

-- 2. إضافة عمود مصدر التمويل لجدول مشتريات المواد الخام
-- Add funding_source column to raw_material_purchases table
ALTER TABLE raw_material_purchases 
ADD COLUMN IF NOT EXISTS funding_source VARCHAR(50) DEFAULT 'project' 
CHECK (funding_source IN ('project', 'personal'));

-- تحديث السجلات الموجودة
UPDATE raw_material_purchases 
SET funding_source = 'project' 
WHERE funding_source IS NULL;

-- إضافة تعليق توضيحي
COMMENT ON COLUMN raw_material_purchases.funding_source IS 'Source of funding: project (من أموال المشروع) or personal (من الأموال الشخصية)';

-- ===================================================================

-- 3. إنشاء جدول تدفق النقدية (إذا لم يكن موجوداً)
-- Create cash_flow table if it doesn't exist
CREATE TABLE IF NOT EXISTS cash_flow (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('income', 'expense', 'purchase')),
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  payment_method VARCHAR(50) DEFAULT 'project' CHECK (payment_method IN ('project', 'personal')),
  reference_id UUID, -- للربط مع جداول أخرى
  reference_table VARCHAR(50), -- اسم الجدول المرجعي
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_cash_flow_user_id ON cash_flow(user_id);
CREATE INDEX IF NOT EXISTS idx_cash_flow_transaction_type ON cash_flow(transaction_type);
CREATE INDEX IF NOT EXISTS idx_cash_flow_payment_method ON cash_flow(payment_method);
CREATE INDEX IF NOT EXISTS idx_cash_flow_transaction_date ON cash_flow(transaction_date);

-- إعداد RLS (Row Level Security)
ALTER TABLE cash_flow ENABLE ROW LEVEL SECURITY;

-- سياسة الأمان للمستخدمين
CREATE POLICY "Users can view their own cash flow records" ON cash_flow
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cash flow records" ON cash_flow
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cash flow records" ON cash_flow
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cash flow records" ON cash_flow
  FOR DELETE USING (auth.uid() = user_id);

-- ===================================================================

-- 4. إضافة عمود الملاحظات لجدول المشتريات (إذا لم يكن موجوداً)
-- Add notes column to purchases table if it doesn't exist
ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- إضافة تعليق توضيحي
COMMENT ON COLUMN purchases.notes IS 'Additional notes for the purchase';

-- ===================================================================

-- 5. التأكد من وجود جميع الأعمدة المطلوبة في جدول المشتريات
-- Ensure all required columns exist in purchases table

-- إضافة عمود الوحدة إذا لم يكن موجوداً
ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'قطعة';

-- إضافة عمود تنبيه المخزون المنخفض
ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS min_stock_alert INTEGER DEFAULT 10;

-- ===================================================================

-- 6. إنشاء دالة لحساب الأموال المتاحة
-- Create function to calculate available funds
CREATE OR REPLACE FUNCTION get_available_funds(user_uuid UUID, payment_type VARCHAR DEFAULT 'project')
RETURNS DECIMAL(10,2) AS $$
DECLARE
    total_income DECIMAL(10,2) := 0;
    total_expenses DECIMAL(10,2) := 0;
    available_funds DECIMAL(10,2) := 0;
BEGIN
    -- حساب إجمالي الدخل من المبيعات
    SELECT COALESCE(SUM(total_amount), 0) INTO total_income
    FROM sales 
    WHERE user_id = user_uuid;
    
    -- حساب إجمالي المصروفات حسب نوع الدفع
    SELECT COALESCE(SUM(total_cost), 0) INTO total_expenses
    FROM purchases 
    WHERE user_id = user_uuid 
    AND (payment_method = payment_type OR (payment_method IS NULL AND payment_type = 'project'));
    
    -- حساب الأموال المتاحة
    available_funds := total_income - total_expenses;
    
    RETURN available_funds;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================================================

-- 7. إنشاء دالة لحساب إحصائيات المشروع
-- Create function to get project statistics
CREATE OR REPLACE FUNCTION get_project_stats(user_uuid UUID)
RETURNS TABLE(
    total_sales DECIMAL(10,2),
    total_project_expenses DECIMAL(10,2),
    total_personal_expenses DECIMAL(10,2),
    available_project_funds DECIMAL(10,2),
    net_profit DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE((SELECT SUM(total_amount) FROM sales WHERE user_id = user_uuid), 0) as total_sales,
        COALESCE((SELECT SUM(total_cost) FROM purchases WHERE user_id = user_uuid AND (payment_method = 'project' OR payment_method IS NULL)), 0) as total_project_expenses,
        COALESCE((SELECT SUM(total_cost) FROM purchases WHERE user_id = user_uuid AND payment_method = 'personal'), 0) as total_personal_expenses,
        COALESCE((SELECT SUM(total_amount) FROM sales WHERE user_id = user_uuid), 0) - 
        COALESCE((SELECT SUM(total_cost) FROM purchases WHERE user_id = user_uuid AND (payment_method = 'project' OR payment_method IS NULL)), 0) as available_project_funds,
        COALESCE((SELECT SUM(total_amount) FROM sales WHERE user_id = user_uuid), 0) - 
        COALESCE((SELECT SUM(total_cost) FROM purchases WHERE user_id = user_uuid AND (payment_method = 'project' OR payment_method IS NULL)), 0) as net_profit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================================================

-- 8. إنشاء trigger لتحديث timestamp
-- Create trigger to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- تطبيق trigger على جدول cash_flow
DROP TRIGGER IF EXISTS update_cash_flow_updated_at ON cash_flow;
CREATE TRIGGER update_cash_flow_updated_at
    BEFORE UPDATE ON cash_flow
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ===================================================================

-- 9. منح الصلاحيات المطلوبة
-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ===================================================================

-- 10. إنشاء views مفيدة للتقارير
-- Create useful views for reporting

-- عرض ملخص المصروفات حسب النوع
CREATE OR REPLACE VIEW expenses_summary AS
SELECT 
    user_id,
    payment_method,
    COUNT(*) as transaction_count,
    SUM(total_cost) as total_amount,
    AVG(total_cost) as average_amount,
    MIN(purchase_date) as first_transaction,
    MAX(purchase_date) as last_transaction
FROM purchases 
GROUP BY user_id, payment_method;

-- عرض الأموال المتاحة لكل مستخدم
CREATE OR REPLACE VIEW user_funds_summary AS
SELECT 
    u.id as user_id,
    u.email,
    COALESCE(s.total_sales, 0) as total_sales,
    COALESCE(pe.project_expenses, 0) as project_expenses,
    COALESCE(pe2.personal_expenses, 0) as personal_expenses,
    COALESCE(s.total_sales, 0) - COALESCE(pe.project_expenses, 0) as available_project_funds
FROM auth.users u
LEFT JOIN (
    SELECT user_id, SUM(total_amount) as total_sales 
    FROM sales 
    GROUP BY user_id
) s ON u.id = s.user_id
LEFT JOIN (
    SELECT user_id, SUM(total_cost) as project_expenses 
    FROM purchases 
    WHERE payment_method = 'project' OR payment_method IS NULL
    GROUP BY user_id
) pe ON u.id = pe.user_id
LEFT JOIN (
    SELECT user_id, SUM(total_cost) as personal_expenses 
    FROM purchases 
    WHERE payment_method = 'personal'
    GROUP BY user_id
) pe2 ON u.id = pe2.user_id;

-- ===================================================================

-- تم الانتهاء من إعداد قاعدة البيانات
-- Database setup completed successfully!

SELECT 'تم إعداد قاعدة البيانات بنجاح! Database setup completed successfully!' as status;
