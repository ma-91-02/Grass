"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Ruler } from "lucide-react";

interface Unit {
  id: string;
  name: string;
  code: string;
  symbol: string | null;
  type: string;
  isActive: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  PIECE: "قطعة",
  BOX: "علبة",
  LITER: "لتر",
  KG: "كغم",
  OTHER: "أخرى",
};

const TYPE_OPTIONS = Object.entries(TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export default function UnitsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Unit | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Unit | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formSymbol, setFormSymbol] = useState("");
  const [formType, setFormType] = useState("PIECE");

  useEffect(() => {
    setIsLoadingAuth(true);
    setAuthError(null);
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) throw new Error(d.error || "فشل تحميل بيانات الجلسة");
        if (!d.data?.companyId)
          throw new Error("لم يتم العثور على شركة مرتبطة بالمستخدم");
        setUserCompanyId(d.data.companyId);
      })
      .catch((err) => {
        setAuthError(
          err instanceof Error ? err.message : "تعذر تحميل بيانات الشركة",
        );
      })
      .finally(() => setIsLoadingAuth(false));
  }, []);

  const { data: units = [], isLoading, error } = useQuery({
    queryKey: ["units", userCompanyId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (userCompanyId) params.append("companyId", userCompanyId);
      const res = await fetch(`/api/units?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل تحميل الوحدات");
      return json.data as Unit[];
    },
    enabled: !!userCompanyId,
  });

  const filtered = units.filter(
    (u) =>
      u.name.includes(search) || u.code.includes(search) || u.symbol?.includes(search),
  );

  const createMutation = useMutation({
    mutationFn: async (data: {
      companyId: string;
      name: string;
      code: string;
      symbol?: string;
      type: string;
    }) => {
      const res = await fetch("/api/units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل إنشاء الوحدة");
      return json.data;
    },
    onSuccess: () => {
      toast("تم إنشاء الوحدة بنجاح", "success");
      qc.invalidateQueries({ queryKey: ["units", userCompanyId] });
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
      data: { name?: string; symbol?: string; type?: string };
    }) => {
      const res = await fetch(`/api/units/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل تحديث الوحدة");
      return json.data;
    },
    onSuccess: () => {
      toast("تم تحديث الوحدة بنجاح", "success");
      qc.invalidateQueries({ queryKey: ["units", userCompanyId] });
      closeDialog();
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/units/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل حذف الوحدة");
      return json.data;
    },
    onSuccess: (data) => {
      if (data.action === "deactivated") {
        toast("الوحدة مستخدمة في مواد، تم تعطيلها بدلاً من الحذف", "info");
      } else {
        toast("تم حذف الوحدة بنجاح", "success");
      }
      qc.invalidateQueries({ queryKey: ["units", userCompanyId] });
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
    setFormSymbol("");
    setFormType("PIECE");
    setDialogOpen(true);
  };

  const openEdit = (item: Unit) => {
    setEditItem(item);
    setFormName(item.name);
    setFormCode(item.code);
    setFormSymbol(item.symbol || "");
    setFormType(item.type);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditItem(null);
  };

  const handleSubmit = () => {
    if (!formName.trim()) {
      toast("الاسم مطلوب", "error");
      return;
    }
    if (!formCode.trim()) {
      toast("الكود مطلوب", "error");
      return;
    }
    const payload = {
      name: formName.trim(),
      code: formCode.trim(),
      symbol: formSymbol.trim() || undefined,
      type: formType,
    };
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, data: payload });
    } else {
      if (!userCompanyId) {
        toast("بيانات الشركة غير متوفرة", "error");
        return;
      }
      createMutation.mutate({ ...payload, companyId: userCompanyId });
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

  const columns: Column<Unit>[] = [
    {
      key: "code",
      header: "الكود",
      render: (u) => (
        <span className="font-mono text-xs text-gray-500">{u.code}</span>
      ),
      sortable: true,
    },
    {
      key: "name",
      header: "الاسم",
      render: (u) => <span className="font-medium">{u.name}</span>,
      sortable: true,
    },
    {
      key: "symbol",
      header: "الرمز",
      render: (u) => <span>{u.symbol || "-"}</span>,
    },
    {
      key: "type",
      header: "النوع",
      render: (u) => <Badge variant="info">{TYPE_LABELS[u.type] || u.type}</Badge>,
    },
    {
      key: "isActive",
      header: "الحالة",
      render: (u) => (
        <Badge variant={u.isActive ? "success" : "danger"}>
          {u.isActive ? "نشط" : "معطل"}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="وحدات القياس"
        description="إدارة وحدات قياس المواد"
        actionLabel="وحدة جديدة"
        onAction={openAdd}
      />

      <DataTable
        columns={columns}
        data={filtered}
        loading={isLoading}
        error={error instanceof Error ? error.message : null}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="بحث بالاسم أو الكود..."
        actions={(item: Unit) => (
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
        )}
      />

      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        title={editItem ? "تعديل وحدة قياس" : "إضافة وحدة قياس جديدة"}
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
            label="الرمز"
            value={formSymbol}
            onChange={(e) => setFormSymbol(e.target.value)}
          />
          <Select
            label="النوع"
            options={TYPE_OPTIONS}
            value={formType}
            onChange={(e) => setFormType(e.target.value)}
          />
        </div>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="حذف وحدة قياس"
        message={`هل أنت متأكد من حذف وحدة القياس "${deleteTarget?.name}"؟ إذا كانت مستخدمة في مواد سيتم تعطيلها بدلاً من الحذف.`}
        confirmLabel="حذف"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
