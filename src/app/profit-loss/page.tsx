'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import QuickNavigation from '@/components/QuickNavigation'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar,
  BarChart3,
  FileText,
  Printer,
  Eye,
  ShoppingCart,
  Package
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'

interface ProfitLossData {
  date: string
  sales: number
  expenses: number
  profit: number
  profitMargin: number
}

interface MonthlyData {
  month: string
  totalSales: number
  totalExpenses: number
  netProfit: number
  profitMargin: number
  transactions: any[]
}

interface DailyData {
  date: string
  sales: number
  expenses: number
  profit: number
  profitMargin: number
  transactions: any[]
}

export default function ProfitLossPage() {
  const [dailyData, setDailyData] = useState<DailyData[]>([])
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'monthly'>('daily')
  const [selectedMonth, setSelectedMonth] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [showDetails, setShowDetails] = useState(false)
  const [selectedDetails, setSelectedDetails] = useState<any[]>([])
  const [detailTitle, setDetailTitle] = useState('')

  useEffect(() => {
    fetchProfitLossData()
  }, [])

  const fetchProfitLossData = async () => {
    try {
      setLoading(true)

      // Fetch sales data
      const { data: salesData } = await supabase
        .from('sales')
        .select('*')
        .order('sale_date', { ascending: false })

      // Fetch invoices data
      const { data: invoicesData } = await supabase
        .from('invoices')
        .select('*')
        .order('invoice_date', { ascending: false })

      // Fetch purchases/expenses data
      const { data: purchasesData } = await supabase
        .from('purchases')
        .select('*')
        .order('purchase_date', { ascending: false })

      // Fetch products data for profit calculation
      const { data: productsData } = await supabase
        .from('products')
        .select('*')

      // Fetch invoice items for profit calculation
      const { data: invoiceItemsData } = await supabase
        .from('invoice_items')
        .select('*')

      if (salesData && invoicesData && purchasesData && productsData) {
        // Process daily data
        const daily = processDailyData(salesData, invoicesData, purchasesData, productsData, invoiceItemsData || [])
        setDailyData(daily)

        // Process monthly data
        const monthly = processMonthlyData(salesData, invoicesData, purchasesData, productsData, invoiceItemsData || [])
        setMonthlyData(monthly)
      }
    } catch (error) {
      console.error('Error fetching profit/loss data:', error)
    } finally {
      setLoading(false)
    }
  }

  const processDailyData = (sales: any[], invoices: any[], purchases: any[], products: any[], invoiceItems: any[]) => {
    const dailyMap = new Map<string, DailyData>()

    // Process sales
    sales.forEach(sale => {
      const date = sale.sale_date
      if (!dailyMap.has(date)) {
        dailyMap.set(date, {
          date,
          sales: 0,
          expenses: 0,
          profit: 0,
          profitMargin: 0,
          transactions: []
        })
      }
      
      const daily = dailyMap.get(date)!
      const product = products.find(p => p.name === sale.product_name)
      const cost = product ? (product.wholesale_price || 0) * sale.quantity : 0
      const revenue = sale.total_price
      const profit = revenue - cost
      
      daily.sales += revenue
      daily.profit += profit
      daily.transactions.push({
        type: 'sale',
        product: sale.product_name,
        quantity: sale.quantity,
        revenue,
        cost,
        profit,
        customer: sale.customer_name,
        time: sale.created_at
      })
    })

    // Process invoices
    invoices.forEach(invoice => {
      const date = invoice.invoice_date
      if (!dailyMap.has(date)) {
        dailyMap.set(date, {
          date,
          sales: 0,
          expenses: 0,
          profit: 0,
          profitMargin: 0,
          transactions: []
        })
      }
      
      const daily = dailyMap.get(date)!
      const items = invoiceItems.filter(item => item.invoice_id === invoice.id)
      
      let totalRevenue = 0
      let totalCost = 0
      let totalProfit = 0
      
      items.forEach(item => {
        const product = products.find(p => p.id === item.product_id)
        const cost = product ? (product.wholesale_price || 0) * item.quantity : 0
        const revenue = item.line_total
        const profit = revenue - cost
        
        totalRevenue += revenue
        totalCost += cost
        totalProfit += profit
      })
      
      daily.sales += totalRevenue
      daily.profit += totalProfit
      daily.transactions.push({
        type: 'invoice',
        invoiceNumber: invoice.invoice_number,
        revenue: totalRevenue,
        cost: totalCost,
        profit: totalProfit,
        customer: invoice.customer_name,
        itemsCount: items.length,
        time: invoice.created_at
      })
    })

    // Process purchases/expenses
    purchases.forEach(purchase => {
      const date = purchase.purchase_date
      if (!dailyMap.has(date)) {
        dailyMap.set(date, {
          date,
          sales: 0,
          expenses: 0,
          profit: 0,
          profitMargin: 0,
          transactions: []
        })
      }
      
      const daily = dailyMap.get(date)!
      daily.expenses += purchase.total_cost
      daily.transactions.push({
        type: 'expense',
        description: purchase.product_name || purchase.expense_description,
        amount: purchase.total_cost,
        supplier: purchase.supplier_name,
        time: purchase.created_at
      })
    })

    // Calculate profit margins
    dailyMap.forEach(daily => {
      daily.profitMargin = daily.sales > 0 ? (daily.profit / daily.sales) * 100 : 0
    })

    return Array.from(dailyMap.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  const processMonthlyData = (sales: any[], invoices: any[], purchases: any[], products: any[], invoiceItems: any[]) => {
    const monthlyMap = new Map<string, MonthlyData>()

    // Process sales
    sales.forEach(sale => {
      const month = sale.sale_date.substring(0, 7)
      if (!monthlyMap.has(month)) {
        monthlyMap.set(month, {
          month,
          totalSales: 0,
          totalExpenses: 0,
          netProfit: 0,
          profitMargin: 0,
          transactions: []
        })
      }
      
      const monthly = monthlyMap.get(month)!
      const product = products.find(p => p.name === sale.product_name)
      const cost = product ? (product.wholesale_price || 0) * sale.quantity : 0
      const revenue = sale.total_price
      const profit = revenue - cost
      
      monthly.totalSales += revenue
      monthly.netProfit += profit
      monthly.transactions.push({
        type: 'sale',
        product: sale.product_name,
        quantity: sale.quantity,
        revenue,
        cost,
        profit,
        customer: sale.customer_name,
        date: sale.sale_date,
        time: sale.created_at
      })
    })

    // Process invoices
    invoices.forEach(invoice => {
      const month = invoice.invoice_date.substring(0, 7)
      if (!monthlyMap.has(month)) {
        monthlyMap.set(month, {
          month,
          totalSales: 0,
          totalExpenses: 0,
          netProfit: 0,
          profitMargin: 0,
          transactions: []
        })
      }
      
      const monthly = monthlyMap.get(month)!
      const items = invoiceItems.filter(item => item.invoice_id === invoice.id)
      
      let totalRevenue = 0
      let totalCost = 0
      let totalProfit = 0
      
      items.forEach(item => {
        const product = products.find(p => p.id === item.product_id)
        const cost = product ? (product.wholesale_price || 0) * item.quantity : 0
        const revenue = item.line_total
        const profit = revenue - cost
        
        totalRevenue += revenue
        totalCost += cost
        totalProfit += profit
      })
      
      monthly.totalSales += totalRevenue
      monthly.netProfit += totalProfit
      monthly.transactions.push({
        type: 'invoice',
        invoiceNumber: invoice.invoice_number,
        revenue: totalRevenue,
        cost: totalCost,
        profit: totalProfit,
        customer: invoice.customer_name,
        itemsCount: items.length,
        date: invoice.invoice_date,
        time: invoice.created_at
      })
    })

    // Process purchases/expenses
    purchases.forEach(purchase => {
      const month = purchase.purchase_date.substring(0, 7)
      if (!monthlyMap.has(month)) {
        monthlyMap.set(month, {
          month,
          totalSales: 0,
          totalExpenses: 0,
          netProfit: 0,
          profitMargin: 0,
          transactions: []
        })
      }
      
      const monthly = monthlyMap.get(month)!
      monthly.totalExpenses += purchase.total_cost
      monthly.transactions.push({
        type: 'expense',
        description: purchase.product_name || purchase.expense_description,
        amount: purchase.total_cost,
        supplier: purchase.supplier_name,
        date: purchase.purchase_date,
        time: purchase.created_at
      })
    })

    // Calculate profit margins
    monthlyMap.forEach(monthly => {
      monthly.profitMargin = monthly.totalSales > 0 ? (monthly.netProfit / monthly.totalSales) * 100 : 0
    })

    return Array.from(monthlyMap.values()).sort((a, b) => b.month.localeCompare(a.month))
  }

  const handleViewDetails = (data: any[], title: string) => {
    setSelectedDetails(data)
    setDetailTitle(title)
    setShowDetails(true)
  }

  const printReport = (data: any[], title: string) => {
    const printContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          @media print {
            body { margin: 0; padding: 20px; }
            .no-print { display: none; }
          }
          body { 
            font-family: 'Arial', sans-serif; 
            margin: 20px; 
            direction: rtl; 
            text-align: right;
          }
          .header { 
            text-align: center; 
            border-bottom: 2px solid #333; 
            padding-bottom: 20px; 
            margin-bottom: 30px;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 20px 0;
          }
          th, td { 
            border: 1px solid #ddd; 
            padding: 12px; 
            text-align: right;
          }
          th { 
            background-color: #f8f9fa; 
            font-weight: bold;
          }
          .print-btn { 
            background: #007bff; 
            color: white; 
            border: none; 
            padding: 10px 20px; 
            border-radius: 5px; 
            cursor: pointer; 
            margin: 20px 0;
          }
          @media print {
            .print-btn { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${title}</h1>
          <p>تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}</p>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>النوع</th>
              <th>التفاصيل</th>
              <th>المبلغ</th>
              <th>التاريخ</th>
            </tr>
          </thead>
          <tbody>
            ${data.map(item => `
              <tr>
                <td>${item.type === 'sale' ? 'مبيعة' : item.type === 'invoice' ? 'فاتورة' : 'مصروف'}</td>
                <td>
                  ${item.type === 'sale' ? `${item.product} - العميل: ${item.customer}` : ''}
                  ${item.type === 'invoice' ? `فاتورة ${item.invoiceNumber} - العميل: ${item.customer}` : ''}
                  ${item.type === 'expense' ? `${item.description} - المورد: ${item.supplier}` : ''}
                </td>
                <td>${item.type === 'expense' ? item.amount : item.revenue} ج.م</td>
                <td>${new Date(item.date || item.time).toLocaleDateString('ar-EG')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <button class="print-btn no-print" onclick="window.print()">طباعة التقرير</button>
      </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.focus()
    }
  }

  const formatCurrency = (amount: number) => {
    if (typeof amount !== 'number' || isNaN(amount)) {
      return '0 ج.م.'
    }
    
    // إذا كان الرقم صحيح (بدون كسور)
    if (Number.isInteger(amount)) {
      return `${amount} ج.م.`
    }
    
    // إذا كان الرقم عشري، نعرض رقمين فقط بعد الفاصلة
    const formattedAmount = Number(amount).toFixed(2)
    
    // إزالة الأصفار الزائدة في النهاية
    const cleanAmount = formattedAmount.replace(/\.?0+$/, '')
    
    return `${cleanAmount} ج.م.`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-EG')
  }

  const formatMonth = (monthString: string) => {
    const [year, month] = monthString.split('-')
    return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long' })
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
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">تقرير الأرباح والخسائر</h1>
            <p className="text-gray-600 text-lg">تحليل شامل للأرباح والخسائر اليومية والشهرية</p>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setSelectedPeriod('daily')}
                className={`px-6 py-3 text-sm font-medium ${
                  selectedPeriod === 'daily'
                    ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                التقارير اليومية
              </button>
              <button
                onClick={() => setSelectedPeriod('monthly')}
                className={`px-6 py-3 text-sm font-medium ${
                  selectedPeriod === 'monthly'
                    ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                التقارير الشهرية
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-600 mb-2">الأموال المتاحة</p>
                  <p className={`text-3xl font-bold ${dailyData.reduce((sum, day) => sum + day.profit, 0) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    {formatCurrency(dailyData.reduce((sum, day) => sum + day.profit, 0))}
                  </p>
                </div>
                <div className={`p-4 rounded-2xl shadow-lg ${dailyData.reduce((sum, day) => sum + day.profit, 0) >= 0 ? 'bg-gradient-to-r from-blue-500 to-blue-600' : 'bg-gradient-to-r from-red-500 to-red-600'}`}>
                  <DollarSign className="h-7 w-7 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-600 mb-2">إجمالي المبيعات</p>
                  <p className="text-3xl font-bold text-green-600">{formatCurrency(dailyData.reduce((sum, day) => sum + day.sales, 0))}</p>
                </div>
                <div className="p-4 rounded-2xl bg-gradient-to-r from-green-500 to-green-600 shadow-lg">
                  <TrendingUp className="h-7 w-7 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-600 mb-2">إجمالي المصروفات</p>
                  <p className="text-3xl font-bold text-red-600">{formatCurrency(dailyData.reduce((sum, day) => sum + day.expenses, 0))}</p>
                </div>
                <div className="p-4 rounded-2xl bg-gradient-to-r from-red-500 to-red-600 shadow-lg">
                  <ShoppingCart className="h-7 w-7 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-600 mb-2">صافي الربح</p>
                  <p className={`text-3xl font-bold ${dailyData.reduce((sum, day) => sum + day.profit, 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(dailyData.reduce((sum, day) => sum + day.profit, 0))}
                  </p>
                </div>
                <div className={`p-4 rounded-2xl shadow-lg ${dailyData.reduce((sum, day) => sum + day.profit, 0) >= 0 ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-gradient-to-r from-red-500 to-red-600'}`}>
                  <Package className="h-7 w-7 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-600 mb-2">حصة الشريك الثالث (ربنا)</p>
                  <p className="text-3xl font-bold text-purple-600">{formatCurrency((dailyData.reduce((sum, day) => sum + day.profit, 0)) > 0 ? (dailyData.reduce((sum, day) => sum + day.profit, 0)) * 0.1 : 0)}</p>
                </div>
                <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-500 to-purple-600 shadow-lg">
                  <DollarSign className="h-7 w-7 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-600 mb-2">حصة يزن</p>
                  <p className="text-3xl font-bold text-indigo-600">{formatCurrency((() => {
                    const availableFunds = dailyData.reduce((sum, day) => sum + day.profit, 0);
                    const godShare = availableFunds > 0 ? availableFunds * 0.1 : 0;
                    const remainingFunds = availableFunds - godShare;
                    return remainingFunds > 0 ? remainingFunds * 0.45 : 0;
                  })())}</p>
                </div>
                <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-indigo-600 shadow-lg">
                  <DollarSign className="h-7 w-7 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-600 mb-2">حصة محمود</p>
                  <p className="text-3xl font-bold text-teal-600">{formatCurrency((() => {
                    const availableFunds = dailyData.reduce((sum, day) => sum + day.profit, 0);
                    const godShare = availableFunds > 0 ? availableFunds * 0.1 : 0;
                    const remainingFunds = availableFunds - godShare;
                    return remainingFunds > 0 ? remainingFunds * 0.45 : 0;
                  })())}</p>
                </div>
                <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-500 to-teal-600 shadow-lg">
                  <DollarSign className="h-7 w-7 text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Profit Trend Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">اتجاه الأرباح اليومية</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyData.slice(0, 30)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => formatDate(value)}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}ك`} />
                    <Tooltip 
                      formatter={(value: any) => [formatCurrency(value), '']}
                      labelFormatter={(label) => formatDate(label)}
                    />
                    <Line type="monotone" dataKey="profit" stroke="#10B981" strokeWidth={2} name="الربح" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Sales vs Expenses Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">المبيعات مقابل المصروفات</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyData.slice(0, 30)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => formatDate(value)}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}ك`} />
                    <Tooltip 
                      formatter={(value: any) => [formatCurrency(value), '']}
                      labelFormatter={(label) => formatDate(label)}
                    />
                    <Bar dataKey="sales" fill="#10B981" name="المبيعات" />
                    <Bar dataKey="expenses" fill="#EF4444" name="المصروفات" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Data Tables */}
          {selectedPeriod === 'daily' ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">التقارير اليومية</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">التاريخ</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المبيعات</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المصروفات</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الربح</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">هامش الربح</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {dailyData.map((day) => (
                      <tr key={day.date} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(day.date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                          {formatCurrency(day.sales)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                          {formatCurrency(day.expenses)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                          {formatCurrency(day.profit)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {day.profitMargin.toFixed(1)}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleViewDetails(day.transactions, `تفاصيل ${formatDate(day.date)}`)}
                              className="text-indigo-600 hover:text-indigo-900"
                              title="عرض التفاصيل"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => printReport(day.transactions, `تقرير ${formatDate(day.date)}`)}
                              className="text-green-600 hover:text-green-900"
                              title="طباعة التقرير"
                            >
                              <Printer className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">التقارير الشهرية</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الشهر</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">إجمالي المبيعات</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">إجمالي المصروفات</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">صافي الربح</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">هامش الربح</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {monthlyData.map((month) => (
                      <tr key={month.month} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatMonth(month.month)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                          {formatCurrency(month.totalSales)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                          {formatCurrency(month.totalExpenses)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                          {formatCurrency(month.netProfit)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {month.profitMargin.toFixed(1)}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleViewDetails(month.transactions, `تفاصيل ${formatMonth(month.month)}`)}
                              className="text-indigo-600 hover:text-indigo-900"
                              title="عرض التفاصيل"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => printReport(month.transactions, `تقرير ${formatMonth(month.month)}`)}
                              className="text-green-600 hover:text-green-900"
                              title="طباعة التقرير"
                            >
                              <Printer className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Details Modal */}
          {showDetails && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{detailTitle}</h3>
                    <p className="text-sm text-gray-600">جميع المعاملات والتفاصيل</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => printReport(selectedDetails, detailTitle)}
                      className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      title="طباعة التقرير"
                    >
                      <Printer className="h-4 w-4 ml-2" />
                      طباعة
                    </button>
                    <button
                      onClick={() => setShowDetails(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">النوع</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">التفاصيل</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">المبلغ</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">التاريخ</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الوقت</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedDetails.map((item, index) => (
                          <tr key={index}>
                            <td className="px-4 py-3 text-sm">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                item.type === 'sale' ? 'bg-green-100 text-green-800' :
                                item.type === 'invoice' ? 'bg-blue-100 text-blue-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {item.type === 'sale' ? 'مبيعة' : item.type === 'invoice' ? 'فاتورة' : 'مصروف'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {item.type === 'sale' && (
                                <div>
                                  <div className="font-medium">{item.product}</div>
                                  <div className="text-sm text-gray-500">العميل: {item.customer}</div>
                                  <div className="text-sm text-gray-500">الكمية: {item.quantity}</div>
                                </div>
                              )}
                              {item.type === 'invoice' && (
                                <div>
                                  <div className="font-medium">فاتورة {item.invoiceNumber}</div>
                                  <div className="text-sm text-gray-500">العميل: {item.customer}</div>
                                  <div className="text-sm text-gray-500">عدد الأصناف: {item.itemsCount}</div>
                                </div>
                              )}
                              {item.type === 'expense' && (
                                <div>
                                  <div className="font-medium">{item.description}</div>
                                  <div className="text-sm text-gray-500">المورد: {item.supplier}</div>
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium">
                              {item.type === 'expense' ? (
                                <span className="text-red-600">-{formatCurrency(item.amount)}</span>
                              ) : (
                                <span className="text-green-600">+{formatCurrency(item.revenue)}</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {item.date ? formatDate(item.date) : formatDate(item.time)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {new Date(item.time).toLocaleTimeString('ar-EG')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
