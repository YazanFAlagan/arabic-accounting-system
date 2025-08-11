'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Package, 
  AlertTriangle,
  ShoppingCart,
  Users,
  BarChart3,
  LogOut
} from 'lucide-react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import QuickNavigation from '@/components/QuickNavigation'

interface DashboardStats {
  totalSales: number
  totalExpenses: number
  netProfit: number
  totalProducts: number
  lowStockProducts: number
  todaySales: number
  thisMonthSales: number
  availableFunds: number // الأموال المتاحة الحالية
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
    blue: 'bg-gradient-to-r from-blue-500 to-blue-600',
    green: 'bg-gradient-to-r from-green-500 to-green-600',
    red: 'bg-gradient-to-r from-red-500 to-red-600',
    yellow: 'bg-gradient-to-r from-yellow-500 to-yellow-600',
    purple: 'bg-gradient-to-r from-purple-500 to-purple-600'
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-600 mb-2">{title}</p>
          <p className="text-3xl font-bold text-gray-800 mb-1">{value}</p>
          {trend && (
            <div className={`flex items-center text-sm ${
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
        <div className={`p-4 rounded-2xl ${colorClasses[color]} shadow-lg`}>
          <div className="text-white">
            {icon}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>({
    totalSales: 0,
    totalExpenses: 0,
    netProfit: 0,
    totalProducts: 0,
    lowStockProducts: 0,
    todaySales: 0,
    thisMonthSales: 0,
    availableFunds: 0
  })

  const formatCurrency = (amount: number) => {
    if (typeof amount !== 'number' || isNaN(amount)) {
      return '0.00 ج.م'
    }
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  const [loading, setLoading] = useState(true)
  const [recentSales, setRecentSales] = useState<any[]>([])
  const [lowStockItems, setLowStockItems] = useState<any[]>([])
  const [chartData, setChartData] = useState({
    pieData: [
      { name: 'المبيعات', value: 0, color: '#10B981' },
      { name: 'المصروفات', value: 0, color: '#EF4444' }
    ],
    monthlyData: [] as any[]
  })

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

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
      
      // Calculate actual net profit: (sale price - product cost) for each sale
      let actualNetProfit = 0
      if (salesData && productsData && salesData.length > 0) {
        actualNetProfit = salesData.reduce((totalProfit, sale) => {
          // Find the product for this sale
          const product = productsData.find(p => p.name === sale.product_name)
          if (product && product.wholesale_price !== null && product.wholesale_price !== undefined) {
            // Convert to numbers and validate
            const unitPrice = parseFloat(sale.unit_price) || 0
            const costPrice = parseFloat(product.wholesale_price) || 0
            const quantity = parseInt(sale.quantity) || 0
            
            // Calculate profit for this sale: (sale price - product cost) × quantity
            const saleProfit = (unitPrice - costPrice) * quantity
            
            // Add to total profit if valid
            if (!isNaN(saleProfit) && isFinite(saleProfit)) {
              return totalProfit + saleProfit
            }
          }
          return totalProfit
        }, 0)
      }
      
      const netProfit = isNaN(actualNetProfit) ? 0 : actualNetProfit
      const totalProducts = productsData?.length || 0
      const lowStockProducts = productsData?.filter(product => 
        product.current_stock <= product.min_stock_alert
      ).length || 0

      // Calculate today's sales
      const today = new Date().toISOString().split('T')[0]
      const todaySales = salesData?.filter(sale => 
        sale.sale_date === today
      ).reduce((sum, sale) => sum + sale.total_price, 0) || 0

      // Calculate this month's sales
      const thisMonth = new Date().toISOString().slice(0, 7)
      const thisMonthSales = salesData?.filter(sale => 
        sale.sale_date.startsWith(thisMonth)
      ).reduce((sum, sale) => sum + sale.total_price, 0) || 0

      // حساب الأموال المتاحة الحالية
      // الأموال المتاحة = إجمالي المبيعات - إجمالي المصروفات والمشتريات
      const availableFunds = totalSales - totalExpenses

      setStats({
        totalSales,
        totalExpenses,
        netProfit,
        totalProducts,
        lowStockProducts,
        todaySales,
        thisMonthSales,
        availableFunds
      })

      // Set recent sales (last 5)
      setRecentSales(salesData?.slice(0, 5) || [])
      
      // Set low stock items
      setLowStockItems(productsData?.filter(product => 
        product.current_stock <= product.min_stock_alert
      ) || [])

      // Prepare chart data
      const pieData = [
        { name: 'المبيعات', value: totalSales, color: '#10B981' },
        { name: 'المصروفات', value: totalExpenses, color: '#EF4444' }
      ]

      // Prepare monthly data for the last 6 months
      const monthlyData = []
      for (let i = 5; i >= 0; i--) {
        const date = new Date()
        date.setMonth(date.getMonth() - i)
        const monthKey = date.toISOString().slice(0, 7)
        const monthName = date.toLocaleDateString('ar-EG', { month: 'short' })
        
        const monthSales = salesData?.filter(sale => 
          sale.sale_date.startsWith(monthKey)
        ).reduce((sum, sale) => sum + sale.total_price, 0) || 0
        
        const monthExpenses = purchasesData?.filter(purchase => 
          purchase.purchase_date.startsWith(monthKey)
        ).reduce((sum, purchase) => sum + purchase.total_cost, 0) || 0
        
        monthlyData.push({
          month: monthName,
          sales: monthSales,
          expenses: monthExpenses,
          profit: monthSales - monthExpenses
        })
      }

      setChartData({ pieData, monthlyData })

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }



  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">جاري تحميل البيانات...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100" dir="rtl">
      <QuickNavigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">لوحة التحكم</h1>
            <p className="text-gray-600 text-lg">مرحباً بك في نظام المحاسبة والمخزون</p>
            <p className="text-gray-500">المستخدم: {user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center px-6 py-3 text-sm font-semibold text-gray-700 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl hover:bg-white hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 transform hover:scale-105"
          >
            <LogOut className="h-4 w-4 ml-2" />
            تسجيل الخروج
          </button>
        </div>

        <div className="space-y-8">
          {/* Main Financial Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <StatCard
              title="الأموال المتاحة"
              value={formatCurrency(stats.availableFunds)}
              icon={<DollarSign className="h-7 w-7" />}
              color={stats.availableFunds >= 0 ? 'blue' : 'red'}
            />
            <StatCard
              title="إجمالي المبيعات"
              value={formatCurrency(stats.totalSales)}
              icon={<TrendingUp className="h-7 w-7" />}
              color="green"
            />
            <StatCard
              title="إجمالي المصروفات"
              value={formatCurrency(stats.totalExpenses)}
              icon={<TrendingDown className="h-7 w-7" />}
              color="red"
            />
            <StatCard
              title="صافي الربح"
              value={formatCurrency(stats.netProfit)}
              icon={<BarChart3 className="h-7 w-7" />}
              color={stats.netProfit >= 0 ? 'green' : 'red'}
            />
          </div>

          {/* Secondary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <StatCard
              title="عدد المنتجات"
              value={stats.totalProducts.toString()}
              icon={<Package className="h-7 w-7" />}
              color="purple"
            />
            <StatCard
              title="مبيعات اليوم"
              value={formatCurrency(stats.todaySales)}
              icon={<ShoppingCart className="h-7 w-7" />}
              color="purple"
            />
            <StatCard
              title="مبيعات هذا الشهر"
              value={formatCurrency(stats.thisMonthSales)}
              icon={<BarChart3 className="h-7 w-7" />}
              color="blue"
            />
            <StatCard
              title="تنبيهات المخزون"
              value={stats.lowStockProducts.toString()}
              icon={<AlertTriangle className="h-7 w-7" />}
              color="yellow"
            />
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Pie Chart - Sales vs Expenses */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8">
              <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                <BarChart3 className="h-6 w-6 ml-2 text-indigo-600" />
                توزيع المبيعات والمصروفات
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData.pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartData.pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any) => [formatCurrency(value), '']}
                      labelStyle={{ direction: 'rtl' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center space-x-reverse space-x-6 mt-4">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-green-500 rounded-full ml-2"></div>
                  <span className="text-sm text-gray-600">المبيعات</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-red-500 rounded-full ml-2"></div>
                  <span className="text-sm text-gray-600">المصروفات</span>
                </div>
              </div>
            </div>

            {/* Bar Chart - Monthly Trends */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8">
              <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                <TrendingUp className="h-6 w-6 ml-2 text-green-600" />
                الاتجاهات الشهرية
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}ك`}
                    />
                    <Tooltip 
                      formatter={(value: any) => [formatCurrency(value), '']}
                      labelStyle={{ direction: 'rtl' }}
                    />
                    <Bar dataKey="sales" fill="#10B981" name="المبيعات" />
                    <Bar dataKey="expenses" fill="#EF4444" name="المصروفات" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Recent Activity & Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Sales */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8">
              <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                <ShoppingCart className="h-6 w-6 ml-2 text-green-600" />
                آخر المبيعات
              </h3>
              {recentSales.length > 0 ? (
                <div className="space-y-4">
                  {recentSales.map((sale) => (
                    <div key={sale.id} className="flex items-center justify-between py-3 px-4 bg-gray-50/50 rounded-xl hover:bg-gray-100/50 transition-colors">
                      <div>
                        <p className="font-semibold text-gray-900">{sale.product_name}</p>
                        <p className="text-sm text-gray-600">العميل: {sale.customer_name}</p>
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-green-600 text-lg">{formatCurrency(sale.total_price)}</p>
                        <p className="text-xs text-gray-500">الكمية: {sale.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">لا توجد مبيعات حتى الآن</p>
                </div>
              )}
            </div>

            {/* Low Stock Alerts */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8">
              <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                <AlertTriangle className="h-6 w-6 ml-2 text-yellow-600" />
                تنبيهات المخزون المنخفض
              </h3>
              {lowStockItems.length > 0 ? (
                <div className="space-y-4">
                  {lowStockItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-3 px-4 bg-red-50/50 rounded-xl border border-red-100">
                      <div>
                        <p className="font-semibold text-gray-900">{item.name}</p>
                        <p className="text-sm text-gray-600">الحد الأدنى: {item.min_stock_alert}</p>
                      </div>
                      <div className="text-left">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-800">
                          {item.current_stock} متبقي
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">جميع المنتجات متوفرة بكمية كافية</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
