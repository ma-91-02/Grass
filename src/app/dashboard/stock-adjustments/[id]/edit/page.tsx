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

interface AdjustmentLine {
  id: string;
  product: { name: string; code: string } | null;
  quantity: number;
  unitCost: number;
  currency: string;
  notes: string | null;
}

interface StockAdjustmentDetail {
  id: string;
  adjustmentNumber: string;
  status: string;
  adjustmentType: string;
  adjustmentDate: string;
  reason: string | null;
  notes: string | null;
  warehouseId: string | null;
  warehouse: { name: string; code: string } | null;
  createdBy: { name: string } | null;
  lines: AdjustmentLine[];
}

interface FormData {
  warehouseId: string;
  adjustmentDate: string;
  reason: string;
  notes: string;
}

export default function StockAdjustmentEditPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = params.id as string;

  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [notDraftError, setNotDraftError] = useState(false);

  const [form, setForm] = useState<FormData>({
    warehouseId: "",
    adjustmentDate: "",
    reason: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

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

  const canEdit =
    permissions.includes("stockAdjustments.edit") || permissions.length === 0;

  const {
    data: adjustment,
    isLoading: isLoadingAdj,
    error: adjError,
  } = useQuery({
    queryKey: ["stock-adjustment", id],
    queryFn: async () => {
      const res = await fetch(`/api/stock-adjustments/${id}`);
      const json = await res.json();
      if (!json.success)
        throw new Error(json.error || "فشل تحميل التسوية");
      return json.data as StockAdjustmentDetail;
    },
  });

  useEffect(() => {
    if (adjustment) {
      if (adjustment.status !== "DRAFT") {
        setNotDraftError(true);
        return;
      }
      setNotDraftError(false);
      setForm({
        warehouseId: adjustment.warehouseId || "",
        adjustmentDate: adjustment.adjustmentDate
          ? new Date(adjustment.adjustmentDate).toISOString().split("T")[0]
          : "",
        reason: adjustment.reason || "",
        notes: adjustment.notes || "",
      });
    }
  }, [adjustment]);

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
      const payload: Record<string, unknown> = {
        warehouseId: form.warehouseId,
        adjustmentDate: form.adjustmentDate || null,
        reason: form.reason || null,
        notes: form.notes || null,
      };

      const res = await fetch(`/api/stock-adjustments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success)
        throw new Error(json.error || "فشل تحديث التسوية");
      return json.data;
    },
    onSuccess: () => {
      toast("تم تحديث التسوية بنجاح", "success");
      router.push(`/dashboard/stock-adjustments/${id}`);
    },
    onError: (err: Error) => {
      toast(err.message, "error");
    },
  });

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!form.warehouseId) e.warehouseId = "المخزن مطلوب";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    updateMutation.mutate();
  };

  const isLoading = isLoadingAuth || isLoadingAdj;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (authError || adjError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard/stock-adjustments")}
            className="rounded-lg p-2 hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-dark">تعديل تسوية مخزن</h1>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center text-red-600">
          {authError ||
            (adjError instanceof Error
              ? adjError.message
              : "فشل تحميل التسوية")}
        </div>
      </div>
    );
  }

  if (!adjustment) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard/stock-adjustments")}
            className="rounded-lg p-2 hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-dark">تعديل تسوية مخزن</h1>
        </div>
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-8 text-center text-yellow-700">
          التسوية غير موجودة
        </div>
      </div>
    );
  }

  if (notDraftError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/dashboard/stock-adjustments/${id}`)}
            className="rounded-lg p-2 hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-dark">تعديل تسوية مخزن</h1>
            <p className="text-sm text-gray-500">تعديل بيانات مسودة تسوية المخزن</p>
          </div>
        </div>
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-8 text-center text-orange-700">
          لا يمكن تعديل تسوية مخزن غير مسودة
        </div>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/dashboard/stock-adjustments/${id}`)}
            className="rounded-lg p-2 hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-dark">تعديل تسوية مخزن</h1>
            <p className="text-sm text-gray-500">تعديل بيانات مسودة تسوية المخزن</p>
          </div>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center text-red-600">
          لا تملك صلاحية تعديل تسوية المخزن
        </div>
      </div>
    );
  }

  const totalQty = adjustment.lines.reduce((s, l) => s + l.quantity, 0);
  const totalCost = adjustment.lines.reduce(
    (s, l) => s + l.quantity * (l.unitCost || 0),
    0,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push(`/dashboard/stock-adjustments/${id}`)}
          className="rounded-lg p-2 hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-dark">
            تعديل تسوية {adjustment.adjustmentNumber}
          </h1>
          <p className="text-sm text-gray-500">
            {adjustment.adjustmentType === "IN" ? "تسوية زيادة" : "تسوية نقص"}
            {" — "}
            {adjustment.warehouse?.name || ""}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>بيانات التسوية</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="mb-1 block text-sm">المخزن *</Label>
                <select
                  value={form.warehouseId}
                  onChange={(e) =>
                    setForm({ ...form, warehouseId: e.target.value })
                  }
                  className={`w-full rounded-lg border border-border bg-white px-3 py-2 text-sm ${
                    errors.warehouseId ? "border-red-300" : ""
                  }`}
                >
                  <option value="">— اختر المخزن —</option>
                  {(warehouses || []).map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </option>
                  ))}
                </select>
                {errors.warehouseId && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.warehouseId}
                  </p>
                )}
              </div>

              <div>
                <Label className="mb-1 block text-sm">التاريخ</Label>
                <Input
                  type="date"
                  value={form.adjustmentDate}
                  onChange={(e) =>
                    setForm({ ...form, adjustmentDate: e.target.value })
                  }
                />
              </div>

              <div>
                <Label className="mb-1 block text-sm">السبب</Label>
                <Input
                  placeholder="سبب التسوية..."
                  value={form.reason}
                  onChange={(e) =>
                    setForm({ ...form, reason: e.target.value })
                  }
                />
              </div>
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

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() =>
                  router.push(`/dashboard/stock-adjustments/${id}`)
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

      <Card>
        <CardHeader>
          <CardTitle>البنود (عرض فقط)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">#</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">المادة</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الكمية</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">تكلفة الوحدة</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {adjustment.lines.map((line, idx) => (
                  <tr key={line.id} className="border-b border-border hover:bg-muted/30">
                    <td className="px-4 py-3 text-sm text-dark">{idx + 1}</td>
                    <td className="px-4 py-3 text-sm text-dark">
                      <p className="font-medium">{line.product?.name || "—"}</p>
                      <p className="text-xs text-gray-500">{line.product?.code || ""}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-dark">{line.quantity.toLocaleString()}</td>
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
                {adjustment.lines.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">لا توجد بنود</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex justify-end gap-6 text-sm">
            <span className="text-gray-500">
              العدد: <strong>{adjustment.lines.length}</strong>
            </span>
            <span className="text-gray-500">
              إجمالي الكمية: <strong>{totalQty.toLocaleString()}</strong>
            </span>
            {totalCost > 0 && (
              <span className="text-gray-500">
                إجمالي التكلفة: <strong>{totalCost.toLocaleString()}</strong>
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
