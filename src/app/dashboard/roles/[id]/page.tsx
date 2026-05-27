"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { PERMISSIONS } from "@/lib/permissions";
import type { TokenPayload } from "@/lib/auth";

interface RoleDetail {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: string[];
}

interface Permission {
  id: string;
  key: string;
  name: string;
  module: string;
  description: string | null;
}

const MODULE_LABELS: Record<string, string> = {
  auth: "المصادقة",
  users: "المستخدمون",
  roles: "الأدوار",
  customers: "العملاء",
  suppliers: "الموردون",
  products: "المواد",
  inventory: "المخزون",
  warehouses: "المخازن",
  sales: "المبيعات",
  purchases: "المشتريات",
  accounts: "الحسابات",
  journals: "القيود",
  reports: "التقارير",
  settings: "الإعدادات",
  audit: "التدقيق",
  exchangeRates: "أسعار الصرف",
  paymentAccounts: "حسابات الدفع",
  units: "الوحدات",
  collections: "التحصيلات",
  branches: "الفروع",
  companies: "الشركات",
  fiscalPeriods: "الفترات المالية",
};

export default function RoleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const qc = useQueryClient();
  const id = params.id as string;

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [user, setUser] = useState<TokenPayload | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) return;
        setUser(d.data);
      })
      .catch(() => {});
  }, []);

  const userPermissions = user?.permissions || [];
  const canManage = userPermissions.includes(PERMISSIONS.ROLES_MANAGE);

  const { data: role, isLoading, error } = useQuery({
    queryKey: ["role", id],
    queryFn: async () => {
      const res = await fetch(`/api/roles/${id}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل تحميل بيانات الدور");
      return json.data as RoleDetail;
    },
  });

  const { data: allPermissions = [] } = useQuery({
    queryKey: ["all-permissions"],
    queryFn: async () => {
      const res = await fetch("/api/permissions");
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as Permission[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (body: {
      name: string;
      description: string | null;
      permissionIds: string[];
    }) => {
      const res = await fetch(`/api/roles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل تحديث الدور");
      return json.data;
    },
    onSuccess: () => {
      toast("تم تحديث الدور بنجاح", "success");
      qc.invalidateQueries({ queryKey: ["role", id] });
      qc.invalidateQueries({ queryKey: ["roles"] });
      setEditing(false);
    },
    onError: (err: Error) => {
      toast(err.message, "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/roles/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل حذف الدور");
      return json.data;
    },
    onSuccess: () => {
      toast("تم حذف الدور بنجاح", "success");
      qc.invalidateQueries({ queryKey: ["roles"] });
      router.push("/dashboard/roles");
    },
    onError: (err: Error) => {
      toast(err.message, "error");
      setDeleteOpen(false);
    },
  });

  const startEditing = () => {
    if (!role) return;
    setName(role.name);
    setDescription(role.description || "");
    setSelectedPermissionIds(
      allPermissions
        .filter((p) => role.permissions.includes(p.key))
        .map((p) => p.id),
    );
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast("اسم الدور مطلوب", "error");
      return;
    }
    updateMutation.mutate({
      name: name.trim(),
      description: description.trim() || null,
      permissionIds: selectedPermissionIds,
    });
  };

  const togglePermission = (permissionId: string) => {
    setSelectedPermissionIds((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId],
    );
  };

  const groupedPermissions: Record<string, Permission[]> = {};
  for (const perm of allPermissions) {
    const module = perm.module || "other";
    if (!groupedPermissions[module]) groupedPermissions[module] = [];
    groupedPermissions[module].push(perm);
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard/roles")}
            className="rounded-lg p-2 hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <PageHeader title="الدور" description="جاري التحميل..." />
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !role) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard/roles")}
            className="rounded-lg p-2 hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <PageHeader title="الدور" description="خطأ في التحميل" />
        </div>
        <Card>
          <CardContent className="py-12 text-center text-red-500">
            {error instanceof Error
              ? error.message
              : "تعذر تحميل بيانات الدور"}
          </CardContent>
        </Card>
      </div>
    );
  }

  const isSystemOwner = role.isSystem;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/dashboard/roles")}
          className="rounded-lg p-2 hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <PageHeader
            title={role.name}
            description={role.description || "دور مستخدم"}
          />
        </div>
        {!editing && (
          <div className="flex gap-2">
            {!isSystemOwner && canManage && (
              <>
                <Button variant="outline" onClick={startEditing}>
                  <Pencil className="h-4 w-4" />
                  تعديل
                </Button>
                <Button variant="danger" onClick={() => setDeleteOpen(true)}>
                  <Trash2 className="h-4 w-4" />
                  حذف
                </Button>
              </>
            )}
            {isSystemOwner && (
              <Badge variant="info">دور نظام</Badge>
            )}
          </div>
        )}
      </div>

      {editing ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>تعديل الدور</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>اسم الدور *</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="اسم الدور"
                  />
                </div>
                <div>
                  <Label>الوصف</Label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="وصف الدور"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>الصلاحيات</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(groupedPermissions).map(([module, perms]) => (
                <div key={module}>
                  <h3 className="mb-2 text-sm font-semibold text-gray-700">
                    {MODULE_LABELS[module] || module}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {perms.map((perm) => (
                      <button
                        key={perm.id}
                        onClick={() => togglePermission(perm.id)}
                        className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                          selectedPermissionIds.includes(perm.id)
                            ? "border-primary bg-primary text-white"
                            : "border-border bg-white text-gray-600 hover:bg-muted"
                        }`}
                      >
                        {perm.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {allPermissions.length === 0 && (
                <p className="text-center text-sm text-gray-500">
                  لا توجد صلاحيات
                </p>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={cancelEditing}>
              إلغاء
            </Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "جاري الحفظ..." : "حفظ التغييرات"}
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>معلومات الدور</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">الاسم</span>
                  <span className="font-medium text-dark">{role.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">الوصف</span>
                  <span className="font-medium text-dark">
                    {role.description || "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">النوع</span>
                  {role.isSystem ? (
                    <Badge variant="info">دور نظام</Badge>
                  ) : (
                    <Badge variant="default">عادي</Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>الصلاحيات</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1">
                  {role.permissions.length > 0 ? (
                    role.permissions.map((perm) => (
                      <Badge key={perm} variant="default" className="text-xs">
                        {perm}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">لا توجد صلاحيات</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {!isSystemOwner && canManage && (
            <div className="flex justify-end">
              <Button variant="danger" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="h-4 w-4" />
                حذف الدور
              </Button>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="تأكيد حذف الدور"
        message={`هل أنت متأكد من حذف الدور "${role.name}"؟`}
        confirmLabel="حذف"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
