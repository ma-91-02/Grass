"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft } from "lucide-react";

interface SupplierAccount {
  id: string;
  supplierId: string;
  currency: string;
  balance: number;
}

interface SupplierDetail {
  id: string;
  name: string;
  code: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  isActive: boolean;
  accounts: SupplierAccount[];
  createdAt: string;
}

const statusBadge = (isActive: boolean) => {
  return (
    <Badge variant={isActive ? "success" : "danger"}>
      {isActive ? "نشط" : "معطل"}
    </Badge>
  );
};

export default function SupplierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { toast } = useToast();
  const [permissions, setPermissions] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        setPermissions(d.data?.permissions || []);
      })
      .catch(() => {
        toast("تعذر التحقق من الصلاحيات", "error");
      });
  }, []);

  const canEdit =
    permissions.includes("suppliers.edit") || permissions.length === 0;

  const {
    data: supplier,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["supplier", id],
    queryFn: async () => {
      const res = await fetch(`/api/suppliers/${id}`);
      const json = await res.json();
      if (!json.success)
        throw new Error(json.error || "فشل تحميل المورد");
      return json.data as SupplierDetail;
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !supplier) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard/customers")}
            className="rounded-lg p-2 hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-dark">تفاصيل المورد</h1>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center text-red-600">
          {error instanceof Error ? error.message : "فشل تحميل المورد"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/dashboard/customers")}
          className="rounded-lg p-2 hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-dark">
            {supplier.name}
          </h1>
          <p className="text-sm text-gray-500">
            مورد — {statusBadge(supplier.isActive)}
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => router.push("/dashboard/customers")}
            className="rounded-lg px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5 border border-primary"
          >
            تعديل
          </button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>معلومات المورد</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-gray-500">الاسم</p>
                <p className="font-medium">{supplier.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">الكود</p>
                <p className="font-mono text-sm font-medium">{supplier.code}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">الهاتف</p>
                <p className="font-medium" dir="ltr">
                  {supplier.phone || "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">الحالة</p>
                <p>{statusBadge(supplier.isActive)}</p>
              </div>
            </div>
            {supplier.address && (
              <div>
                <p className="text-sm text-gray-500">العنوان</p>
                <p className="font-medium">{supplier.address}</p>
              </div>
            )}
            {supplier.notes && (
              <div>
                <p className="text-sm text-gray-500">ملاحظات</p>
                <p className="font-medium">{supplier.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>بيانات النظام</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">رقم المعرف</span>
              <span className="text-sm font-mono">{supplier.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">تاريخ الإنشاء</span>
              <span className="text-sm">
                {new Date(supplier.createdAt).toLocaleDateString("ar-IQ")}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {supplier.accounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>الأرصدة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">العملة</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الرصيد</th>
                  </tr>
                </thead>
                <tbody>
                  {supplier.accounts.map((acc) => (
                    <tr key={acc.id} className="border-b border-border hover:bg-muted/30">
                      <td className="px-4 py-3 text-sm font-medium">{acc.currency}</td>
                      <td className="px-4 py-3 text-sm">
                        {Number(acc.balance).toLocaleString()} {acc.currency}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
