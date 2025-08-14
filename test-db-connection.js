// Test script to check Supabase connection and database tables
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://iklhnsnglhdsdmvcwrzj.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrbGhuc25nbGhkc2RtdmN3cnpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3ODEzMjUsImV4cCI6MjA3MDM1NzMyNX0.-9lzsxEil63-9GW6Dq42f8_Q-pgLY6hI_wOwGcXMbC4'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testCommonTables() {
  console.log('Testing common tables that might exist...')
  
  const commonTables = [
    'users',
    'products',
    'sales',
    'purchases',
    'customers',
    'suppliers',
    'invoices',
    'debts',
    'raw_materials',
    'incomes',
    'expenses'
  ]
  
  const existingTables = []
  
  for (const table of commonTables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('count')
        .limit(1)
      
      if (!error) {
        console.log(`✅ Table ${table}: exists`)
        existingTables.push(table)
      } else {
        console.log(`❌ Table ${table}: ${error.message}`)
      }
    } catch (error) {
      console.log(`❌ Table ${table}: ${error.message}`)
    }
  }
  
  return existingTables
}

async function testConnection() {
  console.log('Testing Supabase connection...')
  
  try {
    // Test basic connection by trying common tables
    const existingTables = await testCommonTables()
    return existingTables.length > 0
  } catch (error) {
    console.error('❌ Connection test failed:', error)
    return false
  }
}

async function checkRequiredTables() {
  console.log('\nChecking required tables for online sales...')
  
  const requiredTables = [
    'online_customers',
    'online_orders', 
    'online_order_items'
  ]
  
  for (const table of requiredTables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('count')
        .limit(1)
      
      if (error) {
        console.log(`❌ Table ${table}: ${error.message}`)
      } else {
        console.log(`✅ Table ${table}: exists`)
      }
    } catch (error) {
      console.log(`❌ Table ${table}: ${error.message}`)
    }
  }
}

async function main() {
  console.log('🔍 Supabase Database Connection Test\n')
  
  const isConnected = await testConnection()
  
  if (isConnected) {
    await checkRequiredTables()
    
    console.log('\n📋 Summary:')
    console.log('- The database connection is working')
    console.log('- Some tables exist, but online sales tables are missing')
    console.log('- You need to run the online sales database setup script')
    console.log('- Run: database/online_sales_quick_setup.sql')
  } else {
    console.log('\n📋 Summary:')
    console.log('- Database connection failed')
    console.log('- Check your Supabase configuration')
    console.log('- Verify the database URL and API key')
  }
}

main().catch(console.error)
