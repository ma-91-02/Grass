"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  UserCircle,
  Warehouse,
  DollarSign,
  Settings,
  LogOut,
  FileText,
  BarChart3,
  Truck,
  ChevronDown,
} from "lucide-react"
import { useState } from "react"

const menuItems = [
  {
    title: "الرئيسية",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "المبيعات",
    href: "/dashboard/sales",
    icon: ShoppingCart,
  },
  {
    title: "المشتريات",
    href: "/dashboard/purchases",
    icon: Package,
  },
  {
    title: "الحسابات",
    href: "/dashboard/accounts",
    icon: DollarSign,
  },
  {
    title: "التقارير",
    href: "/dashboard/reports",
    icon: BarChart3,
  },
  {
    title: "النقل المخزني",
    href: "/dashboard/warehouse-transfers",
    icon: Truck,
  },
  {
    title: "العملاء",
    href: "/dashboard/customers",
    icon: Users,
  },
  {
    title: "المواد",
    href: "/dashboard/products",
    icon: Package,
  },
  {
    title: "التصنيفات",
    href: "/dashboard/categories",
    icon: FileText,
  },
  {
    title: "المخازن",
    href: "/dashboard/warehouses",
    icon: Warehouse,
  },
  {
    title: "المستخدمين",
    href: "/dashboard/users",
    icon: UserCircle,
  },
  {
    title: "الأدوار",
    href: "/dashboard/roles",
    icon: Settings,
  },
  {
    title: "سعر الصرف",
    href: "/dashboard/exchange-rates",
    icon: DollarSign,
  },
  {
    title: "سجل النشاطات",
    href: "/dashboard/audit-logs",
    icon: FileText,
  },
  {
    title: "الإعدادات",
    href: "/dashboard/settings",
    icon: Settings,
  },
]

export function Sidebar({ userName, userRole }: { userName: string; userRole: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)

  async function handleLogout() {
    // Clear the auth cookie by redirecting to a logout API
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/auth/login")
  }

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-l border-border bg-white transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-16 items-center justify-between border-b border-border px-4">
        {!collapsed && (
          <Link href="/dashboard" className="text-xl font-bold text-primary">
            GRASS ERP
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-lg p-1.5 text-gray-500 hover:bg-muted"
        >
          <ChevronDown className={cn("h-5 w-5 transition-transform", collapsed ? "rotate-180" : "-rotate-90")} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors mb-0.5",
                isActive
                  ? "bg-primary text-white"
                  : "text-gray-600 hover:bg-muted hover:text-dark",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? item.title : undefined}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{item.title}</span>}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-border p-4">
        {!collapsed && (
          <div className="mb-3 text-sm">
            <p className="font-medium text-dark">{userName}</p>
            <p className="text-xs text-gray-500">{userRole}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50",
            collapsed && "justify-center"
          )}
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && <span>تسجيل الخروج</span>}
        </button>
      </div>
    </aside>
  )
}
