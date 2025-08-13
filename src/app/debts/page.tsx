'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Plus, Users, DollarSign, Calendar, AlertTriangle, CheckCircle, XCircle, Edit, Trash2, Eye } from 'lucide-react'
import QuickNavigation from '@/components/QuickNavigation'

interface DebtEntity {
  id: string
  name: string
  type: 'individual' | 'company' | 'supplier' | 'customer'
  phone?: string
  email?: string
  address?: string
  notes?: string
}

interface Debt {
  id: string
  entity_id: string
  debt_type: 'owed_to_me' | 'owed_by_me'
  original_amount: number
  current_balance: number
  currency: string
  due_date?: string
  status: 'active' | 'paid' | 'cancelled' | 'overdue'
  description: string
  category: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  entity_name?: string
}

interface DebtTransaction {
  id: string
  debt_id: string
  transaction_type: 'payment' | 'receipt' | 'adjustment'
  amount: number
  payment_method: string
  reference_number?: string
  transaction_date: string
  notes?: string
}

export default function DebtsPage() {
  const { user } = useAuth()
  const [entities, setEntities] = useState<DebtEntity[]>([])
  const [debts, setDebts] = useState<Debt[]>([])
  const [transactions, setTransactions] = useState<DebtTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'debts' | 'entities' | 'transactions'>('debts')
  
  // Modal states
  const [showEntityModal, setShowEntityModal] = useState(false)
  const [showDebtModal, setShowDebtModal] = useState(false)
  const [showTransactionModal, setShowTransactionModal] = useState(false)
  const [editingEntity, setEditingEntity] = useState<DebtEntity | null>(null)
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null)
  const [editingTransaction, setEditingTransaction] = useState<DebtTransaction | null>(null)

  // Form states
  const [entityForm, setEntityForm] = useState({
    name: '',
    type: 'individual' as const,
    phone: '',
    email: '',
    address: '',
    notes: ''
  })

  const [debtForm, setDebtForm] = useState({
    entity_id: '',
    debt_type: 'owed_to_me' as const,
    original_amount: '',
    currency: 'EGP',
    due_date: '',
    description: '',
    category: 'general',
    priority: 'normal' as const
  })

  const [transactionForm, setTransactionForm] = useState({
    debt_id: '',
    transaction_type: 'payment' as const,
    amount: '',
    payment_method: 'cash',
    reference_number: '',
    transaction_date: new Date().toISOString().split('T')[0],
    notes: ''
  })

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch entities
      const { data: entitiesData } = await supabase
        .from('debt_entities')
        .select('*')
        .order('name')
      
      if (entitiesData) setEntities(entitiesData)

      // Fetch debts with entity names
      const { data: debtsData } = await supabase
        .from('debt_summary')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (debtsData) setDebts(debtsData)

      // Fetch transactions
      const { data: transactionsData } = await supabase
        .from('debt_transactions_summary')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (transactionsData) setTransactions(transactionsData)

    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEntitySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingEntity) {
        const { error } = await supabase
          .from('debt_entities')
          .update({ ...entityForm, updated_at: new Date().toISOString() })
          .eq('id', editingEntity.id)
        
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('debt_entities')
          .insert([{ ...entityForm, user_id: user?.id }])
        
        if (error) throw error
      }
      
      setShowEntityModal(false)
      setEditingEntity(null)
      setEntityForm({ name: '', type: 'individual', phone: '', email: '', address: '', notes: '' })
      fetchData()
    } catch (error) {
      console.error('Error saving entity:', error)
    }
  }

  const handleDebtSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const debtData = {
        ...debtForm,
        original_amount: parseFloat(debtForm.original_amount),
        current_balance: parseFloat(debtForm.original_amount),
        user_id: user?.id
      }

      if (editingDebt) {
        const { error } = await supabase
          .from('debts')
          .update({ ...debtData, updated_at: new Date().toISOString() })
          .eq('id', editingDebt.id)
        
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('debts')
          .insert([debtData])
        
        if (error) throw error
      }
      
      setShowDebtModal(false)
      setEditingDebt(null)
      setDebtForm({ entity_id: '', debt_type: 'owed_to_me', original_amount: '', currency: 'EGP', due_date: '', description: '', category: 'general', priority: 'normal' })
      fetchData()
    } catch (error) {
      console.error('Error saving debt:', error)
    }
  }

  const handleTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const transactionData = {
        ...transactionForm,
        amount: parseFloat(transactionForm.amount),
        user_id: user?.id
      }

      if (editingTransaction) {
        const { error } = await supabase
          .from('debt_transactions')
          .update({ ...transactionData, updated_at: new Date().toISOString() })
          .eq('id', editingTransaction.id)
        
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('debt_transactions')
          .insert([transactionData])
        
        if (error) throw error
      }
      
      setShowTransactionModal(false)
      setEditingTransaction(null)
      setTransactionForm({ debt_id: '', transaction_type: 'payment', amount: '', payment_method: 'cash', reference_number: '', transaction_date: new Date().toISOString().split('T')[0], notes: '' })
      fetchData()
    } catch (error) {
      console.error('Error saving transaction:', error)
    }
  }

  const deleteEntity = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الشخص/الجهة؟')) {
      try {
        const { error } = await supabase
          .from('debt_entities')
          .delete()
          .eq('id', id)
        
        if (error) throw error
        fetchData()
      } catch (error) {
        console.error('Error deleting entity:', error)
      }
    }
  }

  const deleteDebt = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الدين؟')) {
      try {
        const { error } = await supabase
          .from('debts')
          .delete()
          .eq('id', id)
        
        if (error) throw error
        fetchData()
      } catch (error) {
        console.error('Error deleting debt:', error)
      }
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'overdue': return <AlertTriangle className="w-5 h-5 text-red-500" />
      case 'active': return <Calendar className="w-5 h-5 text-blue-500" />
      default: return <XCircle className="w-5 h-5 text-gray-500" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-100'
      case 'high': return 'text-orange-600 bg-orange-100'
      case 'normal': return 'text-blue-600 bg-blue-100'
      case 'low': return 'text-gray-600 bg-gray-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100" dir="rtl">
        <QuickNavigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">جاري التحميل...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100" dir="rtl">
      <QuickNavigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">إدارة الديون والذمم المدينة</h1>
              <p className="text-gray-600 mt-2">تتبع الأموال المستحقة عليك وعليهم</p>
            </div>
            <div className="flex space-x-3 space-x-reverse">
              <button
                onClick={() => setShowEntityModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 space-x-reverse"
              >
                <Plus className="w-5 h-5" />
                <span>إضافة شخص/جهة</span>
              </button>
              <button
                onClick={() => setShowDebtModal(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2 space-x-reverse"
              >
                <DollarSign className="w-5 h-5" />
                <span>إضافة دين</span>
              </button>
              <button
                onClick={() => setShowTransactionModal(true)}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center space-x-2 space-x-reverse"
              >
                <Calendar className="w-5 h-5" />
                <span>تسجيل معاملة</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 space-x-reverse">
              <button
                onClick={() => setActiveTab('debts')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'debts'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                الديون
              </button>
              <button
                onClick={() => setActiveTab('entities')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'entities'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                الأشخاص والجهات
              </button>
              <button
                onClick={() => setActiveTab('transactions')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'transactions'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                المعاملات
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm">
          {activeTab === 'debts' && (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-blue-900">أموال عليك</h3>
                  <p className="text-2xl font-bold text-blue-600">
                    {debts
                      .filter(d => d.debt_type === 'owed_to_me')
                      .reduce((sum, d) => sum + d.current_balance, 0)
                      .toLocaleString('ar-EG')} ج.م.
                  </p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-red-900">أموال عليهم</h3>
                  <p className="text-2xl font-bold text-red-600">
                    {debts
                      .filter(d => d.debt_type === 'owed_by_me')
                      .reduce((sum, d) => sum + d.current_balance, 0)
                      .toLocaleString('ar-EG')} ج.م.
                  </p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-green-900">إجمالي الديون</h3>
                  <p className="text-2xl font-bold text-green-600">
                    {debts.length} دين
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الشخص/الجهة</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">نوع الدين</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">المبلغ الأصلي</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الرصيد الحالي</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">تاريخ الاستحقاق</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الحالة</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الأولوية</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {debts.map((debt) => (
                      <tr key={debt.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {debt.entity_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            debt.debt_type === 'owed_to_me' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {debt.debt_type === 'owed_to_me' ? 'أموال عليك' : 'أموال عليهم'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {debt.original_amount.toLocaleString('ar-EG')} ج.م.
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {debt.current_balance.toLocaleString('ar-EG')} ج.م.
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {debt.due_date ? new Date(debt.due_date).toLocaleDateString('ar-EG') : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center space-x-2 space-x-reverse">
                            {getStatusIcon(debt.status)}
                            <span className="capitalize">{debt.status}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(debt.priority)}`}>
                            {debt.priority === 'urgent' ? 'عاجل' : 
                             debt.priority === 'high' ? 'عالية' : 
                             debt.priority === 'normal' ? 'عادية' : 'منخفضة'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2 space-x-reverse">
                            <button
                              onClick={() => {
                                setTransactionForm({
                                  ...transactionForm,
                                  debt_id: debt.id
                                })
                                setShowTransactionModal(true)
                              }}
                              className="text-purple-600 hover:text-purple-900"
                              title="تسجيل معاملة"
                            >
                              <Calendar className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingDebt(debt)
                                setDebtForm({
                                  entity_id: debt.entity_id,
                                  debt_type: debt.debt_type,
                                  original_amount: debt.original_amount.toString(),
                                  currency: debt.currency,
                                  due_date: debt.due_date || '',
                                  description: debt.description,
                                  category: debt.category,
                                  priority: debt.priority
                                })
                                setShowDebtModal(true)
                              }}
                              className="text-blue-600 hover:text-blue-900"
                              title="تعديل الدين"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteDebt(debt.id)}
                              className="text-red-600 hover:text-red-900"
                              title="حذف الدين"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'entities' && (
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الاسم</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">النوع</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الهاتف</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">البريد الإلكتروني</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {entities.map((entity) => (
                      <tr key={entity.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {entity.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {entity.type === 'individual' ? 'فرد' : 
                             entity.type === 'company' ? 'شركة' : 
                             entity.type === 'supplier' ? 'مورد' : 'عميل'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {entity.phone || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {entity.email || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2 space-x-reverse">
                            <button
                              onClick={() => {
                                setEditingEntity(entity)
                                setEntityForm({
                                  name: entity.name,
                                  type: entity.type,
                                  phone: entity.phone || '',
                                  email: entity.email || '',
                                  address: entity.address || '',
                                  notes: entity.notes || ''
                                })
                                setShowEntityModal(true)
                              }}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteEntity(entity.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'transactions' && (
            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">إحصائيات المعاملات</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-green-900">إجمالي المقبوضات</h4>
                    <p className="text-2xl font-bold text-green-600">
                      {transactions
                        .filter(t => t.transaction_type === 'receipt')
                        .reduce((sum, t) => sum + t.amount, 0)
                        .toLocaleString('ar-EG')} ج.م.
                    </p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-red-900">إجمالي المدفوعات</h4>
                    <p className="text-2xl font-bold text-red-600">
                      {transactions
                        .filter(t => t.transaction_type === 'payment')
                        .reduce((sum, t) => sum + t.amount, 0)
                        .toLocaleString('ar-EG')} ج.م.
                    </p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-900">إجمالي المعاملات</h4>
                    <p className="text-2xl font-bold text-blue-600">
                      {transactions.length} معاملة
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الشخص/الجهة</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">نوع المعاملة</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">المبلغ</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">طريقة الدفع</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">تاريخ المعاملة</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {transactions.map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {transaction.entity_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            transaction.transaction_type === 'receipt' 
                              ? 'bg-green-100 text-green-800' 
                              : transaction.transaction_type === 'payment'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {transaction.transaction_type === 'receipt' ? 'قبض' : 
                             transaction.transaction_type === 'payment' ? 'دفع' : 'تعديل'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {transaction.amount.toLocaleString('ar-EG')} ج.م.
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {transaction.payment_method === 'cash' ? 'نقداً' :
                             transaction.payment_method === 'bank_transfer' ? 'تحويل بنكي' :
                             transaction.payment_method === 'check' ? 'شيك' :
                             transaction.payment_method === 'card' ? 'بطاقة ائتمان' : transaction.payment_method}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(transaction.transaction_date).toLocaleDateString('ar-EG')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {transaction.notes || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Entity Modal */}
        {showEntityModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingEntity ? 'تعديل شخص/جهة' : 'إضافة شخص/جهة جديد'}
                </h3>
                <form onSubmit={handleEntitySubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">الاسم</label>
                    <input
                      type="text"
                      required
                      value={entityForm.name}
                      onChange={(e) => setEntityForm({ ...entityForm, name: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">النوع</label>
                    <select
                      value={entityForm.type}
                      onChange={(e) => setEntityForm({ ...entityForm, type: e.target.value as any })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-right"
                    >
                      <option value="individual">فرد</option>
                      <option value="company">شركة</option>
                      <option value="supplier">مورد</option>
                      <option value="customer">عميل</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">الهاتف</label>
                    <input
                      type="tel"
                      value={entityForm.phone}
                      onChange={(e) => setEntityForm({ ...entityForm, phone: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">البريد الإلكتروني</label>
                    <input
                      type="email"
                      value={entityForm.email}
                      onChange={(e) => setEntityForm({ ...entityForm, email: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">العنوان</label>
                    <textarea
                      value={entityForm.address}
                      onChange={(e) => setEntityForm({ ...entityForm, address: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-right"
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">ملاحظات</label>
                    <textarea
                      value={entityForm.notes}
                      onChange={(e) => setEntityForm({ ...entityForm, notes: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-right"
                      rows={2}
                    />
                  </div>
                  <div className="flex space-x-3 space-x-reverse">
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                    >
                      {editingEntity ? 'تحديث' : 'إضافة'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowEntityModal(false)
                        setEditingEntity(null)
                        setEntityForm({ name: '', type: 'individual', phone: '', email: '', address: '', notes: '' })
                      }}
                      className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                    >
                      إلغاء
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Transaction Modal */}
        {showTransactionModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingTransaction ? 'تعديل معاملة' : 'تسجيل معاملة جديدة'}
                </h3>
                <form onSubmit={handleTransactionSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">الدين</label>
                    <select
                      required
                      value={transactionForm.debt_id}
                      onChange={(e) => setTransactionForm({ ...transactionForm, debt_id: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-right"
                    >
                      <option value="">اختر الدين</option>
                      {debts.map((debt) => (
                        <option key={debt.id} value={debt.id}>
                          {debt.entity_name} - {debt.description} ({debt.current_balance.toLocaleString('ar-EG')} ج.م.)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">نوع المعاملة</label>
                    <select
                      required
                      value={transactionForm.transaction_type}
                      onChange={(e) => setTransactionForm({ ...transactionForm, transaction_type: e.target.value as any })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-right"
                    >
                      <option value="payment">دفع</option>
                      <option value="receipt">قبض</option>
                      <option value="adjustment">تعديل</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">المبلغ</label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      value={transactionForm.amount}
                      onChange={(e) => setTransactionForm({ ...transactionForm, amount: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">طريقة الدفع</label>
                    <select
                      value={transactionForm.payment_method}
                      onChange={(e) => setTransactionForm({ ...transactionForm, payment_method: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-right"
                    >
                      <option value="cash">نقداً</option>
                      <option value="bank_transfer">تحويل بنكي</option>
                      <option value="check">شيك</option>
                      <option value="card">بطاقة ائتمان</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">الرقم المرجعي</label>
                    <input
                      type="text"
                      value={transactionForm.reference_number}
                      onChange={(e) => setTransactionForm({ ...transactionForm, reference_number: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-right"
                      placeholder="رقم الشيك أو التحويل"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">تاريخ المعاملة</label>
                    <input
                      type="date"
                      required
                      value={transactionForm.transaction_date}
                      onChange={(e) => setTransactionForm({ ...transactionForm, transaction_date: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">ملاحظات</label>
                    <textarea
                      value={transactionForm.notes}
                      onChange={(e) => setTransactionForm({ ...transactionForm, notes: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-right"
                      rows={2}
                      placeholder="تفاصيل إضافية عن المعاملة"
                    />
                  </div>
                  <div className="flex space-x-3 space-x-reverse">
                    <button
                      type="submit"
                      className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
                    >
                      {editingTransaction ? 'تحديث' : 'تسجيل'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowTransactionModal(false)
                        setEditingTransaction(null)
                        setTransactionForm({ debt_id: '', transaction_type: 'payment', amount: '', payment_method: 'cash', reference_number: '', transaction_date: new Date().toISOString().split('T')[0], notes: '' })
                      }}
                      className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                    >
                      إلغاء
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Debt Modal */}
        {showDebtModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingDebt ? 'تعديل دين' : 'إضافة دين جديد'}
                </h3>
                <form onSubmit={handleDebtSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">الشخص/الجهة</label>
                    <select
                      required
                      value={debtForm.entity_id}
                      onChange={(e) => setDebtForm({ ...debtForm, entity_id: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-right"
                    >
                      <option value="">اختر شخص/جهة</option>
                      {entities.map((entity) => (
                        <option key={entity.id} value={entity.id}>{entity.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">نوع الدين</label>
                    <select
                      required
                      value={debtForm.debt_type}
                      onChange={(e) => setDebtForm({ ...debtForm, debt_type: e.target.value as any })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-right"
                    >
                      <option value="owed_to_me">أموال عليك</option>
                      <option value="owed_by_me">أموال عليهم</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">المبلغ</label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      value={debtForm.original_amount}
                      onChange={(e) => setDebtForm({ ...debtForm, original_amount: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">العملة</label>
                    <select
                      value={debtForm.currency}
                      onChange={(e) => setDebtForm({ ...debtForm, currency: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-right"
                    >
                      <option value="EGP">جنيه مصري</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">تاريخ الاستحقاق</label>
                    <input
                      type="date"
                      value={debtForm.due_date}
                      onChange={(e) => setDebtForm({ ...debtForm, due_date: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">الوصف</label>
                    <textarea
                      required
                      value={debtForm.description}
                      onChange={(e) => setDebtForm({ ...debtForm, description: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-right"
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">الفئة</label>
                    <input
                      type="text"
                      value={debtForm.category}
                      onChange={(e) => setDebtForm({ ...debtForm, category: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">الأولوية</label>
                    <select
                      value={debtForm.priority}
                      onChange={(e) => setDebtForm({ ...debtForm, priority: e.target.value as any })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-right"
                    >
                      <option value="low">منخفضة</option>
                      <option value="normal">عادية</option>
                      <option value="high">عالية</option>
                      <option value="urgent">عاجلة</option>
                    </select>
                  </div>
                  <div className="flex space-x-3 space-x-reverse">
                    <button
                      type="submit"
                      className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                    >
                      {editingDebt ? 'تحديث' : 'إضافة'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowDebtModal(false)
                        setEditingDebt(null)
                        setDebtForm({ entity_id: '', debt_type: 'owed_to_me', original_amount: '', currency: 'EGP', due_date: '', description: '', category: 'general', priority: 'normal' })
                      }}
                      className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                    >
                      إلغاء
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
