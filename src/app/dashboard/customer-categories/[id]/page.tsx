"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";

interface CustomerCategoryDetail {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  customerCount: number;
  createdAt: string;
}

export default function CustomerCategoryDetailPage() {
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
    queryKey: ["customer-category", id],
    queryFn: async () => {
      const res = await fetch(`/api/customer-categories/${id}`);
      const json = await res.json();
      if (!json.success)
        throw new Error(json.error || "فشل تحميل القسم");
      return json.data as CustomerCategoryDetail;
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
        <PageHeader
          title="تفاصيل قسم العميل"
          description="عرض بيانات قسم العملاء ومعلوماته الأساسية"
        />
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/dashboard/customers")}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-gray-600 hover:bg-muted"
          >
            رجوع
          </button>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center text-red-600">
          {error instanceof Error ? error.message : "فشل تحميل القسم"}
        </div>
      </div>
    );
  }

  const canEdit =
    permissions.includes("customerCategories.edit") || permissions.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="تفاصيل قسم العميل"
        description="عرض بيانات قسم العملاء ومعلوماته الأساسية"
      />

      <div className="flex items-center gap-2">
        <button
          onClick={() => router.push("/dashboard/customers")}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-gray-600 hover:bg-muted"
        >
          رجوع
        </button>
        {canEdit && (
          <button
            onClick={() => router.push("/dashboard/customers")}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            تعديل
          </button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>معلومات القسم</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-gray-500">الاسم</p>
                <p className="font-medium">{category.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">الحالة</p>
                <Badge variant={category.isActive ? "success" : "danger"}>
                  {category.isActive ? "نشط" : "غير نشط"}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-500">عدد العملاء</p>
                <p className="font-medium">{category.customerCount}</p>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
