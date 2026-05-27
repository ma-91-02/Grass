"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft } from "lucide-react";

interface AccountDetail {
  id: string;
  code: string;
  name: string;
  type: string;
  level: number;
  parentId: string | null;
  currency: string;
  isActive: boolean;
  isPosting: boolean;
  childrenCount: number;
  description: string | null;
  subtype: string | null;
  normalBalance: string;
  allowManualJournal: boolean;
  isSystem: boolean;
  isProtected: boolean;
  createdAt: string;
  updatedAt: string;
}

const typeLabels: Record<string, string> = {
  ASSET: "أصل",
  LIABILITY: "خصم",
  EQUITY: "حقوق ملكية",
  INCOME: "إيراد",
  EXPENSE: "مصروف",
};

const typeColors: Record<string, string> = {
  ASSET: "bg-blue-100 text-blue-700",
  LIABILITY: "bg-purple-100 text-purple-700",
  EQUITY: "bg-green-100 text-green-700",
  INCOME: "bg-emerald-100 text-emerald-700",
  EXPENSE: "bg-red-100 text-red-700",
};

export default function AccountDetailPage() {
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
    data: account,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["account", id],
    queryFn: async () => {
      const res = await fetch(`/api/accounts/${id}`);
      const json = await res.json();
      if (!json.success)
        throw new Error(json.error || "فشل تحميل الحساب");
      return json.data as AccountDetail;
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard/accounts")}
            className="rounded-lg p-2 hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-dark">تفاصيل الحساب</h1>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center text-red-600">
          {error instanceof Error ? error.message : "فشل تحميل الحساب"}
        </div>
      </div>
    );
  }

  const canEdit =
    permissions.includes("accounts.edit") || permissions.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/dashboard/accounts")}
          className="rounded-lg p-2 hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-dark">
            {account.name}
          </h1>
          <p className="text-sm text-gray-500">
            {typeLabels[account.type] || account.type} —{" "}
            <Badge variant={account.isActive ? "success" : "danger"}>
              {account.isActive ? "نشط" : "معطل"}
            </Badge>
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => router.push("/dashboard/accounts")}
            className="rounded-lg border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5"
          >
            تعديل
          </button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>معلومات الحساب</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-gray-500">الاسم</p>
                <p className="font-medium">{account.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">الكود</p>
                <p className="font-mono text-sm font-medium">{account.code}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">النوع</p>
                <Badge
                  className={
                    typeColors[account.type] || "bg-gray-100 text-gray-700"
                  }
                >
                  {typeLabels[account.type] || account.type}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-500">العملة</p>
                <p className="font-medium">{account.currency}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">المستوى</p>
                <p className="font-medium">{account.level}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">طبيعة الرصيد</p>
                <p className="font-medium">
                  {account.normalBalance === "DEBIT" ? "مدين" : "دائن"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">ترحيل</p>
                <p>
                  {account.isPosting ? (
                    <Badge variant="info">ترحيل</Badge>
                  ) : (
                    <Badge variant="warning">تجميعي</Badge>
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">الحالة</p>
                <p>
                  <Badge variant={account.isActive ? "success" : "danger"}>
                    {account.isActive ? "نشط" : "معطل"}
                  </Badge>
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">إدخال يدوي</p>
                <p className="font-medium">
                  {account.allowManualJournal ? "مسموح" : "غير مسموح"}
                </p>
              </div>
              {account.subtype && (
                <div>
                  <p className="text-sm text-gray-500">النوع الفرعي</p>
                  <p className="font-medium">{account.subtype}</p>
                </div>
              )}
            </div>
            {account.description && (
              <div>
                <p className="text-sm text-gray-500">الوصف</p>
                <p className="font-medium">{account.description}</p>
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
              <span className="text-sm font-mono">{account.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">تاريخ الإنشاء</span>
              <span className="text-sm">
                {new Date(account.createdAt).toLocaleDateString("ar-IQ")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">آخر تحديث</span>
              <span className="text-sm">
                {new Date(account.updatedAt).toLocaleDateString("ar-IQ")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">حساب نظام</span>
              <span className="text-sm">
                {account.isSystem ? "نعم" : "لا"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">حساب محمي</span>
              <span className="text-sm">
                {account.isProtected ? "نعم" : "لا"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {account.childrenCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>الحسابات الفرعية</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              هذا الحساب لديه {account.childrenCount} حساب فرعي. يمكنك
              عرضها في{" "}
              <button
                onClick={() => router.push("/dashboard/accounts")}
                className="text-primary hover:underline"
              >
                شجرة الحسابات
              </button>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
