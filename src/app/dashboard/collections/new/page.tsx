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

export default function NewCollectionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);

  const [customerId, setCustomerId] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [paymentAccountId, setPaymentAccountId] = useState("");
  const [amount, setAmount] = useState(0);
  const [currency, setCurrency] = useState("IQD");
  const [collectionDate, setCollectionDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUserCompanyId(d.data?.companyId || null))
      .catch(() => {});
  }, []);

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

  const { data: invoices = [] } = useQuery({
    queryKey: ["sales-invoices-collections", userCompanyId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (userCompanyId) params.append("companyId", userCompanyId);
      params.append("status", "POSTED");
      params.append("paymentType", "CREDIT");
      params.append("limit", "100");
      const res = await fetch(`/api/sales-invoices?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    enabled: !!userCompanyId,
  });

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
    if (!customerId) {
      toast("يرجى اختيار العميل", "error");
      return;
    }
    if (amount <= 0) {
      toast("المبلغ يجب أن يكون أكبر من 0", "error");
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        customerId,
        invoiceId: invoiceId || null,
        paymentAccountId: paymentAccountId || null,
        amount,
        currency,
        collectionDate: new Date(collectionDate).toISOString(),
        notes: notes || null,
      };

      const res = await fetch("/api/customer-collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "فشل إنشاء التحصيل");
      }
      toast("تم إنشاء التحصيل بنجاح", "success");
      router.push("/dashboard/collections");
    } catch (err) {
      toast(err instanceof Error ? err.message : "فشل إنشاء التحصيل", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/dashboard/collections")}
          className="rounded-lg p-2 hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <PageHeader title="تحصيل جديد" description="إنشاء تحصيل جديد من عميل" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>معلومات التحصيل</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label>العميل *</Label>
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
              <Label>الفاتورة (اختياري)</Label>
              <select
                value={invoiceId}
                onChange={(e) => setInvoiceId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
              >
                <option value="">اختر الفاتورة...</option>
                {invoices.map(
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
                {paymentAccounts.map((pa: { id: string; name: string }) => (
                  <option key={pa.id} value={pa.id}>
                    {pa.name}
                  </option>
                ))}
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
                value={collectionDate}
                onChange={(e) => setCollectionDate(e.target.value)}
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
              {submitting ? "جاري الحفظ..." : "حفظ التحصيل"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
