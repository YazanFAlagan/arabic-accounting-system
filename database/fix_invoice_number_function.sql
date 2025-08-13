-- ===================================================================
-- إصلاح دالة توليد رقم الفاتورة
-- Fix Invoice Number Generation Function
-- ===================================================================

-- حذف الدالة القديمة إذا كانت موجودة
DROP FUNCTION IF EXISTS generate_invoice_number();

-- إنشاء دالة محسنة لتوليد رقم الفاتورة
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
    current_year TEXT;
    current_month TEXT;
    next_number INTEGER;
    invoice_number TEXT;
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
        invoice_number := 'INV-' || current_year || current_month || '-0001';
        RETURN invoice_number;
    END IF;
    
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
    
    -- إذا لم توجد فواتير في هذا الشهر، ابدأ من 1
    IF next_number IS NULL THEN
        next_number := 1;
    END IF;
    
    -- تكوين رقم الفاتورة الجديد
    invoice_number := 'INV-' || current_year || current_month || '-' || LPAD(next_number::TEXT, 4, '0');
    
    RETURN invoice_number;
END;
$$ LANGUAGE plpgsql;

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION generate_invoice_number() TO authenticated;

-- اختبار الدالة
SELECT 'Testing generate_invoice_number function...' as test_message;
SELECT generate_invoice_number() as generated_number;

-- ===================================================================
-- تم إصلاح دالة توليد رقم الفاتورة
-- Invoice number generation function fixed successfully!
-- ===================================================================

SELECT 'تم إصلاح دالة توليد رقم الفاتورة بنجاح! Invoice number generation function fixed successfully!' as status;
