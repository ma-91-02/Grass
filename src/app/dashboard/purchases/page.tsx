"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { PurchaseInvoiceForm } from "@/components/forms/purchase-invoice-form";
import { formatDate, safeJson } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import type { PurchaseInvoiceData } from "@/types";
import type { TokenPayload } from "@/lib/auth";

function enNum(n: number | string): string {
  const num = Number(n) || 0;
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export default function PurchasesPage() {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<PurchaseInvoiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] =
    useState<PurchaseInvoiceData | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [user, setUser] = useState<TokenPayload | null>(null);

  useEffect(() => {
    async function fetchUser() {
      const res = await fetch("/api/auth/me");
      const json = await safeJson<TokenPayload>(res);
      if (json.success && json.data) setUser(json.data);
    }
    fetchUser();
  }, []);

  useEffect(() => {
    async function load() {
      setError(null);
      const res = await fetch("/api/purchases");
      const json = await safeJson<PurchaseInvoiceData[]>(res);
      if (json.success && json.data) {
        setInvoices(json.data);
      } else {
        setError(json.error || "فشل تحميل فواتير المشتريات");
      }
      setLoading(false);
    }
    load();
  }, []);

  async function reloadInvoices() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/purchases");
    const json = await safeJson<PurchaseInvoiceData[]>(res);
    if (json.success && json.data) {
      setInvoices(json.data);
    } else {
      setError(json.error || "فشل تحميل فواتير المشتريات");
    }
    setLoading(false);
  }

  const permissions = user?.permissions || [];
  const canCreate = permissions.includes("purchases.create");
  const canEdit = permissions.includes("purchases.edit");
  const canDelete = permissions.includes("purchases.delete");
  const canPrint = permissions.includes("purchases.print");

  const filtered = invoices.filter(
    (inv) =>
      inv.invoiceNumber.includes(search) ||
      (inv.supplierName || "").includes(search) ||
      (inv.supplierInvoiceNumber || "").includes(search),
  );

  const columns: Column<PurchaseInvoiceData>[] = [
    {
      key: "invoiceNumber",
      header: "رقم الفاتورة",
      render: (item) => (
        <span className="font-medium text-primary">{item.invoiceNumber}</span>
      ),
      sortable: true,
    },
    {
      key: "supplierInvoiceNumber",
      header: "رقم فاتورة المورد",
      render: (item) => (
        <span className="text-gray-600">
          {item.supplierInvoiceNumber || "—"}
        </span>
      ),
    },
    {
      key: "supplierName",
      header: "المورد",
      render: (item) => <span>{item.supplierName || "—"}</span>,
      sortable: true,
    },
    {
      key: "purchaseDate",
      header: "التاريخ",
      render: (item) => (
        <span className="text-gray-600">{formatDate(item.purchaseDate)}</span>
      ),
      sortable: true,
    },
    {
      key: "totalCost",
      header: "الكلفة",
      render: (item) => (
        <span className="font-medium">
          {enNum(item.totalCost)} {item.currency === "USD" ? "$" : "د.ع"}
        </span>
      ),
      sortable: true,
    },
    {
      key: "paid",
      header: "المدفوع",
      render: (item) => (
        <span
          className={item.remaining > 0 ? "text-red-600" : "text-green-600"}
        >
          {enNum(item.paid)}
        </span>
      ),
    },
    {
      key: "remaining",
      header: "الباقي",
      render: (item) => (
        <span
          className={
            item.remaining > 0 ? "text-red-600 font-medium" : "text-gray-500"
          }
        >
          {item.remaining > 0 ? enNum(item.remaining) : "—"}
        </span>
      ),
    },
    {
      key: "paymentMethod",
      header: "الدفع",
      render: (item) => (
        <span className="text-xs text-gray-500">
          {item.paymentMethod === "CASH" ? "نقداً" : "على الحساب"}
        </span>
      ),
    },
  ];

  function handleView(invoice: PurchaseInvoiceData) {
    setSelectedInvoice(invoice);
    setShowViewDialog(true);
  }

  function handleEditClick(invoice: PurchaseInvoiceData) {
    setSelectedInvoice(invoice);
    setShowEditDialog(true);
  }

  function handleDeleteClick(invoice: PurchaseInvoiceData) {
    setSelectedInvoice(invoice);
    setShowDeleteDialog(true);
  }

  function handlePrintClick(invoice: PurchaseInvoiceData) {
    const url = `/api/purchases/${invoice.id}/pdf`;
    window.open(url, "_blank");
  }

  async function handleDeleteConfirm() {
    if (!selectedInvoice) return;
    setDeleteLoading(true);
    const res = await fetch(`/api/purchases/${selectedInvoice.id}`, {
      method: "DELETE",
    });
    const json = await safeJson(res);
    if (json.success) {
      toast("تم حذف الفاتورة بنجاح", "success");
      setShowDeleteDialog(false);
      setSelectedInvoice(null);
      reloadInvoices();
    } else {
      toast(json.error || "فشل حذف الفاتورة", "error");
    }
    setDeleteLoading(false);
  }

  function handleCreateSuccess() {
    setShowCreateDialog(false);
    reloadInvoices();
  }

  function handleEditSuccess() {
    setShowEditDialog(false);
    setSelectedInvoice(null);
    reloadInvoices();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="المشتريات"
        description="إدارة فواتير الشراء"
        actionLabel={canCreate ? "فاتورة مشتريات جديدة" : undefined}
        onAction={canCreate ? () => setShowCreateDialog(true) : undefined}
      />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card>
        <CardContent className="p-6">
          <DataTable
            columns={columns}
            data={filtered}
            loading={loading}
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="بحث برقم الفاتورة أو اسم المورد..."
            onView={handleView}
            onEdit={canEdit ? handleEditClick : undefined}
            onDelete={canDelete ? handleDeleteClick : undefined}
            extraActions={
              canPrint
                ? [
                    {
                      label: "طباعة",
                      onClick: handlePrintClick,
                    },
                  ]
                : undefined
            }
            viewLabel="عرض"
            editLabel="تعديل"
            deleteLabel="حذف"
          />
        </CardContent>
      </Card>

      <Dialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        title="فاتورة مشتريات جديدة"
        className="max-w-5xl w-full"
      >
        <PurchaseInvoiceForm
          userPermissions={permissions}
          onSuccess={handleCreateSuccess}
        />
      </Dialog>

      <Dialog
        open={showEditDialog}
        onClose={() => {
          setShowEditDialog(false);
          setSelectedInvoice(null);
        }}
        title={`تعديل فاتورة ${selectedInvoice?.invoiceNumber || ""}`}
        className="max-w-5xl w-full"
      >
        {selectedInvoice && (
          <PurchaseInvoiceForm
            userPermissions={permissions}
            onSuccess={handleEditSuccess}
            initialData={selectedInvoice}
          />
        )}
      </Dialog>

      <Dialog
        open={showViewDialog}
        onClose={() => {
          setShowViewDialog(false);
          setSelectedInvoice(null);
        }}
        title={selectedInvoice?.invoiceNumber || "فاتورة المشتريات"}
        className="max-w-4xl"
      >
        {selectedInvoice && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">المورد: </span>
                <span className="font-medium">
                  {selectedInvoice.supplierName || "—"}
                </span>
              </div>
              <div>
                <span className="text-gray-500">رقم فاتورة المورد: </span>
                <span className="font-medium">
                  {selectedInvoice.supplierInvoiceNumber || "—"}
                </span>
              </div>
              <div>
                <span className="text-gray-500">التاريخ: </span>
                <span className="font-medium">
                  {formatDate(selectedInvoice.purchaseDate)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">العملة: </span>
                <span className="font-medium">
                  {selectedInvoice.currency === "USD"
                    ? "دولار أمريكي"
                    : "دينار عراقي"}
                </span>
              </div>
              <div>
                <span className="text-gray-500">المخزن: </span>
                <span className="font-medium">
                  {selectedInvoice.warehouseName || "—"}
                </span>
              </div>
              <div>
                <span className="text-gray-500">طريقة الدفع: </span>
                <span className="font-medium">
                  {selectedInvoice.paymentMethod === "CASH"
                    ? "نقداً"
                    : "على الحساب"}
                </span>
              </div>
            </div>

            {selectedInvoice.notes && (
              <div className="rounded-lg bg-gray-50 p-3 text-sm">
                <span className="text-gray-500">ملاحظات: </span>
                <span>{selectedInvoice.notes}</span>
              </div>
            )}

            <div>
              <h3 className="mb-2 text-sm font-semibold text-dark">المواد</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-3 py-2 text-right font-medium text-gray-600">
                        الكود
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-gray-600">
                        المادة
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-gray-600">
                        الكمية
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-gray-600">
                        سعر الشراء
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-gray-600">
                        الإجمالي
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-gray-600">
                        حصة المصروفات
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-gray-600">
                        التكلفة النهائية
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.items.map((item) => (
                      <tr key={item.id} className="border-b border-border">
                        <td className="px-3 py-2 font-mono text-gray-500">
                          {item.productCode}
                        </td>
                        <td className="px-3 py-2">{item.productName}</td>
                        <td className="px-3 py-2">{enNum(item.quantity)}</td>
                        <td className="px-3 py-2">
                          {enNum(item.purchasePrice)}
                        </td>
                        <td className="px-3 py-2">{enNum(item.totalPrice)}</td>
                        <td className="px-3 py-2">
                          {enNum(item.expenseShare)}
                        </td>
                        <td className="px-3 py-2 font-medium">
                          {enNum(item.finalCost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedInvoice.expenses.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-dark">
                  المصاريف
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="px-3 py-2 text-right font-medium text-gray-600">
                          الاسم
                        </th>
                        <th className="px-3 py-2 text-right font-medium text-gray-600">
                          المبلغ
                        </th>
                        <th className="px-3 py-2 text-right font-medium text-gray-600">
                          العملة
                        </th>
                        <th className="px-3 py-2 text-right font-medium text-gray-600">
                          بعملة الفاتورة
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.expenses.map((exp) => (
                        <tr key={exp.id} className="border-b border-border">
                          <td className="px-3 py-2">{exp.name}</td>
                          <td className="px-3 py-2">
                            {enNum(exp.amount)}{" "}
                            {exp.currency === "USD" ? "$" : "د.ع"}
                          </td>
                          <td className="px-3 py-2">
                            {exp.currency === "USD" ? "دولار" : "دينار"}
                          </td>
                          <td className="px-3 py-2">
                            {enNum(exp.amountInInvoiceCurrency)} د.ع
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="border-t border-border pt-3 text-sm">
              <div className="flex justify-between py-1">
                <span className="text-gray-500">إجمالي المواد</span>
                <span>{enNum(selectedInvoice.subtotal)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500">إجمالي المصاريف</span>
                <span>{enNum(selectedInvoice.totalExpenses)}</span>
              </div>
              <div className="flex justify-between py-1 text-lg font-bold text-dark">
                <span>إجمالي الكلفة</span>
                <span>
                  {enNum(selectedInvoice.totalCost)}{" "}
                  {selectedInvoice.currency === "USD" ? "$" : "د.ع"}
                </span>
              </div>
              <div className="flex justify-between py-1 text-green-600">
                <span>المدفوع</span>
                <span>{enNum(selectedInvoice.paid)}</span>
              </div>
              {selectedInvoice.remaining > 0 && (
                <div className="flex justify-between py-1 text-red-600 font-medium">
                  <span>الباقي</span>
                  <span>{enNum(selectedInvoice.remaining)}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </Dialog>

      <ConfirmDialog
        open={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setSelectedInvoice(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="حذف فاتورة المشتريات"
        message={`هل أنت متأكد من حذف فاتورة المشتريات "${selectedInvoice?.invoiceNumber}"؟`}
        confirmLabel="حذف"
        loading={deleteLoading}
      />
    </div>
  );
}
