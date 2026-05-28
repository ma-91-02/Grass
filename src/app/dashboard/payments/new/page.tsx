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
import { ArrowLeft } from "lucide-react";

export default function NewPaymentPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);

  const [supplierId, setSupplierId] = useState("");
  const [purchaseInvoiceId, setPurchaseInvoiceId] = useState("");
  const [paymentAccountId, setPaymentAccountId] = useState("");
  const [amount, setAmount] = useState(0);
  const [currency, setCurrency] = useState("IQD");
  const [paymentDate, setPaymentDate] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setPaymentDate(new Date().toISOString().slice(0, 10));
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUserCompanyId(d.data?.companyId || null))
      .catch(() => {});
  }, []);

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers", userCompanyId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (userCompanyId) params.append("companyId", userCompanyId);
      const res = await fetch(`/api/suppliers?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    enabled: !!userCompanyId,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["purchase-invoices-payments", userCompanyId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (userCompanyId) params.append("companyId", userCompanyId);
      params.append("limit", "100");
      const res = await fetch(`/api/purchases?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return (json.data?.data || []) as Array<{
        id: string;
        invoiceNumber: string;
        supplierId: string;
        remaining: number;
        currency: string;
      }>;
    },
    enabled: !!userCompanyId,
  });

  const filteredInvoices = invoices.filter(
    (inv) => inv.supplierId === supplierId && inv.remaining > 0,
  );

  const { data: paymentAccounts = [] } = useQuery({
    queryKey: ["payment-accounts"],
    queryFn: async () => {
      const res = await fetch("/api/payment-accounts");
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  const handleSubmit = async () => {
    if (!supplierId) {
      toast("يرجى اختيار المورد", "error");
      return;
    }
    if (amount <= 0) {
      toast("المبلغ يجب أن يكون أكبر من 0", "error");
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        supplierId,
        purchaseInvoiceId: purchaseInvoiceId || null,
        paymentAccountId: paymentAccountId || null,
        amount,
        currency,
        paymentDate: new Date(paymentDate).toISOString(),
        notes: notes || null,
      };

      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "فشل إنشاء الدفع");
      }
      toast("تم إنشاء الدفع بنجاح", "success");
      router.push("/dashboard/payments");
    } catch (err) {
      toast(err instanceof Error ? err.message : "فشل إنشاء الدفع", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/dashboard/payments")}
          className="rounded-lg p-2 hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <PageHeader title="دفع جديد" description="تسديد مستحقات مورد" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>معلومات الدفع</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label>المورد *</Label>
              <select
                value={supplierId}
                onChange={(e) => {
                  setSupplierId(e.target.value);
                  setPurchaseInvoiceId("");
                }}
                className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
              >
                <option value="">اختر المورد...</option>
                {suppliers.map(
                  (s: { id: string; name: string; code: string }) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ),
                )}
              </select>
            </div>
            <div>
              <Label>فاتورة الشراء (اختياري)</Label>
              <select
                value={purchaseInvoiceId}
                onChange={(e) => setPurchaseInvoiceId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
                disabled={!supplierId}
              >
                <option value="">اختر الفاتورة...</option>
                {filteredInvoices.map(
                  (inv: {
                    id: string;
                    invoiceNumber: string;
                    remaining: number;
                    currency: string;
                  }) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} — متبقي{" "}
                      {inv.remaining.toLocaleString()} {inv.currency}
                    </option>
                  ),
                )}
              </select>
            </div>
            <div>
              <Label>حساب الدفع</Label>
              <select
                value={paymentAccountId}
                onChange={(e) => setPaymentAccountId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
              >
                <option value="">اختر الحساب...</option>
                {paymentAccounts.map(
                  (pa: { id: string; name: string }) => (
                    <option key={pa.id} value={pa.id}>
                      {pa.name}
                    </option>
                  ),
                )}
              </select>
            </div>
            <div>
              <Label>المبلغ *</Label>
              <Input
                type="number"
                min={0.01}
                step={0.01}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
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
              <Label>التاريخ</Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
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
          <div className="flex justify-end">
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "جاري الحفظ..." : "حفظ الدفع"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
