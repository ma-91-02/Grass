"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ShoppingCart, Package, Users, DollarSign } from "lucide-react"

interface DashboardStats {
  totalCustomers: number
  totalProducts: number
  totalInvoices: number
  totalUsers: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0,
    totalProducts: 0,
    totalInvoices: 0,
    totalUsers: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/dashboard/stats")
        if (res.ok) {
          const data = await res.json()
          setStats(data.data)
        }
      } catch {
        // silent fail
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  const statCards = [
    { title: "إجمالي العملاء", value: stats.totalCustomers, icon: Users, color: "text-blue-600" },
    { title: "إجمالي المواد", value: stats.totalProducts, icon: Package, color: "text-green-600" },
    { title: "إجمالي الفواتير", value: stats.totalInvoices, icon: ShoppingCart, color: "text-accent" },
    { title: "المستخدمين", value: stats.totalUsers, icon: DollarSign, color: "text-primary" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dark">لوحة التحكم</h1>
        <p className="text-sm text-gray-500">نظام إدارة الموارد المؤسسية - GRASS</p>
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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>مرحباً بك في GRASS ERP</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              نظام إدارة الموارد المؤسسية لشركة خبراء الشرق الأوسط / GRASS العراق.
              استخدم القائمة الجانبية للتنقل بين الأقسام.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>الإجراءات السريعة</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• إضافة عميل جديد</li>
              <li>• إضافة مادة جديدة</li>
              <li>• إنشاء فاتورة جديدة</li>
              <li>• تحديث سعر الصرف</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
