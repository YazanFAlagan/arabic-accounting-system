'use client'

import React from 'react'

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

interface RawMaterialModalsProps {
  // Add Material Modal
  showAddModal: boolean
  setShowAddModal: (show: boolean) => void
  newMaterial: {
    name: string
    unit: string
    current_stock: number
    min_stock_alert: number
    unit_cost: number
    supplier_name: string
    description: string
  }
  setNewMaterial: (material: any) => void
  handleAddMaterial: (e: React.FormEvent) => void

  // Edit Material Modal
  showEditModal: boolean
  setShowEditModal: (show: boolean) => void
  editingMaterial: RawMaterial | null
  setEditingMaterial: (material: RawMaterial | null) => void
  handleEditMaterial: (e: React.FormEvent) => void

  // Purchase Modal
  showPurchaseModal: boolean
  setShowPurchaseModal: (show: boolean) => void
  selectedMaterial: RawMaterial | null
  setSelectedMaterial: (material: RawMaterial | null) => void
  newPurchase: {
    quantity: number
    unit_cost: number
    supplier_name: string
    purchase_date: string
  }
  setNewPurchase: (purchase: any) => void
  handlePurchase: (e: React.FormEvent) => void

  // Usage Modal
  showUsageModal: boolean
  setShowUsageModal: (show: boolean) => void
  newUsage: {
    raw_material_id: string
    quantity_used: number
    purpose: string
    notes: string
    usage_date: string
  }
  setNewUsage: (usage: any) => void
  handleUsage: (e: React.FormEvent) => void

  // Edit Usage Modal
  showEditUsageModal: boolean
  setShowEditUsageModal: (show: boolean) => void
  editingUsage: RawMaterialUsage | null
  setEditingUsage: (usage: RawMaterialUsage | null) => void
  handleEditUsage: (e: React.FormEvent) => void

  // Utility
  formatCurrency: (amount: number) => string
}

export default function RawMaterialModals({
  showAddModal,
  setShowAddModal,
  newMaterial,
  setNewMaterial,
  handleAddMaterial,
  showEditModal,
  setShowEditModal,
  editingMaterial,
  setEditingMaterial,
  handleEditMaterial,
  showPurchaseModal,
  setShowPurchaseModal,
  selectedMaterial,
  setSelectedMaterial,
  newPurchase,
  setNewPurchase,
  handlePurchase,
  showUsageModal,
  setShowUsageModal,
  newUsage,
  setNewUsage,
  handleUsage,
  showEditUsageModal,
  setShowEditUsageModal,
  editingUsage,
  setEditingUsage,
  handleEditUsage,
  formatCurrency
}: RawMaterialModalsProps) {
  return (
    <>
      {/* Add Material Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">إضافة مادة خام جديدة</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleAddMaterial} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  اسم المادة الخام
                </label>
                <input
                  type="text"
                  value={newMaterial.name}
                  onChange={(e) => setNewMaterial({...newMaterial, name: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    الوحدة
                  </label>
                  <select
                    value={newMaterial.unit}
                    onChange={(e) => setNewMaterial({...newMaterial, unit: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="قطعة">قطعة</option>
                    <option value="كيلو">كيلو</option>
                    <option value="لتر">لتر</option>
                    <option value="متر">متر</option>
                    <option value="علبة">علبة</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    المخزون الحالي
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newMaterial.current_stock}
                    onChange={(e) => setNewMaterial({...newMaterial, current_stock: parseInt(e.target.value) || 0})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    تنبيه المخزون المنخفض
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newMaterial.min_stock_alert}
                    onChange={(e) => setNewMaterial({...newMaterial, min_stock_alert: parseInt(e.target.value) || 10})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    value={newMaterial.unit_cost}
                    onChange={(e) => setNewMaterial({...newMaterial, unit_cost: parseFloat(e.target.value) || 0})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  اسم المورد
                </label>
                <input
                  type="text"
                  value={newMaterial.supplier_name}
                  onChange={(e) => setNewMaterial({...newMaterial, supplier_name: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  الوصف
                </label>
                <textarea
                  value={newMaterial.description}
                  onChange={(e) => setNewMaterial({...newMaterial, description: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                >
                  حفظ
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Material Modal */}
      {showEditModal && editingMaterial && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">تعديل المادة الخام</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleEditMaterial} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  اسم المادة الخام
                </label>
                <input
                  type="text"
                  value={editingMaterial.name}
                  onChange={(e) => setEditingMaterial({...editingMaterial, name: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    الوحدة
                  </label>
                  <select
                    value={editingMaterial.unit}
                    onChange={(e) => setEditingMaterial({...editingMaterial, unit: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="قطعة">قطعة</option>
                    <option value="كيلو">كيلو</option>
                    <option value="لتر">لتر</option>
                    <option value="متر">متر</option>
                    <option value="علبة">علبة</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    المخزون الحالي
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingMaterial.current_stock}
                    onChange={(e) => setEditingMaterial({...editingMaterial, current_stock: parseInt(e.target.value) || 0})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    تنبيه المخزون المنخفض
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editingMaterial.min_stock_alert}
                    onChange={(e) => setEditingMaterial({...editingMaterial, min_stock_alert: parseInt(e.target.value) || 10})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    value={editingMaterial.unit_cost}
                    onChange={(e) => setEditingMaterial({...editingMaterial, unit_cost: parseFloat(e.target.value) || 0})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  اسم المورد
                </label>
                <input
                  type="text"
                  value={editingMaterial.supplier_name || ''}
                  onChange={(e) => setEditingMaterial({...editingMaterial, supplier_name: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  الوصف
                </label>
                <textarea
                  value={editingMaterial.description || ''}
                  onChange={(e) => setEditingMaterial({...editingMaterial, description: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                >
                  حفظ التعديلات
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Purchase Modal */}
      {showPurchaseModal && selectedMaterial && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">شراء {selectedMaterial.name}</h2>
              <button
                onClick={() => setShowPurchaseModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handlePurchase} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  الكمية ({selectedMaterial.unit})
                </label>
                <input
                  type="number"
                  min="1"
                  value={newPurchase.quantity}
                  onChange={(e) => setNewPurchase({...newPurchase, quantity: parseInt(e.target.value) || 1})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  value={newPurchase.unit_cost}
                  onChange={(e) => setNewPurchase({...newPurchase, unit_cost: parseFloat(e.target.value) || 0})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  اسم المورد
                </label>
                <input
                  type="text"
                  value={newPurchase.supplier_name}
                  onChange={(e) => setNewPurchase({...newPurchase, supplier_name: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  تاريخ الشراء
                </label>
                <input
                  type="date"
                  value={newPurchase.purchase_date}
                  onChange={(e) => setNewPurchase({...newPurchase, purchase_date: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-sm text-gray-600">
                  المخزون الحالي: {selectedMaterial.current_stock} {selectedMaterial.unit}
                </p>
                <p className="text-sm text-gray-600">
                  المخزون بعد الشراء: {selectedMaterial.current_stock + newPurchase.quantity} {selectedMaterial.unit}
                </p>
                <p className="text-sm font-semibold text-gray-900">
                  إجمالي التكلفة: {formatCurrency(newPurchase.quantity * newPurchase.unit_cost)}
                </p>
              </div>
              
              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
                >
                  تأكيد الشراء
                </button>
                <button
                  type="button"
                  onClick={() => setShowPurchaseModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Usage Modal */}
      {showUsageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">تسجيل استخدام مادة خام</h2>
              <button
                onClick={() => setShowUsageModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleUsage} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  الكمية المستخدمة
                </label>
                <input
                  type="number"
                  min="1"
                  value={newUsage.quantity_used}
                  onChange={(e) => setNewUsage({...newUsage, quantity_used: parseInt(e.target.value) || 1})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  الغرض من الاستخدام
                </label>
                <input
                  type="text"
                  value={newUsage.purpose}
                  onChange={(e) => setNewUsage({...newUsage, purpose: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="مثال: إنتاج عطر الورد"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  تاريخ الاستخدام
                </label>
                <input
                  type="date"
                  value={newUsage.usage_date}
                  onChange={(e) => setNewUsage({...newUsage, usage_date: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ملاحظات
                </label>
                <textarea
                  value={newUsage.notes}
                  onChange={(e) => setNewUsage({...newUsage, notes: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="ملاحظات إضافية (اختياري)"
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-orange-600 text-white py-2 px-4 rounded-md hover:bg-orange-700 transition-colors"
                >
                  تسجيل الاستخدام
                </button>
                <button
                  type="button"
                  onClick={() => setShowUsageModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Usage Modal */}
      {showEditUsageModal && editingUsage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">تعديل سجل الاستخدام</h2>
              <button
                onClick={() => setShowEditUsageModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleEditUsage} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  الكمية المستخدمة
                </label>
                <input
                  type="number"
                  min="1"
                  value={editingUsage.quantity_used}
                  onChange={(e) => setEditingUsage({...editingUsage, quantity_used: parseInt(e.target.value) || 1})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  الغرض من الاستخدام
                </label>
                <input
                  type="text"
                  value={editingUsage.purpose}
                  onChange={(e) => setEditingUsage({...editingUsage, purpose: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  تاريخ الاستخدام
                </label>
                <input
                  type="date"
                  value={editingUsage.usage_date}
                  onChange={(e) => setEditingUsage({...editingUsage, usage_date: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ملاحظات
                </label>
                <textarea
                  value={editingUsage.notes || ''}
                  onChange={(e) => setEditingUsage({...editingUsage, notes: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                >
                  حفظ التعديلات
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditUsageModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
