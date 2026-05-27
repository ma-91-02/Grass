"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft, Pencil, Printer, Trash2 } from "lucide-react";

interface PurchaseItem {
  id: string;
  productName: string;
  productCode: string;
  quantity: number;
  purchasePrice: number;
  totalPrice: number;
  expenseShare: number;
  finalCost: number;
  unitFinalCost: number;
  productionDate: string | null;
  expiryDate: string | null;
}

interface PurchaseExpense {
  id: string;
  name: string;
  amount: number;
  currency: string;
  amountInInvoiceCurrency: number;
}

interface PurchaseInvoice {
  id: string;
  invoiceNumber: string;
  supplierInvoiceNumber: string | null;
  purchaseDate: string;
  currency: string;
  exchangeRateValue: number;
  supplierName: string | null;
  warehouseName: string | null;
  notes: string | null;
  subtotal: number;
  totalExpenses: number;
  totalCost: number;
  paymentMethod: string;
  paid: number;
  remaining: number;
  paymentAccountName: string | null;
  status: string;
  items: PurchaseItem[];
  expenses: PurchaseExpense[];
  createdAt: string;
}

export default function PurchaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = params.id as string;

  const [permissions, setPermissions] = useState<string[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setPermissions(d.data?.permissions || []))
      .catch(() => toast("تعذر التحقق من الصلاحيات", "error"));
  }, []);

  const canEdit =
    permissions.includes("purchases.edit") || permissions.length === 0;

  const {
    data: invoice,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["purchase-invoice", id],
    queryFn: async () => {
      const res = await fetch(`/api/purchases/${id}`);
      const json = await res.json();
      if (!json.success)
        throw new Error(json.error || "فشل تحميل فاتورة المشتريات");
      return json.data as PurchaseInvoice;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/purchases/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل حذف الفاتورة");
      return json.data;
    },
    onSuccess: () => {
      toast("تم حذف الفاتورة بنجاح", "success");
      router.push("/dashboard/purchases");
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const canDelete =
    permissions.includes("purchases.delete") || permissions.length === 0;

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
        {error instanceof Error ? error.message : "فشل تحميل فاتورة المشتريات"}
      </div>
    );
  }

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; color: string }> = {
      DRAFT: { label: "مسودة", color: "bg-gray-100 text-gray-700" },
      COMPLETED: { label: "مكتملة", color: "bg-green-100 text-green-700" },
      CANCELLED: { label: "ملغاة", color: "bg-red-100 text-red-700" },
    };
    const s = map[status] || { label: status, color: "bg-gray-100" };
    return <Badge className={s.color}>{s.label}</Badge>;
  };

  const paymentLabel = (method: string) => {
    const map: Record<string, string> = {
      CASH: "نقداً",
      CREDIT: "على الحساب",
    };
    return map[method] || method;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/dashboard/purchases")}
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
          {invoice.status === "DRAFT" && canEdit && (
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/purchases/${id}/edit`)}
            >
              <Pencil className="h-4 w-4" />
              تعديل
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() =>
              window.open(`/api/purchases/${id}/pdf`, "_blank")
            }
          >
            <Printer className="h-4 w-4" />
            PDF
          </Button>
          {canDelete && invoice.status === "DRAFT" && (
            <Button
              variant="danger"
              onClick={() => {
                if (deleteConfirm) {
                  deleteMutation.mutate();
                  setDeleteConfirm(false);
                } else {
                  setDeleteConfirm(true);
                  setTimeout(() => setDeleteConfirm(false), 4000);
                }
              }}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4" />
              {deleteConfirm
                ? "تأكيد الحذف"
                : deleteMutation.isPending
                ? "جاري الحذف..."
                : "حذف"}
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
                <p className="text-sm text-gray-500">المورد</p>
                <p className="font-medium">{invoice.supplierName || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">المخزن</p>
                <p className="font-medium">{invoice.warehouseName || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">التاريخ</p>
                <p className="font-medium">
                  {new Date(invoice.purchaseDate).toLocaleDateString("ar-IQ")}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">رقم فاتورة المورد</p>
                <p className="font-medium">
                  {invoice.supplierInvoiceNumber || "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">طريقة الدفع</p>
                <p className="font-medium">
                  {paymentLabel(invoice.paymentMethod)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">العملة</p>
                <p className="font-medium">
                  {invoice.currency === "USD" ? "دولار أمريكي" : "دينار عراقي"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">حساب التسديد</p>
                <p className="font-medium">
                  {invoice.paymentAccountName || "—"}
                </p>
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
              <span className="text-sm text-gray-500">إجمالي المواد</span>
              <span className="font-medium">
                {invoice.subtotal.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">إجمالي المصاريف</span>
              <span className="font-medium">
                {invoice.totalExpenses.toLocaleString()}
              </span>
            </div>
            <div className="border-t pt-2">
              <div className="flex justify-between">
                <span className="font-bold">إجمالي الكلفة</span>
                <span className="font-bold text-primary">
                  {invoice.totalCost.toLocaleString()}{" "}
                  {invoice.currency === "USD" ? "$" : "د.ع"}
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
            {invoice.paymentAccountName && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">حساب التسديد</span>
                <span className="font-medium">
                  {invoice.paymentAccountName}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>مواد الفاتورة</CardTitle>
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
                    سعر الشراء
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                    الإجمالي
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                    حصة المصروفات
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                    التكلفة النهائية
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                    الإنتاج
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                    الانتهاء
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
                      {item.purchasePrice.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-dark">
                      {item.totalPrice.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-dark">
                      {item.expenseShare.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-dark">
                      {item.finalCost.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-dark">
                      {item.productionDate
                        ? new Date(item.productionDate).toLocaleDateString(
                            "ar-IQ",
                          )
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-dark">
                      {item.expiryDate
                        ? new Date(item.expiryDate).toLocaleDateString("ar-IQ")
                        : "—"}
                    </td>
                  </tr>
                ))}
                {invoice.items.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      لا توجد مواد
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {invoice.expenses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>المصاريف</CardTitle>
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
                      الاسم
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                      المبلغ
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                      العملة
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                      بعملة الفاتورة
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.expenses.map((exp, idx) => (
                    <tr
                      key={exp.id}
                      className="border-b border-border hover:bg-muted/30"
                    >
                      <td className="px-4 py-3 text-sm text-dark">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-dark">
                        {exp.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-dark">
                        {exp.amount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-dark">
                        {exp.currency === "USD" ? "$" : "د.ع"}
                      </td>
                      <td className="px-4 py-3 text-sm text-dark">
                        {exp.amountInInvoiceCurrency.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
