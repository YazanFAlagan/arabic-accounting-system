-- ===================================================================
-- تحديث لوحة التحكم والتقارير لتشمل بيانات الفواتير
-- Update Dashboard and Reports to Include Invoice Data
-- ===================================================================

-- 1. إنشاء دالة لحساب إجمالي المبيعات (تشمل الفواتير والمبيعات القديمة)
-- Create function to calculate total sales (including invoices and old sales)
CREATE OR REPLACE FUNCTION get_total_sales_revenue(user_uuid UUID DEFAULT NULL)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    total_revenue DECIMAL(10,2) := 0;
    sales_revenue DECIMAL(10,2) := 0;
    invoices_revenue DECIMAL(10,2) := 0;
BEGIN
    -- حساب إجمالي المبيعات من جدول sales
    SELECT COALESCE(SUM(total_price), 0)
    INTO sales_revenue
    FROM sales 
    WHERE user_id = COALESCE(user_uuid, auth.uid());
    
    -- حساب إجمالي المبيعات من جدول invoices
    SELECT COALESCE(SUM(total_amount), 0)
    INTO invoices_revenue
    FROM invoices 
    WHERE user_id = COALESCE(user_uuid, auth.uid());
    
    -- المجموع الكلي
    total_revenue := sales_revenue + invoices_revenue;
    
    RETURN total_revenue;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. إنشاء دالة لحساب إجمالي الأرباح (تشمل الفواتير والمبيعات القديمة)
-- Create function to calculate total profit (including invoices and old sales)
CREATE OR REPLACE FUNCTION get_total_profit(user_uuid UUID DEFAULT NULL)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    total_profit DECIMAL(10,2) := 0;
    sales_profit DECIMAL(10,2) := 0;
    invoices_profit DECIMAL(10,2) := 0;
BEGIN
    -- حساب أرباح المبيعات القديمة
    SELECT COALESCE(SUM(
        (s.unit_price - COALESCE(p.wholesale_price, 0)) * s.quantity
    ), 0)
    INTO sales_profit
    FROM sales s
    LEFT JOIN products p ON s.product_name = p.name
    WHERE s.user_id = COALESCE(user_uuid, auth.uid());
    
    -- حساب أرباح الفواتير
    SELECT COALESCE(SUM(
        (ii.final_unit_price - COALESCE(p.wholesale_price, 0)) * ii.quantity
    ), 0)
    INTO invoices_profit
    FROM invoice_items ii
    JOIN invoices i ON ii.invoice_id = i.id
    LEFT JOIN products p ON ii.product_id = p.id
    WHERE i.user_id = COALESCE(user_uuid, auth.uid());
    
    -- المجموع الكلي
    total_profit := sales_profit + invoices_profit;
    
    RETURN total_profit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. إنشاء دالة لحساب إجمالي المبيعات اليومية
-- Create function to calculate daily sales
CREATE OR REPLACE FUNCTION get_daily_sales_revenue(user_uuid UUID DEFAULT NULL)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    daily_revenue DECIMAL(10,2) := 0;
    sales_revenue DECIMAL(10,2) := 0;
    invoices_revenue DECIMAL(10,2) := 0;
BEGIN
    -- مبيعات اليوم من جدول sales
    SELECT COALESCE(SUM(total_price), 0)
    INTO sales_revenue
    FROM sales 
    WHERE user_id = COALESCE(user_uuid, auth.uid())
    AND DATE(sale_date) = CURRENT_DATE;
    
    -- مبيعات اليوم من جدول invoices
    SELECT COALESCE(SUM(total_amount), 0)
    INTO invoices_revenue
    FROM invoices 
    WHERE user_id = COALESCE(user_uuid, auth.uid())
    AND DATE(invoice_date) = CURRENT_DATE;
    
    daily_revenue := sales_revenue + invoices_revenue;
    
    RETURN daily_revenue;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. إنشاء دالة لحساب إجمالي المبيعات الشهرية
-- Create function to calculate monthly sales
CREATE OR REPLACE FUNCTION get_monthly_sales_revenue(user_uuid UUID DEFAULT NULL)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    monthly_revenue DECIMAL(10,2) := 0;
    sales_revenue DECIMAL(10,2) := 0;
    invoices_revenue DECIMAL(10,2) := 0;
BEGIN
    -- مبيعات الشهر من جدول sales
    SELECT COALESCE(SUM(total_price), 0)
    INTO sales_revenue
    FROM sales 
    WHERE user_id = COALESCE(user_uuid, auth.uid())
    AND DATE_TRUNC('month', sale_date) = DATE_TRUNC('month', CURRENT_DATE);
    
    -- مبيعات الشهر من جدول invoices
    SELECT COALESCE(SUM(total_amount), 0)
    INTO invoices_revenue
    FROM invoices 
    WHERE user_id = COALESCE(user_uuid, auth.uid())
    AND DATE_TRUNC('month', invoice_date) = DATE_TRUNC('month', CURRENT_DATE);
    
    monthly_revenue := sales_revenue + invoices_revenue;
    
    RETURN monthly_revenue;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. إنشاء عرض شامل للمبيعات (تشمل الفواتير والمبيعات القديمة)
-- Create comprehensive sales view (including invoices and old sales)
CREATE OR REPLACE VIEW comprehensive_sales_view AS
SELECT 
    'sale' as source_type,
    id,
    user_id,
    product_name,
    quantity,
    unit_price,
    total_price as total_amount,
    sale_date as transaction_date,
    customer_name,
    sale_type,
    created_at,
    'old_sales' as source_table
FROM sales

UNION ALL

SELECT 
    'invoice' as source_type,
    i.id,
    i.user_id,
    ii.product_name,
    ii.quantity,
    ii.final_unit_price as unit_price,
    ii.line_total as total_amount,
    i.invoice_date as transaction_date,
    i.customer_name,
    i.sale_type,
    i.created_at,
    'invoices' as source_table
FROM invoices i
JOIN invoice_items ii ON i.id = ii.invoice_id;

-- 6. إنشاء عرض لإحصائيات لوحة التحكم المحدثة
-- Create view for updated dashboard statistics
CREATE OR REPLACE VIEW dashboard_stats_view AS
SELECT 
    get_total_sales_revenue() as total_sales_revenue,
    get_total_profit() as total_profit,
    get_daily_sales_revenue() as daily_sales,
    get_monthly_sales_revenue() as monthly_sales,
    (SELECT COUNT(*) FROM products) as total_products,
    (SELECT COUNT(*) FROM products WHERE current_stock <= min_stock_alert) as low_stock_products,
    (SELECT COALESCE(SUM(total_cost), 0) FROM purchases) as total_expenses,
    get_total_sales_revenue() - (SELECT COALESCE(SUM(total_cost), 0) FROM purchases) as available_funds;

-- 7. إنشاء دالة لتحديث الإحصائيات في الوقت الفعلي
-- Create function to update statistics in real-time
CREATE OR REPLACE FUNCTION refresh_dashboard_stats()
RETURNS TABLE(
    total_sales_revenue DECIMAL(10,2),
    total_profit DECIMAL(10,2),
    daily_sales DECIMAL(10,2),
    monthly_sales DECIMAL(10,2),
    total_products BIGINT,
    low_stock_products BIGINT,
    total_expenses DECIMAL(10,2),
    available_funds DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        get_total_sales_revenue(),
        get_total_profit(),
        get_daily_sales_revenue(),
        get_monthly_sales_revenue(),
        (SELECT COUNT(*) FROM products),
        (SELECT COUNT(*) FROM products WHERE current_stock <= min_stock_alert),
        (SELECT COALESCE(SUM(total_cost), 0) FROM purchases),
        get_total_sales_revenue() - (SELECT COALESCE(SUM(total_cost), 0) FROM purchases);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. منح الصلاحيات
-- Grant permissions
GRANT EXECUTE ON FUNCTION get_total_sales_revenue(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_total_profit(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_sales_revenue(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_monthly_sales_revenue(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_dashboard_stats() TO authenticated;
GRANT SELECT ON comprehensive_sales_view TO authenticated;
GRANT SELECT ON dashboard_stats_view TO authenticated;

-- 9. اختبار الدوال
-- Test functions
SELECT 'Testing dashboard functions...' as test_message;
SELECT get_total_sales_revenue() as total_revenue;
SELECT get_total_profit() as total_profit;
SELECT get_daily_sales_revenue() as daily_sales;
SELECT get_monthly_sales_revenue() as monthly_sales;

-- ===================================================================
-- تم تحديث لوحة التحكم لتشمل بيانات الفواتير
-- Dashboard updated to include invoice data!
-- ===================================================================

SELECT 'تم تحديث لوحة التحكم لتشمل بيانات الفواتير! Dashboard updated to include invoice data!' as status;
