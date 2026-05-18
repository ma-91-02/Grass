"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ShoppingCart,
  Package,
  Users,
  DollarSign,
  Receipt,
  RotateCcw,
  Boxes,
  Warehouse,
} from "lucide-react";
import Link from "next/link";

interface DashboardStats {
  totalCustomers: number;
  totalProducts: number;
  totalInvoices: number;
  totalUsers: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0,
    totalProducts: 0,
    totalInvoices: 0,
    totalUsers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/dashboard/stats");
        if (res.ok) {
          const data = await res.json();
          setStats(data.data);
        }
      } catch {
        // silent fail
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const statCards = [
    {
      title: "إجمالي العملاء",
      value: stats.totalCustomers,
      icon: Users,
      color: "text-blue-600",
    },
    {
      title: "إجمالي المواد",
      value: stats.totalProducts,
      icon: Package,
      color: "text-green-600",
    },
    {
      title: "إجمالي الفواتير",
      value: stats.totalInvoices,
      icon: ShoppingCart,
      color: "text-accent",
    },
    {
      title: "المستخدمين",
      value: stats.totalUsers,
      icon: DollarSign,
      color: "text-primary",
    },
  ];

  const quickLinks = [
    {
      title: "العملاء",
      href: "/dashboard/customers",
      icon: Users,
      desc: "إدارة العملاء والموردين",
    },
    {
      title: "المواد",
      href: "/dashboard/products",
      icon: Package,
      desc: "إدارة المنتجات والأسعار",
    },
    {
      title: "المخازن",
      href: "/dashboard/warehouses",
      icon: Warehouse,
      desc: "إدارة المخازن",
    },
    {
      title: "أرصدة المخزن",
      href: "/dashboard/stock-balances",
      icon: Boxes,
      desc: "عرض الكميات والتكاليف",
    },
    {
      title: "فواتير البيع",
      href: "/dashboard/sales-invoices",
      icon: Receipt,
      desc: "إنشاء وترحيل الفواتير",
    },
    {
      title: "التحصيلات",
      href: "/dashboard/collections",
      icon: DollarSign,
      desc: "تحصيل مدفوعات العملاء",
    },
    {
      title: "مرتجعات المبيعات",
      href: "/dashboard/sales-returns",
      icon: RotateCcw,
      desc: "إدارة مرتجعات البيع",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dark">لوحة التحكم</h1>
        <p className="text-sm text-gray-500">
          نظام إدارة الموارد المؤسسية - GRASS
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className={`rounded-xl bg-muted p-3 ${stat.color}`}>
                <stat.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{stat.title}</p>
                <p className="text-2xl font-bold text-dark">
                  {loading ? "..." : stat.value}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>الإجراءات السريعة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {quickLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-4 rounded-xl border border-border bg-white p-4 transition-colors hover:bg-muted"
              >
                <div className="rounded-lg bg-primary/10 p-3 text-primary">
                  <link.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-medium text-dark">{link.title}</p>
                  <p className="text-xs text-gray-500">{link.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
