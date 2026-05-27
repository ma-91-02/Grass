"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye } from "lucide-react";

interface FiscalPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  createdAt: string;
}

export default function FiscalPeriodsPage() {
  const qc = useQueryClient();
  const router = useRouter();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newStartDate, setNewStartDate] = useState("");
  const [newEndDate, setNewEndDate] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUserCompanyId(d.data?.companyId || null))
      .catch(() => {
        toast("تعذر التحقق من بيانات المستخدم", "error");
      });
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ["fiscal-periods", userCompanyId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (userCompanyId) params.append("companyId", userCompanyId);
      const res = await fetch(`/api/fiscal-periods?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل تحميل الفترات");
      return json.data as FiscalPeriod[];
    },
    enabled: !!userCompanyId,
  });

  const periods = data || [];

  const filtered = periods.filter((p) => !search || p.name.includes(search));

  const createMutation = useMutation({
    mutationFn: async (body: {
      companyId: string;
      name: string;
      startDate: string;
      endDate: string;
    }) => {
      const res = await fetch("/api/fiscal-periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل إنشاء الفترة");
      return json.data;
    },
    onSuccess: () => {
      toast("تم إنشاء الفترة بنجاح", "success");
      qc.invalidateQueries({ queryKey: ["fiscal-periods"] });
      setDialogOpen(false);
      setNewName("");
      setNewStartDate("");
      setNewEndDate("");
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const transitionMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/fiscal-periods/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل تحديث الحالة");
      return json.data;
    },
    onSuccess: () => {
      toast("تم تحديث الحالة بنجاح", "success");
      qc.invalidateQueries({ queryKey: ["fiscal-periods"] });
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const handleCreate = () => {
    if (!newName.trim() || !newStartDate || !newEndDate) {
      toast("جميع الحقول مطلوبة", "error");
      return;
    }
    if (!userCompanyId) {
      toast("لم يتم تحديد الشركة", "error");
      return;
    }
    createMutation.mutate({
      companyId: userCompanyId,
      name: newName,
      startDate: newStartDate,
      endDate: newEndDate,
    });
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; color: string }> = {
      FUTURE: { label: "مستقبلية", color: "bg-gray-100 text-gray-700" },
      OPEN: { label: "مفتوحة", color: "bg-green-100 text-green-700" },
      CLOSING_IN_PROGRESS: {
        label: "جاري الإغلاق",
        color: "bg-amber-100 text-amber-700",
      },
      SOFT_CLOSED: { label: "إغلاق جزئي", color: "bg-blue-100 text-blue-700" },
      HARD_CLOSED: { label: "مغلقة", color: "bg-red-100 text-red-700" },
    };
    const s = map[status] || { label: status, color: "bg-gray-100" };
    return <Badge className={s.color}>{s.label}</Badge>;
  };

  const columns: Column<FiscalPeriod>[] = [
    {
      key: "name",
      header: "الاسم",
      render: (p) => <span className="font-medium">{p.name}</span>,
    },
    {
      key: "startDate",
      header: "تاريخ البداية",
      render: (p) => (
        <span>{new Date(p.startDate).toLocaleDateString("ar-IQ")}</span>
      ),
    },
    {
      key: "endDate",
      header: "تاريخ النهاية",
      render: (p) => (
        <span>{new Date(p.endDate).toLocaleDateString("ar-IQ")}</span>
      ),
    },
    {
      key: "status",
      header: "الحالة",
      render: (p) => statusBadge(p.status),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="الفترات المالية"
        description="إدارة الفترات المالية للشركة"
        actionLabel="فترة جديدة"
        onAction={() => setDialogOpen(true)}
      />

      <DataTable
        columns={columns}
        data={filtered}
        loading={isLoading}
        error={error instanceof Error ? error.message : null}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="بحث بالاسم..."
        extraActions={[
          {
            label: "فتح",
            onClick: (p) => {
              if (p.status === "FUTURE")
                transitionMutation.mutate({ id: p.id, status: "OPEN" });
            },
            icon: <span className="text-xs">فتح</span>,
          },
          {
            label: "إغلاق",
            onClick: (p) => {
              if (p.status === "OPEN")
                transitionMutation.mutate({ id: p.id, status: "SOFT_CLOSED" });
            },
            icon: <span className="text-xs">إغلاق</span>,
          },
        ]}
        actions={(item: FiscalPeriod) => (
          <button
            onClick={() => router.push(`/dashboard/fiscal-periods/${item.id}`)}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-muted hover:text-primary"
            title="عرض التفاصيل"
          >
            <Eye className="h-4 w-4" />
          </button>
        )}
      />

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="فترة مالية جديدة"
      >
        <div className="space-y-4 p-4">
          <div>
            <Label>الاسم *</Label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="مثال: يناير 2025"
            />
          </div>
          <div>
            <Label>تاريخ البداية *</Label>
            <Input
              type="date"
              value={newStartDate}
              onChange={(e) => setNewStartDate(e.target.value)}
            />
          </div>
          <div>
            <Label>تاريخ النهاية *</Label>
            <Input
              type="date"
              value={newEndDate}
              onChange={(e) => setNewEndDate(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "جاري الحفظ..." : "حفظ"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
