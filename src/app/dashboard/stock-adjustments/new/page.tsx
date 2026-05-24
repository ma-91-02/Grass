"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

interface Product {
  id: string;
  name: string;
  code: string;
  productType: string;
}

interface Warehouse {
  id: string;
  name: string;
  code: string;
}

interface LineData {
  productId: string;
  quantity: string;
  unitCost: string;
  currency: string;
  notes: string;
}

interface FormData {
  warehouseId: string;
  adjustmentType: string;
  adjustmentDate: string;
  reason: string;
  notes: string;
  lines: LineData[];
}

const emptyLine = (dateStr: string): LineData => ({
  productId: "",
  quantity: "1",
  unitCost: "",
  currency: "IQD",
  notes: "",
});

const emptyForm = (dateStr: string): FormData => ({
  warehouseId: "",
  adjustmentType: "IN",
  adjustmentDate: dateStr,
  reason: "",
  notes: "",
  lines: [emptyLine(dateStr)],
});

export default function StockAdjustmentCreatePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [form, setForm] = useState<FormData>(emptyForm(""));
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  useEffect(() => {
    setIsLoadingAuth(true);
    setAuthError(null);
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        const cid = d.data?.companyId || null;
        if (!cid) {
          setAuthError("لم يتم العثور على شركة مرتبطة بالمستخدم");
        }
        setUserCompanyId(cid);
      })
      .catch(() => {
        setAuthError("تعذر تحميل بيانات الشركة");
      })
      .finally(() => setIsLoadingAuth(false));
  }, []);

  useEffect(() => {
    if (!isLoadingAuth && !authError && userCompanyId) {
      setForm((prev) =>
        prev.adjustmentDate === ""
          ? { ...prev, adjustmentDate: new Date().toISOString().split("T")[0] }
          : prev,
      );
    }
  }, [isLoadingAuth, authError, userCompanyId]);

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

  const { data: products } = useQuery({
    queryKey: ["products", userCompanyId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (userCompanyId) params.append("companyId", userCompanyId);
      const res = await fetch(`/api/products?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error("فشل تحميل المواد");
      const allProducts = json.data as Product[];
      return allProducts.filter((p) => p.productType !== "SERVICE");
    },
    enabled: !!userCompanyId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        companyId: userCompanyId,
        warehouseId: form.warehouseId,
        adjustmentType: form.adjustmentType,
        adjustmentDate: form.adjustmentDate || undefined,
        reason: form.reason || null,
        notes: form.notes || null,
        lines: form.lines.map((line) => ({
          productId: line.productId,
          quantity: Number(line.quantity),
          unitCost: line.unitCost ? Number(line.unitCost) : 0,
          currency: line.currency,
          notes: line.notes || null,
        })),
      };

      const res = await fetch("/api/stock-adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success)
        throw new Error(json.error || "فشل إنشاء التسوية");
      return json.data;
    },
    onSuccess: () => {
      toast("تم إنشاء التسوية بنجاح", "success");
      router.push("/dashboard/stock-adjustments");
    },
    onError: (err: Error) => {
      toast(err.message, "error");
    },
  });

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.warehouseId) e.warehouseId = "المخزن مطلوب";
    if (!form.adjustmentType) e.adjustmentType = "نوع التسوية مطلوب";

    form.lines.forEach((line, idx) => {
      if (!line.productId) e[`line_${idx}_product`] = "المادة مطلوبة";
      if (!line.quantity || Number(line.quantity) <= 0)
        e[`line_${idx}_quantity`] = "الكمية يجب أن تكون أكبر من 0";
      if (line.unitCost && Number(line.unitCost) < 0)
        e[`line_${idx}_unitCost`] = "التكلفة لا يمكن أن تكون سالبة";
    });

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    createMutation.mutate();
  };

  const addLine = () => {
    setForm({
      ...form,
      lines: [...form.lines, emptyLine(form.adjustmentDate)],
    });
  };

  const removeLine = (idx: number) => {
    if (form.lines.length <= 1) return;
    setForm({
      ...form,
      lines: form.lines.filter((_, i) => i !== idx),
    });
  };

  const updateLine = (idx: number, field: keyof LineData, value: string) => {
    const newLines = [...form.lines];
    newLines[idx] = { ...newLines[idx], [field]: value };
    setForm({ ...form, lines: newLines });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/dashboard/stock-adjustments")}
          className="rounded-lg p-2 hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-dark">تسوية مخزن جديدة</h1>
          <p className="text-sm text-gray-500">إنشاء تسوية كمية (زيادة أو نقص)</p>
        </div>
      </div>

      {isLoadingAuth && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </CardContent>
        </Card>
      )}

      {authError && !isLoadingAuth && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-600">
          {authError}
        </div>
      )}

      {!isLoadingAuth && !authError && (
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
                  <Label className="mb-1 block text-sm">نوع التسوية *</Label>
                  <select
                    value={form.adjustmentType}
                    onChange={(e) =>
                      setForm({ ...form, adjustmentType: e.target.value })
                    }
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
                  >
                    <option value="IN">تسوية زيادة</option>
                    <option value="OUT">تسوية نقص</option>
                  </select>
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
                  rows={2}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
                  placeholder="ملاحظات اختيارية..."
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">البنود</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addLine}
                  >
                    <Plus className="ml-1 h-4 w-4" />
                    إضافة بند
                  </Button>
                </div>

                {form.lines.map((line, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-border bg-muted/30 p-3"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium">
                        بند #{idx + 1}
                      </span>
                      {form.lines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLine(idx)}
                          className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label className="mb-1 block text-xs">المادة *</Label>
                        <select
                          value={line.productId}
                          onChange={(e) =>
                            updateLine(idx, "productId", e.target.value)
                          }
                          className={`w-full rounded-lg border border-border bg-white px-3 py-2 text-sm ${
                            errors[`line_${idx}_product`]
                              ? "border-red-300"
                              : ""
                          }`}
                        >
                          <option value="">— اختر المادة —</option>
                          {(products || []).map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.code})
                            </option>
                          ))}
                        </select>
                        {errors[`line_${idx}_product`] && (
                          <p className="mt-1 text-xs text-red-500">
                            {errors[`line_${idx}_product`]}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label className="mb-1 block text-xs">الكمية *</Label>
                        <Input
                          type="number"
                          min="1"
                          placeholder="1"
                          value={line.quantity}
                          onChange={(e) =>
                            updateLine(idx, "quantity", e.target.value)
                          }
                          className={
                            errors[`line_${idx}_quantity`]
                              ? "border-red-300"
                              : ""
                          }
                        />
                        {errors[`line_${idx}_quantity`] && (
                          <p className="mt-1 text-xs text-red-500">
                            {errors[`line_${idx}_quantity`]}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label className="mb-1 block text-xs">
                          تكلفة الوحدة
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={line.unitCost}
                            onChange={(e) =>
                              updateLine(idx, "unitCost", e.target.value)
                            }
                            className={
                              errors[`line_${idx}_unitCost`]
                                ? "border-red-300"
                                : ""
                            }
                          />
                          <select
                            value={line.currency}
                            onChange={(e) =>
                              updateLine(idx, "currency", e.target.value)
                            }
                            className="w-24 rounded-lg border border-border bg-white px-3 py-2 text-sm"
                          >
                            <option value="IQD">IQD</option>
                            <option value="USD">USD</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <Label className="mb-1 block text-xs">ملاحظات</Label>
                        <Input
                          placeholder="ملاحظات البند..."
                          value={line.notes}
                          onChange={(e) =>
                            updateLine(idx, "notes", e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() =>
                    router.push("/dashboard/stock-adjustments")
                  }
                >
                  إلغاء
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending
                    ? "جاري الإنشاء..."
                    : "إنشاء تسوية"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
