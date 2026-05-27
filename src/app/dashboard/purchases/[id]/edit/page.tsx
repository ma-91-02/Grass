"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft, Trash2, Plus } from "lucide-react";
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

interface PurchaseExpense {
  name: string;
  amount: number;
  currency: string;
  amountInInvoiceCurrency: number;
}

interface PurchaseInvoiceDetail {
  id: string;
  invoiceNumber: string;
  supplierInvoiceNumber: string | null;
  purchaseDate: string;
  currency: string;
  exchangeRateValue: number;
  supplierId: string;
  supplierName: string | null;
  warehouseId: string;
  warehouseName: string | null;
  notes: string | null;
  subtotal: number;
  totalExpenses: number;
  totalCost: number;
  paymentMethod: string;
  paid: number;
  remaining: number;
  paymentAccountId: string | null;
  paymentAccountName: string | null;
  status: string;
  items: {
    id: string;
    productId: string | null;
    productName: string;
    productCode: string;
    quantity: number;
    purchasePrice: number;
    totalPrice: number;
    productionDate: string | null;
    expiryDate: string | null;
  }[];
  expenses: PurchaseExpense[];
  createdAt: string;
}

interface FormData {
  supplierInvoiceNumber: string;
  purchaseDate: string;
  currency: string;
  exchangeRateValue: string;
  supplierId: string;
  warehouseId: string;
  notes: string;
  paymentMethod: string;
  paid: string;
  paymentAccountId: string;
}

export default function EditPurchasePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = params.id as string;

  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [notAllowedError, setNotAllowedError] = useState(false);

  const [form, setForm] = useState<FormData>({
    supplierInvoiceNumber: "",
    purchaseDate: "",
    currency: "IQD",
    exchangeRateValue: "0",
    supplierId: "",
    warehouseId: "",
    notes: "",
    paymentMethod: "CASH",
    paid: "0",
    paymentAccountId: "",
  });
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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [lineErrors, setLineErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setAuthError(null);
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        setUserCompanyId(d.data?.companyId || null);
        setPermissions(d.data?.permissions || []);
      })
      .catch(() => {
        setAuthError("تعذر التحقق من الصلاحيات");
      });
  }, []);

  const canEdit =
    permissions.includes("purchases.edit") || permissions.length === 0;

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

  const {
    data: invoice,
    isLoading: loadingInvoice,
    error: invoiceError,
  } = useQuery({
    queryKey: ["purchase-invoice", id],
    queryFn: async () => {
      const res = await fetch(`/api/purchases/${id}`);
      const json = await res.json();
      if (!json.success)
        throw new Error(json.error || "فشل تحميل فاتورة المشتريات");
      return json.data as PurchaseInvoiceDetail;
    },
  });

  useEffect(() => {
    if (!invoice) return;
    if (invoice.status !== "DRAFT") {
      setNotAllowedError(true);
      return;
    }
    setNotAllowedError(false);
    setForm({
      supplierInvoiceNumber: invoice.supplierInvoiceNumber || "",
      purchaseDate: invoice.purchaseDate
        ? new Date(invoice.purchaseDate).toISOString().split("T")[0]
        : "",
      currency: invoice.currency,
      exchangeRateValue: String(invoice.exchangeRateValue || 0),
      supplierId: invoice.supplierId || "",
      warehouseId: invoice.warehouseId || "",
      notes: invoice.notes || "",
      paymentMethod: invoice.paymentMethod,
      paid: String(invoice.paid || 0),
      paymentAccountId: invoice.paymentAccountId || "",
    });
    if (invoice.items && invoice.items.length > 0) {
      setLines(
        invoice.items.map((item) => ({
          productId: item.productId || "",
          productName: item.productName,
          productCode: item.productCode,
          quantity: item.quantity,
          purchasePrice: item.purchasePrice,
          totalPrice: item.totalPrice,
          productionDate: item.productionDate
            ? new Date(item.productionDate).toISOString().split("T")[0]
            : "",
          expiryDate: item.expiryDate
            ? new Date(item.expiryDate).toISOString().split("T")[0]
            : "",
        })),
      );
    }
  }, [invoice]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        supplierInvoiceNumber: form.supplierInvoiceNumber || null,
        purchaseDate: form.purchaseDate || null,
        currency: form.currency,
        exchangeRateValue: Number(form.exchangeRateValue) || 0,
        supplierId: form.supplierId,
        warehouseId: form.warehouseId,
        notes: form.notes || null,
        paymentMethod: form.paymentMethod,
        paid: Number(form.paid) || 0,
        paymentAccountId: form.paymentAccountId || null,
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

      const res = await fetch(`/api/purchases/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success)
        throw new Error(json.error || "فشل تعديل فاتورة المشتريات");
      return json.data;
    },
    onSuccess: () => {
      toast("تم تعديل فاتورة المشتريات بنجاح", "success");
      router.push(`/dashboard/purchases/${id}`);
    },
    onError: (err: Error) => {
      toast(err.message, "error");
    },
  });

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

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    const le: Record<string, string> = {};

    if (!form.supplierId) e.supplierId = "المورد مطلوب";
    if (!form.warehouseId) e.warehouseId = "المخزن مطلوب";
    if (!form.purchaseDate) e.purchaseDate = "التاريخ مطلوب";

    if (lines.some((l) => !l.productId)) le.products = "يرجى اختيار المادة لكل بند";
    if (lines.some((l) => l.quantity <= 0)) le.quantity = "الكمية يجب أن تكون أكبر من 0";

    setErrors(e);
    setLineErrors(le);
    return Object.keys(e).length === 0 && Object.keys(le).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (lines.length === 0) {
      toast("يجب إضافة مادة واحدة على الأقل", "error");
      return;
    }
    updateMutation.mutate();
  };

  const subtotal = lines.reduce((sum, l) => sum + l.totalPrice, 0);
  const isLoading = loadingInvoice || !userCompanyId;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (authError || invoiceError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard/purchases")}
            className="rounded-lg p-2 hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-dark">تعديل فاتورة شراء</h1>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center text-red-600">
          {authError ||
            (invoiceError instanceof Error
              ? invoiceError.message
              : "فشل تحميل فاتورة المشتريات")}
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard/purchases")}
            className="rounded-lg p-2 hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-dark">تعديل فاتورة شراء</h1>
        </div>
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-8 text-center text-yellow-700">
          فاتورة المشتريات غير موجودة
        </div>
      </div>
    );
  }

  if (notAllowedError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/dashboard/purchases/${id}`)}
            className="rounded-lg p-2 hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-dark">تعديل فاتورة شراء</h1>
            <p className="text-sm text-gray-500">تعديل بيانات مسودة فاتورة الشراء</p>
          </div>
        </div>
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-8 text-center text-orange-700">
          لا يمكن تعديل فاتورة شراء غير مسودة
        </div>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/dashboard/purchases/${id}`)}
            className="rounded-lg p-2 hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-dark">تعديل فاتورة شراء</h1>
            <p className="text-sm text-gray-500">تعديل بيانات مسودة فاتورة الشراء</p>
          </div>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center text-red-600">
          لا تملك صلاحية تعديل فاتورة المشتريات
        </div>
      </div>
    );
  }

  const selectedSupplier = suppliers.find((s) => s.id === form.supplierId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push(`/dashboard/purchases/${id}`)}
          className="rounded-lg p-2 hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-dark">تعديل فاتورة شراء</h1>
          <p className="text-sm text-gray-500">
            تعديل بيانات مسودة فاتورة الشراء — {invoice.invoiceNumber}
          </p>
        </div>
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
                value={form.supplierInvoiceNumber}
                onChange={(e) =>
                  setForm({ ...form, supplierInvoiceNumber: e.target.value })
                }
                placeholder="اختياري"
                className="mt-1"
              />
            </div>
            <div>
              <Label>التاريخ *</Label>
              <Input
                type="date"
                value={form.purchaseDate}
                onChange={(e) =>
                  setForm({ ...form, purchaseDate: e.target.value })
                }
                className={`mt-1 ${errors.purchaseDate ? "border-red-300" : ""}`}
              />
              {errors.purchaseDate && (
                <p className="mt-1 text-xs text-red-500">{errors.purchaseDate}</p>
              )}
            </div>
            <div>
              <Label>العملة *</Label>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
              >
                <option value="IQD">دينار عراقي</option>
                <option value="USD">دولار أمريكي</option>
              </select>
            </div>
            <div>
              <Label>طريقة الدفع *</Label>
              <select
                value={form.paymentMethod}
                onChange={(e) =>
                  setForm({ ...form, paymentMethod: e.target.value })
                }
                className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
              >
                <option value="CASH">نقداً</option>
                <option value="CREDIT">على الحساب</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>المورد *</Label>
              {suppliers.length === 0 ? (
                <div className="mt-1 rounded-lg border border-amber-200 bg-amber-50 p-2 text-sm text-amber-700">
                  لا يوجد موردون نشطون
                </div>
              ) : (
                <select
                  value={form.supplierId}
                  onChange={(e) =>
                    setForm({ ...form, supplierId: e.target.value })
                  }
                  className={`mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm ${
                    errors.supplierId ? "border-red-300" : ""
                  }`}
                >
                  <option value="">اختر المورد...</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              )}
              {errors.supplierId && (
                <p className="mt-1 text-xs text-red-500">{errors.supplierId}</p>
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
              <Label>المخزن *</Label>
              {warehouses.length === 0 ? (
                <div className="mt-1 rounded-lg border border-amber-200 bg-amber-50 p-2 text-sm text-amber-700">
                  لا يوجد مخازن نشطة
                </div>
              ) : (
                <select
                  value={form.warehouseId}
                  onChange={(e) =>
                    setForm({ ...form, warehouseId: e.target.value })
                  }
                  className={`mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm ${
                    errors.warehouseId ? "border-red-300" : ""
                  }`}
                >
                  <option value="">اختر المخزن...</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </option>
                  ))}
                </select>
              )}
              {errors.warehouseId && (
                <p className="mt-1 text-xs text-red-500">{errors.warehouseId}</p>
              )}
            </div>
          </div>

          <div>
            <Label>ملاحظات</Label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
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
          {lineErrors.products && (
            <p className="text-xs text-red-500">{lineErrors.products}</p>
          )}
          {lineErrors.quantity && (
            <p className="text-xs text-red-500">{lineErrors.quantity}</p>
          )}
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
                إجمالي الكلفة: {subtotal.toLocaleString()}{" "}
                {form.currency === "USD" ? "$" : "د.ع"}
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/purchases/${id}`)}
              >
                إلغاء
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? "جاري الحفظ..." : "حفظ التعديلات"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
