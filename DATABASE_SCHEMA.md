# Database Schema for Arabic Accounting System

This document outlines the database schema required for the Arabic Accounting and Inventory Management System.

## Tables

### 1. Products Table
```sql
CREATE TABLE products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    wholesale_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    selling_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    current_stock INTEGER NOT NULL DEFAULT 0,
    min_stock_alert INTEGER NOT NULL DEFAULT 5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. Sales Table
```sql
CREATE TABLE sales (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    customer_name TEXT NOT NULL,
    sale_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);
```

### 3. Purchases Table
```sql
CREATE TABLE purchases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER, -- NULL for expenses
    unit_cost DECIMAL(10,2) NOT NULL,
    total_cost DECIMAL(10,2) NOT NULL,
    supplier_name TEXT NOT NULL,
    purchase_date DATE NOT NULL,
    type TEXT CHECK (type IN ('product', 'expense')) NOT NULL DEFAULT 'product',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);
```

## Row Level Security (RLS) Policies

### Products Table
```sql
-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all products
CREATE POLICY "Allow authenticated users to read products" ON products
    FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to insert products
CREATE POLICY "Allow authenticated users to insert products" ON products
    FOR INSERT TO authenticated WITH CHECK (true);

-- Allow authenticated users to update products
CREATE POLICY "Allow authenticated users to update products" ON products
    FOR UPDATE TO authenticated USING (true);

-- Allow authenticated users to delete products
CREATE POLICY "Allow authenticated users to delete products" ON products
    FOR DELETE TO authenticated USING (true);
```

### Sales Table
```sql
-- Enable RLS
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own sales
CREATE POLICY "Users can read their own sales" ON sales
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Allow users to insert their own sales
CREATE POLICY "Users can insert their own sales" ON sales
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own sales
CREATE POLICY "Users can update their own sales" ON sales
    FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Allow users to delete their own sales
CREATE POLICY "Users can delete their own sales" ON sales
    FOR DELETE TO authenticated USING (auth.uid() = user_id);
```

### Purchases Table
```sql
-- Enable RLS
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own purchases
CREATE POLICY "Users can read their own purchases" ON purchases
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Allow users to insert their own purchases
CREATE POLICY "Users can insert their own purchases" ON purchases
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own purchases
CREATE POLICY "Users can update their own purchases" ON purchases
    FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Allow users to delete their own purchases
CREATE POLICY "Users can delete their own purchases" ON purchases
    FOR DELETE TO authenticated USING (auth.uid() = user_id);
```

## Indexes for Performance

```sql
-- Sales table indexes
CREATE INDEX idx_sales_user_id ON sales(user_id);
CREATE INDEX idx_sales_product_id ON sales(product_id);
CREATE INDEX idx_sales_sale_date ON sales(sale_date);
CREATE INDEX idx_sales_created_at ON sales(created_at);

-- Purchases table indexes
CREATE INDEX idx_purchases_user_id ON purchases(user_id);
CREATE INDEX idx_purchases_product_id ON purchases(product_id);
CREATE INDEX idx_purchases_purchase_date ON purchases(purchase_date);
CREATE INDEX idx_purchases_type ON purchases(type);
CREATE INDEX idx_purchases_created_at ON purchases(created_at);

-- Products table indexes
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_current_stock ON products(current_stock);
```

## Setup Instructions

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Run the table creation scripts above in order
4. Run the RLS policy scripts
5. Run the index creation scripts
6. Verify that all tables are created successfully

## Authentication Setup

The system uses Supabase Auth with email/password authentication. No additional user table is needed as Supabase handles user management automatically.

## Notes

- All monetary values use DECIMAL(10,2) for precision
- UUIDs are used for primary keys for better security
- Row Level Security ensures data isolation between users
- The products table is shared between users (no RLS user filtering)
- Sales and purchases are user-specific
- The purchases table handles both product purchases and general expenses using the 'type' field
