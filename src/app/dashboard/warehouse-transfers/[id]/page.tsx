"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft, Send, Trash2, Pencil } from "lucide-react";

interface TransferLine {
  id: string;
  product: { name: string; code: string } | null;
  quantity: number;
  unitCost: number;
  currency: string;
  notes: string | null;
}

interface StockTransferDetail {
  id: string;
  transferNumber: string;
  status: string;
  transferDate: string;
  notes: string | null;
  fromWarehouse: { name: string; code: string } | null;
  toWarehouse: { name: string; code: string } | null;
  createdBy: { name: string } | null;
  createdAt: string;
  updatedAt: string;
  lines: TransferLine[];
}

const statusBadge = (status: string) => {
  const map: Record<string, { label: string; color: string }> = {
    DRAFT: { label: "مسودة", color: "bg-gray-100 text-gray-700" },
    POSTED: { label: "مرحّل", color: "bg-green-100 text-green-700" },
    CANCELLED: { label: "ملغى", color: "bg-red-100 text-red-700" },
  };
  const s = map[status] || { label: status, color: "bg-gray-100" };
  return <Badge className={s.color}>{s.label}</Badge>;
};

export default function StockTransferDetailPage() {
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
        // If auth fails, treat as no permissions — edit button won't show
      });
  }, []);

  const canEdit =
    permissions.includes("stockTransfers.edit") || permissions.length === 0;

  const {
    data: transfer,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["stock-transfer", id],
    queryFn: async () => {
      const res = await fetch(`/api/stock-transfers/${id}`);
      const json = await res.json();
      if (!json.success)
        throw new Error(json.error || "فشل تحميل التحويل");
      return json.data as StockTransferDetail;
    },
  });

  const postMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/stock-transfers/${id}/post`, {
        method: "POST",
      });
      const json = await res.json();
      if (!json.success)
        throw new Error(json.error || "فشل ترحيل التحويل");
      return json.data;
    },
    onSuccess: () => {
      toast("تم ترحيل التحويل بنجاح", "success");
      qc.invalidateQueries({ queryKey: ["stock-transfer", id] });
      setShowPostConfirm(false);
    },
    onError: (err: Error) => {
      toast(err.message, "error");
      setShowPostConfirm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/stock-transfers/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json.success)
        throw new Error(json.error || "فشل حذف التحويل");
      return json.data;
    },
    onSuccess: () => {
      toast("تم حذف التحويل بنجاح", "success");
      router.push("/dashboard/warehouse-transfers");
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

  if (error || !transfer) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard/warehouse-transfers")}
            className="rounded-lg p-2 hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-dark">تفاصيل التحويل</h1>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center text-red-600">
          {error instanceof Error ? error.message : "فشل تحميل التحويل"}
        </div>
      </div>
    );
  }

  const totalQty = transfer.lines.reduce((s, l) => s + l.quantity, 0);
  const totalCost = transfer.lines.reduce(
    (s, l) => s + l.quantity * (l.unitCost || 0),
    0,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/dashboard/warehouse-transfers")}
          className="rounded-lg p-2 hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-dark">
            تحويل {transfer.transferNumber}
          </h1>
          <p className="text-sm text-gray-500">
            {statusBadge(transfer.status)}
          </p>
        </div>
        <div className="flex gap-2">
          {transfer.status === "DRAFT" && (
            <>
              {canEdit && (
                <Button
                  variant="outline"
                  onClick={() =>
                    router.push(
                      `/dashboard/warehouse-transfers/${transfer.id}/edit`,
                    )
                  }
                >
                  <Pencil className="h-4 w-4" />
                  تعديل
                </Button>
              )}
              <Button
                onClick={() => setShowPostConfirm(true)}
                disabled={postMutation.isPending}
              >
                <Send className="h-4 w-4" />
                {postMutation.isPending ? "جاري الترحيل..." : "ترحيل"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4" />
                {deleteMutation.isPending ? "جاري الحذف..." : "حذف"}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>معلومات التحويل</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-gray-500">التاريخ</p>
                <p className="font-medium">
                  {new Date(transfer.transferDate).toLocaleDateString("ar-IQ")}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">المخزن المصدر</p>
                <p className="font-medium">
                  {transfer.fromWarehouse?.name || "—"}
                </p>
                <p className="text-xs text-gray-500">
                  {transfer.fromWarehouse?.code || ""}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">المخزن الوجهة</p>
                <p className="font-medium">
                  {transfer.toWarehouse?.name || "—"}
                </p>
                <p className="text-xs text-gray-500">
                  {transfer.toWarehouse?.code || ""}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">الحالة</p>
                <p>{statusBadge(transfer.status)}</p>
              </div>
            </div>
            {transfer.notes && (
              <div>
                <p className="text-sm text-gray-500">ملاحظات</p>
                <p className="font-medium">{transfer.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ملخص البنود</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">عدد البنود</span>
              <span className="font-medium">{transfer.lines.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">إجمالي الكمية</span>
              <span className="font-medium">
                {totalQty.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">إجمالي التكلفة</span>
              <span className="font-medium">
                {totalCost > 0 ? totalCost.toLocaleString() : "—"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>بنود التحويل</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                    #
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                    المادة
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                    الكمية
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                    تكلفة الوحدة
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                    الإجمالي
                  </th>
                </tr>
              </thead>
              <tbody>
                {transfer.lines.map((line, idx) => (
                  <tr
                    key={line.id}
                    className="border-b border-border hover:bg-muted/30"
                  >
                    <td className="px-4 py-3 text-sm text-dark">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3 text-sm text-dark">
                      <p className="font-medium">
                        {line.product?.name || "—"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {line.product?.code || ""}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-sm text-dark">
                      {line.quantity.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-dark">
                      {line.unitCost > 0
                        ? `${line.unitCost.toLocaleString()} ${line.currency}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-dark">
                      {line.unitCost > 0
                        ? `${(line.quantity * line.unitCost).toLocaleString()} ${line.currency}`
                        : "—"}
                    </td>
                  </tr>
                ))}
                {transfer.lines.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      لا توجد بنود
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={showPostConfirm}
        onClose={() => setShowPostConfirm(false)}
        onConfirm={() => postMutation.mutate()}
        title="ترحيل التحويل"
        message={`هل أنت متأكد من ترحيل التحويل ${transfer.transferNumber}؟ لا يمكن التراجع عن هذه العملية.`}
        confirmLabel="ترحيل"
        loading={postMutation.isPending}
      />

      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="حذف التحويل"
        message={`هل أنت متأكد من حذف التحويل ${transfer.transferNumber}؟ لا يمكن التراجع عن هذه العملية.`}
        confirmLabel="حذف"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
