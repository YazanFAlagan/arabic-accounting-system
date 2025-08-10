'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { BarChart3, TrendingUp, Package, DollarSign } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

interface BestSellerData {
  product_name: string
  total_quantity: number
  total_revenue: number
  sales_count: number
  average_price: number
}

interface TrendData {
  month: string
  [key: string]: string | number
}

export default function BestSellersPage() {
  const [bestSellers, setBestSellers] = useState<BestSellerData[]>([])
  const [trendData, setTrendData] = useState<TrendData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('3months')
  const [viewMode, setViewMode] = useState<'quantity' | 'revenue'>('quantity')

  useEffect(() => {
    fetchBestSellersData()
  }, [selectedPeriod])

  const fetchBestSellersData = async () => {
    try {
      setLoading(true)

      // Calculate date range
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

      if (salesData) {
        // Group by product and calculate metrics
        const productMetrics: { [key: string]: BestSellerData } = {}

        salesData.forEach(sale => {
          const productName = sale.product_name
          if (!productMetrics[productName]) {
            productMetrics[productName] = {
              product_name: productName,
              total_quantity: 0,
              total_revenue: 0,
              sales_count: 0,
              average_price: 0
            }
          }

          productMetrics[productName].total_quantity += sale.quantity
          productMetrics[productName].total_revenue += sale.total_price
          productMetrics[productName].sales_count += 1
        })

        // Calculate average prices and sort
        const bestSellersArray = Object.values(productMetrics).map(product => ({
          ...product,
          average_price: product.total_revenue / product.total_quantity
        }))

        // Sort by quantity (default) or revenue
        bestSellersArray.sort((a, b) => 
          viewMode === 'quantity' 
            ? b.total_quantity - a.total_quantity
            : b.total_revenue - a.total_revenue
        )

        setBestSellers(bestSellersArray)

        // Generate trend data for top 5 products
        const topProducts = bestSellersArray.slice(0, 5)
        const trends = generateTrendData(salesData, topProducts, startDate, endDate)
        setTrendData(trends)
      }
    } catch (error) {
      console.error('Error fetching best sellers data:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateTrendData = (sales: any[], topProducts: BestSellerData[], startDate: Date, endDate: Date) => {
    const trendData: TrendData[] = []
    const current = new Date(startDate)

    while (current <= endDate) {
      const monthStr = current.toISOString().slice(0, 7) // YYYY-MM format
      const monthName = current.toLocaleDateString('ar-EG', { month: 'short', year: 'numeric' })

      const monthData: TrendData = { month: monthName }

      topProducts.forEach(product => {
        const monthSales = sales.filter(sale => 
          sale.sale_date.startsWith(monthStr) && sale.product_name === product.product_name
        )
        const quantity = monthSales.reduce((sum, sale) => sum + sale.quantity, 0)
        monthData[product.product_name] = quantity
      })

      trendData.push(monthData)
      current.setMonth(current.getMonth() + 1)
    }

    return trendData
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

  // Colors for charts
  const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16']

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
          <h1 className="text-2xl font-bold text-gray-900">الأكثر مبيعاً</h1>
          <p className="text-gray-600">تحليل أداء المنتجات والاتجاهات</p>
        </div>
        <div className="flex gap-4">
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as 'quantity' | 'revenue')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="quantity">ترتيب حسب الكمية</option>
            <option value="revenue">ترتيب حسب الإيرادات</option>
          </select>
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
      </div>

      {/* Summary Cards */}
      {bestSellers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">المنتج الأكثر مبيعاً</p>
                <p className="text-lg font-bold text-gray-900">{bestSellers[0]?.product_name}</p>
                <p className="text-sm text-gray-500">{bestSellers[0]?.total_quantity} وحدة</p>
              </div>
              <div className="p-3 bg-indigo-100 rounded-full">
                <BarChart3 className="h-6 w-6 text-indigo-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">إجمالي المنتجات المباعة</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatNumber(bestSellers.reduce((sum, product) => sum + product.total_quantity, 0))}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Package className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">إجمالي الإيرادات</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(bestSellers.reduce((sum, product) => sum + product.total_revenue, 0))}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">متوسط سعر البيع</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(bestSellers.length > 0 
                    ? bestSellers.reduce((sum, product) => sum + product.average_price, 0) / bestSellers.length 
                    : 0
                  )}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Best Sellers Bar Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            أفضل 10 منتجات {viewMode === 'quantity' ? '(حسب الكمية)' : '(حسب الإيرادات)'}
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bestSellers.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="product_name" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tickFormatter={formatNumber} />
                <Tooltip 
                  formatter={(value: number) => 
                    viewMode === 'quantity' 
                      ? formatNumber(value) + ' وحدة'
                      : formatCurrency(value)
                  }
                  labelStyle={{ direction: 'rtl' }}
                />
                <Bar 
                  dataKey={viewMode === 'quantity' ? 'total_quantity' : 'total_revenue'} 
                  fill="#6366f1" 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Market Share Pie Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">حصة السوق (أفضل 7 منتجات)</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={bestSellers.slice(0, 7)}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey={viewMode === 'quantity' ? 'total_quantity' : 'total_revenue'}
                  nameKey="product_name"
                >
                  {bestSellers.slice(0, 7).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => 
                    viewMode === 'quantity' 
                      ? formatNumber(value) + ' وحدة'
                      : formatCurrency(value)
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Trend Analysis */}
      {trendData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">اتجاه المبيعات (أفضل 5 منتجات)</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={formatNumber} />
                <Tooltip 
                  formatter={(value: number) => formatNumber(value) + ' وحدة'}
                  labelStyle={{ direction: 'rtl' }}
                />
                {bestSellers.slice(0, 5).map((product, index) => (
                  <Bar 
                    key={product.product_name}
                    dataKey={product.product_name} 
                    fill={colors[index % colors.length]}
                    name={product.product_name}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Detailed Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">تفاصيل المنتجات</h3>
        </div>
        {bestSellers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الترتيب
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    المنتج
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الكمية المباعة
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    إجمالي الإيرادات
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    عدد المبيعات
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    متوسط السعر
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {bestSellers.map((product, index) => (
                  <tr key={product.product_name} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                        index < 3 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{product.product_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatNumber(product.total_quantity)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-green-600">{formatCurrency(product.total_revenue)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatNumber(product.sales_count)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatCurrency(product.average_price)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">لا توجد بيانات مبيعات</h3>
            <p className="mt-1 text-sm text-gray-500">ابدأ بإضافة مبيعات لرؤية التحليلات</p>
          </div>
        )}
      </div>
    </div>
  )
}
