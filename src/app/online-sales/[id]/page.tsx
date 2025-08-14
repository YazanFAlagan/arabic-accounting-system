'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { 
  ArrowRight, 
  ShoppingCart, 
  User, 
  Package, 
  Truck, 
  CreditCard,
  MapPin,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  CheckCircle,
  Clock,
  XCircle,
  Edit,
  Save,
  Plus
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

interface OrderItem {
  id: string
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
  customer_type: 'individual' | 'company'
}

interface Order {
  id: string
  order_number: string
  order_date: string
  customer_id: string
  order_status: string
  payment_status: string
  shipping_method: string
  shipping_cost: number
  payment_method: string
  subtotal: number
  total_amount: number
  notes?: string
  estimated_delivery_date?: string
  actual_delivery_date?: string
  customer?: Customer
  items?: OrderItem[]
}

interface TrackingEvent {
  id: string
  status: string
  status_description: string
  location?: string
  notes?: string
  created_at: string
}

export default function OrderDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const { user } = useAuth()
  const [order, setOrder] = useState<Order | null>(null)
  const [trackingEvents, setTrackingEvents] = useState<TrackingEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [showTrackingForm, setShowTrackingForm] = useState(false)
  const [newTrackingEvent, setNewTrackingEvent] = useState({
    status: '',
    status_description: '',
    location: '',
    notes: ''
  })

  useEffect(() => {
    if (user && params.id) {
      fetchOrderDetails()
      fetchTrackingEvents()
    }
  }, [user, params.id])

  const fetchOrderDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('online_orders')
        .select(`
          *,
          customer:online_customers(*),
          items:online_order_items(*)
        `)
        .eq('id', params.id)
        .single()

      if (error) throw error
      setOrder(data)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching order details:', error)
      setLoading(false)
    }
  }

  const fetchTrackingEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('order_tracking')
        .select('*')
        .eq('order_id', params.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setTrackingEvents(data || [])
    } catch (error) {
      console.error('Error fetching tracking events:', error)
    }
  }

  const updateOrderStatus = async (newStatus: string) => {
    if (!order) return

    try {
      setUpdating(true)
      const { error } = await supabase
        .from('online_orders')
        .update({ 
          order_status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id)

      if (error) throw error

      // Update local state
      setOrder({ ...order, order_status: newStatus })
      
      // Add tracking event
      await addTrackingEvent(newStatus, `تم تحديث حالة الطلب إلى: ${getStatusText(newStatus)}`)
      
    } catch (error) {
      console.error('Error updating order status:', error)
    } finally {
      setUpdating(false)
    }
  }

  const updatePaymentStatus = async (newStatus: string) => {
    if (!order) return

    try {
      setUpdating(true)
      const { error } = await supabase
        .from('online_orders')
        .update({ 
          payment_status: newStatus,
          payment_date: newStatus === 'paid' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id)

      if (error) throw error

      setOrder({ ...order, payment_status: newStatus })
      await addTrackingEvent('payment_update', `تم تحديث حالة الدفع إلى: ${getPaymentStatusText(newStatus)}`)
      
    } catch (error) {
      console.error('Error updating payment status:', error)
    } finally {
      setUpdating(false)
    }
  }

  const addTrackingEvent = async (status: string, description: string) => {
    if (!user || !order) return

    try {
      const { error } = await supabase
        .from('order_tracking')
        .insert([{
          order_id: order.id,
          user_id: user.id,
          status,
          status_description: description,
          location: newTrackingEvent.location,
          notes: newTrackingEvent.notes
        }])

      if (error) throw error

      // Refresh tracking events
      await fetchTrackingEvents()
      setShowTrackingForm(false)
      setNewTrackingEvent({ status: '', status_description: '', location: '', notes: '' })
      
    } catch (error) {
      console.error('Error adding tracking event:', error)
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'في الانتظار'
      case 'confirmed': return 'مؤكد'
      case 'processing': return 'قيد المعالجة'
      case 'shipped': return 'تم الشحن'
      case 'delivered': return 'تم التسليم'
      case 'completed': return 'مكتمل'
      case 'cancelled': return 'ملغي'
      case 'refunded': return 'مسترد'
      default: return status
    }
  }

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case 'paid': return 'مدفوع'
      case 'pending': return 'في الانتظار'
      case 'failed': return 'فشل'
      case 'refunded': return 'مسترد'
      default: return status
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

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'failed': return 'bg-red-100 text-red-800'
      case 'refunded': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">الطلب غير موجود</h2>
          <p className="text-gray-600 mb-4">الطلب الذي تبحث عنه غير موجود أو تم حذفه</p>
          <button
            onClick={() => router.push('/online-sales')}
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700"
          >
            العودة للطلبات
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
                <h1 className="text-2xl font-bold text-gray-900">تفاصيل الطلب</h1>
                <p className="text-sm text-gray-500">طلب رقم: {order.order_number}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 space-x-reverse">
              <button
                onClick={() => setShowTrackingForm(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 flex items-center"
              >
                <Plus className="h-4 w-4 ml-2" />
                إضافة تتبع
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Order Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Status */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">حالة الطلب</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    حالة الطلب
                  </label>
                  <select
                    value={order.order_status}
                    onChange={(e) => updateOrderStatus(e.target.value)}
                    disabled={updating}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="pending">في الانتظار</option>
                    <option value="confirmed">مؤكد</option>
                    <option value="processing">قيد المعالجة</option>
                    <option value="shipped">تم الشحن</option>
                    <option value="delivered">تم التسليم</option>
                    <option value="completed">مكتمل</option>
                    <option value="cancelled">ملغي</option>
                    <option value="refunded">مسترد</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    حالة الدفع
                  </label>
                  <select
                    value={order.payment_status}
                    onChange={(e) => updatePaymentStatus(e.target.value)}
                    disabled={updating}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="pending">في الانتظار</option>
                    <option value="paid">مدفوع</option>
                    <option value="failed">فشل</option>
                    <option value="refunded">مسترد</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-4 space-x-reverse">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.order_status)}`}>
                  {getStatusText(order.order_status)}
                </span>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getPaymentStatusColor(order.payment_status)}`}>
                  {getPaymentStatusText(order.payment_status)}
                </span>
              </div>
            </div>

            {/* Order Items */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">المنتجات</h2>
              
              <div className="overflow-x-auto">
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
                    {order.items?.map((item) => (
                      <tr key={item.id}>
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

              <div className="mt-6 bg-gray-50 rounded-xl p-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">إجمالي المنتجات:</span>
                    <span>{order.subtotal.toFixed(2)} ج.م</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">تكلفة الشحن:</span>
                    <span>{order.shipping_cost.toFixed(2)} ج.م</span>
                  </div>
                  <div className="border-t border-gray-200 pt-2">
                    <div className="flex justify-between font-medium text-lg">
                      <span>الإجمالي النهائي:</span>
                      <span>{order.total_amount.toFixed(2)} ج.م</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tracking Events */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">تتبع الطلب</h2>
              
              <div className="space-y-4">
                {trackingEvents.map((event) => (
                  <div key={event.id} className="border-r-4 border-indigo-500 pr-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{event.status_description}</h4>
                        {event.location && (
                          <p className="text-sm text-gray-600 mt-1">
                            <MapPin className="h-4 w-4 inline ml-1" />
                            {event.location}
                          </p>
                        )}
                        {event.notes && (
                          <p className="text-sm text-gray-600 mt-1">{event.notes}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                          {new Date(event.created_at).toLocaleString('ar-EG')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                
                {trackingEvents.length === 0 && (
                  <p className="text-gray-500 text-center py-8">لا توجد أحداث تتبع بعد</p>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Customer Info */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">معلومات العميل</h2>
              
              {order.customer && (
                <div className="space-y-3">
                  <div className="flex items-center">
                    <User className="h-5 w-5 text-gray-400 ml-2" />
                    <span className="font-medium text-gray-900">{order.customer.customer_name}</span>
                  </div>
                  
                  <div className="flex items-center">
                    <Phone className="h-5 w-5 text-gray-400 ml-2" />
                    <span className="text-gray-600">{order.customer.phone}</span>
                  </div>
                  
                  {order.customer.email && (
                    <div className="flex items-center">
                      <Mail className="h-5 w-5 text-gray-400 ml-2" />
                      <span className="text-gray-600">{order.customer.email}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center">
                    <MapPin className="h-5 w-5 text-gray-400 ml-2" />
                    <span className="text-gray-600">{order.customer.address}</span>
                  </div>
                  
                  <div className="text-sm text-gray-500">
                    {order.customer.city} - {order.customer.governorate}
                  </div>
                  
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    order.customer.customer_type === 'individual' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-purple-100 text-purple-800'
                  }`}>
                    {order.customer.customer_type === 'individual' ? 'فرد' : 'شركة'}
                  </span>
                </div>
              )}
            </div>

            {/* Order Details */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">تفاصيل الطلب</h2>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">رقم الطلب:</span>
                  <span className="font-medium">{order.order_number}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">تاريخ الطلب:</span>
                  <span>{new Date(order.order_date).toLocaleDateString('ar-EG')}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">طريقة الشحن:</span>
                  <span>
                    {order.shipping_method === 'standard' && 'شحن عادي'}
                    {order.shipping_method === 'express' && 'شحن سريع'}
                    {order.shipping_method === 'pickup' && 'استلام من المحل'}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">طريقة الدفع:</span>
                  <span>
                    {order.payment_method === 'cash_on_delivery' && 'الدفع عند الاستلام'}
                    {order.payment_method === 'bank_transfer' && 'التحويل البنكي'}
                    {order.payment_method === 'electronic_payment' && 'الدفع الإلكتروني'}
                    {order.payment_method === 'credit_card' && 'بطاقة ائتمان'}
                  </span>
                </div>
                
                {order.estimated_delivery_date && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">تاريخ التسليم المتوقع:</span>
                    <span>{new Date(order.estimated_delivery_date).toLocaleDateString('ar-EG')}</span>
                  </div>
                )}
                
                {order.actual_delivery_date && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">تاريخ التسليم الفعلي:</span>
                    <span>{new Date(order.actual_delivery_date).toLocaleDateString('ar-EG')}</span>
                  </div>
                )}
              </div>
              
              {order.notes && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h3 className="font-medium text-gray-900 mb-2">ملاحظات</h3>
                  <p className="text-sm text-gray-600">{order.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tracking Form Modal */}
      {showTrackingForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">إضافة حدث تتبع</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الوصف
                </label>
                <input
                  type="text"
                  value={newTrackingEvent.status_description}
                  onChange={(e) => setNewTrackingEvent({...newTrackingEvent, status_description: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="مثال: تم تأكيد الطلب"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الموقع (اختياري)
                </label>
                <input
                  type="text"
                  value={newTrackingEvent.location}
                  onChange={(e) => setNewTrackingEvent({...newTrackingEvent, location: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="مثال: مستودع الشحن"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ملاحظات (اختياري)
                </label>
                <textarea
                  value={newTrackingEvent.notes}
                  onChange={(e) => setNewTrackingEvent({...newTrackingEvent, notes: e.target.value})}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="أي ملاحظات إضافية..."
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 space-x-reverse mt-6">
              <button
                onClick={() => setShowTrackingForm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
              >
                إلغاء
              </button>
              <button
                onClick={() => addTrackingEvent('custom', newTrackingEvent.status_description)}
                disabled={!newTrackingEvent.status_description}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                إضافة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
