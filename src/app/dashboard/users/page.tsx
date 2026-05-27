"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { PERMISSIONS } from "@/lib/permissions";
import type { TokenPayload } from "@/lib/auth";

interface User {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  phone: string | null;
  roles: string[];
  createdAt: string;
}

export default function UsersPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
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
  const canCreate = userPermissions.includes(PERMISSIONS.USERS_CREATE);
  const canEdit = userPermissions.includes(PERMISSIONS.USERS_EDIT);
  const canView = userPermissions.includes(PERMISSIONS.USERS_VIEW);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل تحميل المستخدمين");
      return json.data as User[];
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل تحديث المستخدم");
      return json.data;
    },
    onSuccess: () => {
      toast("تم تحديث الحالة بنجاح", "success");
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const filtered = users.filter(
    (u) => u.name.includes(search) || u.email.includes(search),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark">المستخدمين</h1>
          <p className="text-sm text-gray-500">إدارة حسابات المستخدمين</p>
        </div>
        {isLoadingAuth ? null : canCreate ? (
          <Button onClick={() => router.push("/dashboard/users/new")}>
            <Plus className="h-4 w-4" />
            مستخدم جديد
          </Button>
        ) : null}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="بحث..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">جاري التحميل...</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            لا يوجد مستخدمين
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-right p-4 text-sm font-medium text-gray-500">
                    الاسم
                  </th>
                  <th className="text-right p-4 text-sm font-medium text-gray-500">
                    البريد
                  </th>
                  <th className="text-right p-4 text-sm font-medium text-gray-500">
                    الدور
                  </th>
                  <th className="text-right p-4 text-sm font-medium text-gray-500">
                    الحالة
                  </th>
                  <th className="text-right p-4 text-sm font-medium text-gray-500">
                    تاريخ الإنشاء
                  </th>
                  <th className="text-center p-4 text-sm font-medium text-gray-500">
                    إجراءات
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-border hover:bg-muted/50"
                  >
                    <td className="p-4 text-dark font-medium">{user.name}</td>
                    <td className="p-4 text-gray-600" dir="ltr">
                      {user.email}
                    </td>
                    <td className="p-4">
                      {user.roles.map((role) => (
                        <Badge
                          key={role}
                          className="ml-1 bg-blue-100 text-blue-700"
                        >
                          {role}
                        </Badge>
                      ))}
                    </td>
                    <td className="p-4">
                      <Badge
                        className={
                          user.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-700"
                        }
                      >
                        {user.isActive ? "نشط" : "غير نشط"}
                      </Badge>
                    </td>
                    <td className="p-4 text-gray-600">
                      {new Date(user.createdAt).toLocaleDateString("ar-IQ")}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {canView && (
                          <button
                            onClick={() => router.push(`/dashboard/users/${user.id}`)}
                            className="rounded-lg p-1.5 text-gray-500 hover:bg-muted hover:text-blue-600"
                            title="عرض"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        )}
                        {canEdit && (
                          <button
                            onClick={() =>
                              toggleMutation.mutate({
                                id: user.id,
                                isActive: !user.isActive,
                              })
                            }
                            className={`rounded-lg px-2 py-1 text-xs font-medium transition-colors ${
                              user.isActive
                                ? "text-red-600 hover:bg-red-50"
                                : "text-green-600 hover:bg-green-50"
                            }`}
                            disabled={toggleMutation.isPending}
                          >
                            {user.isActive ? "تعطيل" : "تفعيل"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
