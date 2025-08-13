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
  godShare: number // حصة الشريك الثالث (ربنا) - 10% من الربح
  myShare: number // نصيبي - 45% من الربح الفعلي
  mahmoudShare: number // نصيب محمود - 45% من الربح الفعلي
}

interface StatCardProps {
  title: string
  value: string
  icon: React.ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
  color: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'indigo' | 'teal'
}

function StatCard({ title, value, icon, trend, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-gradient-to-r from-blue-500 to-blue-600',
    green: 'bg-gradient-to-r from-green-500 to-green-600',
    red: 'bg-gradient-to-r from-red-500 to-red-600',
    yellow: 'bg-gradient-to-r from-yellow-500 to-yellow-600',
    purple: 'bg-gradient-to-r from-purple-500 to-purple-600',
    indigo: 'bg-gradient-to-r from-indigo-500 to-indigo-600',
    teal: 'bg-gradient-to-r from-teal-500 to-teal-600'
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
    availableFunds: 0,
    godShare: 0,
    myShare: 0,
    mahmoudShare: 0
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
      // Fetch invoices data
      const { data: invoicesData } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false })

      // Fetch purchases data
      const { data: purchasesData } = await supabase
        .from('purchases')
        .select('*')
        .order('created_at', { ascending: false })

      // Fetch products data
      const { data: productsData } = await supabase
        .from('products')
        .select('*')

      if (invoicesData && purchasesData && productsData) {
        // Calculate total sales from invoices only
        const totalSales = invoicesData.reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0)

        // Calculate total expenses from purchases
        const totalExpenses = purchasesData.reduce((sum, purchase) => sum + (purchase.total_cost || 0), 0)

        // Calculate net profit
        const netProfit = totalSales - totalExpenses

        // Calculate actual net profit (considering product costs)
        let actualNetProfit = netProfit

        // Subtract product costs from sales
        if (invoicesData && productsData && invoicesData.length > 0) {
          // Get invoice items for cost calculation
          const { data: invoiceItemsData } = await supabase
            .from('invoice_items')
            .select('*')

          if (invoiceItemsData) {
            actualNetProfit = invoicesData.reduce((totalProfit, invoice) => {
              const items = invoiceItemsData.filter(item => item.invoice_id === invoice.id)
              return totalProfit + items.reduce((itemProfit, item) => {
                const product = productsData.find(p => p.id === item.product_id)
                if (product && product.wholesale_price) {
                  const costPrice = product.wholesale_price
                  const unitPrice = item.unit_price
                  const quantity = parseInt(item.quantity) || 0
                  const itemProfit = (unitPrice - costPrice) * quantity
                  if (!isNaN(itemProfit) && isFinite(itemProfit)) {
                    return totalProfit + itemProfit
                  }
                }
                return totalProfit
              }, 0)
            }, 0)
          }
        }

        const netProfitFinal = isNaN(actualNetProfit) ? 0 : actualNetProfit
        const totalProducts = productsData?.length || 0
        const lowStockProducts = productsData?.filter(product => 
          product.current_stock <= product.min_stock_alert
        ).length || 0

        // Calculate today's sales (invoices only)
        const today = new Date().toISOString().split('T')[0]
        const todaySales = invoicesData?.filter(invoice => 
          invoice.invoice_date === today
        ).reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0) || 0

        // Calculate this month's sales (invoices only)
        const thisMonth = new Date().toISOString().slice(0, 7)
        const thisMonthSales = invoicesData?.filter(invoice => 
          invoice.invoice_date && invoice.invoice_date.startsWith(thisMonth)
        ).reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0) || 0

        // حساب الأموال المتاحة الحالية
        const availableFunds = totalSales - totalExpenses

        // حساب حصة الشريك الثالث (ربنا) - 10% من الربح
        const godShare = availableFunds > 0 ? availableFunds * 0.10 : 0; // 10% of available funds
        const remainingFunds = availableFunds - godShare;
        const myShare = remainingFunds > 0 ? remainingFunds * 0.45 : 0; // 45% of remaining funds
        const mahmoudShare = remainingFunds > 0 ? remainingFunds * 0.45 : 0; // 45% of remaining funds

        setStats({
          totalSales,
          totalExpenses,
          netProfit: netProfitFinal,
          totalProducts,
          lowStockProducts,
          todaySales,
          thisMonthSales,
          availableFunds,
          godShare,
          myShare,
          mahmoudShare
        })

        // Get recent invoices only
        const recentInvoices = invoicesData?.slice(0, 5) || []
        
        // Convert invoices to display format
        const recentInvoicesAsSales = recentInvoices.map(invoice => ({
          id: invoice.id,
          product_name: `فاتورة رقم ${invoice.invoice_number}`,
          quantity: 1,
          unit_price: invoice.total_amount,
          total_price: invoice.total_amount,
          customer_name: invoice.customer_name,
          sale_date: invoice.invoice_date,
          created_at: invoice.created_at,
          source: 'invoice',
          invoice_number: invoice.invoice_number,
          invoice_date: invoice.invoice_date
        }))
        
        // Set recent sales to invoices only
        setRecentSales(recentInvoicesAsSales)
        
        // Set low stock items
        setLowStockItems(productsData?.filter(product => 
          product.current_stock <= product.min_stock_alert
        ) || [])

        // Prepare chart data
        const pieData = [
          { name: 'المبيعات', value: totalSales, color: '#10B981' },
          { name: 'المصروفات', value: totalExpenses, color: '#EF4444' }
        ]

        // Prepare monthly data
        const monthlyData = []
        for (let i = 5; i >= 0; i--) {
          const date = new Date()
          date.setMonth(date.getMonth() - i)
          const monthKey = date.toISOString().slice(0, 7)
          
          const monthSales = invoicesData?.filter(invoice => 
            invoice.invoice_date && invoice.invoice_date.startsWith(monthKey)
          ).reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0) || 0
          
          const monthExpenses = purchasesData?.filter(purchase => 
            purchase.purchase_date && purchase.purchase_date.startsWith(monthKey)
          ).reduce((sum, purchase) => sum + (purchase.total_cost || 0), 0) || 0
          
          monthlyData.push({
            month: date.toLocaleDateString('ar-EG', { month: 'short', year: 'numeric' }),
            sales: monthSales,
            expenses: monthExpenses
          })
        }
        
        setChartData({
          pieData,
          monthlyData
        })
      }
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
      <div className="max-w-8xl mx-auto px-6 sm:px-8 lg:px-12 py-12">
        {/* Header */}
        <div className="flex justify-between items-center mb-16">
          <div>
            <h1 className="text-5xl font-bold text-gray-800 mb-4">لوحة التحكم</h1>
            <p className="text-gray-600 text-xl mb-2">مرحباً بك في نظام المحاسبة والمخزون</p>
            <p className="text-gray-500 text-lg">المستخدم: {user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center px-8 py-4 text-base font-semibold text-gray-700 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl hover:bg-white hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 transform hover:scale-105"
          >
            <LogOut className="h-5 w-5 ml-3" />
            تسجيل الخروج
          </button>
        </div>

        <div className="space-y-16">
          {/* Main Financial Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
            <StatCard
              title="الأموال المتاحة"
              value={formatCurrency(stats.availableFunds)}
              icon={<DollarSign className="h-8 w-8" />}
              color={stats.availableFunds >= 0 ? 'blue' : 'red'}
            />
            <StatCard
              title="إجمالي المبيعات"
              value={formatCurrency(stats.totalSales)}
              icon={<TrendingUp className="h-8 w-8" />}
              color="green"
            />
            <StatCard
              title="إجمالي المصروفات"
              value={formatCurrency(stats.totalExpenses)}
              icon={<TrendingDown className="h-8 w-8" />}
              color="red"
            />
            <StatCard
              title="صافي الربح"
              value={formatCurrency(stats.netProfit)}
              icon={<BarChart3 className="h-8 w-8" />}
              color={stats.netProfit >= 0 ? 'green' : 'red'}
            />
            <StatCard
              title="حصة الشريك الثالث (ربنا)"
              value={formatCurrency(stats.godShare)}
              icon={<DollarSign className="h-8 w-8" />}
              color="purple"
            />
          </div>

          {/* Secondary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <StatCard
              title="عدد المنتجات"
              value={stats.totalProducts.toString()}
              icon={<Package className="h-8 w-8" />}
              color="purple"
            />
            <StatCard
              title="مبيعات اليوم"
              value={formatCurrency(stats.todaySales)}
              icon={<ShoppingCart className="h-8 w-8" />}
              color="purple"
            />
            <StatCard
              title="مبيعات هذا الشهر"
              value={formatCurrency(stats.thisMonthSales)}
              icon={<BarChart3 className="h-8 w-8" />}
              color="blue"
            />
            <StatCard
              title="تنبيهات المخزون"
              value={stats.lowStockProducts.toString()}
              icon={<AlertTriangle className="h-8 w-8" />}
              color="yellow"
            />
          </div>

          {/* Profit Distribution Section */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-12">
            <h3 className="text-3xl font-bold text-gray-800 mb-12 flex items-center justify-center">
              <BarChart3 className="h-10 w-10 ml-4 text-indigo-600" />
              توزيع الأرباح
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
              <div className="text-center p-8 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-3xl border border-indigo-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                <h4 className="text-2xl font-bold text-indigo-800 mb-4">حصة يزن</h4>
                <p className="text-5xl font-bold text-indigo-600 mb-4">{formatCurrency(stats.myShare)}</p>
                <p className="text-base text-indigo-700 bg-white/70 px-4 py-3 rounded-xl font-medium">45% من الأموال المتاحة</p>
              </div>
              <div className="text-center p-8 bg-gradient-to-br from-teal-50 to-teal-100 rounded-3xl border border-teal-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                <h4 className="text-2xl font-bold text-teal-800 mb-4">حصة محمود</h4>
                <p className="text-5xl font-bold text-teal-600 mb-4">{formatCurrency(stats.mahmoudShare)}</p>
                <p className="text-base text-teal-700 bg-white/70 px-4 py-3 rounded-xl font-medium">45% من الأموال المتاحة</p>
              </div>
              <div className="text-center p-8 bg-gradient-to-br from-purple-50 to-purple-100 rounded-3xl border border-purple-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                <h4 className="text-2xl font-bold text-purple-800 mb-4">حصة الشريك الثالث (ربنا)</h4>
                <p className="text-5xl font-bold text-purple-600 mb-4">{formatCurrency(stats.godShare)}</p>
                <p className="text-base text-purple-700 bg-white/70 px-4 py-3 rounded-xl font-medium">10% من الأموال المتاحة</p>
              </div>
            </div>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-200">
              <p className="text-center text-blue-800 text-xl font-medium">
                <strong>📊 ملاحظة مهمة:</strong> يتم حساب النصيب بناءً على الأموال المتاحة وليس صافي الربح. 
                النصيب = (الأموال المتاحة - حصة الشريك الثالث) × 45%
              </p>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
            {/* Pie Chart - Sales vs Expenses */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-10">
              <h3 className="text-2xl font-bold text-gray-800 mb-8 flex items-center">
                <BarChart3 className="h-8 w-8 ml-3 text-indigo-600" />
                توزيع المبيعات والمصروفات
              </h3>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData.pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={160}
                      paddingAngle={8}
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
              <div className="flex justify-center space-x-reverse space-x-8 mt-8">
                <div className="flex items-center">
                  <div className="w-5 h-5 bg-green-500 rounded-full ml-3"></div>
                  <span className="text-base text-gray-600 font-medium">المبيعات</span>
                </div>
                <div className="flex items-center">
                  <div className="w-5 h-5 bg-red-500 rounded-full ml-3"></div>
                  <span className="text-base text-gray-600 font-medium">المصروفات</span>
                </div>
              </div>
            </div>

            {/* Bar Chart - Monthly Trends */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-10">
              <h3 className="text-2xl font-bold text-gray-800 mb-8 flex items-center">
                <TrendingUp className="h-8 w-8 ml-3 text-green-600" />
                الاتجاهات الشهرية
              </h3>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fontSize: 14 }}
                    />
                    <YAxis 
                      tick={{ fontSize: 14 }}
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
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
            {/* Recent Sales */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-10">
              <h3 className="text-2xl font-bold text-gray-800 mb-8 flex items-center">
                <ShoppingCart className="h-8 w-8 ml-3 text-green-600" />
                آخر المبيعات
              </h3>
              {recentSales.length > 0 ? (
                <div className="space-y-6">
                  {recentSales.map((sale) => (
                    <div key={sale.id} className="flex items-center justify-between py-5 px-6 bg-gray-50/50 rounded-2xl hover:bg-gray-100/50 transition-all duration-300 hover:shadow-lg hover:scale-105">
                      <div>
                        <p className="font-semibold text-gray-900 text-lg">
                          {sale.source === 'invoice' 
                            ? `فاتورة رقم ${sale.invoice_number}` 
                            : sale.product_name
                          }
                        </p>
                        <p className="text-base text-gray-600 mt-1">
                          العميل: {sale.customer_name}
                          {sale.source === 'invoice' && (
                            <span className="mr-3 text-sm text-blue-600 font-medium">
                              | {new Date(sale.invoice_date).toLocaleDateString('ar-EG')}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-green-600 text-xl">{formatCurrency(sale.total_price)}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          {sale.source === 'invoice' ? 'فاتورة متعددة الأصناف' : `الكمية: ${sale.quantity}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <ShoppingCart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">لا توجد مبيعات حتى الآن</p>
                </div>
              )}
            </div>

            {/* Low Stock Alerts */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-10">
              <h3 className="text-2xl font-bold text-gray-800 mb-8 flex items-center">
                <AlertTriangle className="h-8 w-8 ml-3 text-yellow-600" />
                تنبيهات المخزون المنخفض
              </h3>
              {lowStockItems.length > 0 ? (
                <div className="space-y-6">
                  {lowStockItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-5 px-6 bg-red-50/50 rounded-2xl border border-red-100 hover:shadow-lg transition-all duration-300 hover:scale-105">
                      <div>
                        <p className="font-semibold text-gray-900 text-lg">{item.name}</p>
                        <p className="text-base text-gray-600 mt-1">الحد الأدنى: {item.min_stock_alert}</p>
                      </div>
                      <div className="text-left">
                        <span className="inline-flex items-center px-4 py-2 rounded-full text-base font-semibold bg-red-100 text-red-800">
                          {item.current_stock} متبقي
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">جميع المنتجات متوفرة بكمية كافية</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
