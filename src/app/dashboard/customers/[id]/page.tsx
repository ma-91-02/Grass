"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";

interface Receivable {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  totalAfterTax: number;
  paid: number;
  remaining: number;
  currency: string;
  paymentType: string;
}

interface StatementItem {
  date: string;
  type: string;
  referenceNumber: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  currency: string;
}

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [tab, setTab] = useState<"info" | "receivables" | "statement">("info");

  const { data: customer, isLoading: customerLoading } = useQuery({
    queryKey: ["customer", id],
    queryFn: async () => {
      const res = await fetch(`/api/customers/${id}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  const { data: receivables = [] } = useQuery({
    queryKey: ["customer-receivables", id],
    queryFn: async () => {
      const res = await fetch(`/api/customers/${id}/receivables`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data.invoices as Receivable[];
    },
  });

  const { data: statementData } = useQuery({
    queryKey: ["customer-statement", id],
    queryFn: async () => {
      const res = await fetch(`/api/customers/${id}/statement?limit=100`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  const statementItems: StatementItem[] = statementData?.items || [];

  if (customerLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center text-red-600">
        فشل تحميل بيانات العميل
      </div>
    );
  }

  const tabs = [
    { key: "info" as const, label: "معلومات العميل" },
    { key: "receivables" as const, label: "المستحقات" },
    { key: "statement" as const, label: "كشف الحساب" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/dashboard/customers")}
          className="rounded-lg p-2 hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-dark">{customer.name}</h1>
          <p className="text-sm text-gray-500">{customer.code}</p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? "border-b-2 border-primary text-primary"
                : "text-gray-500 hover:text-dark"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "info" && (
        <Card>
          <CardContent className="p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-gray-500">الاسم</p>
                <p className="font-medium">{customer.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">الكود</p>
                <p className="font-medium">{customer.code}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">الهاتف</p>
                <p className="font-medium">{customer.phone || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">الواتساب</p>
                <p className="font-medium">{customer.whatsapp || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">البريد</p>
                <p className="font-medium">{customer.email || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">العنوان</p>
                <p className="font-medium">{customer.address || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">المحافظة</p>
                <p className="font-medium">{customer.governorate || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">نوع العميل</p>
                <p className="font-medium">{customer.customerType || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">حد الائتمان</p>
                <p className="font-medium">
                  {customer.creditLimit?.toLocaleString() || 0}{" "}
                  {customer.currency}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">الرصيد الحالي</p>
                <p className="font-medium">
                  {customer.currentBalance?.toLocaleString() || 0}{" "}
                  {customer.currency}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "receivables" && (
        <Card>
          <CardHeader>
            <CardTitle>فواتير غير مسددة</CardTitle>
          </CardHeader>
          <CardContent>
            {receivables.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                لا توجد فواتير مستحقة
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                        رقم الفاتورة
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                        التاريخ
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                        المجموع
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                        المدفوع
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                        المتبقي
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {receivables.map((inv) => (
                      <tr
                        key={inv.id}
                        className="border-b border-border hover:bg-muted/30"
                      >
                        <td className="px-4 py-3 text-sm font-medium">
                          {inv.invoiceNumber}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {new Date(inv.invoiceDate).toLocaleDateString(
                            "ar-IQ",
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {inv.totalAfterTax.toLocaleString()} {inv.currency}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {inv.paid.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-amber-600">
                          {inv.remaining.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "statement" && (
        <Card>
          <CardHeader>
            <CardTitle>كشف حساب العميل</CardTitle>
          </CardHeader>
          <CardContent>
            {statementItems.length === 0 ? (
              <p className="text-center text-gray-500 py-8">لا توجد حركات</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                        التاريخ
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                        النوع
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                        الرقم
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                        مدين
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                        دائن
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                        الرصيد
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {statementItems.map((item, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-border hover:bg-muted/30"
                      >
                        <td className="px-4 py-3 text-sm">
                          {new Date(item.date).toLocaleDateString("ar-IQ")}
                        </td>
                        <td className="px-4 py-3 text-sm">{item.type}</td>
                        <td className="px-4 py-3 text-sm">
                          {item.referenceNumber}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {item.debit.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {item.credit.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">
                          {item.balance.toLocaleString()} {item.currency}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
