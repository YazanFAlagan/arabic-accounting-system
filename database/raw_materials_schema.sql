-- Raw Materials Management System Schema for Supabase
-- This schema creates tables for managing raw materials inventory, purchases, and usage tracking

-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create raw_materials table
CREATE TABLE IF NOT EXISTS raw_materials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    unit VARCHAR(50) NOT NULL, -- kg, liter, piece, etc.
    current_stock DECIMAL(10,3) DEFAULT 0,
    min_stock_alert DECIMAL(10,3) DEFAULT 0,
    unit_cost DECIMAL(10,2) DEFAULT 0,
    supplier_name VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL
);

-- إنشاء جدول مشتريات المواد الخام
CREATE TABLE IF NOT EXISTS raw_material_purchases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    raw_material_id UUID REFERENCES raw_materials(id) ON DELETE CASCADE NOT NULL,
    raw_material_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10,3) NOT NULL,
    unit_cost DECIMAL(10,2) NOT NULL,
    total_cost DECIMAL(12,2) NOT NULL,
    supplier_name VARCHAR(255),
    purchase_date DATE NOT NULL,
    notes TEXT,
    funding_source VARCHAR(20) DEFAULT 'project',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL
);

-- Create raw_material_usage table
CREATE TABLE IF NOT EXISTS raw_material_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    raw_material_id UUID REFERENCES raw_materials(id) ON DELETE CASCADE NOT NULL,
    raw_material_name VARCHAR(255) NOT NULL,
    quantity_used DECIMAL(10,3) NOT NULL,
    unit_cost DECIMAL(10,2) NOT NULL,
    total_cost DECIMAL(10,2) NOT NULL,
    usage_date DATE NOT NULL,
    purpose VARCHAR(255) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL
);

-- Add type column to existing purchases table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchases' AND column_name = 'type') THEN
        ALTER TABLE purchases ADD COLUMN type VARCHAR(50) DEFAULT 'general';
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_raw_materials_user_id ON raw_materials(user_id);
CREATE INDEX IF NOT EXISTS idx_raw_materials_name ON raw_materials(name);
CREATE INDEX IF NOT EXISTS idx_raw_material_purchases_user_id ON raw_material_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_raw_material_purchases_date ON raw_material_purchases(purchase_date);
CREATE INDEX IF NOT EXISTS idx_raw_material_usage_user_id ON raw_material_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_raw_material_usage_date ON raw_material_usage(usage_date);

-- Enable Row Level Security
ALTER TABLE raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_material_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_material_usage ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for raw_materials
CREATE POLICY "Users can view their own raw materials" ON raw_materials
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own raw materials" ON raw_materials
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own raw materials" ON raw_materials
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own raw materials" ON raw_materials
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for raw_material_purchases
CREATE POLICY "Users can view their own raw material purchases" ON raw_material_purchases
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own raw material purchases" ON raw_material_purchases
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own raw material purchases" ON raw_material_purchases
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own raw material purchases" ON raw_material_purchases
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for raw_material_usage
CREATE POLICY "Users can view their own raw material usage" ON raw_material_usage
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own raw material usage" ON raw_material_usage
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own raw material usage" ON raw_material_usage
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own raw material usage" ON raw_material_usage
    FOR DELETE USING (auth.uid() = user_id);

-- Create function to update raw material stock on purchase
CREATE OR REPLACE FUNCTION update_stock_on_purchase()
RETURNS TRIGGER AS $$
BEGIN
    -- Update stock and unit cost when a purchase is made
    UPDATE raw_materials 
    SET 
        current_stock = current_stock + NEW.quantity,
        unit_cost = NEW.unit_cost,
        updated_at = NOW()
    WHERE id = NEW.raw_material_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to update raw material stock on usage
CREATE OR REPLACE FUNCTION update_stock_on_usage()
RETURNS TRIGGER AS $$
BEGIN
    -- Update stock when material is used
    UPDATE raw_materials 
    SET 
        current_stock = current_stock - NEW.quantity_used,
        updated_at = NOW()
    WHERE id = NEW.raw_material_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to revert stock on purchase deletion
CREATE OR REPLACE FUNCTION revert_stock_on_purchase_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Revert stock when a purchase is deleted
    UPDATE raw_materials 
    SET 
        current_stock = current_stock - OLD.quantity,
        updated_at = NOW()
    WHERE id = OLD.raw_material_id;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create function to revert stock on usage deletion
CREATE OR REPLACE FUNCTION revert_stock_on_usage_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Revert stock when usage is deleted
    UPDATE raw_materials 
    SET 
        current_stock = current_stock + OLD.quantity_used,
        updated_at = NOW()
    WHERE id = OLD.raw_material_id;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic stock updates
CREATE TRIGGER trigger_update_stock_on_purchase
    AFTER INSERT ON raw_material_purchases
    FOR EACH ROW
    EXECUTE FUNCTION update_stock_on_purchase();

CREATE TRIGGER trigger_update_stock_on_usage
    AFTER INSERT ON raw_material_usage
    FOR EACH ROW
    EXECUTE FUNCTION update_stock_on_usage();

CREATE TRIGGER trigger_revert_stock_on_purchase_delete
    AFTER DELETE ON raw_material_purchases
    FOR EACH ROW
    EXECUTE FUNCTION revert_stock_on_purchase_delete();

CREATE TRIGGER trigger_revert_stock_on_usage_delete
    AFTER DELETE ON raw_material_usage
    FOR EACH ROW
    EXECUTE FUNCTION revert_stock_on_usage_delete();

-- Create function to get low stock materials
CREATE OR REPLACE FUNCTION get_low_stock_materials(user_uuid UUID)
RETURNS TABLE (
    id UUID,
    name VARCHAR(255),
    current_stock DECIMAL(10,3),
    min_stock_alert DECIMAL(10,3),
    unit VARCHAR(50)
) AS $$
BEGIN
    RETURN QUERY
    SELECT rm.id, rm.name, rm.current_stock, rm.min_stock_alert, rm.unit
    FROM raw_materials rm
    WHERE rm.user_id = user_uuid 
    AND rm.current_stock <= rm.min_stock_alert
    ORDER BY rm.name;
END;
$$ LANGUAGE plpgsql;

-- Create function to get material usage summary
CREATE OR REPLACE FUNCTION get_material_usage_summary(user_uuid UUID, start_date DATE, end_date DATE)
RETURNS TABLE (
    material_name VARCHAR(255),
    total_used DECIMAL(10,3),
    total_cost DECIMAL(10,2),
    usage_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rmu.raw_material_name,
        SUM(rmu.quantity_used) as total_used,
        SUM(rmu.total_cost) as total_cost,
        COUNT(*) as usage_count
    FROM raw_material_usage rmu
    WHERE rmu.user_id = user_uuid 
    AND rmu.usage_date BETWEEN start_date AND end_date
    GROUP BY rmu.raw_material_name
    ORDER BY total_cost DESC;
END;
$$ LANGUAGE plpgsql;

-- Insert sample data (optional - remove in production)
-- INSERT INTO raw_materials (name, unit, current_stock, min_stock_alert, unit_cost, supplier_name, description, user_id)
-- VALUES 
--     ('ملصقات', 'قطعة', 1000, 100, 0.50, 'مورد الملصقات', 'ملصقات للمنتجات', 'your-user-id'),
--     ('زيت عطري', 'مل', 500, 50, 2.00, 'مورد الزيوت', 'زيت عطري للعطور', 'your-user-id'),
--     ('جليسرين', 'مل', 2000, 200, 0.10, 'مورد المواد الكيميائية', 'جليسرين نقي', 'your-user-id'),
--     ('ماء مقطر', 'لتر', 50, 10, 1.50, 'مورد المياه', 'ماء مقطر للتصنيع', 'your-user-id'),
--     ('كحول', 'مل', 1000, 100, 0.80, 'مورد المواد الكيميائية', 'كحول إيثيلي', 'your-user-id'),
--     ('زجاجات فارغة', 'قطعة', 200, 50, 3.00, 'مورد العبوات', 'زجاجات 100 مل', 'your-user-id');

-- Grant permissions
GRANT ALL ON raw_materials TO authenticated;
GRANT ALL ON raw_material_purchases TO authenticated;
GRANT ALL ON raw_material_usage TO authenticated;
GRANT EXECUTE ON FUNCTION get_low_stock_materials(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_material_usage_summary(UUID, DATE, DATE) TO authenticated;
