"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProfitLossPage() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["profit-loss", fromDate, toDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (fromDate) params.append("from", fromDate);
      if (toDate) params.append("to", toDate);
      const res = await fetch(`/api/reports/profit-loss?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="الأرباح والخسائر"
        description="تقرير الأرباح والخسائر من قيود الأستاذ"
      />

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
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-gray-500">إجمالي الإيرادات</p>
                <p className="text-2xl font-bold text-green-600">
                  {data.totals.totalRevenue.toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-gray-500">إجمالي المصروفات</p>
                <p className="text-2xl font-bold text-red-600">
                  {data.totals.totalExpenses.toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-gray-500">صافي الربح</p>
                <p
                  className={`text-2xl font-bold ${
                    data.totals.netProfit >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {data.totals.netProfit.toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>الإيرادات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-right">
                      <th className="pb-2 font-medium">الكود</th>
                      <th className="pb-2 font-medium">اسم الحساب</th>
                      <th className="pb-2 font-medium text-left">مدين</th>
                      <th className="pb-2 font-medium text-left">دائن</th>
                      <th className="pb-2 font-medium text-left">الرصيد</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.revenueAccounts.map(
                      (acc: {
                        accountCode: string;
                        accountName: string;
                        totalDebit: number;
                        totalCredit: number;
                        netBalance: number;
                      }) => (
                        <tr key={acc.accountCode} className="border-b last:border-0">
                          <td className="py-2 text-gray-500" dir="ltr">
                            {acc.accountCode}
                          </td>
                          <td className="py-2">{acc.accountName}</td>
                          <td className="py-2 text-left font-mono">
                            {acc.totalDebit > 0
                              ? acc.totalDebit.toLocaleString()
                              : "-"}
                          </td>
                          <td className="py-2 text-left font-mono">
                            {acc.totalCredit > 0
                              ? acc.totalCredit.toLocaleString()
                              : "-"}
                          </td>
                          <td
                            className={`py-2 text-left font-mono ${
                              acc.netBalance >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {acc.netBalance.toLocaleString()}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>المصروفات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-right">
                      <th className="pb-2 font-medium">الكود</th>
                      <th className="pb-2 font-medium">اسم الحساب</th>
                      <th className="pb-2 font-medium text-left">مدين</th>
                      <th className="pb-2 font-medium text-left">دائن</th>
                      <th className="pb-2 font-medium text-left">الرصيد</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.expenseAccounts.map(
                      (acc: {
                        accountCode: string;
                        accountName: string;
                        totalDebit: number;
                        totalCredit: number;
                        netBalance: number;
                      }) => (
                        <tr key={acc.accountCode} className="border-b last:border-0">
                          <td className="py-2 text-gray-500" dir="ltr">
                            {acc.accountCode}
                          </td>
                          <td className="py-2">{acc.accountName}</td>
                          <td className="py-2 text-left font-mono">
                            {acc.totalDebit > 0
                              ? acc.totalDebit.toLocaleString()
                              : "-"}
                          </td>
                          <td className="py-2 text-left font-mono">
                            {acc.totalCredit > 0
                              ? acc.totalCredit.toLocaleString()
                              : "-"}
                          </td>
                          <td
                            className={`py-2 text-left font-mono ${
                              acc.netBalance <= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {acc.netBalance.toLocaleString()}
                          </td>
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
