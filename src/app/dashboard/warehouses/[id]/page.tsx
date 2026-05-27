"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft } from "lucide-react";

interface Branch {
  name: string;
  code: string;
}

interface WarehouseDetail {
  id: string;
  name: string;
  code: string;
  address: string | null;
  isActive: boolean;
  companyId: string | null;
  branchId: string | null;
  branch: Branch | null;
  createdAt: string;
  updatedAt: string;
}

const statusBadge = (isActive: boolean) => {
  return (
    <Badge variant={isActive ? "success" : "danger"}>
      {isActive ? "نشط" : "معطل"}
    </Badge>
  );
};

export default function WarehouseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const qc = useQueryClient();
  const id = params.id as string;

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
    permissions.includes("warehouses.edit") || permissions.length === 0;

  const {
    data: warehouse,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["warehouse", id],
    queryFn: async () => {
      const res = await fetch(`/api/warehouses/${id}`);
      const json = await res.json();
      if (!json.success)
        throw new Error(json.error || "فشل تحميل المخزن");
      return json.data as WarehouseDetail;
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (newActive: boolean) => {
      const res = await fetch(`/api/warehouses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newActive }),
      });
      const json = await res.json();
      if (!json.success)
        throw new Error(json.error || "فشل تغيير الحالة");
      return json.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["warehouse", id] });
      toast("تم تغيير الحالة بنجاح", "success");
    },
    onError: (err: Error) => {
      toast(err.message, "error");
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !warehouse) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard/warehouses")}
            className="rounded-lg p-2 hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-dark">تفاصيل المخزن</h1>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center text-red-600">
          {error instanceof Error ? error.message : "فشل تحميل المخزن"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/dashboard/warehouses")}
          className="rounded-lg p-2 hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-dark">
            {warehouse.name}
          </h1>
          <p className="text-sm text-gray-500">
            كود {warehouse.code} — {statusBadge(warehouse.isActive)}
          </p>
        </div>
        <div className="flex gap-2">
          {canEdit && warehouse.isActive && (
            <Button
              variant="outline"
              onClick={() => toggleMutation.mutate(false)}
              disabled={toggleMutation.isPending}
            >
              {toggleMutation.isPending ? "جاري..." : "تعطيل"}
            </Button>
          )}
          {canEdit && !warehouse.isActive && (
            <Button
              variant="outline"
              onClick={() => toggleMutation.mutate(true)}
              disabled={toggleMutation.isPending}
            >
              {toggleMutation.isPending ? "جاري..." : "تفعيل"}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>معلومات المخزن</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-gray-500">الاسم</p>
                <p className="font-medium">{warehouse.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">الكود</p>
                <p className="font-mono text-sm font-medium">{warehouse.code}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">الحالة</p>
                <p>{statusBadge(warehouse.isActive)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">الفرع</p>
                <p className="font-medium">
                  {warehouse.branch ? `${warehouse.branch.name} (${warehouse.branch.code})` : "—"}
                </p>
              </div>
            </div>
            {warehouse.address && (
              <div>
                <p className="text-sm text-gray-500">العنوان</p>
                <p className="font-medium">{warehouse.address}</p>
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
              <span className="text-sm font-mono">{warehouse.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">تاريخ الإنشاء</span>
              <span className="text-sm">
                {new Date(warehouse.createdAt).toLocaleDateString("ar-IQ")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">آخر تحديث</span>
              <span className="text-sm">
                {new Date(warehouse.updatedAt).toLocaleDateString("ar-IQ")}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
