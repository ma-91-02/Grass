"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { ExchangeRateForm } from "@/components/forms/exchange-rate-form";
import { useToast } from "@/components/ui/toast";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

interface ExchangeRate {
  id: string;
  usdToIqd: number;
  date: string;
  note: string | null;
}

export default function ExchangeRatesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState<ExchangeRate | null>(null);

  const {
    data: rates = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["exchange-rates"],
    queryFn: async () => {
      const res = await fetch("/api/exchange-rates");
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل تحميل أسعار الصرف");
      return json.data as ExchangeRate[];
    },
  });

  const currentRate = rates[0];

  const createMutation = useMutation({
    mutationFn: async (data: unknown) => {
      const res = await fetch("/api/exchange-rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل إضافة سعر الصرف");
      return json.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exchange-rates"] });
      toast("تم إضافة سعر الصرف بنجاح", "success");
      setDialogOpen(false);
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/exchange-rates/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل حذف سعر الصرف");
      return json.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exchange-rates"] });
      toast("تم حذف سعر الصرف بنجاح", "success");
      setDeleteItem(null);
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const handleSubmit = useCallback(
    async (data: unknown) => {
      createMutation.mutate(data);
    },
    [createMutation],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center text-red-600">
        {error instanceof Error ? error.message : "خطأ في تحميل البيانات"}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="سعر الصرف"
        description="إدارة أسعار صرف الدولار مقابل الدينار"
        actionLabel="إضافة سعر صرف"
        onAction={() => setDialogOpen(true)}
      />

      {currentRate && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">سعر الصرف الحالي</p>
                <p className="text-2xl font-bold text-primary">
                  1 USD = {formatCurrency(currentRate.usdToIqd)} IQD
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  آخر تحديث: {formatDate(currentRate.date)}
                </p>
              </div>
              <div className="rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
                {formatCurrency(currentRate.usdToIqd)} د.ع
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {rates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            لا توجد أسعار صرف سابقة
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-right p-4 text-sm font-medium text-gray-500">
                    التاريخ
                  </th>
                  <th className="text-right p-4 text-sm font-medium text-gray-500">
                    سعر الصرف
                  </th>
                  <th className="text-right p-4 text-sm font-medium text-gray-500">
                    ملاحظة
                  </th>
                  <th className="text-center p-4 text-sm font-medium text-gray-500 w-20">
                    حذف
                  </th>
                </tr>
              </thead>
              <tbody>
                {rates.map((rate, idx) => (
                  <tr
                    key={rate.id}
                    className="border-b border-border hover:bg-muted/30"
                  >
                    <td className="p-4 text-sm text-gray-600">
                      {formatDate(rate.date)}
                    </td>
                    <td className="p-4">
                      <span className="font-medium">
                        1 USD = {formatCurrency(rate.usdToIqd)} IQD
                      </span>
                      {idx === 0 && (
                        <Badge variant="success" className="mr-2">
                          الحالي
                        </Badge>
                      )}
                    </td>
                    <td className="p-4 text-sm text-gray-600">
                      {rate.note || "-"}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => setDeleteItem(rate)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        title="حذف"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="إضافة سعر صرف"
      >
        <ExchangeRateForm
          onSubmit={handleSubmit}
          loading={createMutation.isPending}
        />
      </Dialog>

      <ConfirmDialog
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={() => deleteItem && deleteMutation.mutate(deleteItem.id)}
        title="حذف سعر صرف"
        message={`هل أنت متأكد من حذف سعر الصرف ${deleteItem ? formatCurrency(deleteItem.usdToIqd) : ""}؟`}
        confirmLabel="حذف"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
