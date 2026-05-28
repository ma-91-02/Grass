"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SalesSummaryPage() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["sales-summary", fromDate, toDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (fromDate) params.append("from", fromDate);
      if (toDate) params.append("to", toDate);
      const res = await fetch(`/api/reports/sales-summary?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="ملخص المبيعات" description="تقرير إجمالي المبيعات حسب الفترة" />

      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">من تاريخ</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="rounded-lg border border-border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">إلى تاريخ</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="rounded-lg border border-border px-3 py-2 text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading && <div className="text-center py-8">جاري التحميل...</div>}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-600">
          {error instanceof Error ? error.message : "فشل التحميل"}
        </div>
      )}

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-gray-500">عدد الفواتير</p>
                <p className="text-2xl font-bold">{data.summary.totalInvoices}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-gray-500">إجمالي المبيعات</p>
                <p className="text-2xl font-bold text-blue-600">
                  {data.summary.totalSales.toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-gray-500">إجمالي الضريبة</p>
                <p className="text-2xl font-bold text-amber-600">
                  {data.summary.totalTax.toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-gray-500">المبلغ المحصل</p>
                <p className="text-2xl font-bold text-green-600">
                  {data.summary.totalPaid.toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>نقداً</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{data.summary.byPaymentType.CASH}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>آجل</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{data.summary.byPaymentType.CREDIT}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>مختلط</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{data.summary.byPaymentType.MIXED}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>تفاصيل الفواتير</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-right">
                      <th className="pb-2 font-medium">رقم الفاتورة</th>
                      <th className="pb-2 font-medium">العميل</th>
                      <th className="pb-2 font-medium">التاريخ</th>
                      <th className="pb-2 font-medium">نوع الدفع</th>
                      <th className="pb-2 font-medium text-left">الإجمالي</th>
                      <th className="pb-2 font-medium text-left">المدفوع</th>
                      <th className="pb-2 font-medium text-left">المتبقي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.invoices.map(
                      (inv: {
                        id: string;
                        invoiceNumber: string;
                        invoiceDate: string;
                        totalAfterTax: number;
                        paid: number;
                        remaining: number;
                        paymentType: string;
                        customer: { name: string } | null;
                      }) => (
                        <tr key={inv.id} className="border-b last:border-0">
                          <td className="py-2">{inv.invoiceNumber}</td>
                          <td className="py-2 text-gray-500">{inv.customer?.name || "-"}</td>
                          <td className="py-2 text-gray-500">
                            {new Date(inv.invoiceDate).toLocaleDateString("ar-IQ")}
                          </td>
                          <td className="py-2">{inv.paymentType === "CASH" ? "نقداً" : inv.paymentType === "CREDIT" ? "آجل" : "مختلط"}</td>
                          <td className="py-2 text-left font-mono">{Number(inv.totalAfterTax).toLocaleString()}</td>
                          <td className="py-2 text-left font-mono text-green-600">{Number(inv.paid).toLocaleString()}</td>
                          <td className="py-2 text-left font-mono text-red-600">{Number(inv.remaining).toLocaleString()}</td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
