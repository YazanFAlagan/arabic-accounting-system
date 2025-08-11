-- Cash Flow Management Table Schema for Supabase
-- This table manages cash flow tracking for the accounting system

-- Create cash_flow table
CREATE TABLE IF NOT EXISTS cash_flow (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
    amount DECIMAL(12,2) NOT NULL, -- Current balance after this transaction
    description TEXT NOT NULL,
    expense_amount DECIMAL(12,2), -- Amount of expense (for expense transactions)
    income_amount DECIMAL(12,2), -- Amount of income (for income transactions)
    payment_method VARCHAR(20) DEFAULT 'project' CHECK (payment_method IN ('project', 'personal')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_cash_flow_user_id ON cash_flow(user_id);
CREATE INDEX IF NOT EXISTS idx_cash_flow_created_at ON cash_flow(created_at);
CREATE INDEX IF NOT EXISTS idx_cash_flow_type ON cash_flow(type);

-- Enable Row Level Security
ALTER TABLE cash_flow ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own cash flow records" ON cash_flow
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cash flow records" ON cash_flow
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cash flow records" ON cash_flow
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cash flow records" ON cash_flow
    FOR DELETE USING (auth.uid() = user_id);

-- Insert initial cash flow record (optional - can be done through the app)
-- This creates an initial balance of 0 for demonstration
-- INSERT INTO cash_flow (type, amount, description, user_id) 
-- VALUES ('income', 0, 'Initial balance', auth.uid());

-- Comments for documentation
COMMENT ON TABLE cash_flow IS 'Table for tracking cash flow and financial transactions';
COMMENT ON COLUMN cash_flow.type IS 'Type of transaction: income or expense';
COMMENT ON COLUMN cash_flow.amount IS 'Current balance after this transaction';
COMMENT ON COLUMN cash_flow.expense_amount IS 'Amount spent (for expense transactions)';
COMMENT ON COLUMN cash_flow.income_amount IS 'Amount received (for income transactions)';
COMMENT ON COLUMN cash_flow.payment_method IS 'Payment method: project funds or personal funds';
