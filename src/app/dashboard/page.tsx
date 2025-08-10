'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Package, 
  AlertTriangle,
  ShoppingCart,
  Users,
  BarChart3
} from 'lucide-react'

interface DashboardStats {
  totalSales: number
  totalExpenses: number
  netProfit: number
  totalProducts: number
  lowStockProducts: number
  todaySales: number
  thisMonthSales: number
}

interface StatCardProps {
  title: string
  value: string
  icon: React.ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
  color: 'blue' | 'green' | 'red' | 'yellow' | 'purple'
}

function StatCard({ title, value, icon, trend, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    purple: 'bg-purple-500'
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {trend && (
            <div className={`flex items-center mt-2 text-sm ${
              trend.isPositive ? 'text-green-600' : 'text-red-600'
            }`}>
              {trend.isPositive ? (
                <TrendingUp className="h-4 w-4 ml-1" />
              ) : (
                <TrendingDown className="h-4 w-4 ml-1" />
              )}
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-full ${colorClasses[color]}`}>
          <div className="text-white">
            {icon}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    totalSales: 0,
    totalExpenses: 0,
    netProfit: 0,
    totalProducts: 0,
    lowStockProducts: 0,
    todaySales: 0,
    thisMonthSales: 0
  })
  const [loading, setLoading] = useState(true)
  const [recentSales, setRecentSales] = useState<any[]>([])
  const [lowStockItems, setLowStockItems] = useState<any[]>([])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // Fetch sales data
      const { data: salesData } = await supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false })

      // Fetch purchases/expenses data
      const { data: purchasesData } = await supabase
        .from('purchases')
        .select('*')

      // Fetch products data
      const { data: productsData } = await supabase
        .from('products')
        .select('*')

      // Calculate statistics
      const totalSales = salesData?.reduce((sum, sale) => sum + sale.total_price, 0) || 0
      const totalExpenses = purchasesData?.reduce((sum, purchase) => sum + purchase.total_cost, 0) || 0
      const netProfit = totalSales - totalExpenses

      // Today's sales
      const today = new Date().toISOString().split('T')[0]
      const todaySales = salesData?.filter(sale => 
        sale.sale_date === today
      ).reduce((sum, sale) => sum + sale.total_price, 0) || 0

      // This month's sales
      const thisMonth = new Date().toISOString().slice(0, 7)
      const thisMonthSales = salesData?.filter(sale => 
        sale.sale_date.startsWith(thisMonth)
      ).reduce((sum, sale) => sum + sale.total_price, 0) || 0

      // Low stock products
      const lowStockProducts = productsData?.filter(product => 
        product.current_stock <= product.min_stock_alert
      ) || []

      setStats({
        totalSales,
        totalExpenses,
        netProfit,
        totalProducts: productsData?.length || 0,
        lowStockProducts: lowStockProducts.length,
        todaySales,
        thisMonthSales
      })

      // Set recent sales (last 5)
      setRecentSales(salesData?.slice(0, 5) || [])
      
      // Set low stock items
      setLowStockItems(lowStockProducts.slice(0, 5))

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">لوحة التحكم</h1>
          <p className="text-gray-600">مرحباً بك، {user?.email}</p>
        </div>
        <div className="text-sm text-gray-500">
          {new Date().toLocaleDateString('ar-EG', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="إجمالي المبيعات"
          value={formatCurrency(stats.totalSales)}
          icon={<DollarSign className="h-6 w-6" />}
          color="green"
        />
        <StatCard
          title="إجمالي المصروفات"
          value={formatCurrency(stats.totalExpenses)}
          icon={<TrendingDown className="h-6 w-6" />}
          color="red"
        />
        <StatCard
          title="صافي الربح"
          value={formatCurrency(stats.netProfit)}
          icon={<TrendingUp className="h-6 w-6" />}
          color={stats.netProfit >= 0 ? 'green' : 'red'}
        />
        <StatCard
          title="عدد المنتجات"
          value={stats.totalProducts.toString()}
          icon={<Package className="h-6 w-6" />}
          color="blue"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="مبيعات اليوم"
          value={formatCurrency(stats.todaySales)}
          icon={<ShoppingCart className="h-6 w-6" />}
          color="purple"
        />
        <StatCard
          title="مبيعات هذا الشهر"
          value={formatCurrency(stats.thisMonthSales)}
          icon={<BarChart3 className="h-6 w-6" />}
          color="blue"
        />
        <StatCard
          title="تنبيهات المخزون"
          value={stats.lowStockProducts.toString()}
          icon={<AlertTriangle className="h-6 w-6" />}
          color="yellow"
        />
      </div>

      {/* Recent Activity & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">آخر المبيعات</h3>
          {recentSales.length > 0 ? (
            <div className="space-y-3">
              {recentSales.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div>
                    <p className="font-medium text-gray-900">{sale.product_name}</p>
                    <p className="text-sm text-gray-600">العميل: {sale.customer_name}</p>
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-green-600">{formatCurrency(sale.total_price)}</p>
                    <p className="text-xs text-gray-500">الكمية: {sale.quantity}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">لا توجد مبيعات حتى الآن</p>
          )}
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">تنبيهات المخزون المنخفض</h3>
          {lowStockItems.length > 0 ? (
            <div className="space-y-3">
              {lowStockItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div>
                    <p className="font-medium text-gray-900">{item.name}</p>
                    <p className="text-sm text-gray-600">الحد الأدنى: {item.min_stock_alert}</p>
                  </div>
                  <div className="text-left">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      {item.current_stock} متبقي
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">جميع المنتجات متوفرة بكمية كافية</p>
          )}
        </div>
      </div>
    </div>
  )
}
