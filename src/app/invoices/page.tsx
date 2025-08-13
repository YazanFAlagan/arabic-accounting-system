'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import QuickNavigation from '@/components/QuickNavigation'
import { useAuth } from '@/contexts/AuthContext'
import { Plus, Search, Edit, FileText, X, Printer } from 'lucide-react'

interface Invoice {
  id: string
  invoice_number: string
  customer_name: string
  invoice_date: string
  sale_type: string
  subtotal: number
  discount_percentage: number
  discount_amount: number
  total_amount: number
  status: string
  notes?: string
  items_count: number
  total_quantity: number
  created_at: string
}

interface InvoiceItem {
  id?: string
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  item_discount_percentage: number
  item_discount_amount: number
  final_unit_price: number
  line_total: number
}

interface Product {
  id: string
  name: string
  wholesale_price: number
  retail_price: number
  shop_price: number
  selling_price: number
  current_stock: number
}

export default function InvoicesPage() {
  const { user } = useAuth()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [savedInvoice, setSavedInvoice] = useState<Invoice | null>(null)
  const [showInvoiceDetails, setShowInvoiceDetails] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [invoiceDetails, setInvoiceDetails] = useState<InvoiceItem[]>([])
  
  // Invoice form state
  const [invoiceForm, setInvoiceForm] = useState({
    customer_name: '',
    invoice_date: new Date().toISOString().split('T')[0],
    sale_type: 'retail' as 'retail' | 'shop',
    discount_percentage: 0,
    discount_amount: 0,
    notes: ''
  })

  // Invoice items state
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([])
  
  // Current item being added
  const [currentItem, setCurrentItem] = useState({
    product_id: '',
    quantity: 1,
    item_discount_percentage: 0,
    item_discount_amount: 0
  })

  useEffect(() => {
    fetchInvoices()
    fetchProducts()
  }, [])

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices_summary')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setInvoices(data || [])
    } catch (error) {
      console.error('Error fetching invoices:', error)
    }
  }

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

  const handleViewInvoiceDetails = async (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    await fetchInvoiceDetails(invoice.id)
    setShowInvoiceDetails(true)
  }

  const printInvoice = async (invoice: Invoice) => {
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
              <p><strong>التاريخ:</strong> ${new Date(invoice.invoice_date).toLocaleDateString('ar-EG')}</p>
              <p><strong>نوع البيع:</strong> ${invoice.sale_type === 'retail' ? 'قطاعي' : 'محلات'}</p>
            </div>
            <div>
              <p><strong>تاريخ الإنشاء:</strong> ${new Date(invoice.created_at).toLocaleDateString('ar-EG')}</p>
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

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, wholesale_price, retail_price, shop_price, selling_price, current_stock')
        .order('name')

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const getProductPriceBySaleType = (product: Product, saleType: string) => {
    switch (saleType) {
      case 'retail':
        return product.retail_price || product.selling_price
      case 'shop':
        return product.shop_price || product.selling_price
      default:
        return product.retail_price || product.selling_price
    }
  }

  const handleAddItem = () => {
    if (!currentItem.product_id) return

    const product = products.find(p => p.id === currentItem.product_id)
    if (!product) return

    const unitPrice = getProductPriceBySaleType(product, invoiceForm.sale_type)
    const percentageDiscount = unitPrice * (currentItem.item_discount_percentage / 100)
    const totalDiscount = percentageDiscount + currentItem.item_discount_amount
    const finalUnitPrice = Math.max(0, unitPrice - totalDiscount)
    const lineTotal = finalUnitPrice * currentItem.quantity

    const newItem: InvoiceItem = {
      product_id: currentItem.product_id,
      product_name: product.name,
      quantity: currentItem.quantity,
      unit_price: unitPrice,
      item_discount_percentage: currentItem.item_discount_percentage,
      item_discount_amount: currentItem.item_discount_amount,
      final_unit_price: finalUnitPrice,
      line_total: lineTotal
    }

    setInvoiceItems([...invoiceItems, newItem])
    
    // Reset current item
    setCurrentItem({
      product_id: '',
      quantity: 1,
      item_discount_percentage: 0,
      item_discount_amount: 0
    })
  }

  const handleRemoveItem = (index: number) => {
    setInvoiceItems(invoiceItems.filter((_, i) => i !== index))
  }

  const calculateSubtotal = () => {
    return invoiceItems.reduce((sum, item) => sum + item.line_total, 0)
  }

  const calculateInvoiceTotal = () => {
    const subtotal = calculateSubtotal()
    const percentageDiscount = subtotal * (invoiceForm.discount_percentage / 100)
    const totalDiscount = percentageDiscount + invoiceForm.discount_amount
    return Math.max(0, subtotal - totalDiscount)
  }

  const handleSaveInvoice = async () => {
    if (!invoiceForm.customer_name || invoiceItems.length === 0) {
      alert('يرجى إدخال اسم العميل وإضافة عنصر واحد على الأقل')
      return
    }

    try {
      console.log('Starting invoice save process...')
      console.log('Invoice form:', invoiceForm)
      console.log('Invoice items:', invoiceItems)
      console.log('User ID:', user?.id)

      // Generate invoice number
      console.log('Generating invoice number...')
      const { data: invoiceNumberData, error: invoiceNumberError } = await supabase
        .rpc('generate_invoice_number')

      if (invoiceNumberError) {
        console.error('Error generating invoice number:', invoiceNumberError)
        throw invoiceNumberError
      }

      const invoiceNumber = invoiceNumberData
      console.log('Generated invoice number:', invoiceNumber)

      // Create invoice
      const invoiceData = {
        invoice_number: invoiceNumber,
        customer_name: invoiceForm.customer_name,
        invoice_date: invoiceForm.invoice_date,
        sale_type: invoiceForm.sale_type,
        discount_percentage: invoiceForm.discount_percentage,
        discount_amount: invoiceForm.discount_amount,
        notes: invoiceForm.notes,
        user_id: user?.id
      }

      console.log('Creating invoice with data:', invoiceData)
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert([invoiceData])
        .select()
        .single()

      if (invoiceError) {
        console.error('Error creating invoice:', invoiceError)
        throw invoiceError
      }

      console.log('Invoice created successfully:', invoice)

      // Create invoice items
      const itemsData = invoiceItems.map(item => ({
        invoice_id: invoice.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        item_discount_percentage: item.item_discount_percentage,
        item_discount_amount: item.item_discount_amount,
        final_unit_price: item.final_unit_price,
        line_total: item.line_total
      }))

      console.log('Creating invoice items:', itemsData)
      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(itemsData)

      if (itemsError) {
        console.error('Error creating invoice items:', itemsError)
        throw itemsError
      }

      console.log('Invoice items created successfully')

      // Reset form
      setInvoiceForm({
        customer_name: '',
        invoice_date: new Date().toISOString().split('T')[0],
        sale_type: 'retail',
        discount_percentage: 0,
        discount_amount: 0,
        notes: ''
      })
      setInvoiceItems([])
      setShowCreateForm(false)
      
      // Refresh data
      fetchInvoices()
      fetchProducts()
      
      // Show success message with invoice details
      setShowSuccessMessage(true)
      setSavedInvoice(invoice)
    } catch (error) {
      console.error('Error saving invoice:', error)
      
      // Provide more specific error messages
      let errorMessage = 'حدث خطأ في حفظ الفاتورة'
      
      if (error && typeof error === 'object' && 'message' in error) {
        const errorObj = error as any
        if (errorObj.message) {
          errorMessage += `: ${errorObj.message}`
        }
        if (errorObj.details) {
          errorMessage += `\nالتفاصيل: ${errorObj.details}`
        }
        if (errorObj.hint) {
          errorMessage += `\nالاقتراح: ${errorObj.hint}`
        }
      }
      
      alert(errorMessage)
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

  const getSaleTypeLabel = (saleType: string) => {
    switch (saleType) {
      case 'retail': return 'قطاعي'
      case 'shop': return 'محلات'
      default: return saleType
    }
  }

  const filteredInvoices = invoices.filter(invoice =>
    invoice.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
              <h1 className="text-2xl font-bold text-gray-900">الفواتير</h1>
              <p className="text-gray-600">إدارة فواتير المبيعات متعددة الأصناف</p>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="h-5 w-5 ml-2" />
              إنشاء فاتورة جديدة
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="البحث في الفواتير..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Success Message */}
          {showSuccessMessage && savedInvoice && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="mr-3">
                    <h3 className="text-sm font-medium text-green-800">تم إنشاء الفاتورة بنجاح!</h3>
                    <div className="mt-1 text-sm text-green-700">
                      <p><strong>رقم الفاتورة:</strong> {savedInvoice.invoice_number}</p>
                      <p><strong>اسم العميل:</strong> {savedInvoice.customer_name}</p>
                      <p><strong>تاريخ الإنشاء:</strong> {new Date(savedInvoice.created_at).toLocaleDateString('ar-EG')}</p>
                      <p><strong>المجموع:</strong> {formatCurrency(savedInvoice.total_amount)}</p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowSuccessMessage(false)
                    setSavedInvoice(null)
                  }}
                  className="text-green-400 hover:text-green-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}

          {/* Create Invoice Modal */}
          {showCreateForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">إنشاء فاتورة جديدة</h3>
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Invoice Header */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        اسم العميل
                      </label>
                      <input
                        type="text"
                        value={invoiceForm.customer_name}
                        onChange={(e) => setInvoiceForm(prev => ({ ...prev, customer_name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        تاريخ الفاتورة
                      </label>
                      <input
                        type="date"
                        value={invoiceForm.invoice_date}
                        onChange={(e) => setInvoiceForm(prev => ({ ...prev, invoice_date: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        نوع البيع
                      </label>
                      <select
                        value={invoiceForm.sale_type}
                        onChange={(e) => {
                          setInvoiceForm(prev => ({ ...prev, sale_type: e.target.value as any }))
                          // Update existing items prices when sale type changes
                          setInvoiceItems(items => items.map(item => {
                            const product = products.find(p => p.id === item.product_id)
                            if (product) {
                              const newUnitPrice = getProductPriceBySaleType(product, e.target.value)
                              const percentageDiscount = newUnitPrice * (item.item_discount_percentage / 100)
                              const totalDiscount = percentageDiscount + item.item_discount_amount
                              const finalUnitPrice = Math.max(0, newUnitPrice - totalDiscount)
                              return {
                                ...item,
                                unit_price: newUnitPrice,
                                final_unit_price: finalUnitPrice,
                                line_total: finalUnitPrice * item.quantity
                              }
                            }
                            return item
                          }))
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      >
                        <option value="retail">قطاعي</option>
                        <option value="shop">محلات</option>
                      </select>
                    </div>
                  </div>

                  {/* Add Item Section */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-900 mb-3">إضافة صنف جديد</h4>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                      <div>
                        <select
                          value={currentItem.product_id}
                          onChange={(e) => setCurrentItem(prev => ({ ...prev, product_id: e.target.value }))}
                          className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        >
                          <option value="">اختر المنتج</option>
                          {products.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name} - متوفر: {product.current_stock}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <input
                          type="number"
                          min="1"
                          placeholder="الكمية"
                          value={currentItem.quantity}
                          onChange={(e) => setCurrentItem(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                          className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          placeholder="خصم %"
                          value={currentItem.item_discount_percentage}
                          onChange={(e) => setCurrentItem(prev => ({ ...prev, item_discount_percentage: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="خصم مبلغ"
                          value={currentItem.item_discount_amount}
                          onChange={(e) => setCurrentItem(prev => ({ ...prev, item_discount_amount: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        />
                      </div>
                      <div>
                        <button
                          onClick={handleAddItem}
                          disabled={!currentItem.product_id}
                          className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors text-sm"
                        >
                          إضافة
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Invoice Items Table */}
                  {invoiceItems.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">المنتج</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الكمية</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">السعر</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الخصم</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">السعر النهائي</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">المجموع</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">إجراءات</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {invoiceItems.map((item, index) => (
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
                                <td className="px-4 py-3">
                                  <button
                                    onClick={() => handleRemoveItem(index)}
                                    className="text-red-600 hover:text-red-900"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Invoice Totals */}
                  {invoiceItems.length > 0 && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            خصم إضافي على الفاتورة (%)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={invoiceForm.discount_percentage}
                            onChange={(e) => setInvoiceForm(prev => ({ ...prev, discount_percentage: parseFloat(e.target.value) || 0 }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            خصم إضافي (مبلغ ثابت)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={invoiceForm.discount_amount}
                            onChange={(e) => setInvoiceForm(prev => ({ ...prev, discount_amount: parseFloat(e.target.value) || 0 }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            ملاحظات
                          </label>
                          <input
                            type="text"
                            value={invoiceForm.notes}
                            onChange={(e) => setInvoiceForm(prev => ({ ...prev, notes: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            placeholder="ملاحظات إضافية..."
                          />
                        </div>
                      </div>

                      <div className="border-t pt-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>المجموع الفرعي:</span>
                          <span className="font-medium">{formatCurrency(calculateSubtotal())}</span>
                        </div>
                        {(invoiceForm.discount_percentage > 0 || invoiceForm.discount_amount > 0) && (
                          <div className="flex justify-between text-sm text-red-600">
                            <span>خصم إضافي:</span>
                            <span>-{formatCurrency((calculateSubtotal() * invoiceForm.discount_percentage / 100) + invoiceForm.discount_amount)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-lg font-bold text-green-600 border-t pt-2">
                          <span>المجموع النهائي:</span>
                          <span>{formatCurrency(calculateInvoiceTotal())}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleSaveInvoice}
                      disabled={!invoiceForm.customer_name || invoiceItems.length === 0}
                      className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 transition-colors"
                    >
                      حفظ الفاتورة
                    </button>
                    <button
                      onClick={() => setShowCreateForm(false)}
                      className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Invoices Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {filteredInvoices.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        رقم الفاتورة
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        العميل
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        التاريخ
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        نوع البيع
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        عدد الأصناف
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        المجموع
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        الإجراءات
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredInvoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{invoice.invoice_number}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{invoice.customer_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {new Date(invoice.invoice_date).toLocaleDateString('ar-EG')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {getSaleTypeLabel(invoice.sale_type)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{invoice.items_count} صنف</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{formatCurrency(invoice.total_amount)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleViewInvoiceDetails(invoice)}
                              className="text-indigo-600 hover:text-indigo-900"
                              title="عرض التفاصيل"
                            >
                              <FileText className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => printInvoice(invoice)}
                              className="text-green-600 hover:text-green-900"
                              title="طباعة الفاتورة"
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
            ) : (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">لا توجد فواتير</h3>
                <p className="mt-1 text-sm text-gray-500">ابدأ بإنشاء فاتورة جديدة</p>
              </div>
            )}
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
                      التاريخ: {new Date(selectedInvoice.invoice_date).toLocaleDateString('ar-EG')}
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
                      <X className="h-6 w-6" />
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
                          <p className="font-medium">{formatCurrency(selectedInvoice.subtotal)}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">الخصم:</span>
                          <p className="font-medium text-red-600">
                            -{formatCurrency((selectedInvoice.subtotal * selectedInvoice.discount_percentage / 100) + selectedInvoice.discount_amount)}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600">المجموع النهائي:</span>
                          <p className="font-medium text-green-600">{formatCurrency(selectedInvoice.total_amount)}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">نوع البيع:</span>
                          <p className="font-medium">{getSaleTypeLabel(selectedInvoice.sale_type)}</p>
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
        </div>
      </div>
    </div>
  )
}
