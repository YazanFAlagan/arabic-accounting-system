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
  Filter,
  Printer
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
  const [showInvoiceDetails, setShowInvoiceDetails] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null)
  const [invoiceDetails, setInvoiceDetails] = useState<any[]>([])
  const [showExpenseDetails, setShowExpenseDetails] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<any>(null)

  useEffect(() => {
    // Set default dates (last 30 days)
    const today = new Date()
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
    
    setEndDate(today.toISOString().split('T')[0])
    setStartDate(thirtyDaysAgo.toISOString().split('T')[0])
  }, [])

  const fetchInvoiceDetails = async (invoiceId: string) => {
    try {
      const { data, error } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoiceId)

      if (error) throw error
      setInvoiceDetails(data || [])
    } catch (error) {
      console.error('Error fetching invoice details:', error)
    }
  }

  const handleViewInvoiceDetails = async (invoice: any) => {
    setSelectedInvoice(invoice)
    await fetchInvoiceDetails(invoice.id)
    setShowInvoiceDetails(true)
  }

  const handleViewExpenseDetails = (expense: any) => {
    setSelectedExpense(expense)
    setShowExpenseDetails(true)
  }

  const printInvoice = async (invoice: any) => {
    try {
      // Fetch invoice details for printing
      const { data: itemsData } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoice.id)

      if (!itemsData) return

      // Create print window content
      const printContent = `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>فاتورة ${invoice.invoice_number}</title>
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
            .invoice-info { 
              display: flex; 
              justify-content: space-between; 
              margin-bottom: 30px;
            }
            .customer-info { 
              border: 1px solid #ddd; 
              padding: 15px; 
              border-radius: 8px;
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
            .totals { 
              margin-top: 30px; 
              text-align: left;
            }
            .total-row { 
              font-weight: bold; 
              font-size: 18px;
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
            <h1>فاتورة مبيعات</h1>
            <h2>رقم الفاتورة: ${invoice.invoice_number}</h2>
          </div>
          
          <div class="invoice-info">
            <div class="customer-info">
              <h3>بيانات العميل:</h3>
              <p><strong>الاسم:</strong> ${invoice.customer_name}</p>
              <p><strong>التاريخ:</strong> ${formatDate(invoice.invoice_date)}</p>
              <p><strong>نوع البيع:</strong> ${invoice.sale_type === 'retail' ? 'قطاعي' : 'محلات'}</p>
            </div>
            <div>
              <p><strong>تاريخ الإنشاء:</strong> ${formatDate(invoice.created_at)}</p>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>المنتج</th>
                <th>الكمية</th>
                <th>السعر الأصلي</th>
                <th>الخصم</th>
                <th>السعر النهائي</th>
                <th>المجموع</th>
              </tr>
            </thead>
            <tbody>
              ${itemsData.map(item => `
                <tr>
                  <td>${item.product_name}</td>
                  <td>${item.quantity}</td>
                  <td>${item.unit_price.toFixed(2)} ج.م</td>
                  <td>
                    ${item.item_discount_percentage > 0 ? item.item_discount_percentage + '%' : ''}
                    ${item.item_discount_percentage > 0 && item.item_discount_amount > 0 ? ' + ' : ''}
                    ${item.item_discount_amount > 0 ? item.item_discount_amount.toFixed(2) + ' ج.م' : ''}
                  </td>
                  <td>${item.final_unit_price.toFixed(2)} ج.م</td>
                  <td>${item.line_total.toFixed(2)} ج.م</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="totals">
            <div class="total-row">
              <strong>المجموع الفرعي:</strong> ${invoice.subtotal?.toFixed(2) || '0.00'} ج.م
            </div>
            ${(invoice.discount_percentage > 0 || invoice.discount_amount > 0) ? `
              <div class="total-row" style="color: red;">
                <strong>خصم إضافي:</strong> -${((invoice.subtotal || 0) * invoice.discount_percentage / 100 + (invoice.discount_amount || 0)).toFixed(2)} ج.م
              </div>
            ` : ''}
            <div class="total-row" style="color: green; font-size: 20px;">
              <strong>المجموع النهائي:</strong> ${invoice.total_amount.toFixed(2)} ج.م
            </div>
          </div>
          
          ${invoice.notes ? `
            <div style="margin-top: 30px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
              <h4>ملاحظات:</h4>
              <p>${invoice.notes}</p>
            </div>
          ` : ''}
          
          <button class="print-btn no-print" onclick="window.print()">طباعة الفاتورة</button>
        </body>
        </html>
      `

      // Open print window
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(printContent)
        printWindow.document.close()
        printWindow.focus()
      }
    } catch (error) {
      console.error('Error printing invoice:', error)
      alert('حدث خطأ في طباعة الفاتورة')
    }
  }

  const fetchReportData = async () => {
    try {
      setLoading(true)

      // Fetch invoices data
      const { data: invoicesData } = await supabase
        .from('invoices')
        .select('*')
        .gte('invoice_date', startDate)
        .lte('invoice_date', endDate)

      // Fetch purchases data
      const { data: purchasesData } = await supabase
        .from('purchases')
        .select('*')
        .gte('purchase_date', startDate)
        .lte('purchase_date', endDate)

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

        // Calculate available funds
        const availableFunds = totalSales - totalExpenses

        // Convert invoices to sales format for display
        const combinedSalesData = [
          ...(invoicesData || []).map(invoice => ({ ...invoice, source: 'invoice' }))
        ]

        setReportData({
          sales: combinedSalesData,
          purchases: purchasesData || [],
          products: productsData || [],
          totalSales,
          totalExpenses,
          netProfit: netProfitFinal,
          availableFunds
        })
      }
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
      const salesHeaders = ['الرقم', 'التاريخ', 'رقم الفاتورة', 'اسم العميل', 'المجموع الفرعي', 'الخصم', 'المجموع النهائي', 'ملاحظات']
      const salesData = [
        salesHeaders,
        ...reportData.sales.map((sale, index) => [
          index + 1,
          formatDate(sale.invoice_date),
          sale.invoice_number || 'غير محدد',
          sale.customer_name || 'غير محدد',
          formatCurrency(sale.subtotal || 0),
          formatCurrency(((sale.subtotal || 0) * (sale.discount_percentage || 0) / 100) + (sale.discount_amount || 0)),
          formatCurrency(sale.total_amount || 0),
          sale.notes || ''
        ])
      ]
      
      const salesSheet = XLSX.utils.aoa_to_sheet(salesData)
      
      // تنسيق ورقة المبيعات
      salesSheet['!cols'] = [
        { width: 8 },   // الرقم
        { width: 12 },  // التاريخ
        { width: 15 },  // رقم الفاتورة
        { width: 20 },  // اسم العميل
        { width: 15 },  // المجموع الفرعي
        { width: 15 },  // الخصم
        { width: 15 },  // المجموع النهائي
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
            <div className="flex gap-3">
              <button
                onClick={generateExcel}
                disabled={loading || getFilteredData().length === 0}
                className="flex items-center px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-xl hover:from-green-700 hover:to-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                <Download className="h-5 w-5 ml-2" />
                تصدير Excel
              </button>
              <button
                onClick={() => {
                  const printContent = `
                    <!DOCTYPE html>
                    <html dir="rtl" lang="ar">
                    <head>
                      <meta charset="UTF-8">
                      <meta name="viewport" content="width=device-width, initial-scale=1.0">
                      <title>تقرير ${reportType === 'all' ? 'شامل' : reportType === 'sales' ? 'المبيعات' : 'المصروفات'}</title>
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
                        .summary { 
                          display: grid; 
                          grid-template-columns: repeat(2, 1fr); 
                          gap: 20px; 
                          margin-bottom: 30px;
                        }
                        .summary-card { 
                          border: 1px solid #ddd; 
                          padding: 15px; 
                          border-radius: 8px; 
                          text-align: center;
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
                        <h1>تقرير ${reportType === 'all' ? 'شامل' : reportType === 'sales' ? 'المبيعات' : 'المصروفات'}</h1>
                        <h2>من ${formatDate(startDate)} إلى ${formatDate(endDate)}</h2>
                        <p>تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}</p>
                      </div>
                      
                      <div class="summary">
                        <div class="summary-card">
                          <h3>الأموال المتاحة</h3>
                          <p>${formatCurrency(reportData.availableFunds)}</p>
                        </div>
                        <div class="summary-card">
                          <h3>إجمالي المبيعات</h3>
                          <p>${formatCurrency(reportData.totalSales)}</p>
                        </div>
                        <div class="summary-card">
                          <h3>إجمالي المصروفات</h3>
                          <p>${formatCurrency(reportData.totalExpenses)}</p>
                        </div>
                        <div class="summary-card">
                          <h3>صافي الربح</h3>
                          <p>${formatCurrency(reportData.netProfit)}</p>
                        </div>
                      </div>
                      
                      <h3>${reportType === 'all' ? 'جميع البيانات' : reportType === 'sales' ? 'بيانات المبيعات' : 'بيانات المصروفات'}</h3>
                      <table>
                        <thead>
                          <tr>
                            <th>التاريخ</th>
                            <th>النوع</th>
                            <th>المنتج</th>
                            <th>العميل/المورد</th>
                            <th>الكمية</th>
                            <th>المبلغ</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${getFilteredData().map(item => `
                            <tr>
                              <td>${formatDate(item.sale_date || item.purchase_date)}</td>
                              <td>${item.type === 'sale' ? 'مبيعة' : (item.type === 'product' ? 'مشتريات' : 'مصروف')}</td>
                              <td>${item.product_name}</td>
                              <td>${item.customer_name || item.supplier_name}</td>
                              <td>${item.quantity || '-'}</td>
                              <td>${formatCurrency(item.total_price || item.total_cost)}</td>
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
                }}
                disabled={loading || getFilteredData().length === 0}
                className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                <Printer className="h-5 w-5 ml-2" />
                طباعة التقرير
              </button>
            </div>
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
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        الإجراءات
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportType === 'sales' && reportData.sales.map((sale) => (
                      <tr key={`sale-${sale.id}`} className="hover:bg-gray-50/50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(sale.invoice_date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            فاتورة
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          فاتورة رقم {sale.invoice_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {sale.customer_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          1
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                          {formatCurrency(sale.total_amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleViewInvoiceDetails(sale)}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="عرض تفاصيل الفاتورة"
                          >
                            <FileText className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => printInvoice(sale)}
                            className="text-green-600 hover:text-green-900 mr-2"
                            title="طباعة الفاتورة"
                          >
                            <Printer className="h-4 w-4" />
                          </button>
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleViewExpenseDetails(purchase)}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="عرض تفاصيل المصروف"
                          >
                            <FileText className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}

                    {reportType === 'all' && [
                      ...reportData.sales.map(sale => ({...sale, type: 'invoice'})),
                      ...reportData.purchases.map(purchase => ({...purchase, type: 'purchase'}))
                    ].sort((a, b) => new Date(b.invoice_date || b.purchase_date).getTime() - new Date(a.invoice_date || a.purchase_date).getTime())
                    .map((item) => (
                      <tr key={`${item.type}-${item.id}`} className="hover:bg-gray-50/50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(item.invoice_date || item.purchase_date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            item.type === 'invoice' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {item.type === 'invoice' ? 'فاتورة' : (item.type === 'product' ? 'مشتريات' : 'مصروف')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.type === 'invoice' ? `فاتورة رقم ${item.invoice_number}` : (item.product_name || item.expense_description)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.customer_name || item.supplier_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.type === 'invoice' ? '1' : (item.quantity || '-')}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${
                          item.type === 'invoice' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(item.total_amount || item.total_cost)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {item.type === 'invoice' && (
                            <button
                              onClick={() => handleViewInvoiceDetails(item)}
                              className="text-indigo-600 hover:text-indigo-900"
                              title="عرض تفاصيل الفاتورة"
                            >
                              <FileText className="h-4 w-4" />
                            </button>
                          )}
                          {item.type === 'invoice' && (
                            <button
                              onClick={() => printInvoice(item)}
                              className="text-green-600 hover:text-green-900 mr-2"
                              title="طباعة الفاتورة"
                            >
                              <Printer className="h-4 w-4" />
                            </button>
                          )}
                          {item.type === 'purchase' && (
                            <button
                              onClick={() => handleViewExpenseDetails(item)}
                              className="text-indigo-600 hover:text-indigo-900"
                              title="عرض تفاصيل المصروف"
                            >
                              <FileText className="h-4 w-4" />
                            </button>
                          )}
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

      {/* Invoice Details Modal */}
      {showInvoiceDetails && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">تفاصيل الفاتورة</h3>
                <p className="text-sm text-gray-600">
                  رقم الفاتورة: {selectedInvoice.invoice_number} | 
                  العميل: {selectedInvoice.customer_name} | 
                  التاريخ: {formatDate(selectedInvoice.invoice_date)}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => printInvoice(selectedInvoice)}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  title="طباعة الفاتورة"
                >
                  <Printer className="h-4 w-4 ml-2" />
                  طباعة
                </button>
                <button
                  onClick={() => setShowInvoiceDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {invoiceDetails.length > 0 ? (
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">ملخص الفاتورة</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">المجموع الفرعي:</span>
                      <p className="font-medium">{formatCurrency(selectedInvoice.subtotal || 0)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">الخصم:</span>
                      <p className="font-medium text-red-600">
                        -{formatCurrency(((selectedInvoice.subtotal || 0) * (selectedInvoice.discount_percentage || 0) / 100) + (selectedInvoice.discount_amount || 0))}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">المجموع النهائي:</span>
                      <p className="font-medium text-green-600">{formatCurrency(selectedInvoice.total_amount)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">نوع البيع:</span>
                      <p className="font-medium">{selectedInvoice.sale_type === 'retail' ? 'قطاعي' : 'محلات'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700">تفاصيل الأصناف</h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">المنتج</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الكمية</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">السعر الأصلي</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الخصم</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">السعر النهائي</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">المجموع</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {invoiceDetails.map((item, index) => (
                          <tr key={index}>
                            <td className="px-4 py-3 text-sm text-gray-900">{item.product_name}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{item.quantity}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(item.unit_price)}</td>
                            <td className="px-4 py-3 text-sm text-red-600">
                              {item.item_discount_percentage > 0 && `${item.item_discount_percentage}%`}
                              {item.item_discount_percentage > 0 && item.item_discount_amount > 0 && ' + '}
                              {item.item_discount_amount > 0 && formatCurrency(item.item_discount_amount)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(item.final_unit_price)}</td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{formatCurrency(item.line_total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {selectedInvoice.notes && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">ملاحظات</h4>
                    <p className="text-sm text-blue-800">{selectedInvoice.notes}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">لا توجد تفاصيل متاحة لهذه الفاتورة</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Expense Details Modal */}
      {showExpenseDetails && selectedExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">تفاصيل المصروف</h3>
                <p className="text-sm text-gray-600">
                  {selectedExpense.type === 'product' ? 'مشتريات' : 'مصروف'} | 
                  التاريخ: {formatDate(selectedExpense.purchase_date)}
                </p>
              </div>
              <button
                onClick={() => setShowExpenseDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* Expense Summary */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-3">ملخص المصروف</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">النوع:</span>
                    <p className="font-medium">
                      {selectedExpense.type === 'product' ? 'مشتريات منتجات' : 
                       selectedExpense.type === 'expense' ? 'مصروف عام' : 'مادة خام'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">المورد:</span>
                    <p className="font-medium">{selectedExpense.supplier_name || 'غير محدد'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">الكمية:</span>
                    <p className="font-medium">{selectedExpense.quantity || 'غير محدد'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">التكلفة الإجمالية:</span>
                    <p className="font-medium text-red-600">{formatCurrency(selectedExpense.total_cost)}</p>
                  </div>
                </div>
              </div>

              {/* Product/Expense Details */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700">تفاصيل {selectedExpense.type === 'product' ? 'المنتج' : 'المصروف'}</h4>
                </div>
                <div className="p-4">
                  <div className="space-y-3">
                    <div>
                      <span className="text-gray-600 text-sm">الاسم:</span>
                      <p className="font-medium text-gray-900">{selectedExpense.product_name || selectedExpense.expense_description}</p>
                    </div>
                    {selectedExpense.unit_cost && (
                      <div>
                        <span className="text-gray-600 text-sm">سعر الوحدة:</span>
                        <p className="font-medium text-gray-900">{formatCurrency(selectedExpense.unit_cost)}</p>
                      </div>
                    )}
                    {selectedExpense.category && (
                      <div>
                        <span className="text-gray-600 text-sm">الفئة:</span>
                        <p className="font-medium text-gray-900">{selectedExpense.category}</p>
                      </div>
                    )}
                    {selectedExpense.payment_method && (
                      <div>
                        <span className="text-gray-600 text-sm">طريقة الدفع:</span>
                        <p className="font-medium text-gray-900">{selectedExpense.payment_method}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedExpense.notes && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">ملاحظات</h4>
                  <p className="text-sm text-blue-800">{selectedExpense.notes}</p>
                </div>
              )}

              {/* Additional Info */}
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-yellow-900 mb-2">معلومات إضافية</h4>
                <div className="text-sm text-yellow-800 space-y-1">
                  <p>• تم إنشاء هذا المصروف في: {formatDate(selectedExpense.created_at)}</p>
                  {selectedExpense.updated_at && selectedExpense.updated_at !== selectedExpense.created_at && (
                    <p>• تم تحديثه في: {formatDate(selectedExpense.updated_at)}</p>
                  )}
                  <p>• نوع المعاملة: {selectedExpense.type === 'product' ? 'مشتريات منتجات' : 
                                       selectedExpense.type === 'expense' ? 'مصروف عام' : 'مادة خام'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
