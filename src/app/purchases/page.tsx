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
    product_id: string
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
    product_id: '',
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
      console.log('Fetching purchases...')
      const { data, error } = await supabase
        .from('purchases')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }
      
      console.log('Fetched purchases:', data)
      setPurchases(data || [])
    } catch (error) {
      console.error('Error fetching purchases:', error)
      // Show error to user
      alert('حدث خطأ في تحميل المشتريات. يرجى تحديث الصفحة والمحاولة مرة أخرى.')
    } finally {
      setLoading(false)
    }
  }

  const fetchProducts = async () => {
    try {
      console.log('Fetching products...')
      const { data, error } = await supabase
        .from('products')
        .select('id, name, current_stock')
        .order('name')

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }
      
      console.log('Fetched products:', data)
      setProducts(data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
      // Show error to user
      alert('حدث خطأ في تحميل المنتجات. يرجى تحديث الصفحة والمحاولة مرة أخرى.')
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
    
    // التحقق من تسجيل الدخول
    if (!user?.id) {
      alert('يجب تسجيل الدخول أولاً')
      return
    }
    
    try {
      setLoading(true)
      console.log('Starting form submission for type:', formData.type)

      // للمصروفات - حفظ مباشر بدون تعقيدات
      if (formData.type === 'expense') {
        console.log('Processing expense - direct save to purchases table')
        
        // إعداد بيانات المصروف
        const expenseData = {
          product_name: formData.product_name,
          quantity: null, // المصروفات لا تحتاج كمية
          unit_cost: formData.unit_cost,
          total_cost: formData.unit_cost, // للمصروفات، التكلفة الإجمالية = تكلفة الوحدة
          supplier_name: formData.supplier_name,
          purchase_date: formData.purchase_date,
          type: 'expense',
          product_id: null, // المصروفات لا تحتاج معرف منتج
          payment_method: formData.payment_method,
          notes: formData.notes || '',
          unit: formData.unit || '',
          min_stock_alert: 0,
          user_id: user.id
        }

        console.log('Expense data to save:', expenseData)

        // حفظ المصروف في جدول purchases
        const { data, error } = await supabase
          .from('purchases')
          .insert([expenseData])
          .select()

        if (error) {
          console.error('Error saving expense:', error)
          throw new Error(`فشل في حفظ المصروف: ${error.message}`)
        }

        if (!data || data.length === 0) {
          throw new Error('لم يتم حفظ البيانات، يرجى المحاولة مرة أخرى')
        }

        console.log('Expense saved successfully:', data)
        alert('تمت إضافة المصروف بنجاح')
        
        // إعادة تعيين النموذج وإغلاقه
        resetForm()
        setShowAddForm(false)
        fetchPurchases()
        setLoading(false)
        return
      }
      
      // معالجة المواد الخام والمنتجات
      let rawMaterialId = null
      if (formData.type === 'raw_material') {
        // التحقق من وجود المادة الخام أولاً
        const { data: existingMaterial, error: checkError } = await supabase
          .from('raw_materials')
          .select('id, current_stock')
          .eq('name', formData.product_name)
          .eq('user_id', user?.id)
          .single()

        if (checkError && checkError.code !== 'PGRST116') {
          throw checkError
        }

        if (existingMaterial) {
          // إذا كانت المادة موجودة، حدث المخزون
          rawMaterialId = existingMaterial.id
          const newStock = existingMaterial.current_stock + formData.quantity

          const { error: updateError } = await supabase
            .from('raw_materials')
            .update({ 
              current_stock: newStock,
              unit_cost: formData.unit_cost,
              supplier_name: formData.supplier_name,
              updated_at: new Date().toISOString()
            })
            .eq('id', rawMaterialId)

          if (updateError) throw updateError
        } else {
          // إنشاء مادة خام جديدة
          const { data: newMaterial, error: createError } = await supabase
            .from('raw_materials')
            .insert([{
              name: formData.product_name,
              unit: formData.unit,
              current_stock: formData.quantity,
              min_stock_alert: formData.min_stock_alert,
              unit_cost: formData.unit_cost,
              supplier_name: formData.supplier_name,
              user_id: user?.id
            }])
            .select('id')
            .single()

          if (createError) throw createError
          rawMaterialId = newMaterial.id
        }

        // تسجيل الشراء في جدول مشتريات المواد الخام
        const { error: rawPurchaseError } = await supabase
          .from('raw_material_purchases')
          .insert([{
            raw_material_id: rawMaterialId,
            raw_material_name: formData.product_name,
            quantity: formData.quantity,
            unit_cost: formData.unit_cost,
            total_cost: calculateTotal(),
            supplier_name: formData.supplier_name,
            purchase_date: formData.purchase_date,
            funding_source: 'project', // افتراضياً من أموال المشروع
            user_id: user?.id
          }])

        if (rawPurchaseError) throw rawPurchaseError

        // تخطي معالجة التدفق النقدي مؤقتاً حتى يتم إنشاء جدول cash_flow
        if (formData.payment_method === 'project') {
          console.log('Skipping cash flow processing (table not available)')
        }
      
      // Prepare purchase data with proper typing
      // Handle different purchase types with explicit type checking
      const purchaseType = formData.type as 'product' | 'expense' | 'raw_material';
      let productId: string | null = null;
      let quantity: number | null = formData.quantity;
      
      // Set product_id only for product purchases
      if (purchaseType === 'product') {
        productId = formData.product_id || null;
      }
      
      // Set quantity to null for expense purchases
      if (purchaseType === 'expense') {
        quantity = null;
      }
      
      // Calculate total cost properly based on purchase type
      let totalCost: number;
      if (purchaseType === 'expense') {
        // For expenses, use unit_cost directly as total cost
        totalCost = formData.unit_cost;
      } else {
        // For products and raw materials, multiply quantity by unit cost
        totalCost = formData.quantity * formData.unit_cost;
      }

      const purchaseData: Omit<Purchase, 'id' | 'created_at' | 'user_id'> & { 
        total_cost: number;
        user_id: string;
      } = {
        ...formData,
        total_cost: totalCost,
        // Handle product_id and quantity based on purchase type
        product_id: productId,
        quantity: quantity,
        // Include user_id for the purchase record (must be valid UUID)
        user_id: user.id,
        // Explicitly include all required fields
        product_name: formData.product_name,
        unit_cost: formData.unit_cost,
        supplier_name: formData.supplier_name,
        purchase_date: formData.purchase_date,
        type: formData.type,
        // Include optional fields
        unit: formData.unit,
        min_stock_alert: formData.min_stock_alert,
        payment_method: formData.payment_method,
        notes: formData.notes
      };

      // Handle purchase based on whether we're editing or creating
      if (editingPurchase) {
        // Update existing purchase
        const { error } = await supabase
          .from('purchases')
          .update(purchaseData)
          .eq('id', editingPurchase.id)
        
        if (error) throw error
        
        alert('تم تحديث المشتريات بنجاح')
      } else {
        // Add new purchase with detailed error handling
        const { data, error } = await supabase
          .from('purchases')
          .insert([purchaseData])
          .select()
        
        if (error) {
          console.error('Database error details:', error)
          throw new Error(`فشل إضافة المشتريات: ${error.message}`)
        }
        
        if (!data || data.length === 0) {
          throw new Error('لم يتم حفظ البيانات، يرجى المحاولة مرة أخرى')
        }
        
        // Update raw materials stock if it's a raw material purchase
        if (formData.type === 'raw_material') {
          // Get current stock
          const { data: materialData, error: materialError } = await supabase
            .from('raw_materials')
            .select('current_stock')
            .eq('id', formData.product_id)
            .single()
          
          if (materialError) throw materialError
          
          // Update stock
          const newStock = (materialData?.current_stock || 0) + formData.quantity
          const { error: updateError } = await supabase
            .from('raw_materials')
            .update({ current_stock: newStock })
            .eq('id', formData.product_id)
          
          if (updateError) throw updateError
        }
        
        alert('تمت إضافة المشتريات بنجاح')
      }
      }

      // Reset form after successful submission
      resetForm()
      setShowAddForm(false)
      setEditingPurchase(null)
      fetchPurchases()
      fetchProducts()
      setLoading(false)
    } catch (error) {
      console.error('Error saving purchase:', error)
      console.error('Error type:', typeof error)
      console.error('Error constructor:', error?.constructor?.name)
      console.error('Error keys:', Object.keys(error || {}))
      console.error('Error stringified:', JSON.stringify(error, null, 2))
      
      // Show more detailed error message
      let errorMessage = 'حدث خطأ غير معروف في حفظ البيانات'
      
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (error && typeof error === 'object') {
        const errorObj = error as any
        if (errorObj.message) {
          errorMessage = errorObj.message
        } else if (errorObj.error_description) {
          errorMessage = errorObj.error_description
        } else if (errorObj.details) {
          errorMessage = errorObj.details
        } else {
          errorMessage = `خطأ في قاعدة البيانات: ${JSON.stringify(error)}`
        }
      }
      
      alert(`حدث خطأ في حفظ البيانات: ${errorMessage}`)
      setLoading(false)
    }
  }

  // Reset form to initial state with proper typing
  const resetForm = () => {
    setFormData({
      type: 'product',
      product_id: '',
      product_name: '',
      quantity: 1,
      unit_cost: 0,
      supplier_name: '',
      purchase_date: new Date().toISOString().split('T')[0],
      unit: 'قطعة',
      min_stock_alert: 10,
      payment_method: 'project',
      notes: ''
    } as FormData)
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
      product_id: purchase.product_id || '',
      product_name: purchase.product_name,
      quantity: purchase.quantity || 1,
      unit_cost: purchase.unit_cost,
      supplier_name: purchase.supplier_name,
      purchase_date: purchase.purchase_date,
      unit: purchase.unit || 'قطعة',
      min_stock_alert: purchase.min_stock_alert || 10,
      payment_method: purchase.payment_method || 'project',
      notes: purchase.notes || ''
    } as FormData)
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

  const totalExpenses = filteredPurchases.reduce((sum, purchase) => sum + purchase.total_cost, 0)
  
  // حساب المصروفات منفصلة حسب نوع الدفع
  const projectExpenses = filteredPurchases
    .filter(purchase => purchase.payment_method === 'project' || !purchase.payment_method)
    .reduce((sum, purchase) => sum + purchase.total_cost, 0)
    
  const personalExpenses = filteredPurchases
    .filter(purchase => purchase.payment_method === 'personal')
    .reduce((sum, purchase) => sum + purchase.total_cost, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100" dir="rtl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-700">جاري التحميل...</p>
        </div>
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
              purchase_date: new Date().toISOString().split('T')[0],
              unit: 'قطعة',  // Default unit
              min_stock_alert: 0,  // Default minimum stock alert
              payment_method: 'project',  // Add missing required property
              notes: ''  // Add missing required property
            })
          }}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-5 w-5 ml-2" />
          إضافة سجل جديد
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* إجمالي المصروفات */}
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

        {/* مصروفات المشروع */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">مصروفات المشروع</h3>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(projectExpenses)}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>

        {/* المصروفات الشخصية */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">المصروفات الشخصية</h3>
              <p className="text-2xl font-bold text-orange-600">{formatCurrency(personalExpenses)}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <DollarSign className="h-8 w-8 text-orange-600" />
            </div>
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
          onChange={(e) => setFilterType(e.target.value as 'all' | 'product' | 'expense' | 'raw_material')}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        >
          <option value="all">جميع السجلات</option>
          <option value="product">مشتريات المنتجات</option>
          <option value="raw_material">المواد الخام</option>
          <option value="expense">المصروفات</option>
        </select>
        <select
          value={filterPaymentMethod}
          onChange={(e) => setFilterPaymentMethod(e.target.value as 'all' | 'project' | 'personal')}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        >
          <option value="all">جميع أنواع الدفع</option>
          <option value="project">أموال المشروع</option>
          <option value="personal">أموال شخصية</option>
        </select>
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
                      product_id: '',
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
                    value={formData.product_id}
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
                      <option value="جرام">جرام</option>
                      <option value="لتر">لتر</option>
                      <option value="مل">مل</option>
                      <option value="متر">متر</option>
                      <option value="سم">سم</option>
                      <option value="علبة">علبة</option>
                      <option value="كيس">كيس</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      الحد الأدنى للتنبيه
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.min_stock_alert}
                      onChange={(e) => setFormData(prev => ({ ...prev, min_stock_alert: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="مثال: 10"
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    طريقة الدفع
                  </label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      payment_method: e.target.value as 'project' | 'personal'
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  >
                    <option value="project">من أموال المشروع</option>
                    <option value="personal">من أموال شخصية</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    الإجمالي (جنيه)
                  </label>
                  <input
                    type="text"
                    value={formData.quantity * formData.unit_cost}
                    disabled
                    className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ملاحظات (اختياري)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  rows={2}
                  placeholder="أي ملاحظات إضافية حول عملية الشراء"
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
    </div>
  )
}
