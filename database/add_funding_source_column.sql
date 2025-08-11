-- Add funding_source column to raw_material_purchases table
-- This script fixes the missing column error in the raw materials system

-- Add the funding_source column to existing table
ALTER TABLE raw_material_purchases 
ADD COLUMN IF NOT EXISTS funding_source VARCHAR(50) DEFAULT 'project' 
CHECK (funding_source IN ('project', 'personal'));

-- Update any existing records to have the default value
UPDATE raw_material_purchases 
SET funding_source = 'project' 
WHERE funding_source IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN raw_material_purchases.funding_source IS 'Source of funding: project (من أموال المشروع) or personal (من الأموال الشخصية)';
