"use client";

import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { WarehouseForm } from "@/components/forms/warehouse-form";
import { useToast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";

interface Warehouse {
  id: string;
  name: string;
  code: string;
  address: string | null;
  isActive: boolean;
}

export default function WarehousesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Warehouse | null>(null);
  const [deleteItem, setDeleteItem] = useState<Warehouse | null>(null);
  const [toggleItem, setToggleItem] = useState<Warehouse | null>(null);
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUserCompanyId(d.data?.companyId || null))
      .catch(() => {});
  }, []);

  const {
    data: warehouses = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["warehouses", userCompanyId],
    queryFn: async () => {
      const params = userCompanyId ? `?companyId=${userCompanyId}` : "";
      const res = await fetch(`/api/warehouses${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل تحميل المخازن");
      return json.data as Warehouse[];
    },
    enabled: !!userCompanyId,
  });

  const filtered = warehouses.filter(
    (w) => w.name.includes(search) || w.code.includes(search),
  );

  const createMutation = useMutation({
    mutationFn: async (data: unknown) => {
      const payload = userCompanyId
        ? { ...(data as object), companyId: userCompanyId }
        : data;
      const res = await fetch("/api/warehouses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل إنشاء المخزن");
      return json.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["warehouses", userCompanyId] });
      toast("تم إنشاء المخزن بنجاح", "success");
      setDialogOpen(false);
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: unknown }) => {
      const payload = userCompanyId
        ? { ...(data as object), companyId: userCompanyId }
        : data;
      const res = await fetch(`/api/warehouses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل تحديث المخزن");
      return json.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["warehouses", userCompanyId] });
      toast("تم تحديث المخزن بنجاح", "success");
      setEditItem(null);
      setDialogOpen(false);
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/warehouses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل تغيير الحالة");
      return json.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["warehouses", userCompanyId] });
      toast("تم تغيير الحالة بنجاح", "success");
      setToggleItem(null);
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/warehouses/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل حذف المخزن");
      return json.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["warehouses", userCompanyId] });
      toast("تم حذف المخزن نهائياً", "success");
      setDeleteItem(null);
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const openAdd = () => {
    setEditItem(null);
    setDialogOpen(true);
  };
  const openEdit = (item: Warehouse) => {
    setEditItem(item);
    setDialogOpen(true);
  };

  const handleSubmit = useCallback(
    async (data: unknown) => {
      if (editItem) updateMutation.mutate({ id: editItem.id, data });
      else createMutation.mutate(data);
    },
    [editItem, updateMutation, createMutation],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="المخازن"
        description="إدارة المخازن والمستودعات"
        actionLabel="مخزن جديد"
        onAction={openAdd}
      />

      <DataTable
        columns={[
          {
            key: "code",
            header: "الكود",
            render: (w: Warehouse) => (
              <span className="font-mono text-xs text-gray-500">{w.code}</span>
            ),
            sortable: true,
          },
          {
            key: "name",
            header: "الاسم",
            render: (w: Warehouse) => (
              <span className="font-medium">{w.name}</span>
            ),
            sortable: true,
          },
          {
            key: "address",
            header: "العنوان",
            render: (w: Warehouse) => (
              <span className="text-gray-600">{w.address || "-"}</span>
            ),
          },
          {
            key: "isActive",
            header: "الحالة",
            render: (w: Warehouse) => (
              <Badge variant={w.isActive ? "success" : "danger"}>
                {w.isActive ? "نشط" : "معطل"}
              </Badge>
            ),
          },
        ]}
        data={filtered}
        loading={isLoading}
        error={error instanceof Error ? error.message : null}
        search={search}
        onSearchChange={setSearch}
        actions={(item: Warehouse) => (
          <>
            <button
              onClick={() => openEdit(item)}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-muted hover:text-blue-600"
              title="تعديل"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
            <button
              onClick={() => setToggleItem(item)}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-muted hover:text-amber-600"
              title={item.isActive ? "تعطيل" : "تفعيل"}
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                />
              </svg>
            </button>
            {!item.isActive && (
              <button
                onClick={() => setDeleteItem(item)}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-muted hover:text-red-600"
                title="حذف نهائي"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            )}
          </>
        )}
      />

      <Dialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditItem(null);
        }}
        title={editItem ? "تعديل مخزن" : "إضافة مخزن جديد"}
      >
        <WarehouseForm
          defaultValues={
            editItem
              ? {
                  name: editItem.name,
                  code: editItem.code,
                  address: editItem.address || "",
                }
              : undefined
          }
          onSubmit={handleSubmit}
          loading={createMutation.isPending || updateMutation.isPending}
        />
      </Dialog>

      <ConfirmDialog
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={() => deleteItem && deleteMutation.mutate(deleteItem.id)}
        title="حذف نهائي"
        message={`سيتم حذف هذا المخزن نهائياً لأنه غير مستخدم في أي عملية. هل أنت متأكد؟`}
        confirmLabel="حذف نهائي"
        loading={deleteMutation.isPending}
      />
      <ConfirmDialog
        open={!!toggleItem}
        onClose={() => setToggleItem(null)}
        onConfirm={() =>
          toggleItem &&
          toggleMutation.mutate({
            id: toggleItem.id,
            isActive: !toggleItem.isActive,
          })
        }
        title={toggleItem?.isActive ? "تعطيل مخزن" : "تفعيل مخزن"}
        message={`هل أنت متأكد من ${toggleItem?.isActive ? "تعطيل" : "تفعيل"} المخزن "${toggleItem?.name}"؟`}
        confirmLabel={toggleItem?.isActive ? "تعطيل" : "تفعيل"}
        loading={toggleMutation.isPending}
      />
    </div>
  );
}
