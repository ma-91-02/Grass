"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";

export default function WarehouseTransfersPage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <PageHeader
        title="النقل المخزني"
        description="إدارة حركة المخازن"
        actionLabel="تحويل مخزن جديد"
        onAction={() => router.push("/dashboard/warehouse-transfers/new")}
      />

      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          صفحة النقل المخزني قيد الإنشاء
        </CardContent>
      </Card>
    </div>
  );
}
