import { useState } from 'react'
import { X, Trash2, Plus, Printer } from 'lucide-react'

interface InvoiceFormProps {
  products: Product[]
  invoiceForm: any
  setInvoiceForm: any
  invoiceItems: InvoiceItem[]
  setInvoiceItems: any
  currentItem: any
  setCurrentItem: any
  onSave: () => void
  onClose: () => void
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

export default function InvoiceForm({
  products,
  invoiceForm,
  setInvoiceForm,
  invoiceItems,
  setInvoiceItems,
  currentItem,
  setCurrentItem,
  onSave,
  onClose
}: InvoiceFormProps) {
  
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
    setInvoiceItems(invoiceItems.filter((_: any, i: number) => i !== index))
  }

  const calculateSubtotal = () => {
    return invoiceItems.reduce((sum: number, item: InvoiceItem) => sum + item.line_total, 0)
  }

  const calculateTotalDiscount = () => {
    const subtotal = calculateSubtotal()
    const percentageDiscount = subtotal * (invoiceForm.discount_percentage / 100)
    return percentageDiscount + invoiceForm.discount_amount
  }

  const calculateFinalTotal = () => {
    const subtotal = calculateSubtotal()
    const percentageDiscount = subtotal * (invoiceForm.discount_percentage / 100)
    const totalDiscount = percentageDiscount + invoiceForm.discount_amount
    return Math.max(subtotal - totalDiscount, 0)
  }

  // حساب إجمالي العنصر الحالي قبل الإضافة
  const calculateCurrentItemTotal = () => {
    if (!currentItem.product_id) return 0
    
    const product = products.find(p => p.id === currentItem.product_id)
    if (!product) return 0
    
    const unitPrice = getProductPriceBySaleType(product, invoiceForm.sale_type)
    const quantity = currentItem.quantity
    const subtotal = unitPrice * quantity
    
    // حساب الخصم
    const percentageDiscount = subtotal * (currentItem.item_discount_percentage / 100)
    const totalDiscount = percentageDiscount + currentItem.item_discount_amount
    
    return Math.max(subtotal - totalDiscount, 0)
  }

  const handlePrintInvoice = () => {
    if (invoiceItems.length === 0) return
    
    const printContent = `
      <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; padding: 20px;">
        <h2 style="text-align: center; margin-bottom: 30px;">فاتورة بيع</h2>
        
        <div style="margin-bottom: 20px;">
          <p><strong>العميل:</strong> ${invoiceForm.customer_name}</p>
          <p><strong>التاريخ:</strong> ${invoiceForm.invoice_date}</p>
          <p><strong>نوع البيع:</strong> ${invoiceForm.sale_type === 'retail' ? 'قطاعي' : invoiceForm.sale_type === 'shop' ? 'محلات' : 'جملة'}</p>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #f5f5f5;">
              <th style="border: 1px solid #ddd; padding: 8px;">المنتج</th>
              <th style="border: 1px solid #ddd; padding: 8px;">الكمية</th>
              <th style="border: 1px solid #ddd; padding: 8px;">السعر</th>
              <th style="border: 1px solid #ddd; padding: 8px;">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            ${invoiceItems.map(item => `
              <tr>
                <td style="border: 1px solid #ddd; padding: 8px;">${item.product_name}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${item.quantity}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${item.final_unit_price.toFixed(2)} ج.م</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${item.line_total.toFixed(2)} ج.م</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div style="text-align: left; margin-top: 20px;">
          <p><strong>المجموع الفرعي: ${calculateSubtotal().toFixed(2)} ج.م</strong></p>
          ${calculateTotalDiscount() > 0 ? `<p><strong>الخصم: ${calculateTotalDiscount().toFixed(2)} ج.م</strong></p>` : ''}
          <p style="font-size: 18px;"><strong>المجموع النهائي: ${calculateFinalTotal().toFixed(2)} ج.م</strong></p>
        </div>
        
        ${invoiceForm.notes ? `<div style="margin-top: 20px;"><p><strong>ملاحظات:</strong> ${invoiceForm.notes}</p></div>` : ''}
      </div>
    `
    
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.print()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" dir="rtl">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[95vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">إنشاء فاتورة جديدة</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Invoice Info - Horizontal Layout */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">معلومات الفاتورة</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  اسم العميل
                </label>
                <input
                  type="text"
                  value={invoiceForm.customer_name}
                  onChange={(e) => setInvoiceForm({...invoiceForm, customer_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="أدخل اسم العميل"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  نوع البيع
                </label>
                <select
                  value={invoiceForm.sale_type}
                  onChange={(e) => setInvoiceForm({...invoiceForm, sale_type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="retail">قطاعي</option>
                  <option value="shop">محلات</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  تاريخ الفاتورة
                </label>
                <input
                  type="date"
                  value={invoiceForm.invoice_date}
                  onChange={(e) => setInvoiceForm({...invoiceForm, invoice_date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ملاحظات
                </label>
                <input
                  type="text"
                  value={invoiceForm.notes}
                  onChange={(e) => setInvoiceForm({...invoiceForm, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="ملاحظات إضافية"
                />
              </div>
            </div>
          </div>

          {/* Add Item Section - Horizontal Layout */}
          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">إضافة منتج للفاتورة</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-8 gap-4 items-end">
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-black mb-2">
                  المنتج
                </label>
                <select
                  value={currentItem.product_id}
                  onChange={(e) => setCurrentItem({...currentItem, product_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                <label className="block text-sm font-bold text-black mb-2">
                  الكمية
                </label>
                <input
                  type="number"
                  min="1"
                  value={currentItem.quantity}
                  onChange={(e) => setCurrentItem({...currentItem, quantity: parseInt(e.target.value) || 1})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-black mb-2">
                  السعر الوحدة
                </label>
                <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm font-medium text-gray-800">
                  {currentItem.product_id ? (() => {
                    const product = products.find(p => p.id === currentItem.product_id);
                    return product ? `${getProductPriceBySaleType(product, invoiceForm.sale_type).toFixed(2)} ج.م` : '0.00 ج.م';
                  })() : '0.00 ج.م'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-black mb-2">
                  خصم بالنسبة المئوية %
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="0"
                  value={currentItem.item_discount_percentage}
                  onChange={(e) => setCurrentItem({...currentItem, item_discount_percentage: parseFloat(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-black mb-2">
                  خصم بالجنيه
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={currentItem.item_discount_amount}
                  onChange={(e) => setCurrentItem({...currentItem, item_discount_amount: parseFloat(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-black mb-2">
                  الإجمالي
                </label>
                <div className="px-3 py-2 bg-green-100 border border-green-300 rounded-md text-sm font-bold text-green-800">
                  {currentItem.product_id ? 
                    `${calculateCurrentItemTotal().toFixed(2)} ج.م`
                    : '0.00 ج.م'
                  }
                </div>
              </div>

              <div>
                <button
                  onClick={handleAddItem}
                  disabled={!currentItem.product_id}
                  className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium flex items-center justify-center"
                >
                  <Plus className="h-4 w-4 ml-2" />
                  إضافة
                </button>
              </div>
            </div>
          </div>

          {/* Invoice Items Table */}
          {invoiceItems.length > 0 && (
            <div className="bg-white border rounded-lg overflow-hidden mb-6">
              <div className="bg-gray-50 px-4 py-3 border-b">
                <h3 className="text-lg font-semibold text-gray-900">منتجات الفاتورة ({invoiceItems.length} منتج)</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">المنتج</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الكمية</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">السعر</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الخصم</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">السعر النهائي</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الإجمالي</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">حذف</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {invoiceItems.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">{item.product_name}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{item.quantity}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{item.unit_price.toFixed(2)} ج.م</td>
                        <td className="px-4 py-3 text-sm text-red-600">
                          {item.item_discount_percentage > 0 && `${item.item_discount_percentage}%`}
                          {item.item_discount_percentage > 0 && item.item_discount_amount > 0 && ' + '}
                          {item.item_discount_amount > 0 && `${item.item_discount_amount.toFixed(2)} ج.م`}
                        </td>
                        <td className="px-4 py-3 text-sm text-green-600 font-medium">{item.final_unit_price.toFixed(2)} ج.م</td>
                        <td className="px-4 py-3 text-sm text-blue-600 font-bold">{item.line_total.toFixed(2)} ج.م</td>
                        <td className="px-4 py-3 text-sm">
                          <button
                            onClick={() => handleRemoveItem(index)}
                            className="text-red-600 hover:text-red-800 p-1 rounded"
                            title="حذف المنتج"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Invoice Summary */}
          {invoiceItems.length > 0 && (
            <div className="bg-green-50 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">ملخص الفاتورة</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    المجموع الفرعي
                  </label>
                  <div className="text-lg font-bold text-gray-900">
                    {calculateSubtotal().toFixed(2)} ج.م
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    خصم إضافي نسبة (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={invoiceForm.discount_percentage}
                    onChange={(e) => setInvoiceForm({...invoiceForm, discount_percentage: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    خصم إضافي مبلغ (ج.م)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={invoiceForm.discount_amount}
                    onChange={(e) => setInvoiceForm({...invoiceForm, discount_amount: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    المجموع النهائي
                  </label>
                  <div className="text-xl font-bold text-green-600">
                    {calculateFinalTotal().toFixed(2)} ج.م
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-reverse space-x-4">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 font-medium"
            >
              إلغاء
            </button>
            
            {invoiceItems.length > 0 && (
              <button
                onClick={handlePrintInvoice}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium flex items-center"
              >
                <Printer className="h-4 w-4 ml-2" />
                طباعة الفاتورة
              </button>
            )}
            
            <button
              onClick={onSave}
              disabled={invoiceItems.length === 0 || !invoiceForm.customer_name}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
            >
              حفظ الفاتورة
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
