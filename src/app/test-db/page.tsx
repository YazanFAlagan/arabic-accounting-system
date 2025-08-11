'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export default function TestDBPage() {
  const { user } = useAuth()
  const [results, setResults] = useState<any[]>([])
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const testConnection = async () => {
    setLoading(true)
    setError('')
    setResults([])

    try {
      // Test 1: Check if user is authenticated
      console.log('User:', user)
      
      // Test 2: Try to fetch from raw_materials table
      const { data: materials, error: materialsError } = await supabase
        .from('raw_materials')
        .select('*')
        .limit(1)

      if (materialsError) {
        console.error('Materials error:', materialsError)
        setError(`خطأ في جدول raw_materials: ${materialsError.message}`)
        return
      }

      // Test 3: Try to insert a test record
      const testMaterial = {
        name: 'اختبار',
        unit: 'قطعة',
        current_stock: 10,
        min_stock_alert: 5,
        unit_cost: 1.0,
        user_id: user?.id
      }

      const { data: insertData, error: insertError } = await supabase
        .from('raw_materials')
        .insert([testMaterial])
        .select()

      if (insertError) {
        console.error('Insert error:', insertError)
        setError(`خطأ في الإدراج: ${insertError.message}`)
        return
      }

      // Test 4: Delete the test record
      if (insertData && insertData.length > 0) {
        await supabase
          .from('raw_materials')
          .delete()
          .eq('id', insertData[0].id)
      }

      setResults([
        { test: 'المصادقة', status: user ? 'نجح' : 'فشل', details: user?.email || 'غير مسجل' },
        { test: 'قراءة الجدول', status: 'نجح', details: `عدد السجلات: ${materials?.length || 0}` },
        { test: 'الإدراج', status: 'نجح', details: 'تم إدراج وحذف السجل التجريبي بنجاح' }
      ])

    } catch (err: any) {
      console.error('Test error:', err)
      setError(`خطأ عام: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const checkTables = async () => {
    setLoading(true)
    setError('')
    setResults([])

    try {
      // Check if tables exist by trying to query them
      const tables = ['raw_materials', 'raw_material_purchases', 'raw_material_usage']
      const tableResults = []

      for (const table of tables) {
        try {
          const { data, error } = await supabase.from(table).select('id').limit(1)
          if (error) {
            tableResults.push({ table, status: 'غير موجود', error: error.message })
          } else {
            tableResults.push({ table, status: 'موجود', count: data?.length || 0 })
          }
        } catch (err: any) {
          tableResults.push({ table, status: 'خطأ', error: err.message })
        }
      }

      setResults(tableResults)
    } catch (err: any) {
      setError(`خطأ في فحص الجداول: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">اختبار قاعدة البيانات</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">معلومات المستخدم</h2>
          <div className="bg-gray-50 p-4 rounded">
            <p><strong>مسجل الدخول:</strong> {user ? 'نعم' : 'لا'}</p>
            <p><strong>البريد الإلكتروني:</strong> {user?.email || 'غير متاح'}</p>
            <p><strong>معرف المستخدم:</strong> {user?.id || 'غير متاح'}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">اختبارات قاعدة البيانات</h2>
          
          <div className="flex gap-4 mb-6">
            <button
              onClick={checkTables}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'جاري الفحص...' : 'فحص الجداول'}
            </button>
            
            <button
              onClick={testConnection}
              disabled={loading || !user}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'جاري الاختبار...' : 'اختبار الإدراج'}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              <strong>خطأ:</strong> {error}
            </div>
          )}

          {results.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">العنصر</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">التفاصيل</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {results.map((result, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {result.test || result.table}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          result.status === 'نجح' || result.status === 'موجود' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {result.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {result.details || result.error || result.count || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
          <strong>ملاحظة:</strong> هذه الصفحة لاختبار اتصال قاعدة البيانات فقط. احذفها بعد حل المشكلة.
        </div>
      </div>
    </div>
  )
}
