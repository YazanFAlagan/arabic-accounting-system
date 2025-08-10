'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Plus, Search, Edit, Trash2, DollarSign, Package } from 'lucide-react'

interface Purchase {
  id: string
  product_id?: string
  product_name: string
  quantity?: number
  unit_cost: number
  total_cost: number
  supplier_name: string
  purchase_date: string
  created_at: string
  type: 'product' | 'expense'
}

interface Product {
  id: string
  name: string
  current_stock: number
}

export default function PurchasesPage() {
  const { user } = useAuth()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'product' | 'expense'>('all')
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    type: 'product' as 'product' | 'expense',
    product_id: '',
    product_name: '',
    quantity: 1,
    unit_cost: 0,
    supplier_name: '',
    purchase_date: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    fetchPurchases()
    fetchProducts()
  }, [])

  const fetchPurchases = async () => {
    try {
      const { data, error } = await supabase
        .from('purchases')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setPurchases(data || [])
    } catch (error) {
      console.error('Error fetching purchases:', error)
    }
  }

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, current_stock')
        .order('name')

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleProductSelect = (productId: string) => {
    const product = products.find(p => p.id === productId)
    if (product) {
      setFormData(prev => ({
        ...prev,
        product_id: productId,
        product_name: product.name
      }))
    }
  }

  const calculateTotal = () => {
    if (formData.type === 'expense') {
      return formData.unit_cost
    }
    return formData.quantity * formData.unit_cost
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const purchaseData = {
        product_id: formData.type === 'product' ? formData.product_id : null,
        product_name: formData.product_name,
        quantity: formData.type === 'product' ? formData.quantity : null,
        unit_cost: formData.unit_cost,
        total_cost: calculateTotal(),
        supplier_name: formData.supplier_name,
        purchase_date: formData.purchase_date,
        type: formData.type,
        user_id: user?.id
      }

      if (editingPurchase) {
        // Update existing purchase
        const { error } = await supabase
          .from('purchases')
          .update(purchaseData)
          .eq('id', editingPurchase.id)

        if (error) throw error
      } else {
        // Create new purchase
        const { error } = await supabase
          .from('purchases')
          .insert([purchaseData])

        if (error) throw error

        // Update product stock if it's a product purchase
        if (formData.type === 'product' && formData.product_id) {
          const product = products.find(p => p.id === formData.product_id)
          if (product) {
            const { error: stockError } = await supabase
              .from('products')
              .update({ 
                current_stock: product.current_stock + formData.quantity 
              })
              .eq('id', formData.product_id)

            if (stockError) throw stockError
          }
        }
      }

      // Reset form and refresh data
      setFormData({
        type: 'product',
        product_id: '',
        product_name: '',
        quantity: 1,
        unit_cost: 0,
        supplier_name: '',
        purchase_date: new Date().toISOString().split('T')[0]
      })
      setShowAddForm(false)
      setEditingPurchase(null)
      fetchPurchases()
      fetchProducts()
    } catch (error) {
      console.error('Error saving purchase:', error)
      alert('حدث خطأ في حفظ البيانات')
    }
  }

  const handleEdit = (purchase: Purchase) => {
    setEditingPurchase(purchase)
    setFormData({
      type: purchase.type,
      product_id: purchase.product_id || '',
      product_name: purchase.product_name,
      quantity: purchase.quantity || 1,
      unit_cost: purchase.unit_cost,
      supplier_name: purchase.supplier_name,
      purchase_date: purchase.purchase_date
    })
    setShowAddForm(true)
  }

  const handleDelete = async (purchaseId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا السجل؟')) return

    try {
      const { error } = await supabase
        .from('purchases')
        .delete()
        .eq('id', purchaseId)

      if (error) throw error
      fetchPurchases()
    } catch (error) {
      console.error('Error deleting purchase:', error)
      alert('حدث خطأ في حذف البيانات')
    }
  }

  const filteredPurchases = purchases.filter(purchase => {
    const matchesSearch = purchase.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         purchase.supplier_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterType === 'all' || purchase.type === filterType
    return matchesSearch && matchesFilter
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-EG')
  }

  const totalExpenses = filteredPurchases.reduce((sum, purchase) => sum + purchase.total_cost, 0)

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
          <h1 className="text-2xl font-bold text-gray-900">المشتريات والمصروفات</h1>
          <p className="text-gray-600">إدارة المشتريات والمصروفات</p>
        </div>
        <button
          onClick={() => {
            setShowAddForm(true)
            setEditingPurchase(null)
            setFormData({
              type: 'product',
              product_id: '',
              product_name: '',
              quantity: 1,
              unit_cost: 0,
              supplier_name: '',
              purchase_date: new Date().toISOString().split('T')[0]
            })
          }}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-5 w-5 ml-2" />
          إضافة سجل جديد
        </button>
      </div>

      {/* Summary Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">إجمالي المصروفات</h3>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
          </div>
          <div className="p-3 bg-red-100 rounded-full">
            <DollarSign className="h-8 w-8 text-red-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="البحث في المشتريات والمصروفات..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as 'all' | 'product' | 'expense')}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        >
          <option value="all">جميع السجلات</option>
          <option value="product">مشتريات المنتجات</option>
          <option value="expense">المصروفات</option>
        </select>
      </div>

      {/* Add/Edit Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingPurchase ? 'تعديل السجل' : 'إضافة سجل جديد'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  نوع السجل
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    type: e.target.value as 'product' | 'expense',
                    product_id: '',
                    product_name: ''
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                >
                  <option value="product">شراء منتج</option>
                  <option value="expense">مصروف</option>
                </select>
              </div>

              {formData.type === 'product' && !editingPurchase && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    المنتج
                  </label>
                  <select
                    value={formData.product_id}
                    onChange={(e) => handleProductSelect(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  >
                    <option value="">اختر المنتج</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} - مخزون حالي: {product.current_stock}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {(formData.type === 'expense' || editingPurchase) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {formData.type === 'product' ? 'اسم المنتج' : 'وصف المصروف'}
                  </label>
                  <input
                    type="text"
                    value={formData.product_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, product_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  />
                </div>
              )}

              {formData.type === 'product' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      الكمية
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.quantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      سعر الوحدة (جنيه)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.unit_cost}
                      onChange={(e) => setFormData(prev => ({ ...prev, unit_cost: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>
              )}

              {formData.type === 'expense' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    المبلغ (جنيه)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.unit_cost}
                    onChange={(e) => setFormData(prev => ({ ...prev, unit_cost: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {formData.type === 'product' ? 'اسم المورد' : 'المدفوع إلى'}
                </label>
                <input
                  type="text"
                  value={formData.supplier_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, supplier_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  التاريخ
                </label>
                <input
                  type="date"
                  value={formData.purchase_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, purchase_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">
                  المجموع: <span className="font-semibold text-gray-900">{formatCurrency(calculateTotal())}</span>
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  {editingPurchase ? 'تحديث' : 'حفظ'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false)
                    setEditingPurchase(null)
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Purchases Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {filteredPurchases.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    النوع
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الوصف
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الكمية
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    سعر الوحدة
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    المجموع
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    المورد/المدفوع إلى
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    التاريخ
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPurchases.map((purchase) => (
                  <tr key={purchase.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        purchase.type === 'product' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {purchase.type === 'product' ? (
                          <>
                            <Package className="h-3 w-3 ml-1" />
                            منتج
                          </>
                        ) : (
                          <>
                            <DollarSign className="h-3 w-3 ml-1" />
                            مصروف
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{purchase.product_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {purchase.quantity || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatCurrency(purchase.unit_cost)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-red-600">{formatCurrency(purchase.total_cost)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{purchase.supplier_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatDate(purchase.purchase_date)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(purchase)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(purchase.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
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
            <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">لا توجد سجلات</h3>
            <p className="mt-1 text-sm text-gray-500">ابدأ بإضافة مشترى أو مصروف جديد</p>
          </div>
        )}
      </div>
    </div>
  )
}
