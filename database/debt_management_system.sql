-- ===================================================================
-- نظام إدارة الديون والذمم المدينة - Debt Management System
-- ===================================================================

-- 1. إنشاء جدول الأشخاص/الجهات (الأفراد والشركات)
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

-- 2. إنشاء جدول الديون (الذمم المدينة والدائنة)
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

-- 3. إنشاء جدول المدفوعات والمقبوضات
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

-- 4. إنشاء جدول تذكيرات الديون
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

-- 5. إنشاء الفهارس
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

-- 6. إعداد RLS
ALTER TABLE debt_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_reminders ENABLE ROW LEVEL SECURITY;

-- 7. سياسات الأمان للأشخاص/الجهات
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

-- 8. سياسات الأمان للديون
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

-- 9. سياسات الأمان للمعاملات
DROP POLICY IF EXISTS "Users can view their own debt transactions" ON debt_transactions;
CREATE POLICY "Users can view their own debt transactions" ON debt_transactions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own debt transactions" ON debt_transactions;
CREATE POLICY "Users can insert their own debt transactions" ON debt_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own debt transactions" ON debt_transactions;
CREATE POLICY "Users can update their own debt transactions" ON debt_transactions
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own debt transactions" ON debt_transactions;
CREATE POLICY "Users can delete their own debt transactions" ON debt_transactions
  FOR DELETE USING (auth.uid() = user_id);

-- 10. سياسات الأمان للتذكيرات
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

-- 11. إنشاء دالة لتحديث رصيد الدين
CREATE OR REPLACE FUNCTION update_debt_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- تحديث رصيد الدين بناءً على المعاملات
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

-- 12. إنشاء trigger لتحديث رصيد الدين
DROP TRIGGER IF EXISTS update_debt_balance_trigger ON debt_transactions;
CREATE TRIGGER update_debt_balance_trigger
    AFTER INSERT OR UPDATE OR DELETE ON debt_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_debt_balance();

-- 13. إنشاء دالة لتحديث حالة الدين
CREATE OR REPLACE FUNCTION update_debt_status()
RETURNS TRIGGER AS $$
BEGIN
    -- تحديث حالة الدين بناءً على الرصيد والتاريخ
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

-- 14. إنشاء trigger لتحديث حالة الدين
DROP TRIGGER IF EXISTS update_debt_status_trigger ON debts;
CREATE TRIGGER update_debt_status_trigger
    AFTER INSERT OR UPDATE ON debts
    FOR EACH ROW
    EXECUTE FUNCTION update_debt_status();

-- 15. إنشاء دالة لتحديث updated_at
CREATE OR REPLACE FUNCTION update_debt_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 16. إنشاء triggers لتحديث updated_at
DROP TRIGGER IF EXISTS update_debt_entities_updated_at ON debt_entities;
CREATE TRIGGER update_debt_entities_updated_at 
    BEFORE UPDATE ON debt_entities 
    FOR EACH ROW 
    EXECUTE FUNCTION update_debt_updated_at();

DROP TRIGGER IF EXISTS update_debts_updated_at ON debts;
CREATE TRIGGER update_debts_updated_at 
    BEFORE UPDATE ON debts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_debt_updated_at();

-- 17. إنشاء views مفيدة
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

-- 18. إضافة صلاحيات للمستخدمين
GRANT SELECT, INSERT, UPDATE, DELETE ON debt_entities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON debts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON debt_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON debt_reminders TO authenticated;
GRANT SELECT ON debt_summary TO authenticated;
GRANT SELECT ON debt_balance_summary TO authenticated;
GRANT SELECT ON debt_transactions_summary TO authenticated;

-- 19. رسالة نجاح
DO $$
BEGIN
    RAISE NOTICE 'تم إنشاء نظام إدارة الديون بنجاح!';
    RAISE NOTICE 'تم إنشاء الجداول: debt_entities, debts, debt_transactions, debt_reminders';
    RAISE NOTICE 'تم إنشاء الفهارس والـ RLS';
    RAISE NOTICE 'تم إنشاء الدوال والـ Triggers';
    RAISE NOTICE 'تم إنشاء الـ Views: debt_summary, debt_balance_summary, debt_transactions_summary';
    RAISE NOTICE 'النظام جاهز لتتبع الديون والذمم المدينة!';
END $$;
