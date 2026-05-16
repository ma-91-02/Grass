"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SalesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dark">المبيعات</h1>
        <p className="text-sm text-gray-500">إدارة فواتير البيع</p>
      </div>
      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          صفحة المبيعات قيد الإنشاء
        </CardContent>
      </Card>
    </div>
  );
}
