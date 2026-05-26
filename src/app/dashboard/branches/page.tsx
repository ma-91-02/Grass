"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";

interface Branch {
  id: string;
  companyId: string;
  name: string;
  code: string;
  address: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function BranchesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [authData, setAuthData] = useState<{
    permissions?: string[];
    companyId?: string | null;
  } | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Branch | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Branch | null>(null);

  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formPhone, setFormPhone] = useState("");

  useEffect(() => {
    setIsLoadingAuth(true);
    setAuthError(null);
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) throw new Error(d.error || "فشل تحميل بيانات الجلسة");
        setAuthData(d.data);
      })
      .catch((err) => {
        setAuthError(
          err instanceof Error ? err.message : "تعذر تحميل بيانات المستخدم",
        );
      })
      .finally(() => setIsLoadingAuth(false));
  }, []);

  const permissions = authData?.permissions || [];
  const canCreate = permissions.includes("branches.create");
  const canEdit = permissions.includes("branches.edit");
  const companyId = authData?.companyId;

  const { data: branches = [], isLoading, error } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const res = await fetch("/api/branches");
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل تحميل الفروع");
      return json.data as Branch[];
    },
    enabled: !isLoadingAuth && !!authData,
  });

  const filtered = branches.filter(
    (b) =>
      b.name.includes(search) ||
      b.code.includes(search) ||
      b.address?.includes(search),
  );

  const createMutation = useMutation({
    mutationFn: async (data: {
      companyId: string;
      name: string;
      code: string;
      address?: string;
      phone?: string;
    }) => {
      const res = await fetch("/api/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل إنشاء الفرع");
      return json.data;
    },
    onSuccess: () => {
      toast("تم إنشاء الفرع بنجاح", "success");
      qc.invalidateQueries({ queryKey: ["branches"] });
      closeDialog();
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: {
        name?: string;
        code?: string;
        address?: string | null;
        phone?: string | null;
      };
    }) => {
      const res = await fetch(`/api/branches/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل تحديث الفرع");
      return json.data;
    },
    onSuccess: () => {
      toast("تم تحديث الفرع بنجاح", "success");
      qc.invalidateQueries({ queryKey: ["branches"] });
      closeDialog();
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/branches/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل حذف الفرع");
      return json.data;
    },
    onSuccess: (data) => {
      if (data.action === "deactivated") {
        toast("الفرع مرتبط ببيانات أخرى، تم تعطيله بدلاً من الحذف", "info");
      } else {
        toast("تم حذف الفرع بنجاح", "success");
      }
      qc.invalidateQueries({ queryKey: ["branches"] });
      setDeleteTarget(null);
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const isPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  const openAdd = () => {
    setEditItem(null);
    setFormName("");
    setFormCode("");
    setFormAddress("");
    setFormPhone("");
    setDialogOpen(true);
  };

  const openEdit = (item: Branch) => {
    setEditItem(item);
    setFormName(item.name);
    setFormCode(item.code);
    setFormAddress(item.address || "");
    setFormPhone(item.phone || "");
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditItem(null);
  };

  const handleSubmit = () => {
    if (!formName.trim()) {
      toast("اسم الفرع مطلوب", "error");
      return;
    }
    if (!formCode.trim()) {
      toast("كود الفرع مطلوب", "error");
      return;
    }
    const payload = {
      name: formName.trim(),
      code: formCode.trim(),
      address: formAddress.trim() || undefined,
      phone: formPhone.trim() || undefined,
    };
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, data: payload });
    } else {
      if (!companyId) {
        toast("معرف الشركة غير متوفر", "error");
        return;
      }
      createMutation.mutate({ ...payload, companyId });
    }
  };

  if (isLoadingAuth) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (authError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="font-medium text-red-600">{authError}</p>
      </div>
    );
  }

  const columns: Column<Branch>[] = [
    {
      key: "code",
      header: "الكود",
      render: (b) => (
        <span className="font-mono text-xs text-gray-500">{b.code}</span>
      ),
      sortable: true,
    },
    {
      key: "name",
      header: "الاسم",
      render: (b) => <span className="font-medium">{b.name}</span>,
      sortable: true,
    },
    {
      key: "address",
      header: "العنوان",
      render: (b) => (
        <span className="text-xs text-gray-500">{b.address || "-"}</span>
      ),
    },
    {
      key: "phone",
      header: "الهاتف",
      render: (b) => <span dir="ltr">{b.phone || "-"}</span>,
    },
    {
      key: "isActive",
      header: "الحالة",
      render: (b) => (
        <Badge variant={b.isActive ? "success" : "danger"}>
          {b.isActive ? "نشط" : "معطل"}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="الفروع"
        description="إدارة فروع الشركات داخل النظام"
        actionLabel={canCreate ? "فرع جديد" : undefined}
        onAction={canCreate ? openAdd : undefined}
      />

      <DataTable
        columns={columns}
        data={filtered}
        loading={isLoading}
        error={error instanceof Error ? error.message : null}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="بحث بالاسم أو الكود..."
        actions={(item: Branch) => {
          if (!canEdit) return <></>;
          return (
            <div className="flex items-center justify-center gap-1">
              <button
                onClick={() => openEdit(item)}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-muted hover:text-blue-600"
                title="تعديل"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={() => setDeleteTarget(item)}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-muted hover:text-red-600"
                title="حذف"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          );
        }}
      />

      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        title={editItem ? "تعديل فرع" : "إضافة فرع جديد"}
        className="max-w-md"
        footer={
          <>
            <Button type="button" variant="outline" onClick={closeDialog} disabled={isPending}>
              إلغاء
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={isPending}>
              {isPending ? "جاري الحفظ..." : "حفظ"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="الاسم"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            required
          />
          <Input
            label="الكود"
            value={formCode}
            onChange={(e) => setFormCode(e.target.value)}
            required
          />
          <Input
            label="الهاتف"
            value={formPhone}
            onChange={(e) => setFormPhone(e.target.value)}
          />
          <Input
            label="العنوان"
            value={formAddress}
            onChange={(e) => setFormAddress(e.target.value)}
          />
        </div>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="حذف فرع"
        message={`هل أنت متأكد من حذف الفرع "${deleteTarget?.name}"؟ إذا كان مرتبطًا ببيانات أخرى سيتم تعطيله بدلاً من الحذف.`}
        confirmLabel="حذف"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
