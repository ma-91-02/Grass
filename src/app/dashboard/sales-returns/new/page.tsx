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
import { ArrowLeft, Trash2, Plus } from "lucide-react";

interface Line {
  originalInvoiceItemId: string;
  productId: string;
  quantity: number;
  notes: string;
}

export default function NewSalesReturnPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);

  const [originalInvoiceId, setOriginalInvoiceId] = useState("");
  const [currency, setCurrency] = useState("IQD");
  const [returnDate, setReturnDate] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReturnDate(new Date().toISOString().slice(0, 10));
  }, []);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUserCompanyId(d.data?.companyId || null))
      .catch(() => {});
  }, []);

  const { data: invoices = [] } = useQuery({
    queryKey: ["posted-invoices", userCompanyId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (userCompanyId) params.append("companyId", userCompanyId);
      params.append("status", "POSTED");
      params.append("limit", "100");
      const res = await fetch(`/api/sales-invoices?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data?.data || [];
    },
    enabled: !!userCompanyId,
  });

  const selectedInvoice = invoices.find(
    (inv: { id: string }) => inv.id === originalInvoiceId,
  );

  const updateLine = (
    index: number,
    field: keyof Line,
    value: string | number,
  ) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setLines(newLines);
  };

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!originalInvoiceId) {
      toast("يرجى اختيار الفاتورة الأصلية", "error");
      return;
    }
    if (lines.length === 0) {
      toast("يرجى إضافة بنود المرتجع", "error");
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
        originalInvoiceId,
        returnDate: new Date(returnDate).toISOString(),
        currency,
        notes: notes || null,
        lines: lines.map((l) => ({
          originalInvoiceItemId: l.originalInvoiceItemId,
          productId: l.productId,
          quantity: l.quantity,
          notes: l.notes || null,
        })),
      };

      const res = await fetch("/api/sales-returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "فشل إنشاء المرتجع");
      }
      toast("تم إنشاء المرتجع بنجاح", "success");
      router.push(`/dashboard/sales-returns/${json.data.id}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "فشل إنشاء المرتجع", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/dashboard/sales-returns")}
          className="rounded-lg p-2 hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <PageHeader
          title="مرتجع بيع جديد"
          description="إنشاء مرتجع من فاتورة أصلية"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>معلومات المرتجع</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label>الفاتورة الأصلية *</Label>
              <select
                value={originalInvoiceId}
                onChange={(e) => {
                  const val = e.target.value;
                  setOriginalInvoiceId(val);
                  const inv = invoices.find(
                    (i: { id: string }) => i.id === val,
                  );
                  if (inv && inv.items) {
                    setLines(
                      inv.items.map(
                        (item: {
                          id: string;
                          productId: string;
                          quantity: number;
                        }) => ({
                          originalInvoiceItemId: item.id,
                          productId: item.productId,
                          quantity: 1,
                          notes: "",
                        }),
                      ),
                    );
                    setCurrency(inv.currency || "IQD");
                  } else {
                    setLines([]);
                  }
                }}
                className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
              >
                <option value="">اختر الفاتورة...</option>
                {invoices.map(
                  (inv: {
                    id: string;
                    invoiceNumber: string;
                    customerName: string;
                    totalAfterTax: number;
                    currency: string;
                  }) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} — {inv.customerName || "—"} —{" "}
                      {inv.totalAfterTax.toLocaleString()} {inv.currency}
                    </option>
                  ),
                )}
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
              <Label>التاريخ</Label>
              <Input
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
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

      {selectedInvoice && lines.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>بنود المرتجع</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lines.map((line, index) => {
              const item = selectedInvoice.items?.find(
                (i: { id: string }) => i.id === line.originalInvoiceItemId,
              );
              return (
                <div
                  key={index}
                  className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-4 items-end"
                >
                  <div className="sm:col-span-2">
                    <Label>المادة</Label>
                    <div className="mt-1 rounded-lg bg-muted px-3 py-2 text-sm">
                      {item?.productName || "—"} ({item?.productCode || "—"})
                    </div>
                  </div>
                  <div>
                    <Label>{`الكمية المرجعة (من أصل ${item?.quantity || 0})`}</Label>
                    <Input
                      type="number"
                      min={1}
                      max={item?.quantity || 999}
                      value={line.quantity}
                      onChange={(e) =>
                        updateLine(index, "quantity", Number(e.target.value))
                      }
                      className="mt-1"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Label>ملاحظات</Label>
                      <Input
                        value={line.notes}
                        onChange={(e) =>
                          updateLine(index, "notes", e.target.value)
                        }
                        className="mt-1"
                      />
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
              );
            })}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? "جاري الحفظ..." : "حفظ المرتجع"}
        </Button>
      </div>
    </div>
  );
}
