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
import { Edit, Trash2, Building2 } from "lucide-react";

interface Company {
  id: string;
  name: string;
  code: string;
  taxId: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  createdAt: string;
}

interface PermissionData {
  permissions?: string[];
  companyId?: string | null;
}

export default function CompaniesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [authData, setAuthData] = useState<PermissionData | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Company | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);

  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formTaxId, setFormTaxId] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");

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
  const canView = permissions.includes("companies.view");
  const canCreate = permissions.includes("companies.create");
  const canEdit = permissions.includes("companies.edit");

  const { data: companies = [], isLoading, error } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const res = await fetch("/api/companies");
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل تحميل الشركات");
      return json.data as Company[];
    },
    enabled: !isLoadingAuth && !!authData,
  });

  const filtered = companies.filter(
    (c) =>
      c.name.includes(search) ||
      c.code.includes(search) ||
      c.email?.includes(search),
  );

  const createMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      code: string;
      taxId?: string;
      address?: string;
      phone?: string;
      email?: string;
    }) => {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل إنشاء الشركة");
      return json.data;
    },
    onSuccess: () => {
      toast("تم إنشاء الشركة بنجاح", "success");
      qc.invalidateQueries({ queryKey: ["companies"] });
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
        taxId?: string | null;
        address?: string | null;
        phone?: string | null;
        email?: string | null;
      };
    }) => {
      const res = await fetch(`/api/companies/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل تحديث الشركة");
      return json.data;
    },
    onSuccess: () => {
      toast("تم تحديث الشركة بنجاح", "success");
      qc.invalidateQueries({ queryKey: ["companies"] });
      closeDialog();
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/companies/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل حذف الشركة");
      return json.data;
    },
    onSuccess: (data) => {
      if (data.action === "deactivated") {
        toast("الشركة مرتبطة ببيانات أخرى، تم تعطيلها بدلاً من الحذف", "info");
      } else {
        toast("تم حذف الشركة بنجاح", "success");
      }
      qc.invalidateQueries({ queryKey: ["companies"] });
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
    setFormTaxId("");
    setFormAddress("");
    setFormPhone("");
    setFormEmail("");
    setDialogOpen(true);
  };

  const openEdit = (item: Company) => {
    setEditItem(item);
    setFormName(item.name);
    setFormCode(item.code);
    setFormTaxId(item.taxId || "");
    setFormAddress(item.address || "");
    setFormPhone(item.phone || "");
    setFormEmail(item.email || "");
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditItem(null);
  };

  const handleSubmit = () => {
    if (!formName.trim()) {
      toast("اسم الشركة مطلوب", "error");
      return;
    }
    if (!formCode.trim()) {
      toast("كود الشركة مطلوب", "error");
      return;
    }
    const payload = {
      name: formName.trim(),
      code: formCode.trim(),
      taxId: formTaxId.trim() || undefined,
      address: formAddress.trim() || undefined,
      phone: formPhone.trim() || undefined,
      email: formEmail.trim() || undefined,
    };
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, data: payload });
    } else {
      createMutation.mutate(payload);
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

  const columns: Column<Company>[] = [
    {
      key: "code",
      header: "الكود",
      render: (c) => (
        <span className="font-mono text-xs text-gray-500">{c.code}</span>
      ),
      sortable: true,
    },
    {
      key: "name",
      header: "الاسم",
      render: (c) => <span className="font-medium">{c.name}</span>,
      sortable: true,
    },
    {
      key: "phone",
      header: "الهاتف",
      render: (c) => <span dir="ltr">{c.phone || "-"}</span>,
    },
    {
      key: "email",
      header: "البريد",
      render: (c) => <span className="text-xs">{c.email || "-"}</span>,
    },
    {
      key: "address",
      header: "العنوان",
      render: (c) => (
        <span className="text-xs text-gray-500">{c.address || "-"}</span>
      ),
    },
    {
      key: "isActive",
      header: "الحالة",
      render: (c) => (
        <Badge variant={c.isActive ? "success" : "danger"}>
          {c.isActive ? "نشط" : "معطل"}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="الشركات"
        description="إدارة الشركات داخل النظام"
        actionLabel={canCreate ? "شركة جديدة" : undefined}
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
        actions={(item: Company) => {
          if (!canEdit) return <></>;
          return (
            <div className="flex items-center justify-center gap-1">
              <button
                onClick={() => openEdit(item)}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-muted hover:text-blue-600"
                title="تعديل"
              >
                <Edit className="h-4 w-4" />
              </button>
              <button
                onClick={() => setDeleteTarget(item)}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-muted hover:text-red-600"
                title="حذف"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        }}
      />

      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        title={editItem ? "تعديل شركة" : "إضافة شركة جديدة"}
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
            label="الرقم الضريبي"
            value={formTaxId}
            onChange={(e) => setFormTaxId(e.target.value)}
          />
          <Input
            label="الهاتف"
            value={formPhone}
            onChange={(e) => setFormPhone(e.target.value)}
          />
          <Input
            label="البريد الإلكتروني"
            value={formEmail}
            onChange={(e) => setFormEmail(e.target.value)}
            type="email"
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
        title="حذف شركة"
        message={`هل أنت متأكد من حذف الشركة "${deleteTarget?.name}"؟ إذا كانت مرتبطة ببيانات أخرى سيتم تعطيلها بدلاً من الحذف.`}
        confirmLabel="حذف"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
