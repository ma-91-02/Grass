"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { Plus, Eye } from "lucide-react";
import { PERMISSIONS } from "@/lib/permissions";
import type { TokenPayload } from "@/lib/auth";

interface Role {
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

export default function RolesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPermissionIds, setNewPermissionIds] = useState<string[]>([]);
  const [user, setUser] = useState<TokenPayload | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    setIsLoadingAuth(true);
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) throw new Error(d.error || "فشل تحميل بيانات الجلسة");
        setUser(d.data);
      })
      .catch(() => {})
      .finally(() => setIsLoadingAuth(false));
  }, []);

  const userPermissions = user?.permissions || [];
  const canView = userPermissions.includes(PERMISSIONS.ROLES_VIEW);
  const canManage = userPermissions.includes(PERMISSIONS.ROLES_MANAGE);

  const {
    data: roles = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const res = await fetch("/api/roles");
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل تحميل الأدوار");
      return json.data as Role[];
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

  const createMutation = useMutation({
    mutationFn: async (body: {
      name: string;
      description: string | null;
      permissionIds: string[];
    }) => {
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل إنشاء الدور");
      return json.data;
    },
    onSuccess: () => {
      toast("تم إنشاء الدور بنجاح", "success");
      qc.invalidateQueries({ queryKey: ["roles"] });
      setCreateOpen(false);
      setNewName("");
      setNewDescription("");
      setNewPermissionIds([]);
    },
    onError: (err: Error) => {
      toast(err.message, "error");
    },
  });

  const handleCreate = () => {
    if (!newName.trim()) {
      toast("اسم الدور مطلوب", "error");
      return;
    }
    createMutation.mutate({
      name: newName.trim(),
      description: newDescription.trim() || null,
      permissionIds: newPermissionIds,
    });
  };

  const toggleNewPermission = (permissionId: string) => {
    setNewPermissionIds((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId],
    );
  };

  const groupedPermissions: Record<string, Permission[]> = {};
  for (const perm of allPermissions) {
    const module = perm.module || "other";
    if (!groupedPermissions[module]) groupedPermissions[module] = [];
    if (!groupedPermissions[module].find((p) => p.key === perm.key)) {
      groupedPermissions[module].push(perm);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark">الأدوار والصلاحيات</h1>
          <p className="text-sm text-gray-500">
            إدارة أدوار المستخدمين والصلاحيات
          </p>
        </div>
        {isLoadingAuth ? null : canManage ? (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            إضافة دور جديد
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">جاري التحميل...</div>
      ) : error ? (
        <Card>
          <CardContent className="py-12 text-center text-red-500">
            تعذر تحميل الأدوار. يرجى المحاولة مرة أخرى.
          </CardContent>
        </Card>
      ) : roles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            لا يوجد أدوار
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => (
            <Card key={role.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-dark">{role.name}</h3>
                  <div className="flex items-center gap-1">
                    {role.isSystem && <Badge variant="info">نظام</Badge>}
                    {canView && (
                      <button
                        onClick={() =>
                          router.push(`/dashboard/roles/${role.id}`)
                        }
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-muted hover:text-dark"
                        title="عرض التفاصيل"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                {role.description && (
                  <p className="text-sm text-gray-500 mb-3">
                    {role.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-1">
                  {role.permissions.slice(0, 6).map((perm) => (
                    <Badge key={perm} variant="default" className="text-xs">
                      {perm}
                    </Badge>
                  ))}
                  {role.permissions.length > 6 && (
                    <Badge variant="default" className="text-xs">
                      +{role.permissions.length - 6}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="إضافة دور جديد"
        className="max-w-2xl"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={createMutation.isPending}
            >
              إلغاء
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "جاري الحفظ..." : "إنشاء الدور"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>اسم الدور *</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="اسم الدور"
              />
            </div>
            <div>
              <Label>الوصف</Label>
              <Input
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="وصف الدور"
              />
            </div>
          </div>

          <div>
            <Label>الصلاحيات</Label>
            <div className="mt-2 max-h-64 space-y-3 overflow-y-auto rounded-lg border border-border p-3">
              {Object.entries(groupedPermissions).map(([module, perms]) => (
                <div key={module}>
                  <h4 className="mb-1 text-xs font-semibold text-gray-700">
                    {MODULE_LABELS[module] || module}
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {perms.map((perm) => (
                      <button
                        key={perm.id}
                        onClick={() => toggleNewPermission(perm.id)}
                        className={`rounded border px-2 py-1 text-xs transition-colors ${
                          newPermissionIds.includes(perm.id)
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
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
