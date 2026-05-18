"use client";


import { Receipt, DollarSign, RotateCcw, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function SalesPage() {
  const cards = [
    {
      title: "فواتير البيع",
      desc: "إنشاء وإدارة فواتير البيع والترحيل",
      href: "/dashboard/sales-invoices",
      icon: Receipt,
      color: "text-blue-600",
    },
    {
      title: "التحصيلات",
      desc: "تحصيل مدفوعات العملاء وطباعة الإيصالات",
      href: "/dashboard/collections",
      icon: DollarSign,
      color: "text-green-600",
    },
    {
      title: "مرتجعات المبيعات",
      desc: "إنشاء وترحيل مرتجعات البيع",
      href: "/dashboard/sales-returns",
      icon: RotateCcw,
      color: "text-amber-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dark">المبيعات</h1>
        <p className="text-sm text-gray-500">إدارة دورة المبيعات الكاملة</p>
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
              <ArrowLeft className="h-5 w-5 text-gray-400 transition-transform group-hover:-translate-x-1" />
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
