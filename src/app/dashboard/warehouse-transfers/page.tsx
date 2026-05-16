"use client";

import { Card, CardContent } from "@/components/ui/card";

export default function WarehouseTransfersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dark">النقل المخزني</h1>
        <p className="text-sm text-gray-500">إدارة حركة المخازن</p>
      </div>
      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          صفحة النقل المخزني قيد الإنشاء
        </CardContent>
      </Card>
    </div>
  );
}
