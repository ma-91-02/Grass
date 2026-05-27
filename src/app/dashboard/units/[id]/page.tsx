"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft, Ruler } from "lucide-react";

interface UnitDetail {
  id: string;
  companyId: string | null;
  name: string;
  code: string;
  symbol: string | null;
  type: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  PIECE: "قطعة",
  BOX: "علبة",
  LITER: "لتر",
  KG: "كغم",
  OTHER: "أخرى",
};

export default function UnitDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { toast } = useToast();

  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    setIsLoadingAuth(true);
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        setPermissions(d.data?.permissions || []);
      })
      .catch(() => {
        toast("تعذر التحقق من الصلاحيات", "error");
      })
      .finally(() => setIsLoadingAuth(false));
  }, [toast]);

  const {
    data: unit,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["unit", id],
    queryFn: async () => {
      const res = await fetch(`/api/units/${id}`);
      const json = await res.json();
      if (!json.success)
        throw new Error(json.error || "فشل تحميل وحدة القياس");
      return json.data as UnitDetail;
    },
  });

  if (isLoadingAuth || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !unit) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard/units")}
            className="rounded-lg p-2 hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-dark">تفاصيل وحدة القياس</h1>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center text-red-600">
          {error instanceof Error ? error.message : "فشل تحميل وحدة القياس"}
        </div>
      </div>
    );
  }

  const canEdit =
    permissions.includes("units.edit") || permissions.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/dashboard/units")}
          className="rounded-lg p-2 hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-dark">
            <Ruler className="h-6 w-6 text-primary" />
            {unit.name}
          </h1>
          <p className="text-sm text-gray-500">
            وحدة قياس —
            <Badge
              variant={unit.isActive ? "success" : "danger"}
              className="mr-1"
            >
              {unit.isActive ? "نشط" : "معطل"}
            </Badge>
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => router.push("/dashboard/units")}
            className="rounded-lg border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5"
          >
            تعديل
          </button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>معلومات الوحدة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-gray-500">الاسم</p>
                <p className="font-medium">{unit.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">الكود</p>
                <p className="font-mono text-sm font-medium">{unit.code}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">الرمز</p>
                <p className="font-medium">{unit.symbol || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">النوع</p>
                <Badge variant="info">
                  {TYPE_LABELS[unit.type] || unit.type}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-500">الحالة</p>
                <Badge variant={unit.isActive ? "success" : "danger"}>
                  {unit.isActive ? "نشط" : "معطل"}
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
              <span className="text-sm font-mono">{unit.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">تاريخ الإنشاء</span>
              <span className="text-sm">
                {new Date(unit.createdAt).toLocaleDateString("ar-IQ")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">آخر تحديث</span>
              <span className="text-sm">
                {new Date(unit.updatedAt).toLocaleDateString("ar-IQ")}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
