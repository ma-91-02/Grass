"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { Trash2, Plus, ArrowLeft } from "lucide-react";

interface InvoiceLine {
  id: string;
  productId: string;
  productName: string | null;
  productCode: string | null;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  discountAmount: number;
  lineTotal: number;
  notes: string | null;
}

interface InvoiceData {
  id: string;
  companyId: string;
  invoiceNumber: string;
  invoiceDate: string;
  customerId: string | null;
  customerName: string | null;
  warehouseId: string | null;
  warehouseName: string | null;
  currency: string;
  paymentType: string;
  paid: number;
  discountPercent: number;
  discountAmount: number;
  notes: string | null;
  status: string;
  items: InvoiceLine[];
}

interface EditLine {
  productId: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  discountAmount: number;
  notes: string;
}

export default function EditSalesInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = params.id as string;
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUserCompanyId(d.data?.companyId || null))
      .catch((err) => console.error("Failed to fetch auth/me", err));
  }, []);

  const {
    data: invoice,
    isLoading: invoiceLoading,
    error: invoiceError,
  } = useQuery({
    queryKey: ["sales-invoice", id],
    queryFn: async () => {
      const res = await fetch(`/api/sales-invoices/${id}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل تحميل الفاتورة");
      return json.data as InvoiceData;
    },
    enabled: !!id,
  });

  const [customerId, setCustomerId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [paymentType, setPaymentType] = useState("CASH");
  const [currency, setCurrency] = useState("IQD");
  const [paid, setPaid] = useState(0);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<EditLine[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (invoice && !initialized) {
      setCustomerId(invoice.customerId || "");
      setWarehouseId(invoice.warehouseId || "");
      setPaymentType(invoice.paymentType);
      setCurrency(invoice.currency);
      setPaid(invoice.paid);
      setDiscountPercent(invoice.discountPercent);
      setDiscountAmount(invoice.discountAmount);
      setNotes(invoice.notes || "");
      setLines(
        invoice.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountPercent: item.discountPercent,
          discountAmount: item.discountAmount,
          notes: item.notes || "",
        })),
      );
      setInitialized(true);
    }
  }, [invoice, initialized]);

  const { data: customers = [] } = useQuery({
    queryKey: ["customers", userCompanyId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (userCompanyId) params.append("companyId", userCompanyId);
      const res = await fetch(`/api/customers?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    enabled: !!userCompanyId,
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ["warehouses", userCompanyId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (userCompanyId) params.append("companyId", userCompanyId);
      const res = await fetch(`/api/warehouses?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    enabled: !!userCompanyId,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products", userCompanyId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (userCompanyId) params.append("companyId", userCompanyId);
      const res = await fetch(`/api/products?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    enabled: !!userCompanyId,
  });

  const addLine = () => {
    setLines([
      ...lines,
      {
        productId: "",
        quantity: 1,
        unitPrice: 0,
        discountPercent: 0,
        discountAmount: 0,
        notes: "",
      },
    ]);
  };

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const updateLine = (
    index: number,
    field: keyof EditLine,
    value: string | number,
  ) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setLines(newLines);
  };

  const subtotal = lines.reduce((sum, line) => {
    const lineSub = line.quantity * line.unitPrice;
    const lineDisc =
      lineSub * (line.discountPercent / 100) + line.discountAmount;
    return sum + Math.max(0, lineSub - lineDisc);
  }, 0);

  const totalDiscount = subtotal * (discountPercent / 100) + discountAmount;
  const totalAfterTax = Math.max(0, subtotal - totalDiscount);

  if (invoiceLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (invoiceError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center text-red-600">
        {invoiceError instanceof Error
          ? invoiceError.message
          : "فشل تحميل الفاتورة"}
      </div>
    );
  }

  if (invoice && invoice.status !== "DRAFT") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/dashboard/sales-invoices/${id}`)}
            className="rounded-lg p-2 hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <PageHeader
            title="تعديل فاتورة بيع"
            description="لا يمكن تعديل فاتورة تم ترحيلها"
          />
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-8 text-center text-amber-700">
          لا يمكن تعديل فاتورة بحالة {invoice.status}. الفواتير المرحّلة غير
          قابلة للتعديل.
        </div>
        <Button onClick={() => router.push(`/dashboard/sales-invoices/${id}`)}>
          العودة إلى تفاصيل الفاتورة
        </Button>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!userCompanyId) {
      toast("لم يتم تحديد الشركة", "error");
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
        companyId: userCompanyId,
        customerId: customerId || null,
        warehouseId: warehouseId || null,
        currency,
        paymentType,
        paid: paymentType === "MIXED" ? paid : 0,
        discountPercent,
        discountAmount,
        notes: notes || null,
        lines: lines.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          discountPercent: l.discountPercent,
          discountAmount: l.discountAmount,
          notes: l.notes || null,
        })),
      };

      const res = await fetch(`/api/sales-invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "فشل تحديث الفاتورة");
      }
      toast("تم تحديث الفاتورة بنجاح", "success");
      router.push(`/dashboard/sales-invoices/${id}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "فشل تحديث الفاتورة", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push(`/dashboard/sales-invoices/${id}`)}
          className="rounded-lg p-2 hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <PageHeader
          title={`تعديل فاتورة ${invoice?.invoiceNumber || ""}`}
          description="تعديل بيانات فاتورة البيع"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>معلومات الفاتورة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label>العميل</Label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
              >
                <option value="">اختر العميل...</option>
                {customers.map((c: { id: string; name: string }) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>المخزن</Label>
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
              >
                <option value="">اختر المخزن...</option>
                {warehouses.map((w: { id: string; name: string }) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
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
              <Label>نوع الدفع</Label>
              <select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
              >
                <option value="CASH">نقدي</option>
                <option value="CREDIT">آجل</option>
                <option value="MIXED">مختلط</option>
              </select>
            </div>
          </div>

          {paymentType === "MIXED" && (
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
              <Label>خصم نسبة (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={discountPercent}
                onChange={(e) => setDiscountPercent(Number(e.target.value))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>خصم مبلغ</Label>
              <Input
                type="number"
                min={0}
                value={discountAmount}
                onChange={(e) => setDiscountAmount(Number(e.target.value))}
                className="mt-1"
              />
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
          <CardTitle>بنود الفاتورة</CardTitle>
          <Button type="button" variant="outline" onClick={addLine}>
            <Plus className="h-4 w-4" />
            إضافة بند
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {lines.length === 0 && (
            <p className="text-center text-sm text-gray-500">
              لا توجد بنود. أضف بنداً جديداً.
            </p>
          )}
          {lines.map((line, index) => (
            <div
              key={index}
              className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-6 items-end"
            >
              <div className="sm:col-span-2">
                <Label>المادة</Label>
                <select
                  value={line.productId}
                  onChange={(e) =>
                    updateLine(index, "productId", e.target.value)
                  }
                  className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
                >
                  <option value="">اختر المادة...</option>
                  {products.map(
                    (p: { id: string; name: string; code: string }) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.code})
                      </option>
                    ),
                  )}
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
                <Label>سعر الوحدة</Label>
                <Input
                  type="number"
                  min={0}
                  value={line.unitPrice}
                  onChange={(e) =>
                    updateLine(index, "unitPrice", Number(e.target.value))
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label>خصم %</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={line.discountPercent}
                  onChange={(e) =>
                    updateLine(index, "discountPercent", Number(e.target.value))
                  }
                  className="mt-1"
                />
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Label>المجموع</Label>
                  <div className="mt-1 rounded-lg bg-muted px-3 py-2 text-sm font-medium">
                    {(
                      line.quantity *
                        line.unitPrice *
                        (1 - line.discountPercent / 100) -
                      line.discountAmount
                    ).toLocaleString()}
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
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm text-gray-500">
                المجموع الفرعي:{" "}
                <span className="font-medium text-dark">
                  {subtotal.toLocaleString()}
                </span>
              </p>
              <p className="text-sm text-gray-500">
                الخصم:{" "}
                <span className="font-medium text-dark">
                  {totalDiscount.toLocaleString()}
                </span>
              </p>
              <p className="text-lg font-bold text-dark">
                الإجمالي: {totalAfterTax.toLocaleString()} {currency}
              </p>
            </div>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "جاري الحفظ..." : "حفظ التعديلات"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
