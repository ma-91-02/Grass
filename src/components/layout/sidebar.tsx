"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
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
  Receipt,
  RotateCcw,
  Boxes,
  Landmark,
  CalendarDays,
  ScrollText,
  Wallet,
  ChevronDown,
  Ruler,
  Building2,
  BarChart3,
  Search,
  ArrowLeftRight,
  Truck,
  UserCheck,
} from "lucide-react";
import { useState } from "react";

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
    title: "فواتير البيع",
    href: "/dashboard/sales-invoices",
    icon: Receipt,
  },
  {
    title: "التحصيلات",
    href: "/dashboard/collections",
    icon: DollarSign,
  },
  {
    title: "المدفوعات",
    href: "/dashboard/payments",
    icon: Wallet,
  },
  {
    title: "مرتجعات المبيعات",
    href: "/dashboard/sales-returns",
    icon: RotateCcw,
  },
  {
    title: "المشتريات",
    href: "/dashboard/purchases",
    icon: Truck,
  },
  {
    title: "الحسابات",
    href: "/dashboard/accounts",
    icon: Landmark,
  },
  {
    title: "القيود اليومية",
    href: "/dashboard/journal-entries",
    icon: ScrollText,
  },
  {
    title: "العملاء والموردون",
    href: "/dashboard/customers",
    icon: Users,
  },
  {
    title: "المواد",
    href: "/dashboard/products",
    icon: Package,
  },
  {
    title: "تصنيفات المواد",
    href: "/dashboard/categories",
    icon: Package,
  },
  {
    title: "وحدات القياس",
    href: "/dashboard/units",
    icon: Ruler,
  },
  {
    title: "المخزون",
    href: "/dashboard/inventory",
    icon: Boxes,
  },
  {
    title: "المخازن",
    href: "/dashboard/warehouses",
    icon: Warehouse,
  },
  {
    title: "أرصدة المخزن",
    href: "/dashboard/stock-balances",
    icon: Boxes,
  },
  {
    title: "حركات المخزن",
    href: "/dashboard/stock-movements",
    icon: Boxes,
  },
  {
    title: "تسويات المخزن",
    href: "/dashboard/stock-adjustments",
    icon: Boxes,
  },
  {
    title: "تحويلات المخزن",
    href: "/dashboard/warehouse-transfers",
    icon: ArrowLeftRight,
  },
  {
    title: "تقييم المخزون",
    href: "/dashboard/inventory/valuation",
    icon: BarChart3,
  },
  {
    title: "تدقيق المخزون",
    href: "/dashboard/inventory/audit",
    icon: Search,
  },
  {
    title: "سعر الصرف",
    href: "/dashboard/exchange-rates",
    icon: DollarSign,
  },
  {
    title: "حسابات الدفع",
    href: "/dashboard/payment-accounts",
    icon: Wallet,
  },
  {
    title: "الفترات المالية",
    href: "/dashboard/fiscal-periods",
    icon: CalendarDays,
  },
  {
    title: "سجل النشاطات",
    href: "/dashboard/audit-logs",
    icon: FileText,
  },
  {
    title: "التقارير",
    href: "/dashboard/reports",
    icon: BarChart3,
  },
  {
    title: "الشركات",
    href: "/dashboard/companies",
    icon: Building2,
  },
  {
    title: "الفروع",
    href: "/dashboard/branches",
    icon: Building2,
  },
  {
    title: "الإعدادات",
    href: "/dashboard/settings",
    icon: Settings,
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
    title: "الموظفون",
    href: "/dashboard/employees",
    icon: UserCheck,
  },
  {
    title: "المشاريع الداخلية",
    href: "/dashboard/internal-projects",
    icon: FileText,
  },
  {
    title: "مهامي",
    href: "/dashboard/internal-projects/my-tasks",
    icon: FileText,
  },
];

export function Sidebar({
  userName,
  userRole,
}: {
  userName: string;
  userRole: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/auth/login");
  }

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-l border-border bg-white transition-all duration-300",
        collapsed ? "w-16" : "w-64",
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
          <ChevronDown
            className={cn(
              "h-5 w-5 transition-transform",
              collapsed ? "rotate-180" : "-rotate-90",
            )}
          />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        {menuItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors mb-0.5",
                isActive
                  ? "bg-primary text-white"
                  : "text-gray-600 hover:bg-muted hover:text-dark",
                collapsed && "justify-center px-2",
              )}
              title={collapsed ? item.title : undefined}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{item.title}</span>}
            </Link>
          );
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
            collapsed && "justify-center",
          )}
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && <span>تسجيل الخروج</span>}
        </button>
      </div>
    </aside>
  );
}
