"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft, Printer, Send, Trash2 } from "lucide-react";

interface InvoiceItem {
  id: string;
  productName: string | null;
  productCode: string | null;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  discountAmount: number;
  lineTotal: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  customer: { name: string; code: string } | null;
  warehouse: { name: string; code: string } | null;
  currency: string;
  paymentType: string;
  totalBeforeTax: number;
  taxAmount: number;
  discountAmount: number;
  discountPercent: number;
  totalAfterTax: number;
  paid: number;
  remaining: number;
  status: string;
  notes: string | null;
  items: InvoiceItem[];
  createdAt: string;
}

export default function SalesInvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const qc = useQueryClient();
  const id = params.id as string;

  const {
    data: invoice,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["sales-invoice", id],
    queryFn: async () => {
      const res = await fetch(`/api/sales-invoices/${id}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل تحميل الفاتورة");
      return json.data as Invoice;
    },
  });

  const postMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/sales-invoices/${id}/post`, {
        method: "POST",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل ترحيل الفاتورة");
      return json.data;
    },
    onSuccess: () => {
      toast("تم ترحيل الفاتورة بنجاح", "success");
      qc.invalidateQueries({ queryKey: ["sales-invoice", id] });
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/sales-invoices/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل حذف الفاتورة");
      return json.data;
    },
    onSuccess: () => {
      toast("تم حذف الفاتورة بنجاح", "success");
      router.push("/dashboard/sales-invoices");
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center text-red-600">
        {error instanceof Error ? error.message : "فشل تحميل الفاتورة"}
      </div>
    );
  }

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; color: string }> = {
      DRAFT: { label: "مسودة", color: "bg-gray-100 text-gray-700" },
      POSTED: { label: "مرحّل", color: "bg-green-100 text-green-700" },
      CANCELLED: { label: "ملغى", color: "bg-red-100 text-red-700" },
    };
    const s = map[status] || { label: status, color: "bg-gray-100" };
    return <Badge className={s.color}>{s.label}</Badge>;
  };

  const paymentLabel = (type: string) => {
    const map: Record<string, string> = {
      CASH: "نقدي",
      CREDIT: "آجل",
      MIXED: "مختلط",
    };
    return map[type] || type;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/dashboard/sales-invoices")}
          className="rounded-lg p-2 hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-dark">
            فاتورة {invoice.invoiceNumber}
          </h1>
          <p className="text-sm text-gray-500">{statusBadge(invoice.status)}</p>
        </div>
        <div className="flex gap-2">
          {invoice.status === "DRAFT" && (
            <>
              <Button
                variant="outline"
                onClick={() =>
                  window.open(`/api/sales-invoices/${id}/print`, "_blank")
                }
              >
                <Printer className="h-4 w-4" />
                معاينة
              </Button>
              <Button
                onClick={() => postMutation.mutate()}
                disabled={postMutation.isPending}
              >
                <Send className="h-4 w-4" />
                {postMutation.isPending ? "جاري الترحيل..." : "ترحيل"}
              </Button>
            </>
          )}
          {invoice.status === "POSTED" && (
            <Button
              variant="outline"
              onClick={() =>
                window.open(`/api/sales-invoices/${id}/print`, "_blank")
              }
            >
              <Printer className="h-4 w-4" />
              طباعة
            </Button>
          )}
          {invoice.status === "DRAFT" && (
            <Button
              variant="danger"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4" />
              حذف
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>تفاصيل الفاتورة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-gray-500">العميل</p>
                <p className="font-medium">{invoice.customer?.name || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">المخزن</p>
                <p className="font-medium">{invoice.warehouse?.name || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">التاريخ</p>
                <p className="font-medium">
                  {new Date(invoice.invoiceDate).toLocaleDateString("ar-IQ")}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">نوع الدفع</p>
                <p className="font-medium">
                  {paymentLabel(invoice.paymentType)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">العملة</p>
                <p className="font-medium">{invoice.currency}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">الحالة</p>
                <p className="font-medium">{statusBadge(invoice.status)}</p>
              </div>
            </div>
            {invoice.notes && (
              <div>
                <p className="text-sm text-gray-500">ملاحظات</p>
                <p className="font-medium">{invoice.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ملخص المبالغ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">المجموع الفرعي</span>
              <span className="font-medium">
                {invoice.totalBeforeTax.toLocaleString()} {invoice.currency}
              </span>
            </div>
            {invoice.discountPercent > 0 && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">
                  خصم ({invoice.discountPercent}%)
                </span>
                <span className="font-medium text-red-600">
                  -
                  {(
                    (invoice.totalBeforeTax * invoice.discountPercent) /
                    100
                  ).toLocaleString()}
                </span>
              </div>
            )}
            {invoice.discountAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">خصم ثابت</span>
                <span className="font-medium text-red-600">
                  -{invoice.discountAmount.toLocaleString()}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">الضريبة</span>
              <span className="font-medium">
                {invoice.taxAmount.toLocaleString()}
              </span>
            </div>
            <div className="border-t pt-2">
              <div className="flex justify-between">
                <span className="font-bold">الإجمالي</span>
                <span className="font-bold text-primary">
                  {invoice.totalAfterTax.toLocaleString()} {invoice.currency}
                </span>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">المدفوع</span>
              <span className="font-medium text-green-600">
                {invoice.paid.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">المتبقي</span>
              <span className="font-medium text-amber-600">
                {invoice.remaining.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>بنود الفاتورة</CardTitle>
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
                    سعر الوحدة
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                    الخصم
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                    المجموع
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, idx) => (
                  <tr
                    key={item.id}
                    className="border-b border-border hover:bg-muted/30"
                  >
                    <td className="px-4 py-3 text-sm text-dark">{idx + 1}</td>
                    <td className="px-4 py-3 text-sm text-dark">
                      <p className="font-medium">{item.productName || "—"}</p>
                      <p className="text-xs text-gray-500">
                        {item.productCode || "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-sm text-dark">
                      {item.quantity.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-dark">
                      {item.unitPrice.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-dark">
                      {item.discountPercent > 0 && (
                        <span className="text-red-600">
                          {item.discountPercent}%
                        </span>
                      )}
                      {item.discountAmount > 0 && (
                        <span className="text-red-600">
                          {" "}
                          {item.discountAmount.toLocaleString()}
                        </span>
                      )}
                      {item.discountPercent === 0 &&
                        item.discountAmount === 0 &&
                        "—"}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-dark">
                      {item.lineTotal.toLocaleString()}
                    </td>
                  </tr>
                ))}
                {invoice.items.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      لا توجد بنود
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
