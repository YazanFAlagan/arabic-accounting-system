'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowRight, 
  Plus, 
  Trash2, 
  ShoppingCart,
  User,
  Package,
  Truck,
  CreditCard,
  Save,
  X
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

interface Product {
  id: string
  name: string
  retail_price: number
  current_stock: number
}

interface OrderItem {
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  discount_percentage: number
  discount_amount: number
  final_unit_price: number
  line_total: number
}

interface Customer {
  id: string
  customer_name: string
  phone: string
  email?: string
  address: string
  city: string
  governorate: string
}

export default function NewOrderPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [step, setStep] = useState<'customer' | 'products' | 'shipping' | 'review'>('customer')
  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  
  // Customer form
  const [customerForm, setCustomerForm] = useState({
    customer_name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    governorate: '',
    customer_type: 'individual' as 'individual' | 'company'
  })
  
  // Order form
  const [orderForm, setOrderForm] = useState({
    shipping_method: 'standard',
    shipping_cost: 50,
    payment_method: 'cash_on_delivery',
    notes: '',
    estimated_delivery_date: ''
  })
  
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [isNewCustomer, setIsNewCustomer] = useState(false)

  useEffect(() => {
    if (user) {
      console.log('User authenticated, fetching data...')
      fetchProducts()
      fetchCustomers()
    } else {
      console.log('No user authenticated')
    }
  }, [user])

  const fetchProducts = async () => {
    try {
      // Use test user ID for now
      const testUserId = '550e8400-e29b-41d4-a716-446655440000'
      
      const { data, error } = await supabase
        .from('products')
        .select('id, name, retail_price, current_stock')
        .eq('user_id', testUserId)
        .gt('current_stock', 0)
        .order('name')

      if (error) {
        console.error('Supabase error fetching products:', error)
        throw error
      }
      
      setProducts(data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
      if (error instanceof Error) {
        alert(`فشل في جلب المنتجات: ${error.message}`)
      } else {
        alert('فشل في جلب المنتجات. يرجى التحقق من الاتصال بقاعدة البيانات.')
      }
    }
  }

  const fetchCustomers = async () => {
    try {
      // Use test user ID for now
      const testUserId = '550e8400-e29b-41d4-a716-446655440000'
      console.log('Fetching customers for user:', testUserId)
      
      const { data, error } = await supabase
        .from('online_customers')
        .select('*')
        .eq('user_id', testUserId)
        .order('customer_name')

      if (error) {
        console.error('Supabase error fetching customers:', error)
        throw error
      }
      
      console.log('Customers fetched successfully:', data?.length || 0, 'customers')
      setCustomers(data || [])
    } catch (error) {
      console.error('Error fetching customers:', error)
      // Show user-friendly error message
      if (error instanceof Error) {
        alert(`فشل في جلب العملاء: ${error.message}`)
      } else {
        alert('فشل في جلب العملاء. يرجى التحقق من الاتصال بقاعدة البيانات.')
      }
    }
  }

  const addOrderItem = () => {
    const newItem: OrderItem = {
      product_id: '',
      product_name: '',
      quantity: 1,
      unit_price: 0,
      discount_percentage: 0,
      discount_amount: 0,
      final_unit_price: 0,
      line_total: 0
    }
    setOrderItems([...orderItems, newItem])
  }

  const updateOrderItem = (index: number, field: keyof OrderItem, value: any) => {
    const updatedItems = [...orderItems]
    updatedItems[index] = { ...updatedItems[index], [field]: value }
    
    // Calculate final unit price and line total
    if (field === 'unit_price' || field === 'discount_percentage' || field === 'discount_amount' || field === 'quantity') {
      const item = updatedItems[index]
      const discountAmount = (item.unit_price * item.discount_percentage / 100) + item.discount_amount
      item.final_unit_price = Math.max(0, item.unit_price - discountAmount)
      item.line_total = item.final_unit_price * item.quantity
    }
    
    setOrderItems(updatedItems)
  }

  const removeOrderItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index))
  }

  const handleProductSelect = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId)
    if (product) {
      updateOrderItem(index, 'product_id', product.id)
      updateOrderItem(index, 'product_name', product.name)
      updateOrderItem(index, 'unit_price', product.retail_price)
    }
  }

  const saveCustomer = async () => {
    try {
      setLoading(true)
      const testUserId = '550e8400-e29b-41d4-a716-446655440000'
      const { data, error } = await supabase
        .from('online_customers')
        .insert([{ ...customerForm, user_id: testUserId }])
        .select()
        .single()

      if (error) throw error
      
      setSelectedCustomer(data)
      setIsNewCustomer(false)
      setStep('products')
    } catch (error) {
      console.error('Error saving customer:', error)
    } finally {
      setLoading(false)
    }
  }

  const createOrder = async () => {
    if (!selectedCustomer || orderItems.length === 0) return

    try {
      setLoading(true)
      const testUserId = '550e8400-e29b-41d4-a716-446655440000'
      
      // Create order
      const { data: order, error: orderError } = await supabase
        .from('online_orders')
        .insert([{
          user_id: testUserId,
          customer_id: selectedCustomer.id,
          order_number: `ORD-${Date.now()}`,
          shipping_method: orderForm.shipping_method,
          shipping_cost: orderForm.shipping_cost,
          payment_method: orderForm.payment_method,
          notes: orderForm.notes,
          estimated_delivery_date: orderForm.estimated_delivery_date || null,
          shipping_address: selectedCustomer.address,
          shipping_city: selectedCustomer.city,
          shipping_governorate: selectedCustomer.governorate,
          subtotal: orderItems.reduce((sum, item) => sum + item.line_total, 0),
          total_amount: orderItems.reduce((sum, item) => sum + item.line_total, 0) + orderForm.shipping_cost
        }])
        .select()
        .single()

      if (orderError) throw orderError

      // Create order items
      const orderItemsData = orderItems.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_percentage: item.discount_percentage,
        discount_amount: item.discount_amount,
        final_unit_price: item.final_unit_price,
        line_total: item.line_total
      }))

      const { error: itemsError } = await supabase
        .from('online_order_items')
        .insert(orderItemsData)

      if (itemsError) throw itemsError

      router.push('/online-sales')
    } catch (error) {
      console.error('Error creating order:', error)
    } finally {
      setLoading(false)
    }
  }

  const totalAmount = orderItems.reduce((sum, item) => sum + item.line_total, 0) + orderForm.shipping_cost

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <button
                onClick={() => router.back()}
                className="mr-4 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <ArrowRight className="h-5 w-5" />
              </button>
              <div className="h-10 w-10 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center ml-4">
                <ShoppingCart className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">طلب جديد</h1>
                <p className="text-sm text-gray-500">إنشاء طلب إلكتروني جديد</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className={`flex items-center ${step === 'customer' ? 'text-indigo-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'customer' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}>
                <User className="h-4 w-4" />
              </div>
              <span className="mr-2 font-medium">معلومات العميل</span>
            </div>
            <div className={`flex-1 h-1 ${step === 'customer' ? 'bg-indigo-600' : 'bg-gray-200'}`}></div>
            
            <div className={`flex items-center ${step === 'products' ? 'text-indigo-600' : step === 'customer' ? 'text-gray-400' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'products' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}>
                <Package className="h-4 w-4" />
              </div>
              <span className="mr-2 font-medium">المنتجات</span>
            </div>
            <div className={`flex-1 h-1 ${step === 'products' ? 'bg-indigo-600' : 'bg-gray-200'}`}></div>
            
            <div className={`flex items-center ${step === 'shipping' ? 'text-indigo-600' : step === 'products' ? 'text-gray-400' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'shipping' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}>
                <Truck className="h-4 w-4" />
              </div>
              <span className="mr-2 font-medium">الشحن والدفع</span>
            </div>
            <div className={`flex-1 h-1 ${step === 'shipping' ? 'bg-indigo-600' : 'bg-gray-200'}`}></div>
            
            <div className={`flex items-center ${step === 'review' ? 'text-indigo-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'review' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}>
                <CreditCard className="h-4 w-4" />
              </div>
              <span className="mr-2 font-medium">المراجعة</span>
            </div>
          </div>
        </div>

        {/* Customer Step */}
        {step === 'customer' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">معلومات العميل</h2>
            
            <div className="mb-6">
              <div className="flex items-center space-x-4 space-x-reverse">
                <button
                  onClick={() => setIsNewCustomer(false)}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    !isNewCustomer 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  عميل موجود
                </button>
                <button
                  onClick={() => setIsNewCustomer(true)}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    isNewCustomer 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  عميل جديد
                </button>
              </div>
            </div>

            {!isNewCustomer ? (
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">
                  اختر العميل
                </label>
                <select
                  value={selectedCustomer?.id || ''}
                  onChange={(e) => {
                    const customer = customers.find(c => c.id === e.target.value)
                    setSelectedCustomer(customer || null)
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">اختر عميل...</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.customer_name} - {customer.phone}
                    </option>
                  ))}
                </select>
                
                {selectedCustomer && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h3 className="font-medium text-gray-900 mb-2">{selectedCustomer.customer_name}</h3>
                    <p className="text-sm text-gray-600">{selectedCustomer.phone}</p>
                    <p className="text-sm text-gray-600">{selectedCustomer.address}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    اسم العميل *
                  </label>
                  <input
                    type="text"
                    value={customerForm.customer_name}
                    onChange={(e) => setCustomerForm({...customerForm, customer_name: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    رقم الهاتف *
                  </label>
                  <input
                    type="tel"
                    value={customerForm.phone}
                    onChange={(e) => setCustomerForm({...customerForm, phone: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    البريد الإلكتروني
                  </label>
                  <input
                    type="email"
                    value={customerForm.email}
                    onChange={(e) => setCustomerForm({...customerForm, email: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    نوع العميل
                  </label>
                  <select
                    value={customerForm.customer_type}
                    onChange={(e) => setCustomerForm({...customerForm, customer_type: e.target.value as 'individual' | 'company'})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="individual">فرد</option>
                    <option value="company">شركة</option>
                  </select>
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    العنوان *
                  </label>
                  <input
                    type="text"
                    value={customerForm.address}
                    onChange={(e) => setCustomerForm({...customerForm, address: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    المدينة *
                  </label>
                  <input
                    type="text"
                    value={customerForm.city}
                    onChange={(e) => setCustomerForm({...customerForm, city: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    المحافظة *
                  </label>
                  <input
                    type="text"
                    value={customerForm.governorate}
                    onChange={(e) => setCustomerForm({...customerForm, governorate: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end mt-8">
              <button
                onClick={isNewCustomer ? saveCustomer : () => setStep('products')}
                disabled={!selectedCustomer && isNewCustomer}
                className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                التالي
                <ArrowRight className="h-4 w-4 mr-2" />
              </button>
            </div>
          </div>
        )}

        {/* Products Step */}
        {step === 'products' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">المنتجات</h2>
            
            <div className="space-y-4">
              {orderItems.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-xl p-4">
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        المنتج *
                      </label>
                      <select
                        value={item.product_id}
                        onChange={(e) => handleProductSelect(index, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        required
                      >
                        <option value="">اختر منتج...</option>
                        {products.map(product => (
                          <option key={product.id} value={product.id}>
                            {product.name} - {product.retail_price} ج.م
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        الكمية *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateOrderItem(index, 'quantity', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        السعر
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => updateOrderItem(index, 'unit_price', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        readOnly
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        الخصم %
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={item.discount_percentage}
                        onChange={(e) => updateOrderItem(index, 'discount_percentage', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    
                    <div className="flex items-end">
                      <button
                        onClick={() => removeOrderItem(index)}
                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="mt-3 text-sm text-gray-600">
                    السعر النهائي: {item.final_unit_price.toFixed(2)} ج.م | 
                    إجمالي السطر: {item.line_total.toFixed(2)} ج.م
                  </div>
                </div>
              ))}
            </div>
            
            <button
              onClick={addOrderItem}
              className="mt-4 w-full border-2 border-dashed border-gray-300 rounded-xl p-4 text-gray-600 hover:text-gray-800 hover:border-gray-400 flex items-center justify-center"
            >
              <Plus className="h-5 w-5 ml-2" />
              إضافة منتج
            </button>

            <div className="flex justify-between mt-8">
              <button
                onClick={() => setStep('customer')}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50"
              >
                السابق
              </button>
              <button
                onClick={() => setStep('shipping')}
                disabled={orderItems.length === 0}
                className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                التالي
                <ArrowRight className="h-4 w-4 mr-2" />
              </button>
            </div>
          </div>
        )}

        {/* Shipping Step */}
        {step === 'shipping' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">الشحن والدفع</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  طريقة الشحن
                </label>
                <select
                  value={orderForm.shipping_method}
                  onChange={(e) => setOrderForm({...orderForm, shipping_method: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="standard">شحن عادي</option>
                  <option value="express">شحن سريع</option>
                  <option value="pickup">استلام من المحل</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  تكلفة الشحن
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={orderForm.shipping_cost}
                  onChange={(e) => setOrderForm({...orderForm, shipping_cost: parseFloat(e.target.value)})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  طريقة الدفع
                </label>
                <select
                  value={orderForm.payment_method}
                  onChange={(e) => setOrderForm({...orderForm, payment_method: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="cash_on_delivery">الدفع عند الاستلام</option>
                  <option value="bank_transfer">التحويل البنكي</option>
                  <option value="electronic_payment">الدفع الإلكتروني</option>
                  <option value="credit_card">بطاقة ائتمان</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  تاريخ التسليم المتوقع
                </label>
                <input
                  type="date"
                  value={orderForm.estimated_delivery_date}
                  onChange={(e) => setOrderForm({...orderForm, estimated_delivery_date: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ملاحظات
                </label>
                <textarea
                  value={orderForm.notes}
                  onChange={(e) => setOrderForm({...orderForm, notes: e.target.value})}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="أي ملاحظات إضافية..."
                />
              </div>
            </div>

            <div className="flex justify-between mt-8">
              <button
                onClick={() => setStep('products')}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50"
              >
                السابق
              </button>
              <button
                onClick={() => setStep('review')}
                className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 flex items-center"
              >
                التالي
                <ArrowRight className="h-4 w-4 mr-2" />
              </button>
            </div>
          </div>
        )}

        {/* Review Step */}
        {step === 'review' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">مراجعة الطلب</h2>
            
            <div className="space-y-6">
              {/* Customer Info */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-medium text-gray-900 mb-3">معلومات العميل</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">الاسم:</span>
                    <span className="mr-2 font-medium">{selectedCustomer?.customer_name}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">الهاتف:</span>
                    <span className="mr-2 font-medium">{selectedCustomer?.phone}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">العنوان:</span>
                    <span className="mr-2 font-medium">{selectedCustomer?.address}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">المدينة:</span>
                    <span className="mr-2 font-medium">{selectedCustomer?.city} - {selectedCustomer?.governorate}</span>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">المنتجات</h3>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">المنتج</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">الكمية</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">السعر</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">الخصم</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {orderItems.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-3 text-sm text-gray-900">{item.product_name}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{item.quantity}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{item.unit_price.toFixed(2)} ج.م</td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {item.discount_percentage > 0 && `${item.discount_percentage}%`}
                            {item.discount_amount > 0 && ` + ${item.discount_amount} ج.م`}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.line_total.toFixed(2)} ج.م</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-medium text-gray-900 mb-3">ملخص الطلب</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">إجمالي المنتجات:</span>
                    <span>{totalAmount - orderForm.shipping_cost} ج.م</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">تكلفة الشحن:</span>
                    <span>{orderForm.shipping_cost} ج.م</span>
                  </div>
                  <div className="border-t border-gray-200 pt-2">
                    <div className="flex justify-between font-medium text-lg">
                      <span>الإجمالي النهائي:</span>
                      <span>{totalAmount.toFixed(2)} ج.م</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Shipping & Payment */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-medium text-gray-900 mb-3">الشحن والدفع</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">طريقة الشحن:</span>
                    <span className="mr-2 font-medium">
                      {orderForm.shipping_method === 'standard' && 'شحن عادي'}
                      {orderForm.shipping_method === 'express' && 'شحن سريع'}
                      {orderForm.shipping_method === 'pickup' && 'استلام من المحل'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">طريقة الدفع:</span>
                    <span className="mr-2 font-medium">
                      {orderForm.payment_method === 'cash_on_delivery' && 'الدفع عند الاستلام'}
                      {orderForm.payment_method === 'bank_transfer' && 'التحويل البنكي'}
                      {orderForm.payment_method === 'electronic_payment' && 'الدفع الإلكتروني'}
                      {orderForm.payment_method === 'credit_card' && 'بطاقة ائتمان'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between mt-8">
              <button
                onClick={() => setStep('shipping')}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50"
              >
                السابق
              </button>
              <button
                onClick={createOrder}
                disabled={loading}
                className="bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    جاري الإنشاء...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    إنشاء الطلب
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
