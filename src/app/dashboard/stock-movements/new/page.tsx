"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft } from "lucide-react";

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

interface FormData {
  productId: string;
  warehouseId: string;
  movementType: string;
  quantity: string;
  unitCost: string;
  currency: string;
  movementDate: string;
  notes: string;
}

const emptyForm: FormData = {
  productId: "",
  warehouseId: "",
  movementType: "ADJUSTMENT_IN",
  quantity: "1",
  unitCost: "",
  currency: "IQD",
  movementDate: new Date().toISOString().split("T")[0],
  notes: "",
};

const movementTypeOptions = [
  { value: "ADJUSTMENT_IN", label: "تسوية زيادة" },
  { value: "ADJUSTMENT_OUT", label: "تسوية نقص" },
  { value: "IN", label: "وارد" },
  { value: "OUT", label: "صادر" },
];

export default function StockMovementCreatePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState<FormData>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUserCompanyId(d.data?.companyId || null))
      .catch(() => {});
  }, []);

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
        productId: form.productId,
        warehouseId: form.warehouseId,
        movementType: form.movementType,
        quantity: Number(form.quantity),
        unitCost: form.unitCost ? Number(form.unitCost) : 0,
        currency: form.currency,
        movementDate: form.movementDate || undefined,
        notes: form.notes || null,
      };

      const res = await fetch("/api/stock-movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل إنشاء حركة المخزن");
      return json.data;
    },
    onSuccess: (data) => {
      toast("تم إنشاء حركة المخزن بنجاح", "success");
      router.push(`/dashboard/stock-movements/${data.id}`);
    },
    onError: (err: Error) => {
      toast(err.message, "error");
    },
  });

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!form.productId) e.productId = "المادة مطلوبة";
    if (!form.warehouseId) e.warehouseId = "المخزن مطلوب";
    if (!form.quantity || Number(form.quantity) <= 0)
      e.quantity = "الكمية يجب أن تكون أكبر من 0";
    if (form.unitCost && Number(form.unitCost) < 0)
      e.unitCost = "التكلفة لا يمكن أن تكون سالبة";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    createMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/dashboard/stock-movements")}
          className="rounded-lg p-2 hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-dark">تسوية مخزون جديدة</h1>
          <p className="text-sm text-gray-500">إنشاء حركة مخزن يدوية</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>بيانات الحركة</CardTitle>
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
                <Label className="mb-1 block text-sm">المادة *</Label>
                <select
                  value={form.productId}
                  onChange={(e) =>
                    setForm({ ...form, productId: e.target.value })
                  }
                  className={`w-full rounded-lg border border-border bg-white px-3 py-2 text-sm ${
                    errors.productId ? "border-red-300" : ""
                  }`}
                >
                  <option value="">— اختر المادة —</option>
                  {(products || []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code})
                    </option>
                  ))}
                </select>
                {errors.productId && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.productId}
                  </p>
                )}
              </div>

              <div>
                <Label className="mb-1 block text-sm">نوع الحركة *</Label>
                <select
                  value={form.movementType}
                  onChange={(e) =>
                    setForm({ ...form, movementType: e.target.value })
                  }
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
                >
                  {movementTypeOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="mb-1 block text-sm">التاريخ</Label>
                <Input
                  type="date"
                  value={form.movementDate}
                  onChange={(e) =>
                    setForm({ ...form, movementDate: e.target.value })
                  }
                />
              </div>

              <div>
                <Label className="mb-1 block text-sm">الكمية *</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="1"
                  value={form.quantity}
                  onChange={(e) =>
                    setForm({ ...form, quantity: e.target.value })
                  }
                  className={errors.quantity ? "border-red-300" : ""}
                />
                {errors.quantity && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.quantity}
                  </p>
                )}
              </div>

              <div>
                <Label className="mb-1 block text-sm">تكلفة الوحدة</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={form.unitCost}
                    onChange={(e) =>
                      setForm({ ...form, unitCost: e.target.value })
                    }
                    className={errors.unitCost ? "border-red-300" : ""}
                  />
                  <select
                    value={form.currency}
                    onChange={(e) =>
                      setForm({ ...form, currency: e.target.value })
                    }
                    className="w-24 rounded-lg border border-border bg-white px-3 py-2 text-sm"
                  >
                    <option value="IQD">IQD</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
                {errors.unitCost && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.unitCost}
                  </p>
                )}
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
                onClick={() => router.push("/dashboard/stock-movements")}
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending
                  ? "جاري الإنشاء..."
                  : "إنشاء حركة"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
