"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ArrowLeft, Trash2 } from "lucide-react";

interface FiscalPeriodDetail {
  id: string;
  companyId: string;
  branchId: string | null;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  FUTURE: { label: "مستقبلية", color: "bg-gray-100 text-gray-700" },
  OPEN: { label: "مفتوحة", color: "bg-green-100 text-green-700" },
  CLOSING_IN_PROGRESS: {
    label: "جاري الإغلاق",
    color: "bg-amber-100 text-amber-700",
  },
  SOFT_CLOSED: { label: "إغلاق جزئي", color: "bg-blue-100 text-blue-700" },
  HARD_CLOSED: { label: "مغلقة", color: "bg-red-100 text-red-700" },
};

export default function FiscalPeriodDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { toast } = useToast();
  const qc = useQueryClient();

  const [permissions, setPermissions] = useState<string[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);

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

  const {
    data: period,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["fiscal-period", id],
    queryFn: async () => {
      const res = await fetch(`/api/fiscal-periods/${id}`);
      const json = await res.json();
      if (!json.success)
        throw new Error(json.error || "فشل تحميل الفترة المالية");
      return json.data as FiscalPeriodDetail;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/fiscal-periods/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل حذف الفترة");
      return json.data;
    },
    onSuccess: () => {
      toast("تم حذف الفترة بنجاح", "success");
      qc.invalidateQueries({ queryKey: ["fiscal-periods"] });
      router.push("/dashboard/fiscal-periods");
    },
    onError: (err: Error) => {
      toast(err.message, "error");
      setDeleteOpen(false);
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !period) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard/fiscal-periods")}
            className="rounded-lg p-2 hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-dark">تفاصيل الفترة المالية</h1>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center text-red-600">
          {error instanceof Error ? error.message : "فشل تحميل الفترة المالية"}
        </div>
      </div>
    );
  }

  const canDelete =
    period.status === "FUTURE" &&
    (permissions.includes("fiscalPeriods.manage") || permissions.length === 0);

  const cfg = statusConfig[period.status] || {
    label: period.status,
    color: "bg-gray-100 text-gray-700",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/dashboard/fiscal-periods")}
          className="rounded-lg p-2 hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-dark">{period.name}</h1>
          <p className="text-sm text-gray-500">
            فترة مالية — <Badge className={cfg.color}>{cfg.label}</Badge>
          </p>
        </div>
        {canDelete && (
          <Button
            variant="danger"
            onClick={() => setDeleteOpen(true)}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="ml-1 h-4 w-4" />
            حذف
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>معلومات الفترة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-gray-500">الاسم</p>
                <p className="font-medium">{period.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">الحالة</p>
                <Badge className={cfg.color}>{cfg.label}</Badge>
              </div>
              <div>
                <p className="text-sm text-gray-500">تاريخ البداية</p>
                <p className="font-medium">
                  {new Date(period.startDate).toLocaleDateString("ar-IQ")}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">تاريخ النهاية</p>
                <p className="font-medium">
                  {new Date(period.endDate).toLocaleDateString("ar-IQ")}
                </p>
              </div>
              {period.branchId && (
                <div>
                  <p className="text-sm text-gray-500">الفرع</p>
                  <p className="font-medium font-mono text-xs">
                    {period.branchId}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>بيانات النظام</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">رقم المعرف</span>
              <span className="text-sm font-mono">{period.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">تاريخ الإنشاء</span>
              <span className="text-sm">
                {new Date(period.createdAt).toLocaleDateString("ar-IQ")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">آخر تحديث</span>
              <span className="text-sm">
                {new Date(period.updatedAt).toLocaleDateString("ar-IQ")}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="حذف الفترة المالية"
        message={`هل أنت متأكد من حذف الفترة "${period.name}"؟ لا يمكن التراجع عن هذه العملية.`}
        confirmLabel="حذف"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
