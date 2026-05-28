"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ArAgingPage() {
  const [asOfDate, setAsOfDate] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["ar-aging", asOfDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (asOfDate) params.append("asOf", asOfDate);
      const res = await fetch(`/api/reports/ar-aging?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  const bucketKeys = ["current", "overdue30", "overdue60", "overdue90"] as const;
  const bucketLabels: Record<string, string> = {
    current: "0-30 يوم",
    overdue30: "31-60 يوم",
    overdue60: "61-90 يوم",
    overdue90: "أكثر من 90 يوم",
  };
  const bucketColors: Record<string, string> = {
    current: "text-green-600",
    overdue30: "text-amber-600",
    overdue60: "text-orange-600",
    overdue90: "text-red-600",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="أعمار الذمم المدينة"
        description="تحليل المبالغ المستحقة حسب الفترات الزمنية"
      />

      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                حتى تاريخ
              </label>
              <input
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
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
          <Card>
            <CardHeader>
              <CardTitle>ملخص الذمم</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-blue-50 p-4 text-center">
                  <p className="text-sm text-gray-500">إجمالي الذمم</p>
                  <p className="text-xl font-bold text-blue-600">
                    {data.grandTotal.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg bg-purple-50 p-4 text-center">
                  <p className="text-sm text-gray-500">عدد الفواتير</p>
                  <p className="text-xl font-bold text-purple-600">
                    {data.totalInvoices}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {bucketKeys.map((key) => (
              <Card key={key}>
                <CardHeader>
                  <CardTitle>{bucketLabels[key]}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p
                    className={`text-2xl font-bold ${bucketColors[key]}`}
                  >
                    {data.buckets[key].total.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">
                    {data.buckets[key].invoices.length} فاتورة
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {bucketKeys.map((key) => (
            <Card key={key}>
              <CardHeader>
                <CardTitle>{bucketLabels[key]}</CardTitle>
              </CardHeader>
              <CardContent>
                {data.buckets[key].invoices.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    لا توجد فواتير في هذه الفترة
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-right">
                          <th className="pb-2 font-medium">رقم الفاتورة</th>
                          <th className="pb-2 font-medium">العميل</th>
                          <th className="pb-2 font-medium">تاريخ الفاتورة</th>
                          <th className="pb-2 font-medium text-left">
                            المتبقي
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.buckets[key].invoices.map(
                          (inv: {
                            id: string;
                            invoiceNumber: string;
                            invoiceDate: string;
                            customerName: string;
                            remaining: number;
                          }) => (
                            <tr
                              key={inv.id}
                              className="border-b last:border-0"
                            >
                              <td className="py-2">{inv.invoiceNumber}</td>
                              <td className="py-2 text-gray-500">
                                {inv.customerName}
                              </td>
                              <td className="py-2 text-gray-500">
                                {new Date(
                                  inv.invoiceDate,
                                ).toLocaleDateString("ar-IQ")}
                              </td>
                              <td
                                className={`py-2 text-left font-mono ${bucketColors[key]}`}
                              >
                                {inv.remaining.toLocaleString()}
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}
