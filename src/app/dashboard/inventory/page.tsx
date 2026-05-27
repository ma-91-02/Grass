"use client";

import { Warehouse, Boxes, ArrowLeftRight, Search, BarChart3 } from "lucide-react";
import Link from "next/link";

export default function InventoryPage() {
  const cards = [
    {
      title: "المخازن",
      desc: "إدارة المخازن والفروع",
      href: "/dashboard/warehouses",
      icon: Warehouse,
      color: "text-blue-600",
    },
    {
      title: "أرصدة المخزن",
      desc: "عرض أرصدة المخازن والمواد",
      href: "/dashboard/stock-balances",
      icon: Boxes,
      color: "text-green-600",
    },
    {
      title: "حركات المخزن",
      desc: "عرض حركات المخازن والمواد",
      href: "/dashboard/stock-movements",
      icon: Boxes,
      color: "text-amber-600",
    },
    {
      title: "تسويات المخزن",
      desc: "إنشاء وإدارة تسويات المخازن",
      href: "/dashboard/stock-adjustments",
      icon: Boxes,
      color: "text-orange-600",
    },
    {
      title: "تحويلات المخازن",
      desc: "نقل المواد بين المخازن",
      href: "/dashboard/warehouse-transfers",
      icon: ArrowLeftRight,
      color: "text-purple-600",
    },
    {
      title: "تقييم المخزون",
      desc: "تقرير تقييم المخزون",
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
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dark">المخزون</h1>
        <p className="text-sm text-gray-500">إدارة المخزون والمستودعات</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group rounded-xl border border-border bg-white p-6 transition-colors hover:bg-muted"
          >
            <div className="flex items-start justify-between">
              <div className="rounded-lg bg-muted p-3">
                <card.icon className={`h-6 w-6 ${card.color}`} />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-lg font-semibold text-dark">{card.title}</h3>
              <p className="mt-1 text-sm text-gray-500">{card.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
