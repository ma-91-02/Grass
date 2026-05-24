"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft, User } from "lucide-react";

interface Role {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
}

interface UserDetail {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  phone: string | null;
  roles: string[];
}

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const qc = useQueryClient();
  const { toast } = useToast();
  const id = params.id as string;

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const [editRolesOpen, setEditRolesOpen] = useState(false);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toggleOpen, setToggleOpen] = useState(false);

  useEffect(() => {
    setIsLoadingAuth(true);
    setAuthError(null);
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) throw new Error(d.error || "فشل تحميل بيانات الجلسة");
        setCurrentUserId(d.data.userId);
      })
      .catch((err) => {
        setAuthError(
          err instanceof Error ? err.message : "تعذر تحميل بيانات الجلسة",
        );
      })
      .finally(() => setIsLoadingAuth(false));
  }, []);

  const {
    data: user,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["user", id],
    queryFn: async () => {
      const res = await fetch(`/api/users/${id}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل تحميل المستخدم");
      return json.data as UserDetail;
    },
  });

  const { data: allRoles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const res = await fetch("/api/roles");
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل تحميل الأدوار");
      return json.data as Role[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل تحديث المستخدم");
      return json.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user", id] });
      qc.invalidateQueries({ queryKey: ["users"] });
      toast("تم تحديث المستخدم بنجاح", "success");
      setEditRolesOpen(false);
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل حذف المستخدم");
      return json.data;
    },
    onSuccess: () => {
      toast("تم حذف المستخدم بنجاح", "success");
      router.push("/dashboard/users");
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const isCurrentUser = currentUserId === id;

  const openEditRoles = useCallback(() => {
    if (!user) return;
    const roleIds = allRoles
      .filter((r) => user.roles.includes(r.name))
      .map((r) => r.id);
    setSelectedRoleIds(roleIds);
    setEditRolesOpen(true);
  }, [user, allRoles]);

  const handleSaveRoles = useCallback(() => {
    updateMutation.mutate({ roleIds: selectedRoleIds });
  }, [updateMutation, selectedRoleIds]);

  const toggleRole = useCallback((roleId: string) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId)
        ? prev.filter((r) => r !== roleId)
        : [...prev, roleId],
    );
  }, []);

  const handleToggleActive = useCallback(() => {
    if (!user) return;
    updateMutation.mutate({ isActive: !user.isActive });
    setToggleOpen(false);
  }, [user, updateMutation]);

  const isSelfAction = isCurrentUser;

  if (isLoading || isLoadingAuth) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (authError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard/users")}
            className="rounded-lg p-2 hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-dark">تفاصيل المستخدم</h1>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center text-red-600">
          {authError}
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard/users")}
            className="rounded-lg p-2 hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-dark">تفاصيل المستخدم</h1>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center text-red-600">
          {error instanceof Error ? error.message : "فشل تحميل المستخدم"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/dashboard/users")}
          className="rounded-lg p-2 hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <User className="h-6 w-6 text-gray-400" />
            <h1 className="text-2xl font-bold text-dark">{user.name}</h1>
            <Badge
              className={
                user.isActive
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-700"
              }
            >
              {user.isActive ? "نشط" : "غير نشط"}
            </Badge>
          </div>
          <p className="text-sm text-gray-500">{user.email}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>معلومات المستخدم</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-gray-500">الاسم</p>
                <p className="font-medium">{user.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">البريد الإلكتروني</p>
                <p className="font-mono text-sm font-medium" dir="ltr">
                  {user.email}
                </p>
              </div>
              {user.phone && (
                <div>
                  <p className="text-sm text-gray-500">الهاتف</p>
                  <p className="font-medium" dir="ltr">
                    {user.phone}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500">الحالة</p>
                <Badge
                  className={
                    user.isActive
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-700"
                  }
                >
                  {user.isActive ? "نشط" : "غير نشط"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>بيانات النظام</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">رقم المعرف</span>
              <span className="font-mono text-sm">{user.id}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>الأدوار</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={openEditRoles}
              disabled={updateMutation.isPending}
            >
              تعديل الأدوار
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {user.roles.length === 0 ? (
            <p className="text-sm text-gray-500">لا يوجد أدوار</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {user.roles.map((role) => (
                <Badge
                  key={role}
                  className="bg-blue-100 text-blue-700 text-sm px-3 py-1"
                >
                  {role}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>الإجراءات</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant={user.isActive ? "outline" : "primary"}
              onClick={() => setToggleOpen(true)}
              disabled={updateMutation.isPending || isSelfAction}
              title={
                isSelfAction
                  ? "لا يمكنك تغيير حالة حسابك"
                  : user.isActive
                    ? "تعطيل المستخدم"
                    : "تفعيل المستخدم"
              }
            >
              {user.isActive ? "تعطيل" : "تفعيل"}
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={() => setDeleteOpen(true)}
              disabled={deleteMutation.isPending || isSelfAction}
              title={
                isSelfAction ? "لا يمكنك حذف حسابك" : "حذف المستخدم"
              }
            >
              حذف
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={editRolesOpen}
        onClose={() => setEditRolesOpen(false)}
        title="تعديل الأدوار"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditRolesOpen(false)}
              disabled={updateMutation.isPending}
            >
              إلغاء
            </Button>
            <Button
              type="button"
              onClick={handleSaveRoles}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "جاري الحفظ..." : "حفظ"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {allRoles.length === 0 ? (
            <p className="text-sm text-gray-500">لا توجد أدوار متاحة</p>
          ) : (
            allRoles.map((role) => (
              <label
                key={role.id}
                className="flex items-center gap-3 rounded-lg border border-border/50 p-3 hover:bg-muted/30 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedRoleIds.includes(role.id)}
                  onChange={() => toggleRole(role.id)}
                  className="h-4 w-4 rounded border-gray-300 text-primary"
                />
                <div>
                  <span className="font-medium text-dark">{role.name}</span>
                  {role.description && (
                    <p className="text-xs text-gray-500">{role.description}</p>
                  )}
                </div>
              </label>
            ))
          )}
        </div>
      </Dialog>

      <ConfirmDialog
        open={toggleOpen}
        onClose={() => setToggleOpen(false)}
        onConfirm={handleToggleActive}
        title={user.isActive ? "تعطيل المستخدم" : "تفعيل المستخدم"}
        message={`هل أنت متأكد من ${user.isActive ? "تعطيل" : "تفعيل"} المستخدم "${user.name}"؟`}
        confirmLabel={user.isActive ? "تعطيل" : "تفعيل"}
        loading={updateMutation.isPending}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="حذف المستخدم"
        message={`هل أنت متأكد من حذف المستخدم "${user.name}"؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmLabel="حذف"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
