"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";

interface SupplierAccount {
  id: string;
  supplierId: string;
  currency: string;
  balance: number;
}

interface PayableInvoice {
  id: string;
  invoiceNumber: string;
  purchaseDate: string;
  totalCost: number;
  paid: number;
  remaining: number;
  currency: string;
}

interface StatementItem {
  id: string;
  date: string;
  type: string;
  reference: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  currency: string;
}

const statusBadge = (isActive: boolean) => (
  <Badge variant={isActive ? "success" : "danger"}>
    {isActive ? "نشط" : "معطل"}
  </Badge>
);

export default function SupplierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [tab, setTab] = useState<"info" | "payables" | "statement">("info");

  const { data: supplier, isLoading: supplierLoading } = useQuery({
    queryKey: ["supplier", id],
    queryFn: async () => {
      const res = await fetch(`/api/suppliers/${id}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل تحميل المورد");
      return json.data as {
        id: string;
        name: string;
        code: string;
        phone: string | null;
        address: string | null;
        notes: string | null;
        isActive: boolean;
        companyId: string | null;
        accounts: SupplierAccount[];
        createdAt: string;
      };
    },
  });

  const {
    data: payablesData,
    isLoading: payablesLoading,
    error: payablesError,
  } = useQuery({
    queryKey: ["supplier-payables", id],
    queryFn: async () => {
      const res = await fetch(`/api/suppliers/${id}/payables`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  const {
    data: statementData,
    isLoading: statementLoading,
    error: statementError,
  } = useQuery({
    queryKey: ["supplier-statement", id],
    queryFn: async () => {
      const res = await fetch(`/api/suppliers/${id}/statement?limit=100`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  const invoices: PayableInvoice[] = payablesData?.invoices || [];
  const statementItems: StatementItem[] = statementData?.transactions || [];

  if (supplierLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard/customers")}
            className="rounded-lg p-2 hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-dark">تفاصيل المورد</h1>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center text-red-600">
          فشل تحميل بيانات المورد
        </div>
      </div>
    );
  }

  const tabs = [
    { key: "info" as const, label: "معلومات المورد" },
    { key: "payables" as const, label: "المستحقات" },
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
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-dark">{supplier.name}</h1>
          <p className="text-sm text-gray-500">
            مورد — {statusBadge(supplier.isActive)}
          </p>
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
        <>
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>معلومات المورد</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-gray-500">الاسم</p>
                    <p className="font-medium">{supplier.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">الكود</p>
                    <p className="font-mono text-sm font-medium">
                      {supplier.code}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">الهاتف</p>
                    <p className="font-medium" dir="ltr">
                      {supplier.phone || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">الحالة</p>
                    <p>{statusBadge(supplier.isActive)}</p>
                  </div>
                </div>
                {supplier.address && (
                  <div>
                    <p className="text-sm text-gray-500">العنوان</p>
                    <p className="font-medium">{supplier.address}</p>
                  </div>
                )}
                {supplier.notes && (
                  <div>
                    <p className="text-sm text-gray-500">ملاحظات</p>
                    <p className="font-medium">{supplier.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>بيانات النظام</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">رقم المعرف</span>
                  <span className="text-sm font-mono">{supplier.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">تاريخ الإنشاء</span>
                  <span className="text-sm">
                    {new Date(supplier.createdAt).toLocaleDateString("ar-IQ")}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {supplier.accounts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>الأرصدة الافتتاحية</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                          العملة
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                          الرصيد
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {supplier.accounts.map((acc) => (
                        <tr
                          key={acc.id}
                          className="border-b border-border hover:bg-muted/30"
                        >
                          <td className="px-4 py-3 text-sm font-medium">
                            {acc.currency}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {Number(acc.balance).toLocaleString()} {acc.currency}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {tab === "payables" && (
        <Card>
          <CardHeader>
            <CardTitle>فواتير شراء غير مسددة</CardTitle>
          </CardHeader>
          <CardContent>
            {payablesLoading ? (
              <p className="text-center text-gray-500 py-8">جاري التحميل...</p>
            ) : payablesError ? (
              <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-red-600">
                {(payablesError as Error).message}
              </p>
            ) : invoices.length === 0 ? (
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
                    {invoices.map((inv) => (
                      <tr
                        key={inv.id}
                        className="border-b border-border hover:bg-muted/30"
                      >
                        <td className="px-4 py-3 text-sm font-medium">
                          {inv.invoiceNumber}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {new Date(inv.purchaseDate).toLocaleDateString(
                            "ar-IQ",
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {inv.totalCost.toLocaleString()} {inv.currency}
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
            <CardTitle>كشف حساب المورد</CardTitle>
          </CardHeader>
          <CardContent>
            {statementLoading ? (
              <p className="text-center text-gray-500 py-8">جاري التحميل...</p>
            ) : statementError ? (
              <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-red-600">
                {(statementError as Error).message}
              </p>
            ) : statementItems.length === 0 ? (
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
                    {statementItems.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-border hover:bg-muted/30"
                      >
                        <td className="px-4 py-3 text-sm">
                          {new Date(item.date).toLocaleDateString("ar-IQ")}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {item.type === "PURCHASE" ? "مشتريات" : "مدفوعات"}
                        </td>
                        <td className="px-4 py-3 text-sm">{item.reference}</td>
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
