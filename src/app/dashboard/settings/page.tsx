"use client";

import { Building2, UserCircle, Settings, CalendarDays, DollarSign, Wallet, Landmark } from "lucide-react";
import Link from "next/link";

const settingsLinks = [
  {
    title: "الشركات",
    desc: "إدارة بيانات الشركات",
    href: "/dashboard/companies",
    icon: Building2,
    color: "text-blue-600",
  },
  {
    title: "الفروع",
    desc: "إدارة الفروع",
    href: "/dashboard/branches",
    icon: Building2,
    color: "text-indigo-600",
  },
  {
    title: "المستخدمين",
    desc: "إدارة المستخدمين والصلاحيات",
    href: "/dashboard/users",
    icon: UserCircle,
    color: "text-green-600",
  },
  {
    title: "الأدوار",
    desc: "إدارة الأدوار والصلاحيات",
    href: "/dashboard/roles",
    icon: Settings,
    color: "text-purple-600",
  },
  {
    title: "الفترات المالية",
    desc: "إدارة الفترات المالية المفتوحة والمغلقة",
    href: "/dashboard/fiscal-periods",
    icon: CalendarDays,
    color: "text-amber-600",
  },
  {
    title: "سعر الصرف",
    desc: "إدارة أسعار صرف العملات",
    href: "/dashboard/exchange-rates",
    icon: DollarSign,
    color: "text-cyan-600",
  },
  {
    title: "حسابات الدفع",
    desc: "إدارة حسابات الدفع النقدية والبنكية",
    href: "/dashboard/payment-accounts",
    icon: Wallet,
    color: "text-orange-600",
  },
  {
    title: "دليل الحسابات",
    desc: "إدارة شجرة الحسابات المحاسبية",
    href: "/dashboard/accounts",
    icon: Landmark,
    color: "text-red-600",
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dark">الإعدادات</h1>
        <p className="text-sm text-gray-500">إعدادات النظام</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {settingsLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group rounded-xl border border-border bg-white p-6 transition-colors hover:bg-muted"
          >
            <div className="rounded-lg bg-muted p-3 w-fit">
              <link.icon className={`h-6 w-6 ${link.color}`} />
            </div>
            <div className="mt-4">
              <h3 className="text-lg font-semibold text-dark">{link.title}</h3>
              <p className="mt-1 text-sm text-gray-500">{link.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
