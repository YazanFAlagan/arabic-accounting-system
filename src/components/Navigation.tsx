'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  TrendingUp, 
  DollarSign, 
  BarChart3, 
  LogOut, 
  Menu, 
  X,
  FileText,
  CreditCard
} from 'lucide-react'

const navigationItems = [
  { name: 'لوحة التحكم', href: '/dashboard', icon: LayoutDashboard },
  { name: 'المبيعات', href: '/sales', icon: ShoppingCart },
  { name: 'المشتريات والمصروفات', href: '/purchases', icon: DollarSign },
  { name: 'المخزون', href: '/inventory', icon: Package },
  { name: 'الأرباح والخسائر', href: '/profit-loss', icon: TrendingUp },
  { name: 'الأكثر مبيعاً', href: '/best-sellers', icon: BarChart3 },
  { name: 'إدارة الديون', href: '/debts', icon: CreditCard },
  { name: 'التقارير', href: '/reports', icon: FileText },
]

export default function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { user, signOut } = useAuth()
  const pathname = usePathname()

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:w-72 lg:flex-col lg:fixed lg:inset-y-0 lg:bg-white/80 lg:backdrop-blur-sm lg:border-l lg:border-gray-200/50 lg:shadow-xl" dir="rtl">
        <div className="flex flex-col flex-grow pt-6 pb-4 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-6">
            <div className="flex items-center">
              <div className="h-12 w-12 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center ml-4 shadow-lg">
                <LayoutDashboard className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">نظام المحاسبة</h1>
                <p className="text-sm text-gray-500">والمخزون</p>
              </div>
            </div>
          </div>
          
          <div className="mt-8 flex-grow flex flex-col">
            <nav className="flex-1 px-4 space-y-2">
              {navigationItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`${
                      isActive
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                        : 'text-gray-700 hover:bg-gray-100/80 hover:text-gray-900'
                    } group flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 transform hover:scale-[1.02]`}
                  >
                    <item.icon
                      className={`${
                        isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'
                      } ml-3 flex-shrink-0 h-5 w-5`}
                    />
                    {item.name}
                  </Link>
                )
              })}
            </nav>
          </div>

          <div className="flex-shrink-0 flex border-t border-gray-200/50 p-6">
            <div className="flex items-center w-full bg-gray-50/50 rounded-xl p-3">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                  <span className="text-sm font-bold text-white">
                    {user?.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="mr-3 flex-1">
                <p className="text-sm font-semibold text-gray-800 truncate">
                  {user?.email}
                </p>
                <p className="text-xs text-gray-500">مستخدم النظام</p>
              </div>
              <button
                onClick={handleSignOut}
                className="flex-shrink-0 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200"
                title="تسجيل الخروج"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between bg-white/90 backdrop-blur-sm border-b border-gray-200/50 px-6 py-4 shadow-sm" dir="rtl">
          <div className="flex items-center">
            <div className="h-10 w-10 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center ml-3 shadow-md">
              <LayoutDashboard className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-800">نظام المحاسبة</h1>
              <p className="text-xs text-gray-500">والمخزون</p>
            </div>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100/80 transition-all duration-200"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="bg-white border-b border-gray-200" dir="rtl">
            <nav className="px-2 py-3 space-y-1">
              {navigationItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    } group flex items-center px-2 py-2 text-base font-medium rounded-md`}
                  >
                    <item.icon
                      className={`${
                        isActive ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-500'
                      } ml-3 flex-shrink-0 h-5 w-5`}
                    />
                    {item.name}
                  </Link>
                )
              })}
              <button
                onClick={handleSignOut}
                className="w-full text-right group flex items-center px-2 py-2 text-base font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md"
              >
                <LogOut className="ml-3 flex-shrink-0 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
                تسجيل الخروج
              </button>
            </nav>
          </div>
        )}
      </div>
    </>
  )
}
