"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function BalanceSheetPage() {
  const [asOfDate, setAsOfDate] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["balance-sheet", asOfDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (asOfDate) params.append("asOf", asOfDate);
      const res = await fetch(
        `/api/reports/balance-sheet?${params.toString()}`,
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="الميزانية العمومية"
        description="مركز الأصول والخصوم وحقوق الملكية من قيود الأستاذ"
      />

      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">حتى تاريخ</label>
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
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-gray-500">إجمالي الأصول</p>
                <p className="text-2xl font-bold text-blue-600">
                  {data.totals.totalAssets.toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-gray-500">إجمالي الخصوم</p>
                <p className="text-2xl font-bold text-amber-600">
                  {data.totals.totalLiabilities.toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-gray-500">حقوق الملكية</p>
                <p className="text-2xl font-bold text-green-600">
                  {data.totals.totalEquity.toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>الأصول</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-right">
                      <th className="pb-2 font-medium">الكود</th>
                      <th className="pb-2 font-medium">اسم الحساب</th>
                      <th className="pb-2 font-medium text-left">الرصيد</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.assetAccounts.map(
                      (acc: {
                        accountCode: string;
                        accountName: string;
                        netBalance: number;
                      }) => (
                        <tr key={acc.accountCode} className="border-b last:border-0">
                          <td className="py-2 text-gray-500" dir="ltr">
                            {acc.accountCode}
                          </td>
                          <td className="py-2">{acc.accountName}</td>
                          <td className="py-2 text-left font-mono text-blue-600">
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
              <CardTitle>الخصوم</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-right">
                      <th className="pb-2 font-medium">الكود</th>
                      <th className="pb-2 font-medium">اسم الحساب</th>
                      <th className="pb-2 font-medium text-left">الرصيد</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.liabilityAccounts.map(
                      (acc: {
                        accountCode: string;
                        accountName: string;
                        netBalance: number;
                      }) => (
                        <tr key={acc.accountCode} className="border-b last:border-0">
                          <td className="py-2 text-gray-500" dir="ltr">
                            {acc.accountCode}
                          </td>
                          <td className="py-2">{acc.accountName}</td>
                          <td className="py-2 text-left font-mono text-amber-600">
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
              <CardTitle>حقوق الملكية</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-right">
                      <th className="pb-2 font-medium">الكود</th>
                      <th className="pb-2 font-medium">اسم الحساب</th>
                      <th className="pb-2 font-medium text-left">الرصيد</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.equityAccounts.map(
                      (acc: {
                        accountCode: string;
                        accountName: string;
                        netBalance: number;
                      }) => (
                        <tr key={acc.accountCode} className="border-b last:border-0">
                          <td className="py-2 text-gray-500" dir="ltr">
                            {acc.accountCode}
                          </td>
                          <td className="py-2">{acc.accountName}</td>
                          <td className="py-2 text-left font-mono text-green-600">
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
