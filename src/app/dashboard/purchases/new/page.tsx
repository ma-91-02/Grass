"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { Trash2, Plus, ArrowLeft } from "lucide-react";
import type { SupplierData, WarehouseData, ProductData } from "@/types";

interface PurchaseLine {
  productId: string;
  productName: string;
  productCode: string;
  quantity: number;
  purchasePrice: number;
  totalPrice: number;
  productionDate: string;
  expiryDate: string;
}

export default function NewPurchasePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUserCompanyId(d.data?.companyId || null))
      .catch((err) => console.error("Failed to fetch auth/me", err));
  }, []);

  const [supplierId, setSupplierId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [currency, setCurrency] = useState("IQD");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paid, setPaid] = useState(0);
  const [purchaseDate, setPurchaseDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<PurchaseLine[]>([
    {
      productId: "",
      productName: "",
      productCode: "",
      quantity: 1,
      purchasePrice: 0,
      totalPrice: 0,
      productionDate: "",
      expiryDate: "",
    },
  ]);
  const [submitting, setSubmitting] = useState(false);

  const queryParams = userCompanyId
    ? `?companyId=${encodeURIComponent(userCompanyId)}`
    : "";

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers", userCompanyId],
    queryFn: async () => {
      const res = await fetch(`/api/suppliers${queryParams}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return (json.data || []).filter(
        (s: SupplierData) => s.isActive,
      ) as SupplierData[];
    },
    enabled: !!userCompanyId,
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ["warehouses", userCompanyId],
    queryFn: async () => {
      const res = await fetch(`/api/warehouses${queryParams}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return (json.data || []).filter(
        (w: WarehouseData) => w.isActive,
      ) as WarehouseData[];
    },
    enabled: !!userCompanyId,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products", userCompanyId],
    queryFn: async () => {
      const res = await fetch(`/api/products${queryParams}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return (json.data || []).filter(
        (p: ProductData) => p.isActive,
      ) as ProductData[];
    },
    enabled: !!userCompanyId,
  });

  const addLine = () => {
    setLines([
      ...lines,
      {
        productId: "",
        productName: "",
        productCode: "",
        quantity: 1,
        purchasePrice: 0,
        totalPrice: 0,
        productionDate: "",
        expiryDate: "",
      },
    ]);
  };

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const handleProductSelect = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (product) {
      const newLines = [...lines];
      const price = Number(product.purchasePrice) || 0;
      newLines[index] = {
        ...newLines[index],
        productId: product.id,
        productName: product.name,
        productCode: product.code,
        purchasePrice: price,
        totalPrice: newLines[index].quantity * price,
      };
      setLines(newLines);
    }
  };

  const updateLine = <K extends keyof PurchaseLine>(
    index: number,
    field: K,
    value: PurchaseLine[K],
  ) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    if (field === "quantity" || field === "purchasePrice") {
      const qty = Number(
        field === "quantity" ? value : newLines[index].quantity,
      );
      const price = Number(
        field === "purchasePrice" ? value : newLines[index].purchasePrice,
      );
      newLines[index].totalPrice = qty * price;
    }
    setLines(newLines);
  };

  const subtotal = lines.reduce((sum, line) => sum + line.totalPrice, 0);
  const totalCost = subtotal;

  const selectedSupplier = suppliers.find((s) => s.id === supplierId);

  const handleSubmit = async () => {
    if (!userCompanyId) {
      toast("لم يتم تحديد الشركة", "error");
      return;
    }
    if (!supplierId) {
      toast("يرجى اختيار المورد", "error");
      return;
    }
    if (!warehouseId) {
      toast("يرجى اختيار المخزن", "error");
      return;
    }
    if (lines.some((l) => !l.productId)) {
      toast("يرجى اختيار المادة لكل بند", "error");
      return;
    }
    if (lines.some((l) => l.quantity <= 0)) {
      toast("الكمية يجب أن تكون أكبر من 0", "error");
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        supplierId,
        warehouseId,
        currency,
        paymentMethod,
        paid: paymentMethod !== "CREDIT" ? paid : 0,
        supplierInvoiceNumber: supplierInvoiceNumber || null,
        purchaseDate,
        notes: notes || null,
        items: lines.map((l) => ({
          productId: l.productId,
          productName: l.productName,
          productCode: l.productCode,
          quantity: l.quantity,
          purchasePrice: l.purchasePrice,
          productionDate: l.productionDate || null,
          expiryDate: l.expiryDate || null,
          totalPrice: l.totalPrice,
        })),
        expenses: [],
      };

      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "فشل إنشاء فاتورة المشتريات");
      }
      toast("تم إنشاء فاتورة المشتريات بنجاح", "success");
      router.push("/dashboard/purchases");
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "فشل إنشاء فاتورة المشتريات",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/dashboard/purchases")}
          className="rounded-lg p-2 hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <PageHeader
          title="فاتورة مشتريات جديدة"
          description="إنشاء فاتورة شراء جديدة"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>معلومات الفاتورة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label>رقم فاتورة المورد</Label>
              <Input
                type="text"
                value={supplierInvoiceNumber}
                onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
                placeholder="اختياري"
                className="mt-1"
              />
            </div>
            <div>
              <Label>التاريخ</Label>
              <Input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>العملة</Label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
              >
                <option value="IQD">دينار عراقي</option>
                <option value="USD">دولار أمريكي</option>
              </select>
            </div>
            <div>
              <Label>طريقة الدفع</Label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
              >
                <option value="CASH">نقداً</option>
                <option value="CREDIT">على الحساب</option>
              </select>
            </div>
          </div>

          {paymentMethod !== "CREDIT" && (
            <div>
              <Label>المبلغ المدفوع</Label>
              <Input
                type="number"
                min={0}
                value={paid}
                onChange={(e) => setPaid(Number(e.target.value))}
                className="mt-1 max-w-xs"
              />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>المورد</Label>
              {suppliers.length === 0 ? (
                <div className="mt-1 rounded-lg border border-amber-200 bg-amber-50 p-2 text-sm text-amber-700">
                  لا يوجد موردون نشطون
                </div>
              ) : (
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
                >
                  <option value="">اختر المورد...</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              )}
              {selectedSupplier && selectedSupplier.accounts.length > 0 && (
                <div className="mt-1 text-xs text-gray-500">
                  الحسابات:{" "}
                  {selectedSupplier.accounts
                    .map(
                      (a) =>
                        `${a.currency === "IQD" ? "د.ع" : "$"} ${Number(a.balance).toLocaleString()}`,
                    )
                    .join(" | ")}
                </div>
              )}
            </div>
            <div>
              <Label>المخزن</Label>
              {warehouses.length === 0 ? (
                <div className="mt-1 rounded-lg border border-amber-200 bg-amber-50 p-2 text-sm text-amber-700">
                  لا يوجد مخازن نشطة
                </div>
              ) : (
                <select
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
                >
                  <option value="">اختر المخزن...</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div>
            <Label>ملاحظات</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>مواد الفاتورة</CardTitle>
          <Button type="button" variant="outline" onClick={addLine}>
            <Plus className="h-4 w-4" />
            إضافة مادة
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {products.length === 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-center text-sm text-amber-700">
              لا توجد مواد. الرجاء إضافة مواد أولاً.
            </div>
          ) : (
            lines.map((line, index) => (
              <div
                key={index}
                className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-7 items-end"
              >
                <div className="sm:col-span-2">
                  <Label>المادة</Label>
                  <select
                    value={line.productId}
                    onChange={(e) => handleProductSelect(index, e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
                  >
                    <option value="">اختر المادة...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>الكمية</Label>
                  <Input
                    type="number"
                    min={1}
                    value={line.quantity}
                    onChange={(e) =>
                      updateLine(index, "quantity", Number(e.target.value))
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>سعر الشراء</Label>
                  <Input
                    type="number"
                    min={0}
                    value={line.purchasePrice}
                    onChange={(e) =>
                      updateLine(index, "purchasePrice", Number(e.target.value))
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>تاريخ الإنتاج</Label>
                  <Input
                    type="date"
                    value={line.productionDate}
                    onChange={(e) =>
                      updateLine(index, "productionDate", e.target.value)
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>تاريخ الانتهاء</Label>
                  <Input
                    type="date"
                    value={line.expiryDate}
                    onChange={(e) =>
                      updateLine(index, "expiryDate", e.target.value)
                    }
                    className="mt-1"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Label>الإجمالي</Label>
                    <div className="mt-1 rounded-lg bg-muted px-3 py-2 text-sm font-medium">
                      {line.totalPrice.toLocaleString()}
                    </div>
                  </div>
                  {lines.length > 1 && (
                    <button
                      onClick={() => removeLine(index)}
                      className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm text-gray-500">
                إجمالي المواد:{" "}
                <span className="font-medium text-dark">
                  {subtotal.toLocaleString()}
                </span>
              </p>
              <p className="text-lg font-bold text-dark">
                إجمالي الكلفة: {totalCost.toLocaleString()}{" "}
                {currency === "USD" ? "$" : "د.ع"}
              </p>
            </div>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "جاري الحفظ..." : "حفظ الفاتورة"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
