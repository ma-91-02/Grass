"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TrialBalancePage() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["trial-balance", fromDate, toDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (fromDate) params.append("from", fromDate);
      if (toDate) params.append("to", toDate);
      const res = await fetch(`/api/reports/trial-balance?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="ميزان المراجعة" description="أرصدة الحسابات مع إجمالي الديون والائتمانات" />

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
          <Card>
            <CardHeader>
              <CardTitle>ملخص</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-blue-50 p-4 text-center">
                  <p className="text-sm text-gray-500">إجمالي الديون</p>
                  <p className="text-xl font-bold text-blue-600">
                    {data.totals.totalDebit.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg bg-green-50 p-4 text-center">
                  <p className="text-sm text-gray-500">إجمالي الائتمانات</p>
                  <p className="text-xl font-bold text-green-600">
                    {data.totals.totalCredit.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>الحسابات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-right">
                      <th className="pb-2 font-medium">الكود</th>
                      <th className="pb-2 font-medium">اسم الحساب</th>
                      <th className="pb-2 font-medium">النوع</th>
                      <th className="pb-2 font-medium text-left">مدين</th>
                      <th className="pb-2 font-medium text-left">دائن</th>
                      <th className="pb-2 font-medium text-left">الرصيد</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.accounts.map(
                      (acc: {
                        accountId: string;
                        accountCode: string;
                        accountName: string;
                        accountType: string;
                        totalDebit: number;
                        totalCredit: number;
                        netBalance: number;
                      }) => (
                        <tr key={acc.accountId} className="border-b last:border-0">
                          <td className="py-2 text-gray-500" dir="ltr">{acc.accountCode}</td>
                          <td className="py-2">{acc.accountName}</td>
                          <td className="py-2 text-gray-500">{acc.accountType}</td>
                          <td className="py-2 text-left font-mono">
                            {acc.totalDebit > 0 ? acc.totalDebit.toLocaleString() : "-"}
                          </td>
                          <td className="py-2 text-left font-mono">
                            {acc.totalCredit > 0 ? acc.totalCredit.toLocaleString() : "-"}
                          </td>
                          <td className={`py-2 text-left font-mono ${acc.netBalance > 0 ? "text-blue-600" : acc.netBalance < 0 ? "text-red-600" : ""}`}>
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
