import { Save, X, ShoppingCart, Minus } from 'lucide-react'

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

interface ModalsProps {
  // Add Material Modal
  showAddModal: boolean
  setShowAddModal: (show: boolean) => void
  newMaterial: any
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
  newPurchase: any
  setNewPurchase: (purchase: any) => void
  handlePurchase: (e: React.FormEvent) => void
  
  // Usage Modal
  showUsageModal: boolean
  setShowUsageModal: (show: boolean) => void
  newUsage: any
  setNewUsage: (usage: any) => void
  handleUsage: (e: React.FormEvent) => void
  
  // Edit Usage Modal
  showEditUsageModal: boolean
  setShowEditUsageModal: (show: boolean) => void
  editingUsage: any
  setEditingUsage: (usage: any) => void
  handleEditUsage: (e: React.FormEvent) => void
  
  formatCurrency: (amount: number) => string
}

export default function RawMaterialModals({
  showAddModal, setShowAddModal, newMaterial, setNewMaterial, handleAddMaterial,
  showEditModal, setShowEditModal, editingMaterial, setEditingMaterial, handleEditMaterial,
  showPurchaseModal, setShowPurchaseModal, selectedMaterial, setSelectedMaterial, newPurchase, setNewPurchase, handlePurchase,
  showUsageModal, setShowUsageModal, newUsage, setNewUsage, handleUsage,
  showEditUsageModal, setShowEditUsageModal, editingUsage, setEditingUsage, handleEditUsage,
  formatCurrency
}: ModalsProps) {
  return (
    <>
      {/* Add Material Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">إضافة مادة خام جديدة</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleAddMaterial} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم المادة</label>
                <input
                  type="text"
                  required
                  value={newMaterial.name}
                  onChange={(e) => setNewMaterial({...newMaterial, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الوحدة</label>
                  <input
                    type="text"
                    required
                    value={newMaterial.unit}
                    onChange={(e) => setNewMaterial({...newMaterial, unit: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">المخزون الحالي</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newMaterial.current_stock}
                    onChange={(e) => setNewMaterial({...newMaterial, current_stock: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الحد الأدنى</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newMaterial.min_stock_alert}
                    onChange={(e) => setNewMaterial({...newMaterial, min_stock_alert: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">سعر الوحدة</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newMaterial.unit_cost}
                    onChange={(e) => setNewMaterial({...newMaterial, unit_cost: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم المورد</label>
                <input
                  type="text"
                  value={newMaterial.supplier_name}
                  onChange={(e) => setNewMaterial({...newMaterial, supplier_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الوصف</label>
                <textarea
                  value={newMaterial.description}
                  onChange={(e) => setNewMaterial({...newMaterial, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors flex items-center justify-center"
                >
                  <Save className="h-4 w-4 ml-2" />
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">تعديل المادة الخام</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleEditMaterial} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم المادة</label>
                <input
                  type="text"
                  required
                  value={editingMaterial.name}
                  onChange={(e) => setEditingMaterial({...editingMaterial, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الوحدة</label>
                  <input
                    type="text"
                    required
                    value={editingMaterial.unit}
                    onChange={(e) => setEditingMaterial({...editingMaterial, unit: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الحد الأدنى</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editingMaterial.min_stock_alert}
                    onChange={(e) => setEditingMaterial({...editingMaterial, min_stock_alert: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">سعر الوحدة</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editingMaterial.unit_cost}
                  onChange={(e) => setEditingMaterial({...editingMaterial, unit_cost: parseFloat(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم المورد</label>
                <input
                  type="text"
                  value={editingMaterial.supplier_name || ''}
                  onChange={(e) => setEditingMaterial({...editingMaterial, supplier_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الوصف</label>
                <textarea
                  value={editingMaterial.description || ''}
                  onChange={(e) => setEditingMaterial({...editingMaterial, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors flex items-center justify-center"
                >
                  <Save className="h-4 w-4 ml-2" />
                  حفظ التغييرات
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">شراء {selectedMaterial.name}</h3>
              <button onClick={() => setShowPurchaseModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handlePurchase} className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">المخزون الحالي: <span className="font-semibold">{selectedMaterial.current_stock} {selectedMaterial.unit}</span></p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الكمية</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={newPurchase.quantity}
                    onChange={(e) => setNewPurchase({...newPurchase, quantity: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">سعر الوحدة</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={newPurchase.unit_cost}
                    onChange={(e) => setNewPurchase({...newPurchase, unit_cost: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم المورد</label>
                <input
                  type="text"
                  required
                  value={newPurchase.supplier_name}
                  onChange={(e) => setNewPurchase({...newPurchase, supplier_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الشراء</label>
                <input
                  type="date"
                  required
                  value={newPurchase.purchase_date}
                  onChange={(e) => setNewPurchase({...newPurchase, purchase_date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">مصدر التمويل</label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center p-3 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="funding_source"
                      value="project"
                      checked={newPurchase.funding_source === 'project'}
                      onChange={(e) => setNewPurchase({...newPurchase, funding_source: e.target.value})}
                      className="ml-2"
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-900">أموال المشروع</div>
                      <div className="text-xs text-gray-500">سيتم الخصم من النقدية</div>
                    </div>
                  </label>
                  <label className="flex items-center p-3 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="funding_source"
                      value="personal"
                      checked={newPurchase.funding_source === 'personal'}
                      onChange={(e) => setNewPurchase({...newPurchase, funding_source: e.target.value})}
                      className="ml-2"
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-900">أموال شخصية</div>
                      <div className="text-xs text-gray-500">لن يتم خصم من النقدية</div>
                    </div>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                <textarea
                  value={newPurchase.notes}
                  onChange={(e) => setNewPurchase({...newPurchase, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={2}
                />
              </div>
              {newPurchase.quantity > 0 && newPurchase.unit_cost > 0 && (
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-sm text-green-700">
                    الإجمالي: <span className="font-semibold">{formatCurrency(newPurchase.quantity * newPurchase.unit_cost)}</span>
                  </p>
                  <p className="text-sm text-green-700">
                    المخزون الجديد: <span className="font-semibold">{selectedMaterial.current_stock + newPurchase.quantity} {selectedMaterial.unit}</span>
                  </p>
                </div>
              )}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors flex items-center justify-center"
                >
                  <ShoppingCart className="h-4 w-4 ml-2" />
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
      {showUsageModal && selectedMaterial && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">استخدام {selectedMaterial.name}</h3>
              <button onClick={() => setShowUsageModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleUsage} className="space-y-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-700">المخزون المتاح: <span className="font-semibold">{selectedMaterial.current_stock} {selectedMaterial.unit}</span></p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الكمية المستخدمة</label>
                <input
                  type="number"
                  min="0.01"
                  max={selectedMaterial.current_stock}
                  step="0.01"
                  required
                  value={newUsage.quantity_used}
                  onChange={(e) => setNewUsage({...newUsage, quantity_used: parseFloat(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الغرض من الاستخدام</label>
                <input
                  type="text"
                  required
                  value={newUsage.purpose}
                  onChange={(e) => setNewUsage({...newUsage, purpose: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="مثال: إنتاج منتج معين، صيانة، إلخ"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الاستخدام</label>
                <input
                  type="date"
                  required
                  value={newUsage.usage_date}
                  onChange={(e) => setNewUsage({...newUsage, usage_date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                <textarea
                  value={newUsage.notes}
                  onChange={(e) => setNewUsage({...newUsage, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={2}
                />
              </div>
              {newUsage.quantity_used > 0 && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-700">
                    المخزون المتبقي: <span className="font-semibold text-lg">{selectedMaterial.current_stock - newUsage.quantity_used} {selectedMaterial.unit}</span>
                  </p>
                </div>
              )}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-orange-600 text-white py-2 px-4 rounded-md hover:bg-orange-700 transition-colors flex items-center justify-center"
                >
                  <Minus className="h-4 w-4 ml-2" />
                  تأكيد الاستخدام
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">تعديل استخدام {editingUsage.raw_material_name}</h3>
              <button onClick={() => setShowEditUsageModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleEditUsage} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الكمية المستخدمة</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={editingUsage.quantity_used}
                  onChange={(e) => setEditingUsage({...editingUsage, quantity_used: parseFloat(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الغرض من الاستخدام</label>
                <input
                  type="text"
                  value={editingUsage.purpose}
                  onChange={(e) => setEditingUsage({...editingUsage, purpose: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الاستخدام</label>
                <input
                  type="date"
                  value={editingUsage.usage_date}
                  onChange={(e) => setEditingUsage({...editingUsage, usage_date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                <textarea
                  value={editingUsage.notes || ''}
                  onChange={(e) => setEditingUsage({...editingUsage, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={2}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors flex items-center justify-center"
                >
                  <Save className="h-4 w-4 ml-2" />
                  حفظ التعديل
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
