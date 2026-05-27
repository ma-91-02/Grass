"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft, Pencil, Send, Trash2 } from "lucide-react";

interface StockMovementDetail {
  id: string;
  companyId: string | null;
  productId: string;
  warehouseId: string | null;
  movementType: string;
  quantity: number;
  unitCost: number;
  currency: string;
  movementDate: string;
  referenceType: string | null;
  referenceId: string | null;
  reason: string | null;
  notes: string | null;
  status: string;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
  product: {
    name: string;
    code: string;
  };
  warehouse: {
    name: string;
    code: string;
  } | null;
}

const movementTypeLabels: Record<string, string> = {
  OPENING_BALANCE: "رصيد افتتاحي",
  IN: "وارد",
  OUT: "صادر",
  ADJUSTMENT_IN: "تسوية زيادة",
  ADJUSTMENT_OUT: "تسوية نقص",
  TRANSFER_OUT: "تحويل خارج",
  TRANSFER_IN: "تحويل وارد",
  RETURN_IN: "مرتجع مشتريات",
};

const movementTypeColors: Record<string, string> = {
  OPENING_BALANCE: "bg-purple-100 text-purple-700",
  IN: "bg-green-100 text-green-700",
  OUT: "bg-red-100 text-red-700",
  ADJUSTMENT_IN: "bg-yellow-100 text-yellow-700",
  ADJUSTMENT_OUT: "bg-orange-100 text-orange-700",
  TRANSFER_OUT: "bg-blue-100 text-blue-700",
  TRANSFER_IN: "bg-cyan-100 text-cyan-700",
  RETURN_IN: "bg-pink-100 text-pink-700",
};

const statusBadge = (status: string) => {
  const map: Record<string, { label: string; color: string }> = {
    DRAFT: { label: "مسودة", color: "bg-gray-100 text-gray-700" },
    POSTED: { label: "مرحّل", color: "bg-green-100 text-green-700" },
    CANCELLED: { label: "ملغى", color: "bg-red-100 text-red-700" },
  };
  const s = map[status] || { label: status, color: "bg-gray-100" };
  return <Badge className={s.color}>{s.label}</Badge>;
};

const referenceLabels: Record<string, string> = {
  PurchaseInvoice: "فاتورة شراء",
  SalesInvoice: "فاتورة بيع",
  PurchaseReturn: "مرتجع شراء",
  SalesReturn: "مرتجع بيع",
  StockAdjustment: "تسوية مخزون",
  StockTransfer: "تحويل مخزن",
};

export default function StockMovementDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const qc = useQueryClient();
  const id = params.id as string;

  const [showPostConfirm, setShowPostConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
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
    permissions.includes("stockMovements.edit") || permissions.length === 0;
  const canDelete =
    permissions.includes("stockMovements.delete") || permissions.length === 0;
  const canPost =
    permissions.includes("stockMovements.post") || permissions.length === 0;

  const {
    data: movement,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["stock-movement", id],
    queryFn: async () => {
      const res = await fetch(`/api/stock-movements/${id}`);
      const json = await res.json();
      if (!json.success)
        throw new Error(json.error || "فشل تحميل حركة المخزن");
      return json.data as StockMovementDetail;
    },
  });

  const postMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/stock-movements/${id}/post`, {
        method: "POST",
      });
      const json = await res.json();
      if (!json.success)
        throw new Error(json.error || "فشل ترحيل حركة المخزن");
      return json.data;
    },
    onSuccess: () => {
      toast("تم ترحيل حركة المخزن بنجاح", "success");
      qc.invalidateQueries({ queryKey: ["stock-movement", id] });
      setShowPostConfirm(false);
    },
    onError: (err: Error) => {
      toast(err.message, "error");
      setShowPostConfirm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/stock-movements/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json.success)
        throw new Error(json.error || "فشل حذف حركة المخزن");
      return json.data;
    },
    onSuccess: () => {
      toast("تم حذف حركة المخزن بنجاح", "success");
      router.push("/dashboard/stock-movements");
      setShowDeleteConfirm(false);
    },
    onError: (err: Error) => {
      toast(err.message, "error");
      setShowDeleteConfirm(false);
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !movement) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard/stock-movements")}
            className="rounded-lg p-2 hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-dark">تفاصيل حركة المخزن</h1>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center text-red-600">
          {error instanceof Error ? error.message : "فشل تحميل حركة المخزن"}
        </div>
      </div>
    );
  }

  const totalCost = movement.unitCost * movement.quantity;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/dashboard/stock-movements")}
          className="rounded-lg p-2 hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-dark">
            حركة مخزن #{movement.id.slice(-6)}
          </h1>
          <p className="text-sm text-gray-500">
            {statusBadge(movement.status)}
          </p>
        </div>
        <div className="flex gap-2">
          {movement.status === "DRAFT" && (
            <>
              {canEdit && (
                <Button
                  variant="outline"
                  onClick={() =>
                    router.push(
                      `/dashboard/stock-movements/${movement.id}/edit`,
                    )
                  }
                >
                  <Pencil className="h-4 w-4" />
                  تعديل
                </Button>
              )}
              {canPost && (
                <Button
                  onClick={() => setShowPostConfirm(true)}
                  disabled={postMutation.isPending}
                >
                  <Send className="h-4 w-4" />
                  {postMutation.isPending ? "جاري الترحيل..." : "ترحيل"}
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                  {deleteMutation.isPending ? "جاري الحذف..." : "حذف"}
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>معلومات الحركة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-gray-500">التاريخ</p>
                <p className="font-medium">
                  {new Date(movement.movementDate).toLocaleDateString("ar-IQ")}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">نوع الحركة</p>
                <Badge
                  className={
                    movementTypeColors[movement.movementType] ||
                    "bg-gray-100 text-gray-700"
                  }
                >
                  {movementTypeLabels[movement.movementType] ||
                    movement.movementType}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-500">المادة</p>
                <p className="font-medium">{movement.product?.name || "—"}</p>
                <p className="text-xs text-gray-500">
                  {movement.product?.code || ""}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">المخزن</p>
                <p className="font-medium">
                  {movement.warehouse?.name || "—"}
                </p>
                <p className="text-xs text-gray-500">
                  {movement.warehouse?.code || ""}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">الكمية</p>
                <p className="font-medium">
                  {movement.quantity.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">تكلفة الوحدة</p>
                <p className="font-medium">
                  {movement.unitCost > 0
                    ? `${Number(movement.unitCost).toLocaleString()} ${movement.currency}`
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">التكلفة الإجمالية</p>
                <p className="font-medium">
                  {totalCost > 0
                    ? `${totalCost.toLocaleString()} ${movement.currency}`
                    : "—"}
                </p>
              </div>
            </div>

            {(movement.referenceType || movement.referenceId) && (
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-sm font-medium text-gray-600">المرجع</p>
                {movement.referenceType && (
                  <p className="text-sm">
                    النوع: {referenceLabels[movement.referenceType] || movement.referenceType}
                  </p>
                )}
                {movement.referenceId && (
                  <p className="text-sm">الرقم: {movement.referenceId}</p>
                )}
              </div>
            )}

            {movement.reason && (
              <div>
                <p className="text-sm text-gray-500">السبب</p>
                <p className="font-medium">{movement.reason}</p>
              </div>
            )}

            {movement.notes && (
              <div>
                <p className="text-sm text-gray-500">ملاحظات</p>
                <p className="font-medium">{movement.notes}</p>
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
              <span className="text-sm font-mono">{movement.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">تاريخ الإنشاء</span>
              <span className="text-sm">
                {new Date(movement.createdAt).toLocaleDateString("ar-IQ")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">آخر تحديث</span>
              <span className="text-sm">
                {new Date(movement.updatedAt).toLocaleDateString("ar-IQ")}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={showPostConfirm}
        onClose={() => setShowPostConfirm(false)}
        onConfirm={() => postMutation.mutate()}
        title="ترحيل حركة المخزن"
        message={`هل أنت متأكد من ترحيل هذه الحركة؟ لا يمكن التراجع عن هذه العملية.`}
        confirmLabel="ترحيل"
        loading={postMutation.isPending}
      />

      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="حذف حركة المخزن"
        message={`هل أنت متأكد من حذف هذه الحركة؟ لا يمكن التراجع عن هذه العملية.`}
        confirmLabel="حذف"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
