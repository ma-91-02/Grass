"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft } from "lucide-react";

interface Warehouse {
  id: string;
  name: string;
  code: string;
}

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
  fromWarehouseId: string;
  toWarehouseId: string;
  fromWarehouse: { name: string; code: string } | null;
  toWarehouse: { name: string; code: string } | null;
  createdBy: { name: string } | null;
  createdAt: string;
  updatedAt: string;
  lines: TransferLine[];
}

interface FormData {
  fromWarehouseId: string;
  toWarehouseId: string;
  transferDate: string;
  notes: string;
}

export default function StockTransferEditPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = params.id as string;

  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [permissions, setPermissions] = useState<string[]>([]);

  const [form, setForm] = useState<FormData>({
    fromWarehouseId: "",
    toWarehouseId: "",
    transferDate: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [notDraftError, setNotDraftError] = useState(false);

  useEffect(() => {
    setIsLoadingAuth(true);
    setAuthError(null);
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        const cid = d.data?.companyId || null;
        const perms: string[] = d.data?.permissions || [];
        setUserCompanyId(cid);
        setPermissions(perms);
      })
      .catch(() => {
        setAuthError("تعذر تحميل بيانات المستخدم");
      })
      .finally(() => setIsLoadingAuth(false));
  }, []);

  const {
    data: transfer,
    isLoading: isLoadingTransfer,
    error: transferError,
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

  useEffect(() => {
    if (transfer) {
      if (transfer.status !== "DRAFT") {
        setNotDraftError(true);
        return;
      }
      setNotDraftError(false);
      setForm({
        fromWarehouseId: transfer.fromWarehouseId || "",
        toWarehouseId: transfer.toWarehouseId || "",
        transferDate: transfer.transferDate
          ? new Date(transfer.transferDate).toISOString().split("T")[0]
          : "",
        notes: transfer.notes || "",
      });
    }
  }, [transfer]);

  const canEdit =
    permissions.includes("stockTransfers.edit") || permissions.length === 0;

  const { data: warehouses } = useQuery({
    queryKey: ["warehouses", userCompanyId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (userCompanyId) params.append("companyId", userCompanyId);
      const res = await fetch(`/api/warehouses?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error("فشل تحميل المخازن");
      return json.data as Warehouse[];
    },
    enabled: !!userCompanyId,
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {};

      if (form.fromWarehouseId !== transfer?.fromWarehouseId) {
        payload.fromWarehouseId = form.fromWarehouseId;
      }
      if (form.toWarehouseId !== transfer?.toWarehouseId) {
        payload.toWarehouseId = form.toWarehouseId;
      }
      const origDate = transfer?.transferDate
        ? new Date(transfer.transferDate).toISOString().split("T")[0]
        : "";
      if (form.transferDate !== origDate) {
        payload.transferDate = form.transferDate || null;
      }
      if (form.notes !== (transfer?.notes || "")) {
        payload.notes = form.notes || null;
      }

      if (Object.keys(payload).length === 0) {
        throw new Error("لم يتم تغيير أي بيانات");
      }

      const res = await fetch(`/api/stock-transfers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل تحديث التحويل");
      return json.data;
    },
    onSuccess: () => {
      toast("تم تحديث التحويل بنجاح", "success");
      router.push(`/dashboard/warehouse-transfers/${id}`);
    },
    onError: (err: Error) => {
      toast(err.message, "error");
    },
  });

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!form.fromWarehouseId) e.fromWarehouseId = "المخزن المصدر مطلوب";
    if (!form.toWarehouseId) e.toWarehouseId = "المخزن الوجهة مطلوب";
    if (
      form.fromWarehouseId &&
      form.toWarehouseId &&
      form.fromWarehouseId === form.toWarehouseId
    ) {
      e.toWarehouseId = "المخزن الوجهة يجب أن يكون مختلفاً عن المصدر";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    updateMutation.mutate();
  };

  const isLoading = isLoadingAuth || isLoadingTransfer;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (authError || transferError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard/warehouse-transfers")}
            className="rounded-lg p-2 hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-dark">تعديل تحويل مخزن</h1>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center text-red-600">
          {authError || (transferError instanceof Error ? transferError.message : "فشل تحميل التحويل")}
        </div>
      </div>
    );
  }

  if (!transfer) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard/warehouse-transfers")}
            className="rounded-lg p-2 hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-dark">تعديل تحويل مخزن</h1>
        </div>
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-8 text-center text-yellow-700">
          التحويل غير موجود
        </div>
      </div>
    );
  }

  if (notDraftError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/dashboard/warehouse-transfers/${id}`)}
            className="rounded-lg p-2 hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-dark">تعديل تحويل مخزن</h1>
            <p className="text-sm text-gray-500">تعديل بيانات مسودة تحويل المخزن</p>
          </div>
        </div>
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-8 text-center text-orange-700">
          لا يمكن تعديل تحويل مخزن غير مسودة
        </div>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/dashboard/warehouse-transfers/${id}`)}
            className="rounded-lg p-2 hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-dark">تعديل تحويل مخزن</h1>
            <p className="text-sm text-gray-500">تعديل بيانات مسودة تحويل المخزن</p>
          </div>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center text-red-600">
          لا تملك صلاحية تعديل تحويل المخزن
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push(`/dashboard/warehouse-transfers/${id}`)}
          className="rounded-lg p-2 hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-dark">تعديل تحويل مخزن</h1>
          <p className="text-sm text-gray-500">
            تعديل بيانات مسودة تحويل المخزن
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>التحويل: {transfer.transferNumber}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="mb-1 block text-sm">المخزن المصدر *</Label>
                <select
                  value={form.fromWarehouseId}
                  onChange={(e) =>
                    setForm({ ...form, fromWarehouseId: e.target.value })
                  }
                  className={`w-full rounded-lg border border-border bg-white px-3 py-2 text-sm ${
                    errors.fromWarehouseId ? "border-red-300" : ""
                  }`}
                >
                  <option value="">— اختر المخزن —</option>
                  {(warehouses || []).map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </option>
                  ))}
                </select>
                {errors.fromWarehouseId && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.fromWarehouseId}
                  </p>
                )}
              </div>

              <div>
                <Label className="mb-1 block text-sm">المخزن الوجهة *</Label>
                <select
                  value={form.toWarehouseId}
                  onChange={(e) =>
                    setForm({ ...form, toWarehouseId: e.target.value })
                  }
                  className={`w-full rounded-lg border border-border bg-white px-3 py-2 text-sm ${
                    errors.toWarehouseId ? "border-red-300" : ""
                  }`}
                >
                  <option value="">— اختر المخزن —</option>
                  {(warehouses || []).map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </option>
                  ))}
                </select>
                {errors.toWarehouseId && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.toWarehouseId}
                  </p>
                )}
              </div>

              <div>
                <Label className="mb-1 block text-sm">التاريخ</Label>
                <Input
                  type="date"
                  value={form.transferDate}
                  onChange={(e) =>
                    setForm({ ...form, transferDate: e.target.value })
                  }
                />
              </div>

              <div>
                <Label className="mb-1 block text-sm">ملاحظات</Label>
                <textarea
                  value={form.notes}
                  onChange={(e) =>
                    setForm({ ...form, notes: e.target.value })
                  }
                  rows={3}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
                  placeholder="ملاحظات اختيارية..."
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() =>
                  router.push(`/dashboard/warehouse-transfers/${id}`)
                }
              >
                إلغاء
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "جاري الحفظ..." : "حفظ التعديلات"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* عرض البنود كمرجع فقط (غير قابلة للتعديل) */}
      {transfer.lines.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>بنود التحويل (قراءة فقط)</CardTitle>
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
                  </tr>
                </thead>
                <tbody>
                  {transfer.lines.map((line, idx) => (
                    <tr
                      key={line.id}
                      className="border-b border-border hover:bg-muted/30"
                    >
                      <td className="px-4 py-3 text-sm text-dark">{idx + 1}</td>
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
