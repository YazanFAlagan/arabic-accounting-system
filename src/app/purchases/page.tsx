'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import QuickNavigation from '@/components/QuickNavigation'
import { useAuth } from '@/contexts/AuthContext'
import { Plus, Search, Edit, Trash2, DollarSign, Package } from 'lucide-react'

interface Purchase {
  id: string
  product_id: string | null
  product_name: string
  quantity: number | null
  unit_cost: number
  total_cost: number
  supplier_name: string
  purchase_date: string
  created_at: string
  type: 'product' | 'expense' | 'raw_material'
  user_id?: string
  payment_method?: 'project' | 'personal'
  notes?: string
  unit?: string
  min_stock_alert?: number
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
  const [filterType, setFilterType] = useState<'all' | 'product' | 'expense' | 'raw_material'>('all')
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<'all' | 'project' | 'personal'>('all')
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null)

  // Define form data type
  type FormData = {
    type: 'product' | 'expense' | 'raw_material'
    product_id: string | null
    product_name: string
    quantity: number
    unit_cost: number
    supplier_name: string
    purchase_date: string
    unit: string
    min_stock_alert: number
    payment_method: 'project' | 'personal'
    notes: string
  }

  // Form state
  const [formData, setFormData] = useState<FormData>({
    type: 'product',
    product_id: null,
    product_name: '',
    quantity: 1,
    unit_cost: 0,
    supplier_name: '',
    purchase_date: new Date().toISOString().split('T')[0],
    unit: 'قطعة',
    min_stock_alert: 10,
    payment_method: 'project',
    notes: ''
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
      alert('حدث خطأ في تحميل المشتريات')
    } finally {
      setLoading(false)
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
      alert('حدث خطأ في تحميل المنتجات')
    }
  }

  const handleProductSelect = (productId: string) => {
    if (!productId) {
      setFormData(prev => ({
        ...prev,
        product_id: null,
        product_name: ''
      }))
      return
    }
    
    const product = products.find(p => p.id === productId)
    if (product) {
      setFormData(prev => ({
        ...prev,
        product_id: productId,
        product_name: product.name
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user?.id) {
      alert('يجب تسجيل الدخول أولاً')
      return
    }

    if (typeof user.id !== 'string' || user.id.trim() === '') {
      alert('معرف المستخدم غير صحيح')
      return
    }
    
    try {
      setLoading(true)

      // Handle different purchase types
      const purchaseType = formData.type
      let productId: string | null = null
      let quantity: number | null = formData.quantity
      
      if (purchaseType === 'product') {
        productId = formData.product_id && formData.product_id.trim() !== '' ? formData.product_id : null
        if (!productId) {
          throw new Error('يجب اختيار منتج للمشتريات من نوع "منتج"')
        }
      }
      
      if (purchaseType === 'expense') {
        quantity = null
      }
      
      const totalCost = purchaseType === 'expense' ? formData.unit_cost : formData.quantity * formData.unit_cost

      const purchaseData = {
        type: formData.type,
        product_id: productId,
        product_name: formData.product_name,
        quantity: quantity,
        unit_cost: formData.unit_cost,
        total_cost: totalCost,
        supplier_name: formData.supplier_name,
        purchase_date: formData.purchase_date,
        unit: formData.unit,
        min_stock_alert: formData.min_stock_alert,
        payment_method: formData.payment_method,
        notes: formData.notes,
        user_id: user.id
      }

      if (editingPurchase) {
        const { error } = await supabase
          .from('purchases')
          .update(purchaseData)
          .eq('id', editingPurchase.id)
        
        if (error) throw error
        alert('تم تحديث المشتريات بنجاح')
      } else {
        const { data, error } = await supabase
          .from('purchases')
          .insert([purchaseData])
          .select()
        
        if (error) throw error
        
        if (!data || data.length === 0) {
          throw new Error('لم يتم حفظ البيانات')
        }
        
        alert('تمت إضافة المشتريات بنجاح')
      }

      resetForm()
      setShowAddForm(false)
      setEditingPurchase(null)
      fetchPurchases()
      setLoading(false)
    } catch (error) {
      console.error('Error saving purchase:', error)
      let errorMessage = 'حدث خطأ في حفظ البيانات'
      
      if (error instanceof Error) {
        errorMessage = error.message
      }
      
      alert(errorMessage)
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      type: 'product',
      product_id: null,
      product_name: '',
      quantity: 1,
      unit_cost: 0,
      supplier_name: '',
      purchase_date: new Date().toISOString().split('T')[0],
      unit: 'قطعة',
      min_stock_alert: 10,
      payment_method: 'project',
      notes: ''
    })
  }

  const handleAddNew = () => {
    setEditingPurchase(null)
    resetForm()
    setShowAddForm(true)
  }

  const handleEdit = (purchase: Purchase) => {
    setEditingPurchase(purchase)
    setFormData({
      type: purchase.type,
      product_id: purchase.product_id || null,
      product_name: purchase.product_name,
      quantity: purchase.quantity || 1,
      unit_cost: purchase.unit_cost,
      supplier_name: purchase.supplier_name,
      purchase_date: purchase.purchase_date,
      unit: purchase.unit || 'قطعة',
      min_stock_alert: purchase.min_stock_alert || 10,
      payment_method: purchase.payment_method || 'project',
      notes: purchase.notes || ''
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
    const matchesSearch = purchase.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         purchase.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterType === 'all' || purchase.type === filterType
    const matchesPaymentMethod = filterPaymentMethod === 'all' || 
                                purchase.payment_method === filterPaymentMethod ||
                                (filterPaymentMethod === 'project' && !purchase.payment_method)
    return matchesSearch && matchesFilter && matchesPaymentMethod
  })

  const formatCurrency = (amount: number) => {
    if (typeof amount !== 'number' || isNaN(amount)) return '0 ج.م.'
    if (Number.isInteger(amount)) return `${amount} ج.م.`
    const formattedAmount = Number(amount).toFixed(2)
    const cleanAmount = formattedAmount.replace(/\.?0+$/, '')
    return `${cleanAmount} ج.م.`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-EG')
  }

  const totalExpenses = filteredPurchases.reduce((sum, purchase) => sum + purchase.total_cost, 0)
  const projectExpenses = filteredPurchases
    .filter(purchase => purchase.payment_method === 'project' || !purchase.payment_method)
    .reduce((sum, purchase) => sum + purchase.total_cost, 0)
  const personalExpenses = filteredPurchases
    .filter(purchase => purchase.payment_method === 'personal')
    .reduce((sum, purchase) => sum + purchase.total_cost, 0)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <QuickNavigation />
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-lg text-gray-600">جاري التحميل...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <QuickNavigation />
      
      <div className="max-w-7xl mx-auto p-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <DollarSign className="h-8 w-8 ml-3 text-indigo-600" />
                المشتريات والمصروفات
              </h1>
              <p className="text-gray-600 mt-2">إدارة المشتريات والمصروفات والمواد الخام</p>
            </div>
            
            <button
              onClick={handleAddNew}
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors flex items-center"
            >
              <Plus className="h-5 w-5 ml-2" />
              إضافة مشترى جديد
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-red-600" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600">إجمالي المصروفات</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalExpenses)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600">أموال المشروع</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(projectExpenses)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-orange-600" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600">أموال شخصية</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(personalExpenses)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Package className="h-6 w-6 text-green-600" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600">عدد السجلات</p>
                <p className="text-2xl font-bold text-gray-900">{filteredPurchases.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">البحث</label>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="البحث في الوصف أو المورد..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">نوع السجل</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as 'all' | 'product' | 'expense' | 'raw_material')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="all">جميع الأنواع</option>
                <option value="product">منتجات</option>
                <option value="raw_material">مواد خام</option>
                <option value="expense">مصروفات</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">نوع الدفع</label>
              <select
                value={filterPaymentMethod}
                onChange={(e) => setFilterPaymentMethod(e.target.value as 'all' | 'project' | 'personal')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="all">جميع الطرق</option>
                <option value="project">أموال المشروع</option>
                <option value="personal">أموال شخصية</option>
              </select>
            </div>
          </div>
        </div>

        {/* Add/Edit Form Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 w-full max-w-2xl max-h-[85vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-bold">
                  {editingPurchase ? 'تعديل المشتريات' : 'إضافة مشتريات جديدة'}
                </h2>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-gray-500 hover:text-gray-700 text-xl"
                >
                  ✕
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      نوع السجل
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        type: e.target.value as 'product' | 'expense' | 'raw_material',
                        product_id: null,
                        product_name: ''
                      }))}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      required
                    >
                      <option value="product">شراء منتج</option>
                      <option value="raw_material">مادة خام جديدة</option>
                      <option value="expense">مصروف</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      طريقة الدفع
                    </label>
                    <select
                      value={formData.payment_method}
                      onChange={(e) => setFormData(prev => ({ ...prev, payment_method: e.target.value as 'project' | 'personal' }))}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      required
                    >
                      <option value="project">من أموال المشروع</option>
                      <option value="personal">من أموال شخصية</option>
                    </select>
                  </div>
                </div>

                {formData.type === 'product' && !editingPurchase && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      المنتج
                    </label>
                    <select
                      value={formData.product_id || ''}
                      onChange={(e) => handleProductSelect(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
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

                {(formData.type === 'expense' || formData.type === 'raw_material' || editingPurchase) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {formData.type === 'product' ? 'اسم المنتج' : 
                       formData.type === 'raw_material' ? 'اسم المادة الخام' : 'وصف المصروف'}
                    </label>
                    <input
                      type="text"
                      value={formData.product_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, product_name: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder={formData.type === 'raw_material' ? 'مثال: زجاجات فارغة، ملصقات، زيت عطري' : ''}
                      required
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {(formData.type === 'product' || formData.type === 'raw_material') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        الكمية
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.quantity}
                        onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        required
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {formData.type === 'expense' ? 'المبلغ (جنيه)' : 'سعر الوحدة (جنيه)'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.unit_cost}
                      onChange={(e) => setFormData(prev => ({ ...prev, unit_cost: parseFloat(e.target.value) || 0 }))}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      اسم المورد
                    </label>
                    <input
                      type="text"
                      value={formData.supplier_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, supplier_name: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      required
                    />
                  </div>
                </div>

                {formData.type === 'raw_material' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        وحدة القياس
                      </label>
                      <select
                        value={formData.unit}
                        onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        required
                      >
                        <option value="قطعة">قطعة</option>
                        <option value="كيلو">كيلو</option>
                        <option value="لتر">لتر</option>
                        <option value="متر">متر</option>
                        <option value="صندوق">صندوق</option>
                        <option value="علبة">علبة</option>
                        <option value="زجاجة">زجاجة</option>
                        <option value="عبوة">عبوة</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        تنبيه المخزون الأدنى
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.min_stock_alert}
                        onChange={(e) => setFormData(prev => ({ ...prev, min_stock_alert: parseInt(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ملاحظات
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="ملاحظات إضافية..."
                  />
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'جاري الحفظ...' : (editingPurchase ? 'تحديث' : 'حفظ')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false)
                      setEditingPurchase(null)
                      resetForm()
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
                      نوع الدفع
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
                            : purchase.type === 'raw_material'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {purchase.type === 'product' ? (
                            <>
                              <Package className="h-3 w-3 ml-1" />
                              منتج
                            </>
                          ) : purchase.type === 'raw_material' ? (
                            <>
                              <Package className="h-3 w-3 ml-1" />
                              مادة خام
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
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          purchase.payment_method === 'project' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {purchase.payment_method === 'project' ? 'أموال المشروع' : 'أموال شخصية'}
                        </span>
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
    </div>
  )
}
