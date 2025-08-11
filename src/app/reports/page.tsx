'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import QuickNavigation from '@/components/QuickNavigation'
import { useAuth } from '@/contexts/AuthContext'
import * as XLSX from 'xlsx'
import { 
  FileText, 
  Download, 
  Calendar,
  DollarSign,
  ShoppingCart,
  Package,
  TrendingUp,
  Filter
} from 'lucide-react'

interface ReportData {
  sales: any[]
  purchases: any[]
  products: any[]
  totalSales: number
  totalExpenses: number
  netProfit: number
  availableFunds: number // الأموال المتاحة الحالية
}

export default function ReportsPage() {
  const { user } = useAuth()
  const [reportData, setReportData] = useState<ReportData>({
    sales: [],
    purchases: [],
    products: [],
    totalSales: 0,
    totalExpenses: 0,
    netProfit: 0,
    availableFunds: 0
  })
  const [loading, setLoading] = useState(false)
  const [reportType, setReportType] = useState<'sales' | 'expenses' | 'all'>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    // Set default dates (last 30 days)
    const today = new Date()
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
    
    setEndDate(today.toISOString().split('T')[0])
    setStartDate(thirtyDaysAgo.toISOString().split('T')[0])
  }, [])

  const fetchReportData = async () => {
    if (!startDate || !endDate) return

    setLoading(true)
    try {
      // Fetch sales data
      const { data: salesData } = await supabase
        .from('sales')
        .select('*')
        .gte('sale_date', startDate)
        .lte('sale_date', endDate)
        .order('sale_date', { ascending: false })

      // Fetch purchases/expenses data
      const { data: purchasesData } = await supabase
        .from('purchases')
        .select('*')
        .gte('purchase_date', startDate)
        .lte('purchase_date', endDate)
        .order('purchase_date', { ascending: false })

      // Fetch products data
      const { data: productsData } = await supabase
        .from('products')
        .select('*')

      const totalSales = salesData?.reduce((sum, sale) => sum + sale.total_price, 0) || 0
      const totalExpenses = purchasesData?.reduce((sum, purchase) => sum + purchase.total_cost, 0) || 0
      
      // Calculate actual net profit: (sale price - product cost) for each sale
      let actualNetProfit = 0
      if (salesData && productsData && salesData.length > 0) {
        actualNetProfit = salesData.reduce((totalProfit, sale) => {
          // Find the product for this sale
          const product = productsData.find((p: any) => p.name === sale.product_name)
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
      
      // Calculate available funds (total sales minus total expenses)
      const availableFunds = totalSales - totalExpenses

      setReportData({
        sales: salesData || [],
        purchases: purchasesData || [],
        products: productsData || [],
        totalSales,
        totalExpenses,
        netProfit,
        availableFunds
      })
    } catch (error) {
      console.error('Error fetching report data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (startDate && endDate) {
      fetchReportData()
    }
  }, [startDate, endDate])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-EG')
  }

  const generateExcel = () => {
    // إنشاء كتاب عمل جديد
    const workbook = XLSX.utils.book_new()
    
    // تحديد نوع التقرير بالعربية
    const reportTypeArabic = {
      'all': 'تقرير شامل',
      'sales': 'تقرير المبيعات', 
      'expenses': 'تقرير المصروفات'
    }[reportType] || 'تقرير شامل'
    
    // ورقة الملخص الإحصائي
    const summaryData = [
      ['تقرير المحاسبة والمخزون'],
      [`${reportTypeArabic}`],
      [`من ${formatDate(startDate)} إلى ${formatDate(endDate)}`],
      [''],
      ['ملخص التقرير'],
      ['الأموال المتاحة', formatCurrency(reportData.availableFunds)],
      ['إجمالي المبيعات', formatCurrency(reportData.totalSales)],
      ['إجمالي المصروفات', formatCurrency(reportData.totalExpenses)],
      ['صافي الربح', formatCurrency(reportData.netProfit)],
      [''],
      [`تاريخ الإنشاء: ${new Date().toLocaleDateString('ar-EG')}`]
    ]
    
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
    
    // تنسيق ورقة الملخص
    summarySheet['!cols'] = [{ width: 25 }, { width: 20 }]
    
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'الملخص الإحصائي')
    
    // ورقة المبيعات (إذا كان التقرير يتضمن المبيعات)
    if ((reportType === 'sales' || reportType === 'all') && reportData.sales.length > 0) {
      const salesHeaders = ['الرقم', 'التاريخ', 'اسم المنتج', 'اسم العميل', 'الكمية', 'سعر الوحدة', 'إجمالي السعر', 'ملاحظات']
      const salesData = [
        salesHeaders,
        ...reportData.sales.map((sale, index) => [
          index + 1,
          formatDate(sale.created_at),
          sale.product_name || 'غير محدد',
          sale.customer_name || 'غير محدد',
          sale.quantity || 0,
          formatCurrency(sale.unit_price || 0),
          formatCurrency(sale.total_price || 0),
          sale.notes || ''
        ])
      ]
      
      const salesSheet = XLSX.utils.aoa_to_sheet(salesData)
      
      // تنسيق ورقة المبيعات
      salesSheet['!cols'] = [
        { width: 8 },   // الرقم
        { width: 12 },  // التاريخ
        { width: 20 },  // اسم المنتج
        { width: 20 },  // اسم العميل
        { width: 10 },  // الكمية
        { width: 15 },  // سعر الوحدة
        { width: 15 },  // إجمالي السعر
        { width: 25 }   // ملاحظات
      ]
      
      XLSX.utils.book_append_sheet(workbook, salesSheet, 'المبيعات')
    }
    
    // ورقة المصروفات (إذا كان التقرير يتضمن المصروفات)
    if ((reportType === 'expenses' || reportType === 'all') && reportData.purchases.length > 0) {
      const purchasesHeaders = ['الرقم', 'التاريخ', 'النوع', 'اسم المنتج/المصروف', 'اسم المورد', 'الكمية', 'التكلفة الإجمالية', 'ملاحظات']
      const purchasesData = [
        purchasesHeaders,
        ...reportData.purchases.map((purchase, index) => [
          index + 1,
          formatDate(purchase.created_at),
          purchase.type === 'product' ? 'منتج' : purchase.type === 'expense' ? 'مصروف' : 'مادة خام',
          purchase.product_name || purchase.expense_description || 'غير محدد',
          purchase.supplier_name || 'غير محدد',
          purchase.quantity || 0,
          formatCurrency(purchase.total_cost || 0),
          purchase.notes || ''
        ])
      ]
      
      const purchasesSheet = XLSX.utils.aoa_to_sheet(purchasesData)
      
      // تنسيق ورقة المصروفات
      purchasesSheet['!cols'] = [
        { width: 8 },   // الرقم
        { width: 12 },  // التاريخ
        { width: 12 },  // النوع
        { width: 25 },  // اسم المنتج/المصروف
        { width: 20 },  // اسم المورد
        { width: 10 },  // الكمية
        { width: 15 },  // التكلفة الإجمالية
        { width: 25 }   // ملاحظات
      ]
      
      XLSX.utils.book_append_sheet(workbook, purchasesSheet, 'المصروفات والمشتريات')
    }
    
    // حفظ الملف
    const fileName = `تقرير-${reportTypeArabic}-${startDate}-${endDate}.xlsx`
    XLSX.writeFile(workbook, fileName)
  }

  const getFilteredData = () => {
    switch (reportType) {
      case 'sales':
        return reportData.sales
      case 'expenses':
        return reportData.purchases
      case 'all':
        return [...reportData.sales, ...reportData.purchases]
      default:
        return []
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100" dir="rtl">
      <QuickNavigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-2">التقارير</h1>
              <p className="text-gray-600 text-lg">إنشاء وتصدير التقارير المالية</p>
            </div>
            <button
              onClick={generateExcel}
              disabled={loading || getFilteredData().length === 0}
              className="flex items-center px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-xl hover:from-green-700 hover:to-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              <Download className="h-5 w-5 ml-2" />
              تصدير Excel
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
              <Filter className="h-6 w-6 ml-2 text-indigo-600" />
              فلاتر التقرير
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {/* Report Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  نوع التقرير
                </label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as 'sales' | 'expenses' | 'all')}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 transition-all duration-200 bg-white hover:bg-gray-50 text-gray-900 font-medium"
                >
                  <option value="all">تقرير شامل</option>
                  <option value="sales">تقرير المبيعات</option>
                  <option value="expenses">تقرير المصروفات</option>
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  من تاريخ
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 transition-all duration-200 bg-white hover:bg-gray-50 text-gray-900 font-medium"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  إلى تاريخ
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 transition-all duration-200 bg-white hover:bg-gray-50 text-gray-900 font-medium"
                />
              </div>

              {/* Generate Button */}
              <div className="flex items-end">
                <button
                  onClick={fetchReportData}
                  disabled={loading || !startDate || !endDate}
                  className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <FileText className="h-5 w-5 ml-2" />
                      إنشاء التقرير
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-600 mb-2">الأموال المتاحة</p>
                  <p className={`text-3xl font-bold ${reportData.availableFunds >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    {formatCurrency(reportData.availableFunds)}
                  </p>
                </div>
                <div className={`p-4 rounded-2xl shadow-lg ${reportData.availableFunds >= 0 ? 'bg-gradient-to-r from-blue-500 to-blue-600' : 'bg-gradient-to-r from-red-500 to-red-600'}`}>
                  <DollarSign className="h-7 w-7 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-600 mb-2">إجمالي المبيعات</p>
                  <p className="text-3xl font-bold text-green-600">{formatCurrency(reportData.totalSales)}</p>
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
                  <p className="text-3xl font-bold text-red-600">{formatCurrency(reportData.totalExpenses)}</p>
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
                  <p className={`text-3xl font-bold ${reportData.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(reportData.netProfit)}
                  </p>
                </div>
                <div className={`p-4 rounded-2xl shadow-lg ${reportData.netProfit >= 0 ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-gradient-to-r from-red-500 to-red-600'}`}>
                  <Package className="h-7 w-7 text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden">
            <div className="p-6 border-b border-gray-200/50">
              <h3 className="text-xl font-bold text-gray-800">
                {reportType === 'sales' && 'بيانات المبيعات'}
                {reportType === 'expenses' && 'بيانات المصروفات'}
                {reportType === 'all' && 'جميع البيانات'}
              </h3>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              </div>
            ) : getFilteredData().length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50/50">
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        التاريخ
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        النوع
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        المنتج
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        العميل/المورد
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        الكمية
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        المبلغ
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportType === 'sales' && reportData.sales.map((sale) => (
                      <tr key={`sale-${sale.id}`} className="hover:bg-gray-50/50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(sale.sale_date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            مبيعة
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {sale.product_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {sale.customer_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {sale.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                          {formatCurrency(sale.total_price)}
                        </td>
                      </tr>
                    ))}
                    
                    {reportType === 'expenses' && reportData.purchases.map((purchase) => (
                      <tr key={`purchase-${purchase.id}`} className="hover:bg-gray-50/50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(purchase.purchase_date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            {purchase.type === 'product' ? 'مشتريات' : 'مصروف'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {purchase.product_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {purchase.supplier_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {purchase.quantity || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600">
                          {formatCurrency(purchase.total_cost)}
                        </td>
                      </tr>
                    ))}

                    {reportType === 'all' && [
                      ...reportData.sales.map(sale => ({...sale, type: 'sale'})),
                      ...reportData.purchases.map(purchase => ({...purchase, type: 'purchase'}))
                    ].sort((a, b) => new Date(b.sale_date || b.purchase_date).getTime() - new Date(a.sale_date || a.purchase_date).getTime())
                    .map((item) => (
                      <tr key={`${item.type}-${item.id}`} className="hover:bg-gray-50/50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(item.sale_date || item.purchase_date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            item.type === 'sale' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {item.type === 'sale' ? 'مبيعة' : (item.type === 'product' ? 'مشتريات' : 'مصروف')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.product_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.customer_name || item.supplier_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.quantity || '-'}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${
                          item.type === 'sale' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(item.total_price || item.total_cost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد بيانات</h3>
                <p className="text-gray-500">اختر التواريخ وانقر على "إنشاء التقرير"</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
