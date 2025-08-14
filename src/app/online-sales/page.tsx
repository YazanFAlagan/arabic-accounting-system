'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ShoppingCart, 
  Users, 
  Package, 
  Truck, 
  DollarSign, 
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  Phone,
  Mail
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

interface OnlineCustomer {
  id: string
  customer_name: string
  phone: string
  email?: string
  address: string
  city: string
  governorate: string
  customer_type: 'individual' | 'company'
  created_at: string
}

interface OnlineOrder {
  id: string
  order_number: string
  order_date: string
  customer_id: string
  order_status: string
  payment_status: string
  total_amount: number
  shipping_method: string
  payment_method: string
  customer?: OnlineCustomer
}

export default function OnlineSalesPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'orders' | 'customers' | 'settings'>('orders')
  const [orders, setOrders] = useState<OnlineOrder[]>([])
  const [customers, setCustomers] = useState<OnlineCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    if (user) {
      console.log('User authenticated, fetching data...')
      setLoading(true)
      fetchOrders()
      fetchCustomers()
    } else {
      console.log('No user authenticated')
      setLoading(false)
      // Show authentication required message
      setOrders([])
      setCustomers([])
    }
  }, [user])

  const fetchOrders = async () => {
    try {
      console.log('Fetching orders for user:', user?.id)
      
      if (!user?.id) {
        throw new Error('No authenticated user found')
      }
      
      const { data, error } = await supabase
        .from('online_orders')
        .select(`
          *,
          customer:online_customers(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Supabase error fetching orders:', error)
        throw error
      }
      
      console.log('Orders fetched successfully:', data?.length || 0, 'orders')
      setOrders(data || [])
    } catch (error) {
      console.error('Error fetching orders:', error)
      // Show user-friendly error message
      if (error instanceof Error) {
        alert(`فشل في جلب الطلبات: ${error.message}`)
      } else {
        alert('فشل في جلب الطلبات. يرجى التحقق من الاتصال بقاعدة البيانات.')
      }
      setOrders([])
    }
  }

  const testConnection = async () => {
    try {
      console.log('Testing Supabase connection...')
      const { data, error } = await supabase.auth.getUser()
      
      if (error) {
        console.error('Auth error:', error)
        return false
      }
      
      if (!data.user) {
        console.error('No user found in auth')
        return false
      }
      
      console.log('Current user:', data.user)
      return true
    } catch (error) {
      console.error('Connection test failed:', error)
      return false
    }
  }

  const fetchCustomers = async () => {
    try {
      console.log('Fetching customers for user:', user?.id)
      
      if (!user?.id) {
        throw new Error('No authenticated user found')
      }
      
      const { data, error } = await supabase
        .from('online_customers')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Supabase error fetching customers:', error)
        throw error
      }
      
      console.log('Customers fetched successfully:', data?.length || 0, 'customers')
      setCustomers(data || [])
      setLoading(false)
    } catch (error) {
      console.error('Error fetching customers:', error)
      // Show user-friendly error message
      if (error instanceof Error) {
        alert(`فشل في جلب العملاء: ${error.message}`)
      } else {
        alert('فشل في جلب العملاء. يرجى التحقق من الاتصال بقاعدة البيانات.')
      }
      setCustomers([])
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'confirmed': return 'bg-blue-100 text-blue-800'
      case 'processing': return 'bg-purple-100 text-purple-800'
      case 'shipped': return 'bg-indigo-100 text-indigo-800'
      case 'delivered': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-emerald-100 text-emerald-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      case 'refunded': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />
      case 'confirmed': return <CheckCircle className="h-4 w-4" />
      case 'processing': return <Package className="h-4 w-4" />
      case 'shipped': return <Truck className="h-4 w-4" />
      case 'delivered': return <CheckCircle className="h-4 w-4" />
      case 'completed': return <CheckCircle className="h-4 w-4" />
      case 'cancelled': return <XCircle className="h-4 w-4" />
      case 'refunded': return <XCircle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'failed': return 'bg-red-100 text-red-800'
      case 'refunded': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer?.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer?.phone.includes(searchTerm)
    
    const matchesStatus = statusFilter === 'all' || order.order_status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const filteredCustomers = customers.filter(customer =>
    customer.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const stats = {
    totalOrders: orders.length,
    pendingOrders: orders.filter(o => o.order_status === 'pending').length,
    completedOrders: orders.filter(o => o.order_status === 'completed').length,
    totalRevenue: orders.reduce((sum, o) => sum + o.total_amount, 0),
    totalCustomers: customers.length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل البيانات...</p>
          {!user && (
            <p className="text-red-600 mt-2">لم يتم تسجيل الدخول بعد</p>
          )}
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full mx-4 text-center">
          <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">مطلوب تسجيل الدخول</h2>
          <p className="text-gray-600 mb-6">يجب عليك تسجيل الدخول للوصول إلى نظام البيع الإلكتروني</p>
          <button
            onClick={() => router.push('/login')}
            className="w-full bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
          >
            تسجيل الدخول
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="h-10 w-10 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center ml-4">
                <ShoppingCart className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">البيع الإلكتروني</h1>
                <p className="text-sm text-gray-500">إدارة الطلبات والعملاء عبر الإنترنت</p>
              </div>
            </div>
            <button 
              onClick={() => router.push('/online-sales/new-order')}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 flex items-center"
            >
              <Plus className="h-5 w-5 ml-2" />
              طلب جديد
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Debug Info */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="text-sm font-medium text-yellow-800 mb-2">معلومات التصحيح:</h3>
            <div className="text-xs text-yellow-700 space-y-1">
              <p>حالة المستخدم: {user ? 'مسجل الدخول' : 'غير مسجل'}</p>
              <p>معرف المستخدم: {user?.id || 'غير محدد'}</p>
              <p>البريد الإلكتروني: {user?.email || 'غير محدد'}</p>
              <p>عدد الطلبات: {orders.length}</p>
              <p>عدد العملاء: {customers.length}</p>
              <p>حالة التحميل: {loading ? 'جاري التحميل' : 'مكتمل'}</p>
            </div>
            <div className="mt-3 space-x-2">
              <button
                onClick={async () => {
                  const result = await testConnection()
                  alert(result ? 'الاتصال ناجح' : 'فشل الاتصال')
                }}
                className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200"
              >
                اختبار الاتصال
              </button>
              <button
                onClick={() => { 
                  setLoading(true)
                  fetchOrders()
                  fetchCustomers()
                }}
                className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded hover:bg-green-200"
              >
                تحديث البيانات
              </button>
              <button
                onClick={async () => {
                  try {
                    const { data, error } = await supabase.auth.getUser()
                    if (error) {
                      alert(`خطأ في المصادقة: ${error.message}`)
                    } else if (data.user) {
                      alert(`المستخدم: ${data.user.email}`)
                    } else {
                      alert('لا يوجد مستخدم')
                    }
                  } catch (err) {
                    alert(`خطأ: ${err}`)
                  }
                }}
                className="px-3 py-1 bg-purple-100 text-purple-700 text-xs rounded hover:bg-purple-200"
              >
                اختبار المصادقة
              </button>
            </div>
          </div>
        )}
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="h-12 w-12 bg-blue-100 rounded-xl flex items-center justify-center ml-4">
                <ShoppingCart className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">إجمالي الطلبات</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="h-12 w-12 bg-yellow-100 rounded-xl flex items-center justify-center ml-4">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">في الانتظار</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingOrders}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="h-12 w-12 bg-green-100 rounded-xl flex items-center justify-center ml-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">مكتملة</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completedOrders}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="h-12 w-12 bg-emerald-100 rounded-xl flex items-center justify-center ml-4">
                <DollarSign className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">إجمالي الإيرادات</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalRevenue.toLocaleString()} ج.م</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="h-12 w-12 bg-purple-100 rounded-xl flex items-center justify-center ml-4">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">العملاء</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalCustomers}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('orders')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'orders'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                الطلبات
              </button>
              <button
                onClick={() => setActiveTab('customers')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'customers'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                العملاء
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'settings'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                الإعدادات
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="البحث في الطلبات أو العملاء..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              {activeTab === 'orders' && (
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="all">جميع الحالات</option>
                  <option value="pending">في الانتظار</option>
                  <option value="confirmed">مؤكد</option>
                  <option value="processing">قيد المعالجة</option>
                  <option value="shipped">تم الشحن</option>
                  <option value="delivered">تم التسليم</option>
                  <option value="completed">مكتمل</option>
                  <option value="cancelled">ملغي</option>
                </select>
              )}
            </div>

            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        رقم الطلب
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        العميل
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        التاريخ
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        الحالة
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        الدفع
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
                    {filteredOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{order.order_number}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {order.customer?.customer_name}
                              </div>
                              <div className="text-sm text-gray-500 flex items-center">
                                <Phone className="h-4 w-4 ml-1" />
                                {order.customer?.phone}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(order.order_date).toLocaleDateString('ar-EG')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.order_status)}`}>
                            {getStatusIcon(order.order_status)}
                            <span className="mr-1">
                              {order.order_status === 'pending' && 'في الانتظار'}
                              {order.order_status === 'confirmed' && 'مؤكد'}
                              {order.order_status === 'processing' && 'قيد المعالجة'}
                              {order.order_status === 'shipped' && 'تم الشحن'}
                              {order.order_status === 'delivered' && 'تم التسليم'}
                              {order.order_status === 'completed' && 'مكتمل'}
                              {order.order_status === 'cancelled' && 'ملغي'}
                              {order.order_status === 'refunded' && 'مسترد'}
                            </span>
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(order.payment_status)}`}>
                            {order.payment_status === 'paid' && 'مدفوع'}
                            {order.payment_status === 'pending' && 'في الانتظار'}
                            {order.payment_status === 'failed' && 'فشل'}
                            {order.payment_status === 'refunded' && 'مسترد'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {order.total_amount.toLocaleString()} ج.م
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <button 
                              onClick={() => router.push(`/online-sales/${order.id}`)}
                              className="text-indigo-600 hover:text-indigo-900 p-1"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button className="text-green-600 hover:text-green-900 p-1">
                              <Edit className="h-4 w-4" />
                            </button>
                            <button className="text-red-600 hover:text-red-900 p-1">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredOrders.length === 0 && (
                  <div className="text-center py-12">
                    <Package className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">لا توجد طلبات</h3>
                    <p className="mt-1 text-sm text-gray-500">ابدأ بإنشاء طلب جديد</p>
                    <button
                      onClick={() => router.push('/online-sales/new-order')}
                      className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      إنشاء طلب جديد
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Customers Tab */}
            {activeTab === 'customers' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCustomers.map((customer) => (
                  <div key={customer.id} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {customer.customer_name}
                        </h3>
                        <div className="space-y-2 text-sm text-gray-600">
                          <div className="flex items-center">
                            <Phone className="h-4 w-4 ml-2 text-gray-400" />
                            {customer.phone}
                          </div>
                          {customer.email && (
                            <div className="flex items-center">
                              <Mail className="h-4 w-4 ml-2 text-gray-400" />
                              {customer.email}
                            </div>
                          )}
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 ml-2 text-gray-400" />
                            {customer.city} - {customer.governorate}
                          </div>
                        </div>
                        <div className="mt-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            customer.customer_type === 'individual' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {customer.customer_type === 'individual' ? 'فرد' : 'شركة'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <button className="text-indigo-600 hover:text-indigo-900 p-2">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button className="text-green-600 hover:text-green-900 p-2">
                          <Edit className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredCustomers.length === 0 && (
                  <div className="col-span-full text-center py-12">
                    <Users className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">لا يوجد عملاء</h3>
                    <p className="mt-1 text-sm text-gray-500">ابدأ بإضافة عميل جديد</p>
                    <button
                      onClick={() => router.push('/online-sales/new-order')}
                      className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      إضافة عميل جديد
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">إعدادات المتجر</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        اسم المتجر
                      </label>
                      <input
                        type="text"
                        defaultValue="متجر إلكتروني"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        تكلفة الشحن الافتراضية
                      </label>
                      <input
                        type="number"
                        defaultValue="50"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">طرق الدفع المقبولة</h3>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input type="checkbox" defaultChecked className="ml-3 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
                      <span className="text-sm text-gray-700">الدفع عند الاستلام</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" defaultChecked className="ml-3 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
                      <span className="text-sm text-gray-700">التحويل البنكي</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="ml-3 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
                      <span className="text-sm text-gray-700">الدفع الإلكتروني</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
