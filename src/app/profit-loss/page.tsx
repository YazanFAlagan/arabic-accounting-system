'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import QuickNavigation from '@/components/QuickNavigation'
import { TrendingUp, TrendingDown, DollarSign, BarChart3 } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

interface ProfitLossData {
  totalRevenue: number
  totalExpenses: number
  netProfit: number
  availableFunds: number // الأموال المتاحة الحالية
  monthlyData: Array<{
    month: string
    revenue: number
    expenses: number
    profit: number
  }>
  categoryExpenses: Array<{
    category: string
    amount: number
  }>
}

export default function ProfitLossPage() {
  const [data, setData] = useState<ProfitLossData>({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    availableFunds: 0,
    monthlyData: [],
    categoryExpenses: []
  })
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('12months')

  useEffect(() => {
    fetchProfitLossData()
  }, [selectedPeriod])

  const fetchProfitLossData = async () => {
    try {
      setLoading(true)

      // Calculate date range based on selected period
      const endDate = new Date()
      const startDate = new Date()
      
      switch (selectedPeriod) {
        case '1month':
          startDate.setMonth(endDate.getMonth() - 1)
          break
        case '3months':
          startDate.setMonth(endDate.getMonth() - 3)
          break
        case '6months':
          startDate.setMonth(endDate.getMonth() - 6)
          break
        case '12months':
        default:
          startDate.setFullYear(endDate.getFullYear() - 1)
          break
      }

      const startDateStr = startDate.toISOString().split('T')[0]
      const endDateStr = endDate.toISOString().split('T')[0]

      // Fetch sales data
      const { data: salesData } = await supabase
        .from('sales')
        .select('*')
        .gte('sale_date', startDateStr)
        .lte('sale_date', endDateStr)

      // Fetch purchases data
      const { data: purchasesData } = await supabase
        .from('purchases')
        .select('*')
        .gte('purchase_date', startDateStr)
        .lte('purchase_date', endDateStr)

      // Fetch products data for cost calculation
      const { data: productsData } = await supabase
        .from('products')
        .select('*')

      // Calculate totals
      const totalRevenue = salesData?.reduce((sum, sale) => sum + sale.total_price, 0) || 0
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
      
      // Ensure netProfit is a valid number
      const netProfit = isNaN(actualNetProfit) || !isFinite(actualNetProfit) ? 0 : actualNetProfit

      // حساب الأموال المتاحة الحالية
      // الأموال المتاحة = إجمالي الإيرادات - إجمالي المصروفات
      const availableFunds = totalRevenue - totalExpenses

      // Generate monthly data
      const monthlyData = generateMonthlyData(salesData || [], purchasesData || [], productsData || [], startDate, endDate)

      // Generate category expenses
      const categoryExpenses = generateCategoryExpenses(purchasesData || [])

      setData({
        totalRevenue,
        totalExpenses,
        netProfit,
        availableFunds,
        monthlyData,
        categoryExpenses
      })
    } catch (error) {
      console.error('Error fetching profit/loss data:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateMonthlyData = (sales: any[], purchases: any[], products: any[], startDate: Date, endDate: Date) => {
    const monthlyData: any[] = []
    const current = new Date(startDate)

    while (current <= endDate) {
      const monthStr = current.toISOString().slice(0, 7) // YYYY-MM format
      const monthName = current.toLocaleDateString('ar-EG', { month: 'short', year: 'numeric' })

      const monthSales = sales.filter(sale => sale.sale_date.startsWith(monthStr))
      const monthPurchases = purchases.filter(purchase => purchase.purchase_date.startsWith(monthStr))

      const revenue = monthSales.reduce((sum, sale) => sum + sale.total_price, 0)
      const expenses = monthPurchases.reduce((sum, purchase) => sum + purchase.total_cost, 0)
      
      // Calculate actual profit for this month: (sale price - product cost) for each sale
      const actualProfit = monthSales.reduce((totalProfit, sale) => {
        const product = products.find((p: any) => p.name === sale.product_name)
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
      
      // Ensure profit is a valid number
      const profit = isNaN(actualProfit) || !isFinite(actualProfit) ? 0 : actualProfit

      monthlyData.push({
        month: monthName,
        revenue,
        expenses,
        profit
      })

      current.setMonth(current.getMonth() + 1)
    }

    return monthlyData
  }

  const generateCategoryExpenses = (purchases: any[]) => {
    const categories: { [key: string]: number } = {}

    purchases.forEach(purchase => {
      const category = purchase.type === 'product' ? 'مشتريات المنتجات' : 'مصروفات أخرى'
      categories[category] = (categories[category] || 0) + purchase.total_cost
    })

    return Object.entries(categories).map(([category, amount]) => ({
      category,
      amount
    }))
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('ar-EG').format(value)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100" dir="rtl">
      <QuickNavigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">الأرباح والخسائر</h1>
          <p className="text-gray-600">تحليل الأداء المالي</p>
        </div>
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        >
          <option value="1month">آخر شهر</option>
          <option value="3months">آخر 3 أشهر</option>
          <option value="6months">آخر 6 أشهر</option>
          <option value="12months">آخر 12 شهر</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">الأموال المتاحة</p>
              <p className={`text-2xl font-bold ${data.availableFunds >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {formatCurrency(data.availableFunds)}
              </p>
            </div>
            <div className={`p-3 rounded-full ${data.availableFunds >= 0 ? 'bg-blue-100' : 'bg-red-100'}`}>
              <DollarSign className={`h-6 w-6 ${data.availableFunds >= 0 ? 'text-blue-600' : 'text-red-600'}`} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">إجمالي الإيرادات</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(data.totalRevenue)}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">إجمالي المصروفات</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(data.totalExpenses)}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <TrendingDown className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">صافي الربح</p>
              <p className={`text-2xl font-bold ${data.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(data.netProfit)}
              </p>
            </div>
            <div className={`p-3 rounded-full ${data.netProfit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              <BarChart3 className={`h-6 w-6 ${data.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">الاتجاه الشهري</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={formatNumber} />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  labelStyle={{ direction: 'rtl' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="الإيرادات"
                />
                <Line 
                  type="monotone" 
                  dataKey="expenses" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  name="المصروفات"
                />
                <Line 
                  type="monotone" 
                  dataKey="profit" 
                  stroke="#6366f1" 
                  strokeWidth={2}
                  name="الربح"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Expenses Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">توزيع المصروفات</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.categoryExpenses}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis tickFormatter={formatNumber} />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  labelStyle={{ direction: 'rtl' }}
                />
                <Bar dataKey="amount" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed Analysis */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">التحليل التفصيلي</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">متوسط الإيرادات الشهرية</p>
            <p className="text-lg font-semibold text-gray-900">
              {formatCurrency(data.monthlyData.length > 0 ? data.totalRevenue / data.monthlyData.length : 0)}
            </p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">متوسط المصروفات الشهرية</p>
            <p className="text-lg font-semibold text-gray-900">
              {formatCurrency(data.monthlyData.length > 0 ? data.totalExpenses / data.monthlyData.length : 0)}
            </p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">هامش الربح</p>
            <p className="text-lg font-semibold text-gray-900">
              {data.totalRevenue > 0 ? ((data.netProfit / data.totalRevenue) * 100).toFixed(1) : 0}%
            </p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">نسبة المصروفات</p>
            <p className="text-lg font-semibold text-gray-900">
              {data.totalRevenue > 0 ? ((data.totalExpenses / data.totalRevenue) * 100).toFixed(1) : 0}%
            </p>
          </div>
        </div>
      </div>

      {/* Monthly Breakdown Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">التفصيل الشهري</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الشهر
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الإيرادات
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  المصروفات
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  صافي الربح
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  هامش الربح
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.monthlyData.map((month, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {month.month}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                    {formatCurrency(month.revenue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                    {formatCurrency(month.expenses)}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${
                    month.profit >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(month.profit)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {month.revenue > 0 ? ((month.profit / month.revenue) * 100).toFixed(2) : 0}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
        </div>
      </div>
    </div>
  )
}
