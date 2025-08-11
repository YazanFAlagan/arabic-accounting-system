-- Add payment_method column to purchases table
-- This script adds the payment method column to track whether expenses are from project or personal funds

-- Add the payment_method column to existing table
ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'project' 
CHECK (payment_method IN ('project', 'personal'));

-- Update any existing records to have the default value
UPDATE purchases 
SET payment_method = 'project' 
WHERE payment_method IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN purchases.payment_method IS 'Payment method: project (من أموال المشروع) or personal (من الأموال الشخصية)';

-- Create index for better performance when filtering by payment method
CREATE INDEX IF NOT EXISTS idx_purchases_payment_method ON purchases(payment_method);
