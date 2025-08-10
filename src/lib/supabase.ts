import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface Product {
  id: string
  name: string
  wholesale_price: number
  selling_price: number
  current_stock: number
  min_stock_alert: number
  created_at: string
  updated_at: string
}

export interface Sale {
  id: string
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  total_price: number
  customer_name: string
  sale_date: string
  created_at: string
  user_id: string
}

export interface Purchase {
  id: string
  product_id?: string
  product_name: string
  quantity?: number
  unit_cost: number
  total_cost: number
  supplier_name: string
  purchase_date: string
  created_at: string
  user_id: string
  type: 'product' | 'expense'
}

export interface User {
  id: string
  email: string
  name: string
  created_at: string
}
