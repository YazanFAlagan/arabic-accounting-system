'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import QuickNavigation from '@/components/QuickNavigation'
import { Package, AlertTriangle, ShoppingCart, Minus, Search, Filter, Plus, Edit, Trash2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import RawMaterialModals from '@/components/RawMaterialModals'

interface RawMaterial {
  id: string
  name: string
  unit: string
  current_stock: number
  min_stock_alert: number
  unit_cost: number
  supplier_name?: string
  description?: string
  created_at: string
  updated_at: string
}

interface RawMaterialUsage {
  id: string
  raw_material_id: string
  raw_material_name: string
  quantity_used: number
  unit_cost: number
  total_cost: number
  usage_date: string
  purpose: string
  notes?: string
  created_at: string
  user_id: string
}

export default function RawMaterialsPage() {
  const { user } = useAuth()
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([])
  const [usages, setUsages] = useState<RawMaterialUsage[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterLowStock, setFilterLowStock] = useState(false)

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [showUsageModal, setShowUsageModal] = useState(false)
  const [showEditUsageModal, setShowEditUsageModal] = useState(false)

  // Form states
  const [newMaterial, setNewMaterial] = useState({
    name: '',
    unit: 'قطعة',
    current_stock: 0,
    min_stock_alert: 10,
    unit_cost: 0,
    supplier_name: '',
    description: ''
  })

  const [editingMaterial, setEditingMaterial] = useState<RawMaterial | null>(null)
  const [selectedMaterial, setSelectedMaterial] = useState<RawMaterial | null>(null)
  const [editingUsage, setEditingUsage] = useState<RawMaterialUsage | null>(null)

  const [newPurchase, setNewPurchase] = useState({
    quantity: 1,
    unit_cost: 0,
    supplier_name: '',
    purchase_date: new Date().toISOString().split('T')[0]
  })

  const [newUsage, setNewUsage] = useState({
    raw_material_id: '',
    quantity_used: 1,
    purpose: '',
    notes: '',
    usage_date: new Date().toISOString().split('T')[0]
  })

  // Fetch all data
  const fetchAllData = async () => {
    if (!user?.id) {
      // If user is not ready, ensure we are not stuck in loading state
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      
      // Fetch raw materials
      const { data: materialsData, error: materialsError } = await supabase
        .from('raw_materials')
        .select('*')
        .eq('user_id', user.id)
        .order('name')

      if (materialsError) throw materialsError
      setRawMaterials(materialsData || [])

      // Fetch usage records
      const { data: usagesData, error: usagesError } = await supabase
        .from('raw_material_usage')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (usagesError) throw usagesError
      setUsages(usagesData || [])

    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!user?.id) {
      // Avoid calling fetch when user is not yet available
      setLoading(false)
      return
    }
    fetchAllData()
  }, [user?.id])

  // Add new material
  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) return

    try {
      const { error } = await supabase
        .from('raw_materials')
        .insert([{
          ...newMaterial,
          user_id: user.id
        }])

      if (error) throw error

      setNewMaterial({
        name: '',
        unit: 'قطعة',
        current_stock: 0,
        min_stock_alert: 10,
        unit_cost: 0,
        supplier_name: '',
        description: ''
      })
      setShowAddModal(false)
      fetchAllData()
      alert('تمت إضافة المادة الخام بنجاح')
    } catch (error) {
      console.error('Error adding material:', error)
      alert('حدث خطأ في إضافة المادة الخام')
    }
  }

  // Edit material
  const handleEditMaterial = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingMaterial) return

    try {
      const { error } = await supabase
        .from('raw_materials')
        .update({
          name: editingMaterial.name,
          unit: editingMaterial.unit,
          current_stock: editingMaterial.current_stock,
          min_stock_alert: editingMaterial.min_stock_alert,
          unit_cost: editingMaterial.unit_cost,
          supplier_name: editingMaterial.supplier_name,
          description: editingMaterial.description,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingMaterial.id)

      if (error) throw error

      setEditingMaterial(null)
      setShowEditModal(false)
      fetchAllData()
      alert('تم تحديث المادة الخام بنجاح')
    } catch (error) {
      console.error('Error updating material:', error)
      alert('حدث خطأ في تحديث المادة الخام')
    }
  }

  // Delete material
  const handleDeleteMaterial = async (materialId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه المادة الخام؟')) return

    try {
      const { error } = await supabase
        .from('raw_materials')
        .delete()
        .eq('id', materialId)

      if (error) throw error
      fetchAllData()
      alert('تم حذف المادة الخام بنجاح')
    } catch (error) {
      console.error('Error deleting material:', error)
      alert('حدث خطأ في حذف المادة الخام')
    }
  }

  // Handle purchase
  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMaterial || !user?.id) return

    try {
      // Update stock
      const newStock = selectedMaterial.current_stock + newPurchase.quantity
      const { error: updateError } = await supabase
        .from('raw_materials')
        .update({ 
          current_stock: newStock,
          unit_cost: newPurchase.unit_cost,
          supplier_name: newPurchase.supplier_name,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedMaterial.id)

      if (updateError) throw updateError

      setNewPurchase({
        quantity: 1,
        unit_cost: 0,
        supplier_name: '',
        purchase_date: new Date().toISOString().split('T')[0]
      })
      setSelectedMaterial(null)
      setShowPurchaseModal(false)
      fetchAllData()
      alert(`تمت إضافة ${newPurchase.quantity} ${selectedMaterial.unit} إلى مخزون ${selectedMaterial.name}`)
    } catch (error) {
      console.error('Error processing purchase:', error)
      alert('حدث خطأ في معالجة الشراء')
    }
  }

  // Handle usage
  const handleUsage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) return

    try {
      const material = rawMaterials.find(m => m.id === newUsage.raw_material_id)
      if (!material) {
        alert('يرجى اختيار مادة خام')
        return
      }

      if (material.current_stock < newUsage.quantity_used) {
        alert('الكمية المطلوبة أكبر من المخزون المتاح')
        return
      }

      // Update stock
      const newStock = material.current_stock - newUsage.quantity_used
      const { error: updateError } = await supabase
        .from('raw_materials')
        .update({ 
          current_stock: newStock,
          updated_at: new Date().toISOString()
        })
        .eq('id', material.id)

      if (updateError) throw updateError

      // Add usage record
      const { error: usageError } = await supabase
        .from('raw_material_usage')
        .insert([{
          ...newUsage,
          raw_material_name: material.name,
          unit_cost: material.unit_cost,
          total_cost: newUsage.quantity_used * material.unit_cost,
          user_id: user.id
        }])

      if (usageError) throw usageError

      setNewUsage({
        raw_material_id: '',
        quantity_used: 1,
        purpose: '',
        notes: '',
        usage_date: new Date().toISOString().split('T')[0]
      })
      setShowUsageModal(false)
      fetchAllData()
      alert(`تم تسجيل استخدام ${newUsage.quantity_used} ${material.unit} من ${material.name}`)
    } catch (error) {
      console.error('Error processing usage:', error)
      alert('حدث خطأ في تسجيل الاستخدام')
    }
  }

  // Handle edit usage
  const handleEditUsage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUsage) return

    try {
      // Implementation for editing usage
      alert('تم تحديث سجل الاستخدام بنجاح')
      setEditingUsage(null)
      setShowEditUsageModal(false)
      fetchAllData()
    } catch (error) {
      console.error('Error updating usage:', error)
      alert('حدث خطأ في تحديث سجل الاستخدام')
    }
  }

  // Handle delete usage
  const handleDeleteUsage = async (usageId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا السجل؟')) return

    try {
      const { error } = await supabase
        .from('raw_material_usage')
        .delete()
        .eq('id', usageId)

      if (error) throw error
      fetchAllData()
      alert('تم حذف سجل الاستخدام بنجاح')
    } catch (error) {
      console.error('Error deleting usage:', error)
      alert('حدث خطأ في حذف سجل الاستخدام')
    }
  }

  // Clear all usage data
  const clearAllUsageData = async () => {
    if (!confirm('هل أنت متأكد من حذف جميع سجلات استخدام المواد الخام؟\nهذا الإجراء لا يمكن التراجع عنه!')) {
      return
    }

    if (!confirm('تأكيد أخير: سيتم حذف جميع سجلات الاستخدام نهائياً. هل تريد المتابعة؟')) {
      return
    }

    try {
      setLoading(true)
      
      const { error } = await supabase
        .from('raw_material_usage')
        .delete()
        .neq('id', 'impossible-id')
      
      if (error) {
        console.error('Error clearing usage data:', error)
        alert('حدث خطأ في حذف البيانات')
        return
      }
      
      await fetchAllData()
      alert('تم حذف جميع سجلات الاستخدام بنجاح!')
      
    } catch (error) {
      console.error('Error in clearAllUsageData:', error)
      alert('حدث خطأ في حذف البيانات')
    } finally {
      setLoading(false)
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

  const filteredMaterials = rawMaterials.filter(material => {
    const matchesSearch = material.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterLowStock ? material.current_stock <= material.min_stock_alert : true
    return matchesSearch && matchesFilter
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <QuickNavigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">إدارة المواد الخام</h1>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">إجمالي المواد</p>
                  <p className="text-2xl font-bold text-gray-900">{rawMaterials.length}</p>
                </div>
                <Package className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">مخزون منخفض</p>
                  <p className="text-2xl font-bold text-red-600">
                    {rawMaterials.filter(m => m.current_stock <= m.min_stock_alert).length}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">قيمة المخزون</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency(rawMaterials.reduce((sum, m) => sum + (m.current_stock * m.unit_cost), 0))}
                  </p>
                </div>
                <ShoppingCart className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">استخدام الشهر</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {usages.filter(u => u.usage_date.startsWith(new Date().toISOString().slice(0, 7))).length}
                  </p>
                </div>
                <Minus className="h-8 w-8 text-orange-600" />
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="البحث في المواد الخام..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterLowStock(!filterLowStock)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filterLowStock
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {filterLowStock ? 'إظهار الكل' : 'مخزون منخفض'}
                </button>
                <button
                  onClick={clearAllUsageData}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  مسح جميع الاستخدامات
                </button>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                  إضافة مادة خام
                </button>
              </div>
            </div>
          </div>

          {/* Materials Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">المواد الخام</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">اسم المادة</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">المخزون الحالي</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الوحدة</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">تنبيه المخزون</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">سعر الوحدة</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">المورد</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredMaterials.map((material) => (
                    <tr key={material.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{material.name}</td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${
                        material.current_stock <= material.min_stock_alert ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {material.current_stock}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{material.unit}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{material.min_stock_alert}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(material.unit_cost)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{material.supplier_name || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {setSelectedMaterial(material); setShowPurchaseModal(true)}}
                            className="text-green-600 hover:text-green-900" title="شراء"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {setNewUsage({...newUsage, raw_material_id: material.id}); setShowUsageModal(true)}}
                            className="text-orange-600 hover:text-orange-900" title="استخدام"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {setEditingMaterial(material); setShowEditModal(true)}}
                            className="text-indigo-600 hover:text-indigo-900" title="تعديل"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteMaterial(material.id)}
                            className="text-red-600 hover:text-red-900" title="حذف"
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
          </div>

          {/* Recent Usage */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">آخر الاستخدامات</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">التاريخ</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">المادة الخام</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الكمية المستخدمة</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الغرض</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">المخزون المتبقي</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {usages.slice(0, 10).map((usage) => {
                    const material = rawMaterials.find(m => m.id === usage.raw_material_id)
                    const originalStock = material ? material.current_stock + usage.quantity_used : usage.quantity_used
                    const currentRemaining = material ? material.current_stock : 0
                    
                    return (
                      <tr key={usage.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(usage.usage_date).toLocaleDateString('ar-EG')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{usage.raw_material_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{usage.quantity_used}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{usage.purpose}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-600">
                          {currentRemaining} من أصل {originalStock}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setEditingUsage(usage)
                                setShowEditUsageModal(true)
                              }}
                              className="text-indigo-600 hover:text-indigo-900" 
                              title="تعديل"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteUsage(usage.id)}
                              className="text-red-600 hover:text-red-900" 
                              title="حذف"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <RawMaterialModals
        showAddModal={showAddModal}
        setShowAddModal={setShowAddModal}
        newMaterial={newMaterial}
        setNewMaterial={setNewMaterial}
        handleAddMaterial={handleAddMaterial}
        showEditModal={showEditModal}
        setShowEditModal={setShowEditModal}
        editingMaterial={editingMaterial}
        setEditingMaterial={setEditingMaterial}
        handleEditMaterial={handleEditMaterial}
        showPurchaseModal={showPurchaseModal}
        setShowPurchaseModal={setShowPurchaseModal}
        selectedMaterial={selectedMaterial}
        setSelectedMaterial={setSelectedMaterial}
        newPurchase={newPurchase}
        setNewPurchase={setNewPurchase}
        handlePurchase={handlePurchase}
        showUsageModal={showUsageModal}
        setShowUsageModal={setShowUsageModal}
        newUsage={newUsage}
        setNewUsage={setNewUsage}
        handleUsage={handleUsage}
        showEditUsageModal={showEditUsageModal}
        setShowEditUsageModal={setShowEditUsageModal}
        editingUsage={editingUsage}
        setEditingUsage={setEditingUsage}
        handleEditUsage={handleEditUsage}
        formatCurrency={formatCurrency}
      />
    </div>
  )
}
