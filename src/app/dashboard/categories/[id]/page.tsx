"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft } from "lucide-react";

interface CategoryDetail {
  id: string;
  companyId: string | null;
  name: string;
  code: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function CategoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { toast } = useToast();

  const [permissions, setPermissions] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        setPermissions(d.data?.permissions || []);
      })
      .catch(() => {
        toast("تعذر التحقق من الصلاحيات", "error");
      });
  }, []);

  const {
    data: category,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["category", id],
    queryFn: async () => {
      const res = await fetch(`/api/categories/${id}`);
      const json = await res.json();
      if (!json.success)
        throw new Error(json.error || "فشل تحميل التصنيف");
      return json.data as CategoryDetail;
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !category) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard/categories")}
            className="rounded-lg p-2 hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-dark">تفاصيل تصنيف المادة</h1>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center text-red-600">
          {error instanceof Error ? error.message : "فشل تحميل التصنيف"}
        </div>
      </div>
    );
  }

  const canEdit =
    permissions.includes("productCategories.edit") || permissions.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/dashboard/categories")}
          className="rounded-lg p-2 hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-dark">{category.name}</h1>
          <p className="text-sm text-gray-500">
            تصنيف مادة —{" "}
            <Badge variant={category.isActive ? "success" : "danger"}>
              {category.isActive ? "نشط" : "غير نشط"}
            </Badge>
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => router.push("/dashboard/categories")}
            className="rounded-lg border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5"
          >
            تعديل
          </button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>معلومات التصنيف</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-gray-500">الاسم</p>
                <p className="font-medium">{category.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">الكود</p>
                <p className="font-mono text-sm font-medium">
                  {category.code || "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">الحالة</p>
                <Badge variant={category.isActive ? "success" : "danger"}>
                  {category.isActive ? "نشط" : "غير نشط"}
                </Badge>
              </div>
            </div>
            {category.description && (
              <div>
                <p className="text-sm text-gray-500">الوصف</p>
                <p className="font-medium">{category.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>بيانات النظام</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">رقم المعرف</span>
              <span className="text-sm font-mono">{category.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">تاريخ الإنشاء</span>
              <span className="text-sm">
                {new Date(category.createdAt).toLocaleDateString("ar-IQ")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">آخر تحديث</span>
              <span className="text-sm">
                {new Date(category.updatedAt).toLocaleDateString("ar-IQ")}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
