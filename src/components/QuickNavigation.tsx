'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  TrendingUp, 
  Star, 
  FileText,
  ChevronLeft,
  ChevronRight,
  CreditCard
} from 'lucide-react'

const quickNavItems = [
  { name: 'لوحة التحكم', href: '/dashboard', icon: LayoutDashboard },
  { name: 'الفواتير', href: '/invoices', icon: FileText },
  { name: 'المشتريات', href: '/purchases', icon: Package },
  { name: 'المخزون', href: '/inventory', icon: Package },
  { name: 'المواد الخام', href: '/raw-materials', icon: Package },
  { name: 'الأرباح والخسائر', href: '/profit-loss', icon: TrendingUp },
  { name: 'الأكثر مبيعاً', href: '/best-sellers', icon: Star },
  { name: 'التقارير', href: '/reports', icon: FileText },
]

export default function QuickNavigation() {
  const pathname = usePathname()
  
  // Find current page index
  const currentIndex = quickNavItems.findIndex(item => item.href === pathname)
  const prevPage = currentIndex > 0 ? quickNavItems[currentIndex - 1] : null
  const nextPage = currentIndex < quickNavItems.length - 1 ? quickNavItems[currentIndex + 1] : null

  return (
    <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-40" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Quick Navigation Pills */}
          <div className="flex items-center space-x-reverse space-x-2 overflow-x-auto scrollbar-hide">
            {quickNavItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                      : 'bg-gray-100/80 text-gray-700 hover:bg-gray-200/80 hover:text-gray-900'
                  } flex items-center px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 transform hover:scale-105 whitespace-nowrap`}
                >
                  <item.icon className="h-4 w-4 ml-2" />
                  {item.name}
                </Link>
              )
            })}
          </div>

          {/* Previous/Next Navigation */}
          <div className="flex items-center space-x-reverse space-x-2">
            {prevPage && (
              <Link
                href={prevPage.href}
                className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100/80 rounded-lg transition-all duration-200"
                title={`السابق: ${prevPage.name}`}
              >
                <ChevronRight className="h-4 w-4 ml-1" />
                <span className="hidden sm:inline">{prevPage.name}</span>
              </Link>
            )}
            
            {nextPage && (
              <Link
                href={nextPage.href}
                className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100/80 rounded-lg transition-all duration-200"
                title={`التالي: ${nextPage.name}`}
              >
                <span className="hidden sm:inline">{nextPage.name}</span>
                <ChevronLeft className="h-4 w-4 mr-1" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
