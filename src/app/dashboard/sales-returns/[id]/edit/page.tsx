"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";

interface ReturnLineData {
  id: string;
  productId: string;
  productName: string | null;
  productCode: string | null;
  quantity: number;
  unitPriceSnapshot: number;
  lineTotal: number;
  notes: string | null;
}

interface SalesReturnData {
  id: string;
  returnNumber: string;
  companyId: string;
  originalInvoiceId: string;
  originalInvoiceNumber: string | null;
  customerId: string | null;
  customerName: string | null;
  warehouseId: string | null;
  warehouseName: string | null;
  returnDate: string;
  currency: string;
  totalAmount: number;
  totalCogs: number;
  status: string;
  notes: string | null;
  lines: ReturnLineData[];
}

export default function EditSalesReturnPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = params.id as string;

  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);

  useEffect(() => {
    setIsLoadingAuth(true);
    setAuthError(null);
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) {
          setAuthError(d.error || "فشل التحقق من الهوية");
        } else {
          setUserCompanyId(d.data?.companyId || null);
        }
      })
      .catch(() => setAuthError("تعذر الاتصال بالخادم"))
      .finally(() => setIsLoadingAuth(false));
  }, []);

  const {
    data: salesReturn,
    isLoading: returnLoading,
    error: returnError,
  } = useQuery({
    queryKey: ["sales-return", id, userCompanyId],
    queryFn: async () => {
      const res = await fetch(`/api/sales-returns/${id}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل تحميل المرتجع");
      return json.data as SalesReturnData;
    },
    enabled: !!id && !isLoadingAuth,
  });

  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<
    { id: string; productId: string; productName: string | null; productCode: string | null; quantity: number; notes: string }[]
  >([]);
  const [submitting, setSubmitting] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (salesReturn && !initialized) {
      setNotes(salesReturn.notes || "");
      setLines(
        salesReturn.lines.map((l) => ({
          id: l.id,
          productId: l.productId,
          productName: l.productName,
          productCode: l.productCode,
          quantity: l.quantity,
          notes: l.notes || "",
        })),
      );
      setInitialized(true);
    }
  }, [salesReturn, initialized]);

  const updateLineQuantity = (index: number, quantity: number) => {
    setLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], quantity };
      return next;
    });
  };

  const updateLineNotes = (index: number, value: string) => {
    setLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], notes: value };
      return next;
    });
  };

  if (isLoadingAuth || returnLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (authError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center text-red-600">
        {authError}
      </div>
    );
  }

  if (returnError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center text-red-600">
        {returnError instanceof Error
          ? returnError.message
          : "فشل تحميل المرتجع"}
      </div>
    );
  }

  if (!salesReturn) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-8 text-center text-yellow-700">
        لم يتم العثور على المرتجع
      </div>
    );
  }

  if (salesReturn.status !== "DRAFT") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/dashboard/sales-returns/${id}`)}
            className="rounded-lg p-2 hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <PageHeader
            title="تعديل مرتجع بيع"
            description="لا يمكن تعديل مرتجع غير مسودة"
          />
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-8 text-center text-amber-700">
          لا يمكن تعديل مرتجع بحالة {salesReturn.status}. المرتجعات غير المسودة
          غير قابلة للتعديل.
        </div>
        <Button
          onClick={() => router.push(`/dashboard/sales-returns/${id}`)}
        >
          العودة إلى تفاصيل المرتجع
        </Button>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (lines.some((l) => l.quantity <= 0)) {
      toast("الكمية يجب أن تكون أكبر من 0", "error");
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        companyId: userCompanyId,
        notes: notes || null,
        lines: lines.map((l) => ({
          id: l.id,
          productId: l.productId,
          quantity: l.quantity,
          notes: l.notes || null,
        })),
      };

      const res = await fetch(`/api/sales-returns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "فشل تحديث المرتجع");
      }
      toast("تم تحديث المرتجع بنجاح", "success");
      router.push(`/dashboard/sales-returns/${id}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "فشل تحديث المرتجع", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push(`/dashboard/sales-returns/${id}`)}
          className="rounded-lg p-2 hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <PageHeader
          title={`تعديل مرتجع ${salesReturn.returnNumber}`}
          description="تعديل بيانات مرتجع البيع"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">المرتجع</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="text-gray-500">{salesReturn.returnNumber}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">الفاتورة الأصلية</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="text-gray-500">
              {salesReturn.originalInvoiceNumber || "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">الحالة</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className="bg-gray-100 text-gray-700">مسودة</Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ملاحظات</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
            rows={2}
            placeholder="ملاحظات..."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>بنود المرتجع</CardTitle>
        </CardHeader>
        <CardContent>
          {lines.length === 0 && (
            <p className="text-center text-sm text-gray-500">
              لا توجد بنود في هذا المرتجع
            </p>
          )}
          {lines.length > 0 && (
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
                      الكمية الجديدة
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                      ملاحظات
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, idx) => (
                    <tr
                      key={line.id}
                      className="border-b border-border hover:bg-muted/30"
                    >
                      <td className="px-4 py-3 text-sm text-dark">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-3 text-sm text-dark">
                        <p className="font-medium">{line.productName || "—"}</p>
                        <p className="text-xs text-gray-500">
                          {line.productCode || "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-sm text-dark">
                        {line.quantity.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          min={0}
                          step="any"
                          value={line.quantity}
                          onChange={(e) =>
                            updateLineQuantity(
                              idx,
                              Number(e.target.value),
                            )
                          }
                          className="w-24"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="text"
                          value={line.notes}
                          onChange={(e) =>
                            updateLineNotes(idx, e.target.value)
                          }
                          className="w-full"
                          placeholder="ملاحظات البند..."
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-white p-4">
        <div className="flex items-center gap-4">
          <p className="text-sm text-gray-500">
            مبلغ المرتجع:{" "}
            <span className="font-medium text-dark">
              {salesReturn.totalAmount.toLocaleString()}{" "}
              {salesReturn.currency}
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/sales-returns/${id}`)}
          >
            إلغاء
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "جاري الحفظ..." : "حفظ التعديلات"}
          </Button>
        </div>
      </div>
    </div>
  );
}
