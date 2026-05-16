"use client"

import { Card, CardContent } from "@/components/ui/card"

export default function PurchasesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dark">المشتريات</h1>
        <p className="text-sm text-gray-500">إدارة فواتير الشراء</p>
      </div>
      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          صفحة المشتريات قيد الإنشاء
        </CardContent>
      </Card>
    </div>
  )
}
