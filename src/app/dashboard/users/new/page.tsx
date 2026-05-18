"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft } from "lucide-react";

interface Role {
  id: string;
  name: string;
}

export default function NewUserPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const { data: roles = [] } = useQuery({
    queryKey: ["roles-select"],
    queryFn: async () => {
      const res = await fetch("/api/roles");
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as Role[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (body: {
      name: string;
      email: string;
      password: string;
      phone: string | null;
      roleIds: string[];
    }) => {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل إنشاء المستخدم");
      return json.data;
    },
    onSuccess: () => {
      toast("تم إنشاء المستخدم بنجاح", "success");
      router.push("/dashboard/users");
    },
    onError: (err: Error) => {
      toast(err.message, "error");
      setSubmitting(false);
    },
  });

  const handleSubmit = () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      toast("الاسم والبريد وكلمة المرور مطلوبة", "error");
      return;
    }

    setSubmitting(true);
    createMutation.mutate({
      name,
      email,
      password,
      phone: phone || null,
      roleIds: selectedRoleIds,
    });
  };

  const toggleRole = (roleId: string) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId)
        ? prev.filter((id) => id !== roleId)
        : [...prev, roleId],
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/dashboard/users")}
          className="rounded-lg p-2 hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <PageHeader title="مستخدم جديد" description="إنشاء حساب مستخدم جديد" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>معلومات المستخدم</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>الاسم *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="الاسم الكامل"
              />
            </div>
            <div>
              <Label>البريد الإلكتروني *</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@company.com"
                dir="ltr"
              />
            </div>
            <div>
              <Label>كلمة المرور *</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
              />
            </div>
            <div>
              <Label>الهاتف</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="07XX XXX XXXX"
              />
            </div>
          </div>

          <div>
            <Label>الأدوار</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => toggleRole(role.id)}
                  className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                    selectedRoleIds.includes(role.id)
                      ? "border-primary bg-primary text-white"
                      : "border-border bg-white text-gray-600 hover:bg-muted"
                  }`}
                >
                  {role.name}
                </button>
              ))}
              {roles.length === 0 && (
                <p className="text-sm text-gray-500">لا توجد أدوار متاحة</p>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "جاري الحفظ..." : "إنشاء المستخدم"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
