-- ===================================================================
-- التحقق من إعداد نظام الفواتير
-- Verify Invoice System Setup
-- ===================================================================

-- 1. التحقق من وجود الجداول المطلوبة
-- Check if required tables exist
SELECT 
    'Tables Check' as check_type,
    table_name,
    CASE 
        WHEN table_name IS NOT NULL THEN '✅ موجود'
        ELSE '❌ غير موجود'
    END as status
FROM (
    SELECT 'invoices' as table_name
    UNION ALL SELECT 'invoice_items'
    UNION ALL SELECT 'products'
) t
WHERE EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = t.table_name
);

-- 2. التحقق من وجود الدوال المطلوبة
-- Check if required functions exist
SELECT 
    'Functions Check' as check_type,
    routine_name,
    CASE 
        WHEN routine_name IS NOT NULL THEN '✅ موجود'
        ELSE '❌ غير موجود'
    END as status
FROM (
    SELECT 'generate_invoice_number' as routine_name
    UNION ALL SELECT 'calculate_invoice_totals'
) f
WHERE EXISTS (
    SELECT 1 
    FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name = f.routine_name
);

-- 3. التحقق من وجود المحفزات
-- Check if required triggers exist
SELECT 
    'Triggers Check' as check_type,
    trigger_name,
    CASE 
        WHEN trigger_name IS NOT NULL THEN '✅ موجود'
        ELSE '❌ غير موجود'
    END as status
FROM (
    SELECT 'trigger_update_invoice_totals' as trigger_name
    UNION ALL SELECT 'trigger_update_stock_on_invoice_change'
) tr
WHERE EXISTS (
    SELECT 1 
    FROM information_schema.triggers 
    WHERE trigger_schema = 'public' 
    AND trigger_name = tr.trigger_name
);

-- 4. التحقق من وجود الأعمدة المطلوبة في جدول المنتجات
-- Check if required columns exist in products table
SELECT 
    'Products Columns Check' as check_type,
    column_name,
    CASE 
        WHEN column_name IS NOT NULL THEN '✅ موجود'
        ELSE '❌ غير موجود'
    END as status
FROM (
    SELECT 'retail_price' as column_name
    UNION ALL SELECT 'shop_price'
    UNION ALL SELECT 'wholesale_price'
) c
WHERE EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'products'
    AND column_name = c.column_name
);

-- 5. التحقق من وجود الأعمدة المطلوبة في جدول الفواتير
-- Check if required columns exist in invoices table
SELECT 
    'Invoices Columns Check' as check_type,
    column_name,
    CASE 
        WHEN column_name IS NOT NULL THEN '✅ موجود'
        ELSE '❌ غير موجود'
    END as status
FROM (
    SELECT 'invoice_number' as column_name
    UNION ALL SELECT 'customer_name'
    UNION ALL SELECT 'sale_type'
    UNION ALL SELECT 'subtotal'
    UNION ALL SELECT 'total_amount'
) c
WHERE EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'invoices'
    AND column_name = c.column_name
);

-- 6. التحقق من وجود الأعمدة المطلوبة في جدول عناصر الفواتير
-- Check if required columns exist in invoice_items table
SELECT 
    'Invoice Items Columns Check' as check_type,
    column_name,
    CASE 
        WHEN column_name IS NOT NULL THEN '✅ موجود'
        ELSE '❌ غير موجود'
    END as status
FROM (
    SELECT 'invoice_id' as column_name
    UNION ALL SELECT 'product_id'
    UNION ALL SELECT 'product_name'
    UNION ALL SELECT 'quantity'
    UNION ALL SELECT 'unit_price'
    UNION ALL SELECT 'line_total'
) c
WHERE EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'invoice_items'
    AND column_name = c.column_name
);

-- 7. اختبار دالة توليد رقم الفاتورة
-- Test invoice number generation function
SELECT 
    'Function Test' as check_type,
    'generate_invoice_number' as function_name,
    CASE 
        WHEN generate_invoice_number() IS NOT NULL THEN '✅ تعمل بشكل صحيح'
        ELSE '❌ لا تعمل'
    END as status;

-- 8. التحقق من وجود البيانات في جدول المنتجات
-- Check if products table has data
SELECT 
    'Data Check' as check_type,
    'products' as table_name,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ يحتوي على ' || COUNT(*) || ' منتج'
        ELSE '❌ فارغ'
    END as status
FROM products;

-- 9. التحقق من إعداد RLS
-- Check RLS setup
SELECT 
    'RLS Check' as check_type,
    schemaname || '.' || tablename as table_name,
    CASE 
        WHEN rowsecurity THEN '✅ مفعل'
        ELSE '❌ غير مفعل'
    END as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('invoices', 'invoice_items');

-- 10. ملخص شامل
-- Comprehensive summary
SELECT 
    'SUMMARY' as check_type,
    'Invoice System Status' as description,
    CASE 
        WHEN (
            SELECT COUNT(*) FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('invoices', 'invoice_items')
        ) = 2
        AND (
            SELECT COUNT(*) FROM information_schema.routines 
            WHERE routine_schema = 'public' 
            AND routine_name IN ('generate_invoice_number', 'calculate_invoice_totals')
        ) = 2
        THEN '✅ النظام جاهز للاستخدام'
        ELSE '❌ النظام يحتاج إلى إعداد'
    END as status;
