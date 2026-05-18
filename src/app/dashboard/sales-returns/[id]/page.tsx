"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft, Printer, Send } from "lucide-react";

interface ReturnLine {
  id: string;
  productName: string | null;
  productCode: string | null;
  quantity: number;
  lineTotal: number;
}

interface SalesReturn {
  id: string;
  returnNumber: string;
  returnDate: string;
  customer: { name: string; code: string } | null;
  originalInvoice: { invoiceNumber: string; invoiceDate: string } | null;
  warehouse: { name: string; code: string } | null;
  currency: string;
  totalAmount: number;
  totalCogs: number;
  status: string;
  notes: string | null;
  lines: ReturnLine[];
  createdAt: string;
}

export default function SalesReturnDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const qc = useQueryClient();
  const id = params.id as string;

  const {
    data: salesReturn,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["sales-return", id],
    queryFn: async () => {
      const res = await fetch(`/api/sales-returns/${id}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل تحميل المرتجع");
      return json.data as SalesReturn;
    },
  });

  const postMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/sales-returns/${id}/post`, {
        method: "POST",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل ترحيل المرتجع");
      return json.data;
    },
    onSuccess: () => {
      toast("تم ترحيل المرتجع بنجاح", "success");
      qc.invalidateQueries({ queryKey: ["sales-return", id] });
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

  if (error || !salesReturn) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center text-red-600">
        {error instanceof Error ? error.message : "فشل تحميل المرتجع"}
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/dashboard/sales-returns")}
          className="rounded-lg p-2 hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-dark">
            مرتجع {salesReturn.returnNumber}
          </h1>
          <p className="text-sm text-gray-500">
            {statusBadge(salesReturn.status)}
          </p>
        </div>
        <div className="flex gap-2">
          {salesReturn.status === "DRAFT" && (
            <>
              <Button
                variant="outline"
                onClick={() =>
                  window.open(`/api/sales-returns/${id}/print`, "_blank")
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
          {salesReturn.status === "POSTED" && (
            <Button
              variant="outline"
              onClick={() =>
                window.open(`/api/sales-returns/${id}/print`, "_blank")
              }
            >
              <Printer className="h-4 w-4" />
              طباعة
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>تفاصيل المرتجع</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-gray-500">العميل</p>
                <p className="font-medium">
                  {salesReturn.customer?.name || "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">المخزن</p>
                <p className="font-medium">
                  {salesReturn.warehouse?.name || "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">الفاتورة الأصلية</p>
                <p className="font-medium">
                  {salesReturn.originalInvoice?.invoiceNumber || "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">التاريخ</p>
                <p className="font-medium">
                  {new Date(salesReturn.returnDate).toLocaleDateString("ar-IQ")}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">العملة</p>
                <p className="font-medium">{salesReturn.currency}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">الحالة</p>
                <p className="font-medium">{statusBadge(salesReturn.status)}</p>
              </div>
            </div>
            {salesReturn.notes && (
              <div>
                <p className="text-sm text-gray-500">ملاحظات</p>
                <p className="font-medium">{salesReturn.notes}</p>
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
              <span className="text-sm text-gray-500">مبلغ المرتجع</span>
              <span className="font-medium">
                {salesReturn.totalAmount.toLocaleString()}{" "}
                {salesReturn.currency}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">تكلفة البضاعة</span>
              <span className="font-medium">
                {salesReturn.totalCogs.toLocaleString()} {salesReturn.currency}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>بنود المرتجع</CardTitle>
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
                    المجموع
                  </th>
                </tr>
              </thead>
              <tbody>
                {salesReturn.lines.map((line, idx) => (
                  <tr
                    key={line.id}
                    className="border-b border-border hover:bg-muted/30"
                  >
                    <td className="px-4 py-3 text-sm text-dark">{idx + 1}</td>
                    <td className="px-4 py-3 text-sm text-dark">
                      <p className="font-medium">{line.productName || "—"}</p>
                      <p className="text-xs text-gray-500">
                        {line.productCode || "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-sm text-dark">
                      {line.quantity.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-dark">
                      {line.lineTotal.toLocaleString()}
                    </td>
                  </tr>
                ))}
                {salesReturn.lines.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
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
