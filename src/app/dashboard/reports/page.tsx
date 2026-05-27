"use client";

import { BarChart3, Search, Package, FileText } from "lucide-react";
import Link from "next/link";

const reportLinks = [
  {
    title: "تقييم المخزون",
    desc: "تقرير تقييم المخزون حسب المواد والمخازن",
    href: "/dashboard/inventory/valuation",
    icon: BarChart3,
    color: "text-cyan-600",
  },
  {
    title: "تدقيق المخزون",
    desc: "مشاكل المخزون والتسوية وبطاقة المخزن",
    href: "/dashboard/inventory/audit",
    icon: Search,
    color: "text-red-600",
  },
  {
    title: "أرصدة المخزن",
    desc: "عرض أرصدة المخازن والمواد المتوفرة",
    href: "/dashboard/stock-balances",
    icon: Package,
    color: "text-green-600",
  },
  {
    title: "سجل النشاطات",
    desc: "سجل جميع العمليات والنشاطات في النظام",
    href: "/dashboard/audit-logs",
    icon: FileText,
    color: "text-blue-600",
  },
];

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dark">التقارير</h1>
        <p className="text-sm text-gray-500">تقارير النظام</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reportLinks.map((link) => (
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
